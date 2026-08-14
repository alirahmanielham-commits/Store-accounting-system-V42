import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, Layers, Percent, Wallet, Printer, Trash2, List, Settings, CheckCircle, ArrowLeftRight } from 'lucide-react';
import { Loan, Installment, LoanHistoryItem } from '../../types';
import { formatDateDisplay } from '../../utils/format';
import { getLoanHistory } from '../../services/accountingService';
import { calculateDaysPastDue, calculatePenalty, calculateEarlySettlement } from '../../utils/penaltyUtils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  loan: Loan | null;
  installments: Installment[];
  formatCurrency: (val: number) => string;
  getPersonName: (id: string | number) => string;
  userRole: string;
  handleUpdateLoanStatus: (loanId: string | number, newStatus: string) => Promise<void>;
  handleDeleteLoan: (loanId: string | number) => void;
  setPrintingLoanId: (id: string | null) => void;
  onPayInstallment: (loanId: string) => void;
  LOAN_STATUS_LABELS: Record<string, string>;
  LOAN_STATUS_COLORS: Record<string, string>;
  isSubmitting?: boolean;
}

export default function LoanCardModal({
  isOpen,
  onClose,
  loan,
  installments,
  formatCurrency,
  getPersonName,
  userRole,
  handleUpdateLoanStatus,
  handleDeleteLoan,
  setPrintingLoanId,
  onPayInstallment,
  LOAN_STATUS_LABELS,
  LOAN_STATUS_COLORS,
  isSubmitting
}: Props) {
  if (!loan) return null;

  const [historyList, setHistoryList] = useState<LoanHistoryItem[]>([]);

  useEffect(() => {
    if (loan?.id) {
      loadHistory();
    }
  }, [loan?.id, loan?.status]);

  const loadHistory = async () => {
    if (!loan) return;
    const items = await getLoanHistory(loan.id);
    const combined: LoanHistoryItem[] = [...items];
    if (loan.history && Array.isArray(loan.history)) {
      loan.history.forEach(lh => {
        if (!combined.some(c => c.status === lh.status && c.date === lh.date)) {
          combined.push({
            loanId: loan.id,
            status: lh.status,
            date: lh.date,
            desc: lh.desc,
            user: lh.user
          });
        }
      });
    }
    combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setHistoryList(combined);
  };

  const loanInsts = (installments || []).filter(i => i.loanId === loan.id);
  const paidInsts = loanInsts.filter(i => i.status === 'paid').length;
  const totalInsts = loanInsts.length;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-5xl md:max-h-[90vh] bg-white rounded-3xl shadow-2xl z-50 overflow-hidden flex flex-col"
          >
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{backgroundColor: loan.type === 'given' ? '#eff6ff' : '#ecfdf5'}}>
                  <Wallet className={`w-6 h-6 ${loan.type === 'given' ? 'text-blue-500' : 'text-emerald-500'}`}/>
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-800">کارت وام - {getPersonName(loan.personId)}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm font-bold text-gray-500 font-mono" dir="ltr">#{loan.loanNumber || loan.id}</span>
                    <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${LOAN_STATUS_COLORS[loan.status] || 'bg-gray-100 text-gray-600'}`}>
                      {LOAN_STATUS_LABELS[loan.status] || 'نامشخص'}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-xl transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                  <div className="text-sm font-medium text-gray-500 mb-1">مبلغ وام</div>
                  <div className="text-lg font-black font-mono text-gray-900" dir="ltr">{formatCurrency(loan.amount)}</div>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                  <div className="text-sm font-medium text-gray-500 mb-1">تاریخ پرداخت</div>
                  <div className="text-lg font-bold text-gray-900">{formatDateDisplay(loan.startDate)}</div>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                  <div className="text-sm font-medium text-gray-500 mb-1">اقساط</div>
                  <div className="text-lg font-bold text-gray-900">{totalInsts} {loan.frequency === 'yearly' ? '(سالانه)' : loan.frequency === 'quarterly' ? '(فصلی)' : '(ماهانه)'}</div>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                  <div className="text-sm font-medium text-gray-500 mb-1">پیشرفت پرداخت</div>
                  <div className="flex items-center gap-3">
                     <div className="flex-1 h-2.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{width: `${(paidInsts/totalInsts)*100}%`}}></div>
                     </div>
                     <span className="text-sm font-bold text-emerald-600">{paidInsts}/{totalInsts}</span>
                  </div>
                </div>
              </div>

              <div className="mb-8">
                 <h4 className="font-black text-gray-800 mb-4 flex items-center gap-2">
                    <ArrowLeftRight className="w-5 h-5 text-indigo-500" />
                    تغییر وضعیت وام
                 </h4>
                 <div className="flex flex-wrap gap-2">
                    {['requested', 'incomplete', 'completed_dossier', 'approved', 'active', 'completed'].map(st => {
                       const isActive = loan.status === st;
                       const statusLabels = {
                          requested: 'درخواست',
                          incomplete: 'نقص پرونده',
                          completed_dossier: 'تکمیل پرونده',
                          approved: 'تایید شده',
                          active: 'پرداخت شده / فعال',
                          completed: 'تسویه شده'
                       };
                       return (
                          <button
                             key={st}
                             onClick={() => handleUpdateLoanStatus(loan.id, st)}
                             disabled={isSubmitting}
                             className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${isActive ? 'bg-indigo-600 text-white shadow-md' : 'bg-white border border-gray-200 text-gray-700 hover:border-indigo-300 hover:text-indigo-700 hover:bg-indigo-50'} disabled:opacity-50`}
                          >
                             {isActive && <CheckCircle className="w-4 h-4" />}
                             {statusLabels[st as keyof typeof statusLabels]}
                          </button>
                       );
                    })}
                 </div>
              </div>

              <div className="flex flex-col lg:flex-row gap-8">
                 <div className="flex-1">
                    <div className="flex justify-between items-center mb-4">
                       <h4 className="font-black text-gray-800 flex items-center gap-2">
                          <List className="w-5 h-5 text-emerald-500" />
                          گزارش اقساط
                       </h4>
                       <button
                          onClick={() => onPayInstallment(loan.id as string)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm flex items-center gap-2 transition-colors"
                       >
                          <CheckCircle className="w-4 h-4" />
                          ثبت پرداختی قسط
                       </button>
                    </div>
                    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm max-h-[400px] overflow-y-auto">
                       <table className="w-full text-sm text-right relative">
                          <thead className="bg-gray-100 text-gray-600 font-bold border-b border-gray-200 sticky top-0 z-10">
                             <tr>
                                <th className="p-3">ردیف</th>
                                <th className="p-3">سررسید</th>
                                <th className="p-3">مبلغ قسط</th>
                                <th className="p-3">وضعیت</th>
                                <th className="p-3">دیرکرد/جریمه</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                             {loanInsts.map((inst, idx) => {
                                const daysPast = calculateDaysPastDue(inst.dueDate);
                                const penalty = Math.max(0, calculatePenalty(loan, inst) - (inst.penaltyPaidAmount || 0));
                                return (
                                <tr key={inst.id} className="hover:bg-gray-50 transition-colors">
                                   <td className="p-3 font-bold text-gray-600">{idx + 1}</td>
                                   <td className="p-3 font-mono font-medium">{formatDateDisplay(inst.dueDate)}</td>
                                   <td className="p-3 font-black text-gray-900" dir="ltr">{formatCurrency(inst.amount)}</td>
                                   <td className="p-3">
                                      <span className={`px-2 py-1 rounded-lg text-xs font-bold ${inst.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : inst.status === 'overdue' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                                         {inst.status === 'paid' ? 'پرداخت شده' : inst.status === 'overdue' ? 'معوق' : 'سررسید نشده'}
                                      </span>
                                   </td>
                                   <td className="p-3">
                                     {(inst.status === 'pending' || inst.status === 'overdue') && daysPast > 0 ? (
                                        <div className="flex flex-col text-xs">
                                           <span className="text-rose-500 font-bold">{daysPast} روز گذشته</span>
                                           {penalty > 0 && <span className="text-rose-700 font-black">{formatCurrency(penalty)} ریال جریمه باقی‌مانده</span>}
                                        </div>
                                     ) : '-'}
                                   </td>
                                </tr>
                                );
                             })}
                          </tbody>
                       </table>
                    </div>
                 </div>

                 <div className="w-full lg:w-64">
                    <h4 className="font-black text-gray-800 mb-4 flex items-center gap-2">
                       <Settings className="w-5 h-5 text-gray-500" />
                       عملیات
                    </h4>
                    <div className="space-y-3">
                       {loan.status === 'active' && loan.earlySettlementPolicy !== 'none' && (
                          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4">
                             <h5 className="font-bold text-emerald-800 text-sm mb-2">تسویه زودتر از موعد</h5>
                             <div className="space-y-2 text-xs text-emerald-700">
                                <div className="flex justify-between">
                                   <span>باقیمانده + جریمه:</span>
                                   <span className="font-bold">{formatCurrency(calculateEarlySettlement(loan, loanInsts).totalRemaining + calculateEarlySettlement(loan, loanInsts).penaltyTotal)}</span>
                                </div>
                                <div className="flex justify-between text-rose-600">
                                   <span>کسر تخفیف ({loan.earlySettlementDiscountPercent}%):</span>
                                   <span className="font-bold">{formatCurrency(calculateEarlySettlement(loan, loanInsts).discountAmount)}</span>
                                </div>
                                <div className="flex justify-between pt-2 border-t border-emerald-200 font-black text-emerald-900 text-sm">
                                   <span>قابل پرداخت:</span>
                                   <span>{formatCurrency(calculateEarlySettlement(loan, loanInsts).payableAmount)}</span>
                                </div>
                             </div>
                          </div>
                       )}
                       <button
                          onClick={() => setPrintingLoanId(loan.id as string)}
                          className="w-full bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-3 rounded-xl flex items-center gap-3 font-bold transition-colors shadow-sm"
                       >
                          <Printer className="w-5 h-5 text-gray-400" />
                          چاپ دفترچه اقساط
                       </button>
                       {(userRole === 'admin' || userRole === 'manager') && (
                          <button
                             onClick={() => {
                               handleDeleteLoan(loan.id);
                               onClose();
                             }}
                             className="w-full bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 px-4 py-3 rounded-xl flex items-center gap-3 font-bold transition-colors shadow-sm"
                          >
                             <Trash2 className="w-5 h-5 text-rose-400" />
                             حذف کامل وام
                          </button>
                       )}
                    </div>
                 </div>
              </div>

              {historyList.length > 0 && (
                <div className="mt-8 bg-gray-50 rounded-2xl border border-gray-200 p-5">
                   <h5 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-indigo-500" />
                      تاریخچه وضعیت‌های وام
                   </h5>
                   <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-right border-collapse">
                         <thead>
                            <tr className="bg-slate-100 text-slate-500 text-sm">
                               <th className="p-3 font-bold">وضعیت</th>
                               <th className="p-3 font-bold">تاریخ و زمان</th>
                               <th className="p-3 font-bold">کاربر</th>
                               <th className="p-3 font-bold">توضیحات</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-100">
                            {historyList.map((hist, idx) => (
                               <tr key={hist.id || idx} className="bg-white hover:bg-slate-50 transition-colors">
                                  <td className="p-3">
                                     <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${LOAN_STATUS_COLORS[hist.status] || 'bg-gray-100 text-gray-700'}`}>
                                        {LOAN_STATUS_LABELS[hist.status] || hist.status}
                                     </span>
                                  </td>
                                  <td className="p-3 text-sm font-medium text-slate-600 font-mono" dir="ltr">
                                     {new Date(hist.date).toLocaleString('fa-IR')}
                                  </td>
                                  <td className="p-3 text-sm font-medium text-slate-600">
                                     {hist.user || 'سیستم'}
                                  </td>
                                  <td className="p-3 text-sm font-medium text-slate-600">
                                     {hist.desc}
                                  </td>
                               </tr>
                            ))}
                         </tbody>
                      </table>
                   </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
