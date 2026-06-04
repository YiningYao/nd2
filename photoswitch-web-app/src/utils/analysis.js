import { filterAnalysisFrames, getCycleF0 } from './cycleUtils.js';

function groupBy(data, keyFn) {
  return data.reduce((acc, row) => {
    const key = keyFn(row);
    if (!acc.has(key)) acc.set(key, []);
    acc.get(key).push(row);
    return acc;
  }, new Map());
}

function mean(values) {
  const clean = values.filter((value) => Number.isFinite(value));
  if (!clean.length) return null;
  return clean.reduce((sum, value) => sum + value, 0) / clean.length;
}

function sd(values) {
  const clean = values.filter((value) => Number.isFinite(value));
  if (clean.length <= 1) return 0;
  const avg = mean(clean);
  return Math.sqrt(clean.reduce((sum, value) => sum + (value - avg) ** 2, 0) / (clean.length - 1));
}

function sem(values) {
  const clean = values.filter((value) => Number.isFinite(value));
  if (!clean.length) return null;
  return sd(clean) / Math.sqrt(clean.length);
}

function firstNMean(rows, n) {
  return mean(rows.slice(0, Math.max(1, Number(n) || 1)).map((row) => row.F_corrected));
}

function summarizeMeanTrace(normalizedRows, valueKey) {
  const grouped = groupBy(normalizedRows, (row) => `${row.mutant}||${row.frame}||${row.time_s}`);
  return Array.from(grouped.entries()).map(([key, rows]) => {
    const [mutant, frame, time_s] = key.split('||');
    const values = rows.map((row) => row[valueKey]);
    return {
      mutant,
      frame: Number(frame),
      time_s: Number(time_s),
      mean: mean(values),
      sd: sd(values),
      sem: sem(values),
      n: values.length,
    };
  }).sort((a, b) => a.mutant.localeCompare(b.mutant) || a.frame - b.frame);
}

function requireRepresentative(normalizedRows, settings) {
  const representative = settings.representativeRoi || 'ROI3';
  const exists = normalizedRows.some((row) => row.roi === representative);
  if (!exists) throw new Error(`Representative ROI ${representative} not found`);
}

export function normalizeSingleSwitching(data, settings) {
  const f0Frames = Number(settings.f0Frames) || 1;
  const normalizedTrace = [];
  const summary = [];
  const grouped = groupBy(data, (row) => `${row.mutant}||${row.roi}`);

  grouped.forEach((rows, key) => {
    const [mutant, roi] = key.split('||');
    const sorted = [...rows].sort((a, b) => a.frame - b.frame);
    const F0 = firstNMean(sorted, f0Frames);
    if (!Number.isFinite(F0) || F0 === 0) throw new Error(`Cannot calculate F0 for ${mutant} ${roi}`);
    const roiTrace = sorted.map((row) => ({ ...row, F0, F_norm: row.F_corrected / F0 }));
    normalizedTrace.push(...roiTrace);
    const fValues = roiTrace.map((row) => row.F_corrected);
    const fMin = Math.min(...fValues);
    const fEnd = roiTrace[roiTrace.length - 1].F_corrected;
    summary.push({
      mutant,
      roi,
      F0,
      Fmin: fMin,
      Fend: fEnd,
      switching_amplitude: 1 - fMin / F0,
      end_ratio: fEnd / F0,
    });
  });

  requireRepresentative(normalizedTrace, settings);
  return {
    mode: 'single',
    normalizedTrace,
    summary,
    meanTrace: summarizeMeanTrace(normalizedTrace, 'F_norm'),
    representativeTrace: normalizedTrace.filter((row) => row.roi === (settings.representativeRoi || 'ROI3')),
    valueKey: 'F_norm',
  };
}

export function analyzeFatigue(data, settings) {
  const analysisRows = filterAnalysisFrames(data, settings);
  const normalizedTrace = [];
  const summary = [];
  const grouped = groupBy(analysisRows, (row) => `${row.mutant}||${row.roi}||${row.cycle_index}`);

  grouped.forEach((rows, key) => {
    const [mutant, roi, cycleText] = key.split('||');
    const cycleIndex = Number(cycleText);
    const sorted = [...rows].sort((a, b) => a.position_in_cycle - b.position_in_cycle || a.frame - b.frame);
    const cycleF0 = getCycleF0(analysisRows, cycleIndex, roi, mutant);
    if (!Number.isFinite(cycleF0) || cycleF0 === 0) throw new Error(`Cannot calculate F0 for cycle ${cycleIndex}`);
    const roiCycleTrace = sorted.map((row) => ({ ...row, cycle_F0: cycleF0, F_norm_fatigue: row.F_corrected / cycleF0 }));
    normalizedTrace.push(...roiCycleTrace);
    const values = roiCycleTrace.map((row) => row.F_corrected);
    const cycleFmin = Math.min(...values);
    const cycleFend = roiCycleTrace[roiCycleTrace.length - 1].F_corrected;
    summary.push({
      mutant,
      roi,
      cycle_index: cycleIndex,
      cycle_F0: cycleF0,
      cycle_Fmin: cycleFmin,
      cycle_Fend: cycleFend,
      cycle_switching_amplitude: 1 - cycleFmin / cycleF0,
      cycle_end_ratio: cycleFend / cycleF0,
      F0: cycleF0,
      Fmin: cycleFmin,
      Fend: cycleFend,
      switching_amplitude: 1 - cycleFmin / cycleF0,
      end_ratio: cycleFend / cycleF0,
    });
  });

  requireRepresentative(normalizedTrace, settings);
  return {
    mode: 'fatigue',
    normalizedTrace,
    summary,
    cycleMetricTrace: summarizeCycleMetric(summary, 'cycle_switching_amplitude'),
    representativeTrace: normalizedTrace.filter((row) => row.roi === (settings.representativeRoi || 'ROI3')),
    valueKey: 'F_norm_fatigue',
  };
}

export function analyzePhotobleaching(data, settings) {
  const analysisRows = filterAnalysisFrames(data, settings);
  const normalizedTrace = [];
  const summary = [];
  const roiGroups = groupBy(analysisRows, (row) => `${row.mutant}||${row.roi}`);

  roiGroups.forEach((roiRows, key) => {
    const [mutant, roi] = key.split('||');
    const firstCycleRows = roiRows.filter((row) => row.cycle_index === 1).sort((a, b) => a.position_in_cycle - b.position_in_cycle || a.frame - b.frame);
    if (!firstCycleRows.length) throw new Error('Cannot calculate F0 for cycle 1');
    const globalF0 = firstCycleRows[0].F_corrected;
    if (!Number.isFinite(globalF0) || globalF0 === 0) throw new Error('Cannot calculate F0 for cycle 1');
    normalizedTrace.push(...roiRows.map((row) => ({ ...row, global_F0: globalF0, F_norm_bleaching: row.F_corrected / globalF0 })));

    const cycleGroups = groupBy(roiRows, (row) => row.cycle_index);
    cycleGroups.forEach((rows, cycleIndex) => {
      const sorted = [...rows].sort((a, b) => a.position_in_cycle - b.position_in_cycle || a.frame - b.frame);
      const cycleStart = sorted[0].F_corrected;
      const cycleEnd = sorted[sorted.length - 1].F_corrected;
      const cycleStartRatio = cycleStart / globalF0;
      const cycleEndRatio = cycleEnd / globalF0;
      summary.push({
        mutant,
        roi,
        cycle_index: Number(cycleIndex),
        global_F0: globalF0,
        cycle_start: cycleStart,
        cycle_end: cycleEnd,
        cycle_start_ratio: cycleStartRatio,
        cycle_end_ratio: cycleEndRatio,
        bleaching_loss: 1 - cycleStartRatio,
        F0: globalF0,
        Fmin: Math.min(...sorted.map((row) => row.F_corrected)),
        Fend: cycleEnd,
        switching_amplitude: null,
        end_ratio: cycleEndRatio,
      });
    });
  });

  requireRepresentative(normalizedTrace, settings);
  return {
    mode: 'photobleaching',
    normalizedTrace,
    summary,
    meanTrace: summarizeMeanTrace(normalizedTrace, 'F_norm_bleaching'),
    cycleStartTrace: summarizeCycleMetric(summary, 'cycle_start_ratio'),
    cycleEndTrace: summarizeCycleMetric(summary, 'cycle_end_ratio'),
    representativeTrace: normalizedTrace.filter((row) => row.roi === (settings.representativeRoi || 'ROI3')),
    valueKey: 'F_norm_bleaching',
  };
}

export function compareMutants(data, settings) {
  if (settings.comparisonMode === 'fatigue') {
    return { ...analyzeFatigue(data, settings), mode: 'mutant-fatigue' };
  }
  if (settings.comparisonMode === 'photobleaching') {
    return { ...analyzePhotobleaching(data, settings), mode: 'mutant-photobleaching' };
  }
  return { ...normalizeSingleSwitching(data, settings), mode: 'mutant-single' };
}

export function summarizeCycleMetric(summary, metricKey) {
  const grouped = groupBy(summary, (row) => `${row.mutant}||${row.cycle_index}`);
  return Array.from(grouped.entries()).map(([key, rows]) => {
    const [mutant, cycle] = key.split('||');
    const values = rows.map((row) => row[metricKey]);
    return {
      mutant,
      cycle_index: Number(cycle),
      mean: mean(values),
      sd: sd(values),
      sem: sem(values),
      n: values.length,
    };
  }).sort((a, b) => a.mutant.localeCompare(b.mutant) || a.cycle_index - b.cycle_index);
}
