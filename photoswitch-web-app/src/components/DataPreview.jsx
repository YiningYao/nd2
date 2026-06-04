export default function DataPreview({ data }) {
  const rows = (data || []).slice(0, 12);
  return (
    <section className="panel">
      <div className="section-title-row">
        <h2>Data preview</h2>
        <span>{data?.length || 0} rows parsed</span>
      </div>
      <div className="table-wrap small-table">
        <table>
          <thead>
            <tr>{['mutant', 'roi', 'frame', 'time_s', 'intensity', 'background', 'F_corrected'].map((column) => <th key={column}>{column}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.mutant}-${row.roi}-${row.frame}-${index}`}>
                <td>{row.mutant}</td><td>{row.roi}</td><td>{row.frame}</td><td>{row.time_s}</td><td>{row.intensity}</td><td>{row.background}</td><td>{row.F_corrected}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
