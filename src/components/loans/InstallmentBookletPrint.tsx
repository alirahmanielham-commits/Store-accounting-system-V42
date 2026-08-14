import React, { useRef } from 'react'; 
import { formatDateDisplay } from '../../utils/format';
import { Loan, Installment, Person } from '../../types';
import { motion } from 'motion/react';
import { Printer, X } from 'lucide-react';
// import { useReactToPrint } from 'react-to-print';

interface InstallmentBookletPrintProps {
  loan: Loan;
  installments: Installment[];
  person: Person | undefined;
  onClose: () => void;
  formatCurrency: (val: number) => string;
  currency?: string;
}

export default function InstallmentBookletPrint({ loan, installments, person, onClose, formatCurrency, currency = 'تومان' }: InstallmentBookletPrintProps) {
  const componentRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    document.title = `دفترچه_اقساط_وام_${loan.loanNumber || loan.id}`;
    setTimeout(() => {
        window.print();
        document.title = "Applet";
    }, 100);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm print:fixed print:inset-0 print:bg-white print:p-0 print-section">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col print:shadow-none print:max-h-none print:h-auto print:overflow-visible"
        dir="rtl"
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-200 print:hidden">
          <h2 className="text-xl font-bold text-slate-800">چاپ دفترچه اقساط</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-600/20"
            >
              <Printer className="w-4 h-4" />
              <span>چاپ</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 print:overflow-visible print:bg-white print:p-0">
          <div ref={componentRef} dir="rtl" style={{ direction: 'rtl' }} className="bg-white p-8 rounded-xl print:p-8 print:bg-white text-slate-900">
            {/* Booklet Header */}
            <div className="text-center mb-8 pb-6 border-b-2 border-slate-200">
              <h1 className="text-2xl font-black text-slate-800 mb-2">دفترچه اقساط وام</h1>
              <div className="text-sm text-slate-500 font-medium">شماره وام: {loan.loanNumber || loan.id}</div>
            </div>

            {/* Loan & Person Info */}
            <div className="grid grid-cols-2 gap-6 mb-8 p-6 bg-slate-50 rounded-xl border border-slate-200 print:bg-white print:border-slate-300">
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">وام گیرنده:</span>
                  <span className="font-bold text-slate-800">{person?.name || 'نامشخص'}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">مبلغ وام:</span>
                  <span className="font-bold text-slate-800" dir="ltr">{formatCurrency(loan.amount)} {currency}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">تاریخ پرداخت:</span>
                  <span className="font-bold text-slate-800">{formatDateDisplay(loan.startDate)}</span>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">تعداد اقساط:</span>
                  <span className="font-bold text-slate-800">{loan.totalInstallments} قسط</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">مبلغ هر قسط:</span>
                  <span className="font-bold text-slate-800" dir="ltr">{formatCurrency(loan.installmentAmount)} {currency}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">تواتر پرداخت:</span>
                  <span className="font-bold text-slate-800">
                    {loan.frequency === 'monthly' ? 'ماهانه' : 
                     loan.frequency === 'quarterly' ? 'سه‌ماهه' : 
                     loan.frequency === 'yearly' ? 'سالانه' : 'سایر'}
                  </span>
                </div>
              </div>
            </div>

            {/* Installments Table (Booklet format) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2 print:gap-6">
              {installments.sort((a,b) => a.dueDate.localeCompare(b.dueDate)).map((inst, idx) => (
                <div key={inst.id} className="border-2 border-dashed border-slate-300 rounded-xl p-5 flex flex-col relative page-break-inside-avoid print:border-solid print:border-slate-400">
                  <div className="absolute -top-4 -right-4 w-8 h-8 bg-slate-800 text-white rounded-full flex items-center justify-center font-bold text-sm border-4 border-white print:border-none print:bg-slate-200 print:text-slate-800">
                    {idx + 1}
                  </div>
                  <div className="flex-1 space-y-4 mt-2">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                      <span className="text-sm font-semibold text-slate-600">کد قسط:</span>
                      <span className="font-black text-slate-900 tracking-widest font-mono">{inst.installmentCode || '-'}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                      <span className="text-sm font-semibold text-slate-600">تاریخ سررسید:</span>
                      <span className="font-black text-slate-900">{formatDateDisplay(inst.dueDate)}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                      <span className="text-sm font-semibold text-slate-600">مبلغ قسط:</span>
                      <span className="font-black text-slate-900" dir="ltr">{formatCurrency(inst.amount)} {currency}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                      <span className="text-sm font-semibold text-slate-600">تاریخ پرداخت:</span>
                      <span className={`text-xs ${inst.paidDate ? 'font-black text-emerald-600' : 'text-slate-400'}`}>
                        {inst.paidDate ? formatDateDisplay(inst.paidDate) : '.......................................'}
                      </span>
                    </div>
                    {inst.status === 'paid' && inst.paidAmount ? (
                      <>
                      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                        <span className="text-sm font-semibold text-slate-600">مبلغ پرداخت شده:</span>
                        <span className="font-black text-emerald-600" dir="ltr">{formatCurrency(inst.paidAmount)} {currency}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                        <span className="text-sm font-semibold text-slate-600">شماره رسید پرداختی:</span>
                        <span className="font-black text-slate-900">{inst.receiptNumber || '-'}</span>
                      </div>
                      </>
                    ) : null}
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-sm font-semibold text-slate-600">مهر و امضا:</span>
                      <span className="text-slate-400 text-xs">
                        {inst.status === 'paid' ? '✔ تایید شده' : '.......................................'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </motion.div>
    </div>
  );
}
