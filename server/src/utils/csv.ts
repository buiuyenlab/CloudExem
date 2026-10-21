/**
 * Converts array of records into a valid CSV string with UTF-8 BOM
 * for perfect Vietnamese character rendering in Microsoft Excel.
 */
export function exportToCsv(headers: { key: string; label: string }[], data: any[]): string {
  const BOM = '\uFEFF';
  const headerRow = headers.map(h => `"${h.label.replace(/"/g, '""')}"`).join(',');

  const rows = data.map(item => {
    return headers
      .map(h => {
        const val = item[h.key] ?? '';
        const stringVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
        return `"${stringVal.replace(/"/g, '""')}"`;
      })
      .join(',');
  });

  return BOM + [headerRow, ...rows].join('\r\n');
}

