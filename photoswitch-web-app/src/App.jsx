import { useEffect, useMemo, useState } from 'react';
import {
  gridFromWorkbookArrayBuffer,
  gridToTsv,
  NORMALIZATION_TEMPLATES,
  normalizeExcelGrid,
  parseExcelText,
  exportExcelNormalizationWorkbook,
} from './utils/excelNormalization.js';
import { deleteExperiment, listExperiments, loadExperiment, saveExperiment } from './utils/storageUtils.js';

const DRAFT_KEY = 'photoswitch_roi_analyzer_excel_draft';

const exampleExcel = `Frame\tROI1\tROI2\tROI3\tROI4\tROI5
1\t12000\t13000\t12800\t11000\t11800
2\t11500\t12500\t12100\t10400\t11100
3\t10800\t11900\t11600\t9900\t10500
4\t10100\t11200\t11000\t9400\t9900`;

const defaultSettings = {
  experimentName: 'Photoswitch normalization',
  normalizationTemplate: 'column-first-row',
  cycleCount: 10,
  headerRows: 1,
  labelColumns: 1,
  autoRowsPerCycle: true,
  rowsPerCycle: 40,
  outputMode: 'formulas',
};

function readFileAsGrid(file, onLoad, onError) {
  const extension = file.name.split('.').pop().toLowerCase();
  const reader = new FileReader();
  reader.onerror = () => onError('Could not read this local file.');
  reader.onload = () => {
    try {
      if (extension === 'xlsx' || extension === 'xls') {
        onLoad(gridFromWorkbookArrayBuffer(reader.result), `Imported Excel file: ${file.name}`);
      } else {
        onLoad(parseExcelText(reader.result), String(reader.result || ''));
      }
    } catch (error) {
      onError(error.message);
    }
  };
  if (extension === 'xlsx' || extension === 'xls') reader.readAsArrayBuffer(file);
  else reader.readAsText(file);
}

function copyToClipboard(text, setMessage, setError) {
  navigator.clipboard.writeText(text)
    .then(() => setMessage('Copied tab-delimited Excel layout to clipboard. Paste directly into Excel.'))
    .catch(() => setError('Clipboard copy failed. Please select the output box and copy manually.'));
}

export default function App() {
  const [settings, setSettings] = useState(defaultSettings);
  const [excelText, setExcelText] = useState(exampleExcel);
  const [inputGrid, setInputGrid] = useState(() => parseExcelText(exampleExcel));
  const [results, setResults] = useState(null);
  const [message, setMessage] = useState('Paste an Excel block, choose a normalization template, then click Normalize.');
  const [error, setError] = useState('');
  const [experiments, setExperiments] = useState([]);

  useEffect(() => {
    setExperiments(listExperiments());
    try {
      const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
      if (draft) {
        setSettings({ ...defaultSettings, ...draft.settings });
        setExcelText(draft.excelText || exampleExcel);
        setInputGrid(draft.inputGrid?.length ? draft.inputGrid : parseExcelText(draft.excelText || exampleExcel));
        setResults(draft.results || null);
        setMessage('Restored Excel normalization draft from localStorage.');
      }
    } catch {
      setMessage('Paste an Excel block, choose a normalization template, then click Normalize.');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ settings, excelText, inputGrid, results, timestamp: new Date().toISOString() }));
  }, [settings, excelText, inputGrid, results]);

  const outputText = useMemo(() => {
    if (!results) return '';
    if (settings.outputMode === 'values') return results.tsvValues;
    if (settings.outputMode === 'formulaOnly') return results.tsvFormulaOnly;
    if (settings.outputMode === 'denominators') return results.tsvDenominators;
    return results.tsvFormulas;
  }, [results, settings.outputMode]);

  const updateSetting = (key, value) => setSettings((current) => ({ ...current, [key]: value }));

  const parsePastedTable = () => {
    try {
      const grid = parseExcelText(excelText);
      setInputGrid(grid);
      setResults(null);
      setError('');
      setMessage(`Parsed ${grid.length} Excel rows and ${Math.max(0, ...grid.map((row) => row.length))} columns.`);
    } catch (parseError) {
      setError(parseError.message);
    }
  };

  const runNormalization = () => {
    try {
      const grid = inputGrid.length ? inputGrid : parseExcelText(excelText);
      const nextResults = normalizeExcelGrid(grid, settings);
      setInputGrid(grid);
      setResults(nextResults);
      setError('');
      setMessage(`Normalized as Excel layout. Effective rows per cycle: ${nextResults.rowsPerCycle}.`);
    } catch (normalizationError) {
      setError(normalizationError.message);
    }
  };

  const handleFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    readFileAsGrid(file, (grid, sourceText) => {
      setInputGrid(grid);
      setExcelText(sourceText.startsWith('Imported Excel file') ? gridToTsv(grid) : sourceText);
      setResults(null);
      setError('');
      setMessage(`Loaded ${grid.length} rows from ${file.name}.`);
    }, setError);
  };

  const saveCurrentExperiment = () => {
    const saved = saveExperiment({
      experimentName: settings.experimentName,
      rawInput: excelText,
      parsedData: inputGrid,
      settings,
      results,
    });
    setExperiments(listExperiments());
    setMessage(`Saved locally: ${saved.experimentName}`);
  };

  const loadSavedExperiment = (id) => {
    const experiment = loadExperiment(id);
    if (!experiment) return;
    setSettings({ ...defaultSettings, ...experiment.settings });
    setExcelText(experiment.rawInput || exampleExcel);
    setInputGrid(experiment.parsedData || []);
    setResults(experiment.results || null);
    setError('');
    setMessage(`Loaded local experiment: ${experiment.experimentName}`);
  };

  const deleteSavedExperiment = (id) => {
    deleteExperiment(id);
    setExperiments(listExperiments());
    setMessage('Deleted saved experiment.');
  };

  const clearCurrent = () => {
    setExcelText('');
    setInputGrid([]);
    setResults(null);
    setError('');
    localStorage.removeItem(DRAFT_KEY);
    setMessage('Current Excel workspace cleared.');
  };

  const outputRows = outputText ? outputText.split('\n').length : 0;
  const outputColumns = outputText ? Math.max(...outputText.split('\n').map((row) => row.split('\t').length)) : 0;

  return (
    <div className="app-shell excel-app-shell">
      <header className="hero">
        <div>
          <h1>Photoswitch ROI Analyzer</h1>
          <p>Excel-style ROI intensity normalization. Paste from Excel, choose the formula template, copy back to Excel.</p>
        </div>
        <div className="privacy-badge">Browser only · Excel layout in / Excel layout out</div>
      </header>

      <main className="excel-layout">
        <aside className="panel settings-panel">
          <h2>Normalization settings</h2>
          <label>
            Experiment name
            <input value={settings.experimentName} onChange={(event) => updateSetting('experimentName', event.target.value)} />
          </label>
          <label>
            1️⃣ Normalization template
            <select value={settings.normalizationTemplate} onChange={(event) => updateSetting('normalizationTemplate', event.target.value)}>
              {NORMALIZATION_TEMPLATES.map((template) => (
                <option key={template.value} value={template.value}>{template.label}</option>
              ))}
            </select>
          </label>
          <div className="template-help">
            Formula references assume the pasted block starts at Excel cell A1. For example, with 2 header rows and 1 label column, the first numeric cell is B3.
          </div>
          <div className="two-column-inputs">
            <label>2️⃣ Cycle count<input type="number" min="1" value={settings.cycleCount} onChange={(event) => updateSetting('cycleCount', event.target.value)} /></label>
            <label>Header rows<input type="number" min="0" value={settings.headerRows} onChange={(event) => updateSetting('headerRows', event.target.value)} /></label>
            <label>Label columns<input type="number" min="0" value={settings.labelColumns} onChange={(event) => updateSetting('labelColumns', event.target.value)} /></label>
            <label>Rows per cycle<input type="number" min="1" value={settings.rowsPerCycle} disabled={settings.autoRowsPerCycle} onChange={(event) => updateSetting('rowsPerCycle', event.target.value)} /></label>
          </div>
          <label className="checkbox-row">
            <input type="checkbox" checked={settings.autoRowsPerCycle} onChange={(event) => updateSetting('autoRowsPerCycle', event.target.checked)} />
            Auto-calculate rows per cycle from pasted data and cycle count
          </label>
          <label>
            Output layout
            <select value={settings.outputMode} onChange={(event) => updateSetting('outputMode', event.target.value)}>
              <option value="formulas">Excel formulas with original labels</option>
              <option value="values">Calculated normalized values with original labels</option>
              <option value="formulaOnly">Only formula cells</option>
              <option value="denominators">Only denominator references</option>
            </select>
          </label>
          <button className="primary-button" onClick={runNormalization} disabled={!excelText.trim() && inputGrid.length === 0}>Normalize</button>
        </aside>

        <section className="workspace excel-workspace">
          {error && <div className="alert error">{error}</div>}
          {message && !error && <div className="alert info">{message}</div>}

          <section className="panel data-input-panel">
            <div className="section-title-row">
              <h2>Excel input</h2>
              <span>Paste an Excel range exactly as it appears in your sheet</span>
            </div>
            <textarea
              className="excel-textarea"
              value={excelText}
              onChange={(event) => setExcelText(event.target.value)}
              placeholder="Paste Excel cells here. Rows are separated by new lines; columns are separated by tabs."
            />
            <div className="button-row wrap">
              <button onClick={parsePastedTable}>Parse pasted Excel layout</button>
              <label className="file-button">
                Import local XLSX/CSV
                <input type="file" accept=".xlsx,.xls,.csv,.txt" onChange={handleFile} />
              </label>
              <button onClick={() => { setExcelText(exampleExcel); setInputGrid(parseExcelText(exampleExcel)); setResults(null); }}>Load example</button>
              <button onClick={clearCurrent}>Clear current data</button>
            </div>
          </section>

          <section className="panel output-panel">
            <div className="section-title-row">
              <h2>Excel output</h2>
              <span>{results ? `${outputRows} rows × ${outputColumns} columns` : 'No preview table: copy this block back to Excel'}</span>
            </div>
            <textarea
              className="excel-textarea output-textarea"
              readOnly
              value={outputText}
              placeholder="Normalized Excel-style output will appear here as a tab-delimited block. Copy it and paste directly into Excel."
            />
            <div className="button-row wrap">
              <button disabled={!results} onClick={() => copyToClipboard(outputText, setMessage, setError)}>Copy output for Excel</button>
              <button disabled={!results} onClick={() => exportExcelNormalizationWorkbook(results, `${settings.experimentName.replace(/\s+/g, '_')}_normalized.xlsx`)}>Download XLSX</button>
              <button disabled={!inputGrid.length} onClick={saveCurrentExperiment}>Save experiment locally</button>
            </div>
          </section>
        </section>

        <aside className="panel saved-panel">
          <div className="section-title-row">
            <h2>Saved experiments</h2>
            <span>{experiments.length} local</span>
          </div>
          <p className="muted">Saved only in browser localStorage. Data is never uploaded.</p>
          <div className="saved-list">
            {experiments.length === 0 && <p className="muted">No saved experiments yet.</p>}
            {experiments.map((experiment) => (
              <div key={experiment.id} className="saved-item">
                <div>
                  <strong>{experiment.experimentName || 'Untitled experiment'}</strong>
                  <small>{new Date(experiment.timestamp).toLocaleString()}</small>
                </div>
                <div className="button-row compact">
                  <button onClick={() => loadSavedExperiment(experiment.id)}>Load</button>
                  <button className="danger" onClick={() => deleteSavedExperiment(experiment.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </main>
    </div>
  );
}
