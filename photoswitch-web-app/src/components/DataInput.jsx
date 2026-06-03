import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { convertWideToLong, detectLongOrWideFormat, parsePastedText, standardizeRows } from '../utils/parser.js';

const exampleLong = `mutant\troi\tframe\tintensity\tbackground
WT\tROI1\t1\t12000\t300
WT\tROI1\t2\t11500\t300
WT\tROI1\t3\t10900\t300
WT\tROI2\t1\t13000\t320`;

const exampleWide = `frame\tROI1\tROI2\tROI3\tROI4\tROI5
1\t12000\t13000\t12800\t11000\t11800
2\t11500\t12500\t12100\t10400\t11100
3\t10800\t11900\t11600\t9900\t10500`;

function rowsFromImportedFile(file, callback, onError) {
  const extension = file.name.split('.').pop().toLowerCase();
  const reader = new FileReader();
  reader.onerror = () => onError('Could not read local file');
  if (extension === 'csv') {
    reader.onload = () => {
      const result = Papa.parse(reader.result, { header: true, skipEmptyLines: true, dynamicTyping: false });
      if (result.errors?.length) onError(result.errors[0].message);
      else callback(result.data);
    };
    reader.readAsText(file);
  } else if (extension === 'xlsx' || extension === 'xls') {
    reader.onload = () => {
      const workbook = XLSX.read(reader.result, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      callback(XLSX.utils.sheet_to_json(worksheet, { defval: '' }));
    };
    reader.readAsArrayBuffer(file);
  } else {
    onError('Please import a csv or xlsx file');
  }
}

export default function DataInput({ settings, rawInput, setRawInput, onParsed, onError }) {
  const parseRows = (rows, sourceText = rawInput) => {
    const format = detectLongOrWideFormat(rows);
    const longRows = format === 'wide' ? convertWideToLong(rows, settings.experimentName || 'Sample1') : rows;
    const parsed = standardizeRows(longRows, settings);
    onParsed(parsed, sourceText || JSON.stringify(rows, null, 2));
  };

  const handlePasteParse = () => {
    try {
      parseRows(parsePastedText(rawInput), rawInput);
    } catch (error) {
      onError(error.message);
    }
  };

  const handleFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    rowsFromImportedFile(file, (rows) => {
      try {
        parseRows(rows, `Imported local file: ${file.name}`);
      } catch (error) {
        onError(error.message);
      }
    }, onError);
  };

  return (
    <section className="panel data-input-panel">
      <div className="section-title-row">
        <h2>Data input</h2>
        <span>Paste table or import local file</span>
      </div>
      <textarea
        value={rawInput}
        onChange={(event) => setRawInput(event.target.value)}
        placeholder="Paste long or wide format table from Excel/Fiji/Nikon here"
      />
      <div className="button-row">
        <button onClick={handlePasteParse}>Parse pasted table</button>
        <label className="file-button">
          Import CSV/XLSX locally
          <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} />
        </label>
      </div>
      <details>
        <summary>Example long format</summary>
        <pre>{exampleLong}</pre>
      </details>
      <details>
        <summary>Example wide format</summary>
        <pre>{exampleWide}</pre>
      </details>
    </section>
  );
}
