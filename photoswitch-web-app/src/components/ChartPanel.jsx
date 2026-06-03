import { useMemo, useState } from 'react';
import { CartesianGrid, ErrorBar, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const COLORS = ['#2563eb', '#16a34a', '#dc2626', '#9333ea', '#ea580c', '#0891b2', '#4b5563', '#be123c'];

function unique(values) {
  return Array.from(new Set(values.filter(Boolean))).sort();
}

function makeSeriesRows(rows, xKey, yKey, seriesKey) {
  const xValues = unique(rows.map((row) => row[xKey])).sort((a, b) => Number(a) - Number(b));
  return xValues.map((x) => {
    const row = { [xKey]: x };
    rows.filter((item) => item[xKey] === x).forEach((item) => {
      row[item[seriesKey]] = item[yKey];
    });
    return row;
  });
}

export default function ChartPanel({ results, parsedData }) {
  const [xAxis, setXAxis] = useState('frame');
  const [valueType, setValueType] = useState('normalized');
  const [selectedMutant, setSelectedMutant] = useState('all');
  const [selectedRoi, setSelectedRoi] = useState('all');
  const [showRepresentative, setShowRepresentative] = useState(false);
  const [showMeanSd, setShowMeanSd] = useState(true);

  const trace = results?.normalizedTrace || parsedData || [];
  const mutants = unique(trace.map((row) => row.mutant));
  const rois = unique(trace.map((row) => row.roi));
  const normalizedKey = results?.valueKey || 'F_norm';
  const yKey = valueType === 'raw' ? 'intensity' : valueType === 'corrected' ? 'F_corrected' : normalizedKey;

  const filteredTrace = trace.filter((row) => {
    if (selectedMutant !== 'all' && row.mutant !== selectedMutant) return false;
    if (selectedRoi !== 'all' && row.roi !== selectedRoi) return false;
    if (showRepresentative && results?.representativeTrace?.length) {
      const representativeRoi = results.representativeTrace[0].roi;
      return row.roi === representativeRoi;
    }
    return row[yKey] !== undefined && row[yKey] !== null;
  });

  const chartData = useMemo(() => makeSeriesRows(
    filteredTrace.map((row) => ({ ...row, series: `${row.mutant}-${row.roi}${row.cycle_index ? `-C${row.cycle_index}` : ''}` })),
    xAxis,
    yKey,
    'series',
  ), [filteredTrace, xAxis, yKey]);
  const seriesNames = unique(filteredTrace.map((row) => `${row.mutant}-${row.roi}${row.cycle_index ? `-C${row.cycle_index}` : ''}`)).slice(0, 20);

  const meanRows = results?.meanTrace || [];
  const meanData = meanRows.filter((row) => selectedMutant === 'all' || row.mutant === selectedMutant);
  const cycleMetric = results?.cycleMetricTrace || results?.cycleStartTrace || [];

  return (
    <section className="panel chart-panel">
      <div className="section-title-row">
        <h2>Charts</h2>
        <span>Recharts, local browser rendering</span>
      </div>
      <div className="chart-controls">
        <label>X axis<select value={xAxis} onChange={(event) => setXAxis(event.target.value)}><option value="frame">frame</option><option value="time_s">time_s</option></select></label>
        <label>Value<select value={valueType} onChange={(event) => setValueType(event.target.value)}><option value="raw">raw intensity</option><option value="corrected">F_corrected</option><option value="normalized">F_norm</option></select></label>
        <label>Mutant<select value={selectedMutant} onChange={(event) => setSelectedMutant(event.target.value)}><option value="all">All</option>{mutants.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>ROI<select value={selectedRoi} onChange={(event) => setSelectedRoi(event.target.value)}><option value="all">All</option>{rois.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="checkbox-row"><input type="checkbox" checked={showRepresentative} onChange={(event) => setShowRepresentative(event.target.checked)} />Show ROI3 only</label>
        <label className="checkbox-row"><input type="checkbox" checked={showMeanSd} onChange={(event) => setShowMeanSd(event.target.checked)} />Show mean ± SD</label>
      </div>

      <div id="current-chart" className="chart-card">
        <h3>Trace overlay</h3>
        <ResponsiveContainer width="100%" height={380}>
          <LineChart data={chartData} margin={{ top: 12, right: 28, bottom: 12, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey={xAxis} type="number" allowDecimals />
            <YAxis />
            <Tooltip />
            <Legend />
            {seriesNames.map((name, index) => <Line key={name} type="monotone" dataKey={name} stroke={COLORS[index % COLORS.length]} dot={false} strokeWidth={1.8} />)}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {showMeanSd && meanData.length > 0 && (
        <div className="chart-card">
          <h3>Mutant mean ± SD</h3>
          <ResponsiveContainer width="100%" height={340}>
            <LineChart data={meanData} margin={{ top: 12, right: 28, bottom: 12, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey={xAxis} type="number" />
              <YAxis />
              <Tooltip />
              <Legend />
              {mutants.filter((mutant) => selectedMutant === 'all' || mutant === selectedMutant).map((mutant, index) => (
                <Line key={mutant} data={meanData.filter((row) => row.mutant === mutant)} type="monotone" dataKey="mean" name={`${mutant} mean`} stroke={COLORS[index % COLORS.length]} dot={false} strokeWidth={2}>
                  <ErrorBar dataKey="sd" width={3} stroke={COLORS[index % COLORS.length]} />
                </Line>
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {cycleMetric.length > 0 && (
        <div className="chart-card">
          <h3>Cycle metric mean ± SD</h3>
          <ResponsiveContainer width="100%" height={340}>
            <LineChart data={cycleMetric} margin={{ top: 12, right: 28, bottom: 12, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="cycle_index" type="number" />
              <YAxis />
              <Tooltip />
              <Legend />
              {mutants.filter((mutant) => selectedMutant === 'all' || mutant === selectedMutant).map((mutant, index) => (
                <Line key={mutant} data={cycleMetric.filter((row) => row.mutant === mutant)} type="monotone" dataKey="mean" name={`${mutant} cycle mean`} stroke={COLORS[index % COLORS.length]} dot strokeWidth={2}>
                  <ErrorBar dataKey="sd" width={4} stroke={COLORS[index % COLORS.length]} />
                </Line>
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
