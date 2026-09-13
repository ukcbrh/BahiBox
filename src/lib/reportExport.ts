import * as XLSX from 'xlsx';

function escapeHtml(value: any): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Exports an array of plain row-objects to a downloadable .xlsx file. 
// Each object's keys become column headers automatically.
export function exportReportToExcel(data: any[], filename: string, sheetName: string = 'Report') {
  if (!data || data.length === 0) {
    return false;
  }
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : filename + '.xlsx');
  return true;
}

export interface ReportColumn {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
}

// Opens a clean, printable HTML table in a new tab and triggers the 
// browser's print dialog automatically once it loads.
export function printReportTable(title: string, columns: ReportColumn[], data: any[], subtitle?: string) {
  const win = window.open('', '_blank');
  if (!win) return;

  const headHtml = columns.map(c =>
    `<th style="padding:8px 12px;border:1px solid #ddd;background:#f3f4f6;text-align:${c.align || 'left'};">${escapeHtml(c.label)}</th>`
  ).join('');

  const rowsHtml = data.map(row =>
    '<tr>' + columns.map(c =>
      `<td style="padding:6px 12px;border:1px solid #ddd;text-align:${c.align || 'left'};">${escapeHtml(row[c.key])}</td>`
    ).join('') + '</tr>'
  ).join('');

  win.document.write(
    '<html><head><title>' + escapeHtml(title) + '</title>' +
    '<style>body{font-family:Arial,sans-serif;padding:24px;color:#111;}' +
    'h2{margin-bottom:4px;}p{margin-top:0;color:#666;font-size:13px;}' +
    'table{border-collapse:collapse;width:100%;margin-top:16px;font-size:13px;}' +
    '@media print{body{padding:0;}}</style></head><body>' +
    '<h2>' + escapeHtml(title) + '</h2>' +
    (subtitle ? '<p>' + escapeHtml(subtitle) + '</p>' : '') +
    '<table><thead><tr>' + headHtml + '</tr></thead><tbody>' + rowsHtml + '</tbody></table>' +
    '<script>window.onload = function() { window.print(); };</script>' +
    '</body></html>'
  );
  win.document.close();
}
