import React, { useState, useMemo } from 'react';
import { Loan, Installment, Person } from '../../types';
import { addCommas } from '../../utils/format';
import { FileText, Download, Filter, FileSpreadsheet } from 'lucide-react';

interface LoansReportsProps {
  formatCurrency?: (val: number) => string;
  loans: Loan[];
  installments: Installment[];
  persons: Person[];
  storeSettings?: any;
}

export default function LoansReports({ 
  formatCurrency = (val: number) => Number(val).toLocaleString("fa-IR") + " تومان",
  loans, installments, persons, storeSettings
}: LoansReportsProps) {
  const [reportType, setReportType] = useState<'active' | 'settled' | 'cashflow'>('active');

  const reportData = useMemo(() => {
    if (reportType === 'active' || reportType === 'settled') {
      const targetStatus = reportType === 'active' ? 'active' : 'completed';
      return loans.filter(l => l.status === targetStatus).map(loan => {
         const person = persons.find(p => p.id === loan.personId);
         const loanInsts = installments.filter(i => i.loanId === loan.id);
         const paidAmount = loanInsts.filter(i => i.status === 'paid').reduce((a, c) => a + (c.paidAmount || c.amount || 0), 0);
         const totalExpected = loanInsts.reduce((a, c) => a + (c.amount || 0), 0);
         return {
           ...loan,
           personName: person?.name || 'نامشخص',
           paidAmount,
           totalExpected,
           remainingAmount: totalExpected - paidAmount
         };
      });
    } else if (reportType === 'cashflow') {
       // Future cashflow (pending installments grouped by month)
       const today = new Date().toLocaleDateString('fa-IR').replace(/\//g, '-');
       const flowMap: Record<string, { month: string, expectedAmount: number, count: number }> = {};
       
       installments.filter(i => i.status === 'pending' && i.dueDate >= today).forEach(inst => {
         const month = inst.dueDate.substring(0, 7);
         if (!flowMap[month]) flowMap[month] = { month, expectedAmount: 0, count: 0 };
         flowMap[month].expectedAmount += (inst.amount || 0);
         flowMap[month].count += 1;
       });

       return Object.values(flowMap).sort((a, b) => a.month.localeCompare(b.month));
    }
    return [];
  }, [loans, installments, persons, reportType]);

  const handleExportCSV = () => {
     // Simplified CSV export
     let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
     if (reportType === 'active' || reportType === 'settled') {
        csvContent += "شماره وام,وام‌گیرنده,مبلغ اصل,کل مبلغ با سود,پرداخت شده,باقیمانده,تاریخ شروع\n";
        (reportData as any[]).forEach(row => {
           csvContent += `${row.loanNumber || row.id},${row.personName},${row.amount},${row.totalExpected},${row.paidAmount},${row.remainingAmount},${row.startDate}\n`;
        });
     } else {
        csvContent += "ماه سررسید,تعداد اقساط,مجموع مبلغ پیش‌بینی شده\n";
        (reportData as any[]).forEach(row => {
           csvContent += `${row.month},${row.count},${row.expectedAmount}\n`;
        });
     }
     const encodedUri = encodeURI(csvContent);
     const link = document.createElement("a");
     link.setAttribute("href", encodedUri);
     link.setAttribute("download", `loans_report_${reportType}.csv`);
     document.body.appendChild(link);
     link.click();
     document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
       <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col md:flex-row gap-6 items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
            <FileText className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-black text-gray-900">گزارشات تسهیلات</h2>
            <p className="text-sm text-gray-500 mt-1">گزارش‌گیری جامع از وضعیت وام‌ها و جریان نقدی</p>
          </div>
        </div>
        <button onClick={handleExportCSV} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-colors shadow-sm">
           <FileSpreadsheet className="w-4 h-4" />
           خروجی اکسل
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex gap-2 overflow-x-auto bg-gray-50/50">
           <button 
             onClick={() => setReportType('active')}
             className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${reportType === 'active' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
           >
              وام‌های فعال
           </button>
           <button 
             onClick={() => setReportType('settled')}
             className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${reportType === 'settled' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
           >
              وام‌های تسویه شده
           </button>
           <button 
             onClick={() => setReportType('cashflow')}
             className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${reportType === 'cashflow' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
           >
              جریان نقدی آتی (سررسیدها)
           </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-gray-50 text-gray-500 font-medium">
              {(reportType === 'active' || reportType === 'settled') ? (
                <tr>
                  <th className="px-6 py-4">شماره وام</th>
                  <th className="px-6 py-4">وام‌گیرنده</th>
                  <th className="px-6 py-4">تاریخ شروع</th>
                  <th className="px-6 py-4">مبلغ اصل ({storeSettings?.currency || "تومان"})</th>
                  <th className="px-6 py-4">کل پرداختی ({storeSettings?.currency || "تومان"})</th>
                  <th className="px-6 py-4">مانده ({storeSettings?.currency || "تومان"})</th>
                </tr>
              ) : (
                <tr>
                  <th className="px-6 py-4">ماه سررسید</th>
                  <th className="px-6 py-4">تعداد اقساط</th>
                  <th className="px-6 py-4">مبلغ پیش‌بینی شده ({storeSettings?.currency || "تومان"})</th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reportData.map((row: any, idx) => (
                <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                  {(reportType === 'active' || reportType === 'settled') ? (
                    <>
                      <td className="px-6 py-4 font-mono text-gray-600">{row.loanNumber || row.id}</td>
                      <td className="px-6 py-4 font-bold text-gray-900">{row.personName}</td>
                      <td className="px-6 py-4 font-mono text-gray-600" dir="ltr">{row.startDate}</td>
                      <td className="px-6 py-4 font-mono font-medium text-gray-900" dir="ltr">{addCommas(row.amount)} {storeSettings?.currency || "تومان"}</td>
                      <td className="px-6 py-4 font-mono font-medium text-emerald-600" dir="ltr">{addCommas(row.paidAmount)} {storeSettings?.currency || "تومان"}</td>
                      <td className="px-6 py-4 font-mono font-bold text-rose-600" dir="ltr">{addCommas(row.remainingAmount)} {storeSettings?.currency || "تومان"}</td>
                    </>
                  ) : (
                    <>
                      <td className="px-6 py-4 font-mono font-bold text-gray-900" dir="ltr">{row.month}</td>
                      <td className="px-6 py-4 text-gray-600">{row.count} قسط</td>
                      <td className="px-6 py-4 font-mono font-black text-indigo-600" dir="ltr">{addCommas(row.expectedAmount)} {storeSettings?.currency || "تومان"}</td>
                    </>
                  )}
                </tr>
              ))}
              {reportData.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    داده‌ای برای نمایش وجود ندارد.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
