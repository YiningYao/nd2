export default function SavedExperiments({ experiments, onLoad, onDelete }) {
  return (
    <section className="panel saved-panel">
      <div className="section-title-row">
        <h2>Saved experiments</h2>
        <span>{experiments.length} local</span>
      </div>
      <p className="muted">Saved only in this browser localStorage. Nothing is uploaded.</p>
      <div className="saved-list">
        {experiments.length === 0 && <p className="muted">No saved experiments yet.</p>}
        {experiments.map((experiment) => (
          <div key={experiment.id} className="saved-item">
            <div>
              <strong>{experiment.experimentName || 'Untitled experiment'}</strong>
              <small>{new Date(experiment.timestamp).toLocaleString()}</small>
            </div>
            <div className="button-row compact">
              <button onClick={() => onLoad(experiment.id)}>Load</button>
              <button className="danger" onClick={() => onDelete(experiment.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
