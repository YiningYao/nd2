import * as XLSX from 'xlsx';

export const NORMALIZATION_TEMPLATES = [
  {
    value: 'column-first-row',
    label: 'Column baseline: first data row (B3/B$3, B4/B$3, C3/C$3)',
  },
  {
    value: 'column-current-row',
    label: 'Column baseline: same row fixed (B3/B$3, B4/B$4, C3/C$3)',
  },
  {
    value: 'row-first-column',
    label: 'Row baseline: first data column (B3/$B3, C3/$B3)',
  },
  {
    value: 'global-first-cell',
    label: 'Global baseline: first numeric cell (B3/$B$3, C3/$B$3)',
  },
  {
    value: 'cycle-start-column',
    label: 'Cycle baseline: first row of each cycle, same column',
  },
];

export function parseExcelText(text) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line) => line.split('\t').map((cell) => cell.trim()));
}

export function gridToTsv(grid) {
  return grid.map((row) => row.map((cell) => cell ?? '').join('\t')).join('\n');
}

export function padGrid(grid) {
  const width = Math.max(0, ...grid.map((row) => row.length));
  return grid.map((row) => Array.from({ length: width }, (_, index) => row[index] ?? ''));
}

export function gridFromWorkbookArrayBuffer(arrayBuffer) {
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }).map((row) => row.map((cell) => String(cell ?? '')));
}

export function isNumericCell(value) {
  if (value === null || value === undefined || value === '') return false;
  return Number.isFinite(Number(value));
}

export function toColumnName(index) {
  let n = index + 1;
  let name = '';
  while (n > 0) {
    const remainder = (n - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
}

export function toA1(rowIndex, columnIndex, { lockRow = false, lockColumn = false } = {}) {
  const column = `${lockColumn ? '$' : ''}${toColumnName(columnIndex)}`;
  const row = `${lockRow ? '$' : ''}${rowIndex + 1}`;
  return `${column}${row}`;
}

function getCycleStartRow(rowIndex, dataStartRow, rowsPerCycle) {
  if (!rowsPerCycle || rowsPerCycle < 1) return dataStartRow;
  const dataOffset = rowIndex - dataStartRow;
  return dataStartRow + Math.floor(dataOffset / rowsPerCycle) * rowsPerCycle;
}

export function getDenominatorCell(rowIndex, columnIndex, settings) {
  const dataStartRow = Math.max(0, Number(settings.headerRows || 0));
  const dataStartColumn = Math.max(0, Number(settings.labelColumns || 0));
  const rowsPerCycle = Math.max(1, Number(settings.rowsPerCycle || 1));

  if (settings.normalizationTemplate === 'column-current-row') {
    return { rowIndex, columnIndex, lockRow: true, lockColumn: false };
  }
  if (settings.normalizationTemplate === 'row-first-column') {
    return { rowIndex, columnIndex: dataStartColumn, lockRow: false, lockColumn: true };
  }
  if (settings.normalizationTemplate === 'global-first-cell') {
    return { rowIndex: dataStartRow, columnIndex: dataStartColumn, lockRow: true, lockColumn: true };
  }
  if (settings.normalizationTemplate === 'cycle-start-column') {
    return {
      rowIndex: getCycleStartRow(rowIndex, dataStartRow, rowsPerCycle),
      columnIndex,
      lockRow: true,
      lockColumn: false,
    };
  }
  return { rowIndex: dataStartRow, columnIndex, lockRow: true, lockColumn: false };
}

export function calculateRowsPerCycle(grid, settings) {
  const headerRows = Math.max(0, Number(settings.headerRows || 0));
  const dataRows = Math.max(0, grid.length - headerRows);
  const cycleCount = Math.max(1, Number(settings.cycleCount || 1));
  if (!settings.autoRowsPerCycle) return Math.max(1, Number(settings.rowsPerCycle || 1));
  return Math.max(1, Math.ceil(dataRows / cycleCount));
}

export function normalizeExcelGrid(inputGrid, settings) {
  const grid = padGrid(inputGrid);
  if (!grid.length) throw new Error('Please paste an Excel-style table first.');

  const headerRows = Math.max(0, Number(settings.headerRows || 0));
  const labelColumns = Math.max(0, Number(settings.labelColumns || 0));
  const rowsPerCycle = calculateRowsPerCycle(grid, settings);
  const effectiveSettings = { ...settings, rowsPerCycle };

  const valueGrid = grid.map((row) => [...row]);
  const formulaGrid = grid.map((row) => [...row]);
  const denominatorGrid = grid.map((row) => row.map(() => ''));
  const formulaOnlyGrid = grid.map((row) => row.map(() => ''));

  for (let rowIndex = 0; rowIndex < grid.length; rowIndex += 1) {
    for (let columnIndex = 0; columnIndex < grid[rowIndex].length; columnIndex += 1) {
      const cell = grid[rowIndex][columnIndex];
      if (rowIndex < headerRows || columnIndex < labelColumns || !isNumericCell(cell)) continue;

      const denominator = getDenominatorCell(rowIndex, columnIndex, effectiveSettings);
      const denominatorValue = Number(grid[denominator.rowIndex]?.[denominator.columnIndex]);
      const numeratorValue = Number(cell);
      const numeratorRef = toA1(rowIndex, columnIndex);
      const denominatorRef = toA1(denominator.rowIndex, denominator.columnIndex, denominator);
      const formula = `=${numeratorRef}/${denominatorRef}`;

      formulaGrid[rowIndex][columnIndex] = formula;
      formulaOnlyGrid[rowIndex][columnIndex] = formula;
      denominatorGrid[rowIndex][columnIndex] = denominatorRef;
      valueGrid[rowIndex][columnIndex] = Number.isFinite(denominatorValue) && denominatorValue !== 0
        ? Number((numeratorValue / denominatorValue).toPrecision(12))
        : '#DIV/0!';
    }
  }

  return {
    valueGrid,
    formulaGrid,
    formulaOnlyGrid,
    denominatorGrid,
    rowsPerCycle,
    tsvValues: gridToTsv(valueGrid),
    tsvFormulas: gridToTsv(formulaGrid),
    tsvFormulaOnly: gridToTsv(formulaOnlyGrid),
    tsvDenominators: gridToTsv(denominatorGrid),
  };
}

function sheetFromGrid(grid) {
  const worksheet = XLSX.utils.aoa_to_sheet(grid);
  Object.keys(worksheet).forEach((address) => {
    if (address.startsWith('!')) return;
    const cell = worksheet[address];
    if (typeof cell.v === 'string' && cell.v.startsWith('=')) {
      cell.f = cell.v.slice(1);
      cell.v = undefined;
      cell.t = 'n';
    }
  });
  return worksheet;
}

export function exportExcelNormalizationWorkbook(results, filename = 'normalized_excel_template.xlsx') {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheetFromGrid(results.valueGrid), 'Normalized values');
  XLSX.utils.book_append_sheet(workbook, sheetFromGrid(results.formulaGrid), 'Excel formulas');
  XLSX.utils.book_append_sheet(workbook, sheetFromGrid(results.denominatorGrid), 'Denominator refs');
  XLSX.writeFile(workbook, filename);
}
