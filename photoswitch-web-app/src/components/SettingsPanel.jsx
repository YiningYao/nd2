const modeOptions = [
  ['single', 'Single switching normalization'],
  ['fatigue', '10-cycle fatigue'],
  ['photobleaching', '10-cycle photobleaching'],
  ['mutant', 'Mutant comparison'],
];

export default function SettingsPanel({ settings, onChange, onRun, hasData }) {
  const update = (key, value) => onChange({ ...settings, [key]: value });
  return (
    <aside className="panel settings-panel">
      <h2>Settings</h2>
      <label>
        Experiment name
        <input value={settings.experimentName} onChange={(event) => update('experimentName', event.target.value)} placeholder="Sample1" />
      </label>
      <label>
        Analysis mode
        <select value={settings.analysisMode} onChange={(event) => update('analysisMode', event.target.value)}>
          {modeOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      {settings.analysisMode === 'mutant' && (
        <label>
          Mutant comparison type
          <select value={settings.comparisonMode} onChange={(event) => update('comparisonMode', event.target.value)}>
            <option value="single">Single switching data</option>
            <option value="fatigue">Cycle fatigue data</option>
            <option value="photobleaching">Cycle photobleaching data</option>
          </select>
        </label>
      )}
      <div className="two-column-inputs">
        <label>Frame interval (s)<input type="number" step="0.001" value={settings.frameInterval} onChange={(event) => update('frameInterval', event.target.value)} /></label>
        <label>F0 frames<input type="number" min="1" value={settings.f0Frames} onChange={(event) => update('f0Frames', event.target.value)} /></label>
        <label>Reset frames<input type="number" min="0" value={settings.resetFrames} onChange={(event) => update('resetFrames', event.target.value)} /></label>
        <label>Analysis frames<input type="number" min="1" value={settings.analysisFrames} onChange={(event) => update('analysisFrames', event.target.value)} /></label>
        <label>Cycle number<input type="number" min="1" value={settings.cycleNumber} onChange={(event) => update('cycleNumber', event.target.value)} /></label>
        <label>Representative ROI<input value={settings.representativeRoi} onChange={(event) => update('representativeRoi', event.target.value)} /></label>
      </div>
      <label className="checkbox-row">
        <input type="checkbox" checked={settings.backgroundSubtraction} onChange={(event) => update('backgroundSubtraction', event.target.checked)} />
        Background subtraction
      </label>
      <label className="checkbox-row">
        <input type="checkbox" checked={settings.skipResetFrames} onChange={(event) => update('skipResetFrames', event.target.checked)} />
        Skip reset frames
      </label>
      <button className="primary-button" onClick={onRun} disabled={!hasData}>Run Analysis</button>
    </aside>
  );
}
