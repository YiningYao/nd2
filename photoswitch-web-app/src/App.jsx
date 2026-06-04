import { useEffect, useState } from 'react';
import ChartPanel from './components/ChartPanel.jsx';
import DataInput from './components/DataInput.jsx';
import DataPreview from './components/DataPreview.jsx';
import ResultsTable from './components/ResultsTable.jsx';
import SavedExperiments from './components/SavedExperiments.jsx';
import SettingsPanel from './components/SettingsPanel.jsx';
import { analyzeFatigue, analyzePhotobleaching, compareMutants, normalizeSingleSwitching } from './utils/analysis.js';
import { exportChartPNG, exportCSV, exportXLSX } from './utils/exportUtils.js';
import { deleteExperiment, listExperiments, loadExperiment, saveExperiment } from './utils/storageUtils.js';

const DRAFT_KEY = 'photoswitch_roi_analyzer_current_draft';

const defaultSettings = {
  experimentName: 'Sample1',
  analysisMode: 'single',
  comparisonMode: 'single',
  frameInterval: 0.05,
  f0Frames: 1,
  resetFrames: 3,
  analysisFrames: 40,
  cycleNumber: 10,
  representativeRoi: 'ROI3',
  backgroundSubtraction: true,
  skipResetFrames: true,
};

function runSelectedAnalysis(parsedData, settings) {
  if (settings.analysisMode === 'single') return normalizeSingleSwitching(parsedData, settings);
  if (settings.analysisMode === 'fatigue') return analyzeFatigue(parsedData, settings);
  if (settings.analysisMode === 'photobleaching') return analyzePhotobleaching(parsedData, settings);
  return compareMutants(parsedData, settings);
}

export default function App() {
  const [settings, setSettings] = useState(defaultSettings);
  const [rawInput, setRawInput] = useState('');
  const [parsedData, setParsedData] = useState([]);
  const [results, setResults] = useState(null);
  const [message, setMessage] = useState('Paste data or import a local CSV/XLSX file to begin.');
  const [error, setError] = useState('');
  const [experiments, setExperiments] = useState([]);

  useEffect(() => {
    setExperiments(listExperiments());
    try {
      const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
      if (draft) {
        setSettings({ ...defaultSettings, ...draft.settings });
        setRawInput(draft.rawInput || '');
        setParsedData(draft.parsedData || []);
        setResults(draft.results || null);
        setMessage('Restored current draft from browser localStorage.');
      }
    } catch {
      setMessage('Paste data or import a local CSV/XLSX file to begin.');
    }
  }, []);

  useEffect(() => {
    const draft = { settings, rawInput, parsedData, results, timestamp: new Date().toISOString() };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [settings, rawInput, parsedData, results]);

  const handleParsed = (rows, sourceText) => {
    setParsedData(rows);
    setRawInput(sourceText);
    setResults(null);
    setError('');
    setMessage(`Parsed ${rows.length} rows. Click Run Analysis.`);
  };

  const handleRun = () => {
    try {
      const nextResults = runSelectedAnalysis(parsedData, settings);
      setResults(nextResults);
      setError('');
      setMessage('Analysis completed in the browser.');
    } catch (analysisError) {
      setError(analysisError.message);
    }
  };

  const handleSave = () => {
    const saved = saveExperiment({
      experimentName: settings.experimentName,
      rawInput,
      parsedData,
      settings,
      results,
    });
    setExperiments(listExperiments());
    setMessage(`Saved locally: ${saved.experimentName}`);
  };

  const handleLoad = (id) => {
    const experiment = loadExperiment(id);
    if (!experiment) return;
    setSettings({ ...defaultSettings, ...experiment.settings });
    setRawInput(experiment.rawInput || '');
    setParsedData(experiment.parsedData || []);
    setResults(experiment.results || null);
    setError('');
    setMessage(`Loaded local experiment: ${experiment.experimentName}`);
  };

  const handleDelete = (id) => {
    deleteExperiment(id);
    setExperiments(listExperiments());
    setMessage('Deleted saved experiment.');
  };

  const clearCurrent = () => {
    setRawInput('');
    setParsedData([]);
    setResults(null);
    setError('');
    localStorage.removeItem(DRAFT_KEY);
    setMessage('Current data cleared. Saved experiments were not changed.');
  };

  const exportBaseName = (settings.experimentName || 'photoswitch_results').replace(/\s+/g, '_');

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <h1>Photoswitch ROI Analyzer</h1>
          <p>For ROI intensity normalization, fatigue, photobleaching, and mutant comparison.</p>
        </div>
        <div className="privacy-badge">Local browser analysis · No server upload</div>
      </header>

      <main className="layout">
        <SettingsPanel settings={settings} onChange={setSettings} onRun={handleRun} hasData={parsedData.length > 0} />
        <div className="workspace">
          {error && <div className="alert error">{error}</div>}
          {message && !error && <div className="alert info">{message}</div>}
          <DataInput settings={settings} rawInput={rawInput} setRawInput={setRawInput} onParsed={handleParsed} onError={setError} />
          <DataPreview data={parsedData} />

          <section className="panel export-panel">
            <div className="section-title-row"><h2>Export and local storage</h2><span>Browser only</span></div>
            <div className="button-row wrap">
              <button disabled={!results} onClick={() => exportCSV(results.normalizedTrace, `${exportBaseName}_normalized_trace.csv`)}>Export normalized trace as CSV</button>
              <button disabled={!results} onClick={() => exportCSV(results.summary, `${exportBaseName}_summary.csv`)}>Export summary as CSV</button>
              <button disabled={!results} onClick={() => exportXLSX({ normalized_trace: results.normalizedTrace, summary: results.summary, mean_trace: results.meanTrace || [], representative_roi: results.representativeTrace || [] }, `${exportBaseName}_all_results.xlsx`)}>Export all results as XLSX</button>
              <button disabled={!results} onClick={() => exportChartPNG('current-chart', `${exportBaseName}_chart.png`)}>Export current chart as PNG</button>
              <button disabled={!parsedData.length} onClick={handleSave}>Save experiment locally</button>
              <button onClick={clearCurrent}>Clear current data</button>
            </div>
          </section>

          {results && (
            <>
              <ResultsTable title="Normalized trace table" data={results.normalizedTrace} />
              <ResultsTable title="Summary table" data={results.summary} />
              <ChartPanel results={results} parsedData={parsedData} />
            </>
          )}
        </div>
        <SavedExperiments experiments={experiments} onLoad={handleLoad} onDelete={handleDelete} />
      </main>
    </div>
  );
}
