function formatValue(value) {
  if (typeof value === 'number') return Number.isInteger(value) ? value : value.toFixed(5);
  if (value === null || value === undefined) return '';
  return value;
}

export default function ResultsTable({ title, data, limit = 12 }) {
  const rows = (data || []).slice(0, limit);
  const columns = rows.length ? Object.keys(rows[0]) : [];
  return (
    <section className="panel">
      <div className="section-title-row">
        <h2>{title}</h2>
        <span>{data?.length || 0} rows</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index}>{columns.map((column) => <td key={column}>{formatValue(row[column])}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
