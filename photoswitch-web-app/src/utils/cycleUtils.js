export function getCycleFrames(settings) {
  return (Number(settings.resetFrames) || 0) + (Number(settings.analysisFrames) || 0);
}

export function assignCycleInfo(data, settings) {
  const resetFrames = Number(settings.resetFrames) || 0;
  const cycleFrames = getCycleFrames(settings);
  if (cycleFrames <= 0) throw new Error('reset_frames + analysis_frames must be greater than 0');
  return data.map((row) => {
    const cycleIndex = Math.floor((row.frame - 1) / cycleFrames) + 1;
    const positionInCycle = ((row.frame - 1) % cycleFrames) + 1;
    return {
      ...row,
      cycle_index: cycleIndex,
      position_in_cycle: positionInCycle,
      analysis_frame: Math.max(positionInCycle - resetFrames, 0),
      is_reset_frame: positionInCycle <= resetFrames,
    };
  });
}

export function filterAnalysisFrames(data, settings) {
  const cycleNumber = Number(settings.cycleNumber) || 10;
  const cycleFrames = getCycleFrames(settings);
  const requiredFrames = cycleFrames * cycleNumber;
  const maxFrame = Math.max(...data.map((row) => row.frame));
  if (maxFrame < requiredFrames) {
    throw new Error('Not enough frames for selected cycle_number, reset_frames, and analysis_frames');
  }
  const withCycles = assignCycleInfo(data, settings).filter((row) => row.cycle_index <= cycleNumber);
  if (!settings.skipResetFrames) return withCycles;
  return withCycles.filter((row) => !row.is_reset_frame);
}

export function getCycleF0(data, cycle_index, roi, mutant) {
  const rows = data
    .filter((row) => row.cycle_index === cycle_index && row.roi === roi && row.mutant === mutant)
    .sort((a, b) => a.position_in_cycle - b.position_in_cycle || a.frame - b.frame);
  if (!rows.length) throw new Error(`Cannot calculate F0 for cycle ${cycle_index}`);
  if (rows[0].analysis_frame > 1) throw new Error(`Cannot calculate F0 for cycle ${cycle_index}`);
  return rows[0].F_corrected;
}
