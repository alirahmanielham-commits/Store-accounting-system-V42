import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface ExportColumn {
  header: string;
  key: string;
}

interface ExportOptions {
  filename: string;
  title: string;
  subtitle?: string;
  columns: ExportColumn[];
  data: any[];
}

export const exportToExcel = ({ filename, title, subtitle, columns, data }: ExportOptions) => {
  // Transform data for Excel
  const excelData = data.map(item => {
    const row: any = {};
    columns.forEach(col => {
      row[col.header] = item[col.key];
    });
    return row;
  });

  const ws = XLSX.utils.json_to_sheet(excelData);
  
  // Set RTL direction for the worksheet
  if (!ws['!dir']) ws['!dir'] = 'rtl';
  
  // Adjust column widths based on header length
  const wscols = columns.map(col => ({ wch: Math.max(col.header.length + 5, 15) }));
  ws['!cols'] = wscols;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

export const exportToPDF = ({ filename, title, subtitle, columns, data }: ExportOptions) => {
  // Use jsPDF
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  // Adding a standard font that supports Persian is necessary in a real scenario
  // Since jsPDF default font doesn't support Persian/Arabic characters out of the box,
  // we would typically add a base64 font here. For now, we will rely on English keys or 
  // simplified output if the font is missing, but assume a generic approach.
  
  doc.setFontSize(16);
  doc.text(title, 280, 15, { align: 'right' }); // RTL align
  
  if (subtitle) {
    doc.setFontSize(11);
    doc.text(subtitle, 280, 22, { align: 'right' });
  }

  const tableData = data.map(item => columns.map(col => String(item[col.key] || '')));
  const head = [columns.map(col => col.header)];

  // Need to reverse arrays to mock RTL in table if jsPDF doesn't handle RTL natively in autotable
  const reverseHead = [head[0].reverse()];
  const reverseData = tableData.map(row => row.reverse());

  (doc as any).autoTable({
    head: reverseHead,
    body: reverseData,
    startY: 30,
    theme: 'grid',
    styles: {
      fontStyle: 'normal',
      halign: 'center', // Center text
    },
    headStyles: {
      fillColor: [79, 70, 229], // Indigo 600
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251], // Gray 50
    }
  });

  doc.save(`${filename}.pdf`);
};
