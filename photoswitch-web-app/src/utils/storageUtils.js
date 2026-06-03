const STORAGE_KEY = 'photoswitch_roi_analyzer_experiments';

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeAll(experiments) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(experiments));
}

export function saveExperiment(experiment) {
  const experiments = readAll();
  const id = experiment.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const saved = { ...experiment, id, timestamp: new Date().toISOString() };
  const index = experiments.findIndex((item) => item.id === id);
  if (index >= 0) experiments[index] = saved;
  else experiments.unshift(saved);
  writeAll(experiments);
  return saved;
}

export function loadExperiment(id) {
  return readAll().find((experiment) => experiment.id === id) || null;
}

export function listExperiments() {
  return readAll().sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

export function deleteExperiment(id) {
  const filtered = readAll().filter((experiment) => experiment.id !== id);
  writeAll(filtered);
  return filtered;
}
