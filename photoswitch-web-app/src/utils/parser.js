import Papa from 'papaparse';
import * as XLSX from 'xlsx';

const REQUIRED_LONG_COLUMNS = ['frame', 'intensity'];
const OPTIONAL_COLUMNS = ['mutant', 'roi', 'time_s', 'background'];

function normalizeColumnName(name) {
  return String(name ?? '').trim();
}

function getValue(row, name) {
  const key = Object.keys(row).find((column) => column.toLowerCase() === name.toLowerCase());
  return key ? row[key] : undefined;
}

function toNumber(value, errorMessage) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(errorMessage);
  return number;
}

export function parsePastedText(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return [];
  const result = Papa.parse(trimmed, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
    transformHeader: normalizeColumnName,
  });
  if (result.errors?.length) {
    throw new Error(result.errors[0].message || 'Could not parse pasted table');
  }
  return result.data.map((row) => {
    const cleaned = {};
    Object.entries(row).forEach(([key, value]) => {
      const column = normalizeColumnName(key);
      if (column) cleaned[column] = typeof value === 'string' ? value.trim() : value;
    });
    return cleaned;
  });
}

export function detectLongOrWideFormat(data) {
  if (!data?.length) return 'empty';
  const columns = Object.keys(data[0]).map(normalizeColumnName);
  const lower = new Set(columns.map((column) => column.toLowerCase()));
  if (lower.has('frame') && lower.has('intensity')) return 'long';
  if (lower.has('frame')) {
    const metadata = new Set(['frame', 'time_s', 'mutant', 'roi', 'background']);
    const valueColumns = columns.filter((column) => !metadata.has(column.toLowerCase()) && column.trim() !== '');
    const looksWide = valueColumns.length > 0 && data.some((row) => valueColumns.some((column) => Number.isFinite(Number(row[column]))));
    if (looksWide) return 'wide';
  }
  if (!lower.has('frame')) throw new Error('Missing required column: frame');
  throw new Error('Missing required column: intensity');
}

export function convertWideToLong(data, mutantName = 'Sample1') {
  if (!data?.length) return [];
  const columns = Object.keys(data[0]);
  const frameColumn = columns.find((column) => column.trim().toLowerCase() === 'frame');
  if (!frameColumn) throw new Error('Missing required column: frame');
  const metadata = new Set(['frame', 'time_s', 'mutant', 'roi', 'background']);
  const roiColumns = columns.filter((column) => !metadata.has(String(column).trim().toLowerCase()) && String(column).trim() !== '');
  return data.flatMap((row) => roiColumns.map((roi) => ({
    mutant: mutantName || 'Sample1',
    roi,
    frame: row[frameColumn],
    intensity: row[roi],
    background: 0,
  })));
}

export function validateData(data) {
  if (!data?.length) throw new Error('No data rows found');
  const columns = Object.keys(data[0]).map((column) => column.trim().toLowerCase());
  if (!columns.includes('frame')) throw new Error('Missing required column: frame');
  if (!columns.includes('intensity')) throw new Error('Missing required column: intensity');

  data.forEach((row) => {
    toNumber(getValue(row, 'frame'), 'Frame column must be numeric');
    toNumber(getValue(row, 'intensity'), 'Intensity values must be numeric');
    const backgroundValue = getValue(row, 'background');
    const timeValue = getValue(row, 'time_s');
    if (backgroundValue !== undefined && backgroundValue !== '') {
      toNumber(backgroundValue, 'Background values must be numeric');
    }
    if (timeValue !== undefined && timeValue !== '') {
      toNumber(timeValue, 'time_s values must be numeric');
    }
  });
  return true;
}

export function standardizeRows(data, settings) {
  validateData(data);
  const frameInterval = Number(settings.frameInterval) || 0.05;
  const backgroundSubtraction = Boolean(settings.backgroundSubtraction);
  return data
    .map((row) => {
      const frame = toNumber(getValue(row, 'frame'), 'Frame column must be numeric');
      const intensity = toNumber(getValue(row, 'intensity'), 'Intensity values must be numeric');
      const backgroundValue = getValue(row, 'background');
      const timeValue = getValue(row, 'time_s');
      const background = backgroundValue === undefined || backgroundValue === '' ? 0 : toNumber(backgroundValue, 'Background values must be numeric');
      const time = timeValue === undefined || timeValue === '' ? (frame - 1) * frameInterval : toNumber(timeValue, 'time_s values must be numeric');
      return {
        mutant: getValue(row, 'mutant') || settings.experimentName || 'Sample1',
        roi: getValue(row, 'roi') || 'ROI1',
        frame,
        time_s: Number(time.toFixed(6)),
        intensity,
        background,
        F_corrected: backgroundSubtraction ? intensity - background : intensity,
      };
    })
    .sort((a, b) => String(a.mutant).localeCompare(String(b.mutant)) || String(a.roi).localeCompare(String(b.roi)) || a.frame - b.frame);
}

export function rowsFromWorkbook(workbook) {
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
}

export { REQUIRED_LONG_COLUMNS, OPTIONAL_COLUMNS };
