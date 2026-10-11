import * as XLSX from 'xlsx';
import { getActiveStoreSettings, NumberFormatConfig } from './format';

export interface ExportColumn {
  header: string;
  key: string;
  isNumeric?: boolean;
}

export interface ExportOptions {
  filename: string;
  title?: string;
  subtitle?: string;
  columns?: ExportColumn[];
  data: any[];
  sheetName?: string;
  storeSettings?: Partial<NumberFormatConfig> | any;
}

export interface ExportSheet {
  sheetName: string;
  data: any[];
  columns?: ExportColumn[];
}

export interface MultiSheetExportOptions {
  filename: string;
  sheets: ExportSheet[];
  storeSettings?: Partial<NumberFormatConfig> | any;
}

/**
 * Formats a numeric value respecting the active company decimal settings.
 * If use_decimals is false, rounds to nearest integer.
 * If use_decimals is true, rounds to specified decimal_places (default 2).
 */
export const formatDecimalForExcel = (
  val: number | string | undefined | null,
  storeSettings?: any
): number => {
  if (val === undefined || val === null || val === '') return 0;
  const num = typeof val === 'number' ? val : Number(String(val).replace(/,/g, '').replace(/٫/g, '.').trim());
  if (isNaN(num)) return 0;

  const settings = storeSettings || getActiveStoreSettings();
  const useDecimals = Boolean(settings?.use_decimals);
  const places = typeof settings?.decimal_places === 'number' ? settings.decimal_places : 2;

  if (useDecimals) {
    return Number(num.toFixed(places));
  }
  return Math.round(num);
};

/**
 * Formats a numeric string with optional commas and decimals for display in Excel cells.
 */
export const formatDecimalStringForExcel = (
  val: number | string | undefined | null,
  storeSettings?: any
): string => {
  const num = formatDecimalForExcel(val, storeSettings);
  const settings = storeSettings || getActiveStoreSettings();
  const useDecimals = Boolean(settings?.use_decimals);
  const places = typeof settings?.decimal_places === 'number' ? settings.decimal_places : 2;

  if (useDecimals) {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: places,
      useGrouping: false
    });
  }
  return String(Math.round(num));
};

/**
 * Export a single table data array to Excel (.xlsx) with RTL support and decimal formatting.
 */
export const exportToExcel = ({
  filename,
  title,
  subtitle,
  columns,
  data,
  sheetName = 'گزارش',
  storeSettings
}: ExportOptions) => {
  if (!data || data.length === 0) {
    console.warn('exportToExcel: No data to export');
  }

  let excelData: any[] = [];

  if (columns && columns.length > 0) {
    excelData = data.map(item => {
      const row: any = {};
      columns.forEach(col => {
        let val = item[col.key];
        if (col.isNumeric && (typeof val === 'number' || !isNaN(Number(val)))) {
          val = formatDecimalForExcel(val, storeSettings);
        }
        row[col.header] = val !== undefined && val !== null ? val : '';
      });
      return row;
    });
  } else {
    // If data is already an array of objects with Persian keys
    excelData = data;
  }

  const ws = XLSX.utils.json_to_sheet(excelData);

  // Set RTL direction for the worksheet
  if (!ws['!dir']) ws['!dir'] = 'rtl';

  // Calculate auto column widths
  if (excelData.length > 0) {
    const keys = Object.keys(excelData[0] || {});
    const colWidths = keys.map(key => {
      let maxLen = String(key).length;
      excelData.slice(0, 50).forEach(row => {
        const valLen = String(row[key] || '').length;
        if (valLen > maxLen) maxLen = valLen;
      });
      return { wch: Math.min(Math.max(maxLen + 4, 12), 45) };
    });
    ws['!cols'] = colWidths;
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const cleanFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  XLSX.writeFile(wb, cleanFilename);
};

/**
 * Export multiple sheets to a single Excel workbook (.xlsx)
 */
export const exportMultiSheetExcel = ({
  filename,
  sheets,
  storeSettings
}: MultiSheetExportOptions) => {
  const wb = XLSX.utils.book_new();

  sheets.forEach(({ sheetName, data, columns }) => {
    let sheetRows: any[] = [];
    if (columns && columns.length > 0) {
      sheetRows = data.map(item => {
        const row: any = {};
        columns.forEach(col => {
          let val = item[col.key];
          if (col.isNumeric && (typeof val === 'number' || !isNaN(Number(val)))) {
            val = formatDecimalForExcel(val, storeSettings);
          }
          row[col.header] = val !== undefined && val !== null ? val : '';
        });
        return row;
      });
    } else {
      sheetRows = data;
    }

    const ws = XLSX.utils.json_to_sheet(sheetRows);
    if (!ws['!dir']) ws['!dir'] = 'rtl';

    if (sheetRows.length > 0) {
      const keys = Object.keys(sheetRows[0] || {});
      const colWidths = keys.map(key => {
        let maxLen = String(key).length;
        sheetRows.slice(0, 50).forEach(row => {
          const valLen = String(row[key] || '').length;
          if (valLen > maxLen) maxLen = valLen;
        });
        return { wch: Math.min(Math.max(maxLen + 4, 12), 45) };
      });
      ws['!cols'] = colWidths;
    }

    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  const cleanFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  XLSX.writeFile(wb, cleanFilename);
};

export const exportToPDF = ({ filename, title, subtitle, columns, data }: ExportOptions) => {
  const cols = columns || Object.keys(data[0] || {}).map(k => ({ header: k, key: k }));
  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="fa">
    <head>
      <meta charset="utf-8">
      <title>${title || filename}</title>
      <style>
        body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; direction: rtl; }
        h1 { font-size: 18px; margin-bottom: 6px; }
        p { font-size: 13px; color: #555; margin-top: 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
        th { background-color: #f3f4f6; font-weight: bold; }
        tr:nth-child(even) { background-color: #fafafa; }
      </style>
    </head>
    <body>
      <h1>${title || filename}</h1>
      ${subtitle ? `<p>${subtitle}</p>` : ''}
      <table>
        <thead>
          <tr>${cols.map(c => `<th>${c.header}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${data.map(row => `<tr>${cols.map(c => `<td>${row[c.key] ?? ''}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }
};
