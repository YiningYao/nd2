import { saveAs } from 'file-saver';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export function exportCSV(data, filename = 'export.csv') {
  const csv = Papa.unparse(data || []);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  saveAs(blob, filename);
}

export function exportXLSX(sheets, filename = 'photoswitch_results.xlsx') {
  const workbook = XLSX.utils.book_new();
  Object.entries(sheets || {}).forEach(([sheetName, rows]) => {
    const worksheet = XLSX.utils.json_to_sheet(rows || []);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));
  });
  const output = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  saveAs(new Blob([output], { type: 'application/octet-stream' }), filename);
}

export function exportChartPNG(chartId, filename = 'chart.png') {
  const chart = document.getElementById(chartId);
  if (!chart) throw new Error('Current chart was not found');
  const svg = chart.querySelector('svg');
  if (!svg) throw new Error('Current chart does not contain an SVG');

  const serializer = new XMLSerializer();
  const svgText = serializer.serializeToString(svg);
  const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  const image = new Image();
  const width = svg.clientWidth || 900;
  const height = svg.clientHeight || 420;

  image.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = width * 2;
    canvas.height = height * 2;
    const context = canvas.getContext('2d');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.scale(2, 2);
    context.drawImage(image, 0, 0, width, height);
    URL.revokeObjectURL(url);
    canvas.toBlob((blob) => {
      if (blob) saveAs(blob, filename);
    }, 'image/png');
  };
  image.src = url;
}
