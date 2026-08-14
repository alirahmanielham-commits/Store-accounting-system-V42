import React, { useState, useMemo } from 'react';
import { Loan, Installment, Person } from '../../types';
import { addCommas, formatDateDisplay } from '../../utils/format';
import { calculateDaysPastDue, calculatePenalty } from '../../utils/penaltyUtils';
import { AlertCircle, Clock, Search, Phone, MessageCircle, CheckCircle, CreditCard } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';

interface LoansArrearsProps {
  formatCurrency?: (val: number) => string;
  loans: Loan[];
  installments: Installment[];
  persons: Person[];
  storeSettings?: any;
}

export default function LoansArrears({ 
  formatCurrency = (val: number) => Number(val).toLocaleString("fa-IR") + " " + (storeSettings?.currency || "تومان"),
  loans, installments, persons, storeSettings
}: LoansArrearsProps) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'overdue'|'all'>('overdue');
  const [dateFilter, setDateFilter] = useState('');
  const today = new Date().toLocaleDateString('fa-IR').replace(/\//g, '-');

  const overdueInstallments = useMemo(() => {
    let overdue = installments
      .filter(i => {
        if (filterType === 'overdue') {
            if (i.status !== 'pending' && i.status !== 'overdue') return false;
            if (calculateDaysPastDue(i.dueDate) <= 0) return false;
        }
        
        const loan = loans.find(l => l.id === i.loanId);
        if (!loan || (loan.status !== 'active' && loan.status !== 'overdue')) return false;
        return true;
      })
      .map(inst => {
        const loan = loans.find(l => l.id === inst.loanId);
        const loanInsts = installments.filter(i => i.loanId === inst.loanId).sort((a,b) => a.dueDate.localeCompare(b.dueDate));
        const installmentNumber = loanInsts.findIndex(i => i.id === inst.id) + 1;
        const person = persons.find(p => p.id === loan?.personId);
        
        // Calculate days overdue
        const daysOverdue = calculateDaysPastDue(inst.dueDate);
        return {
          ...inst,
          loan,
          person,
          daysOverdue: daysOverdue < 0 ? 0 : daysOverdue,
          installmentNumber
        };
      })
      .sort((a, b) => b.daysOverdue - a.daysOverdue);

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      overdue = overdue.filter(i => i.person?.name.toLowerCase().includes(lower) || i.loan?.loanNumber?.toString().includes(lower) || i.loan?.id.toString().includes(lower) || i.installmentCode?.toString().includes(lower) || i.person?.phone?.includes(lower));
    }
    
    if (dateFilter) {
      overdue = overdue.filter(i => i.dueDate === dateFilter);
    }
    
    return overdue;
  }, [installments, loans, persons, today, searchTerm, filterType, dateFilter]);

  const totalOverdueAmount = overdueInstallments.reduce((acc, curr) => acc + (curr.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-rose-100 shadow-sm p-6 flex flex-col md:flex-row gap-6 items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center shrink-0">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-black text-gray-900">مدیریت معوقات</h2>
            <p className="text-sm text-gray-500 mt-1">پیگیری و مدیریت اقساط سررسید گذشته</p>
          </div>
        </div>
        <div className="bg-rose-50 px-6 py-4 rounded-xl border border-rose-100 text-center min-w-[200px]">
           <p className="text-sm text-rose-600 font-bold mb-1">جمع کل معوقات</p>
           <p className="text-2xl font-black text-rose-700 font-mono" dir="ltr">{formatCurrency(totalOverdueAmount)}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50/50">
          <div className="flex gap-2 w-full sm:w-auto"><div className="relative w-full sm:w-96">
            <input
              type="text"
              placeholder="جستجو نام، شماره وام یا کد قسط..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          </div>
          <select 
             value={filterType} 
             onChange={e => setFilterType(e.target.value as 'overdue'|'all')}
             className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20"
          >
             <option value="overdue">فقط معوقات (سررسید گذشته)</option>
             <option value="all">همه اقساط</option>
          </select>
          <input 
             type="date"
             value={dateFilter}
             onChange={e => setDateFilter(e.target.value)}
             className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20"
          />
          {dateFilter && <button onClick={() => setDateFilter('')} className="px-3 py-2 text-rose-600 bg-rose-50 rounded-xl text-sm">حذف تاریخ</button>}
          </div>
          <div className="text-sm text-gray-500 font-medium bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm">
            تعداد: <span className="font-black text-gray-900">{overdueInstallments.length}</span> مورد
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-gray-50 text-gray-500 font-medium">
              <tr>
                <th className="px-6 py-4">وام‌گیرنده</th>
                <th className="px-6 py-4">شماره وام / قسط</th>
                <th className="px-6 py-4">سررسید</th>
                <th className="px-6 py-4">تأخیر (روز)</th>
                <th className="px-6 py-4">مبلغ معوق ({storeSettings?.currency || "تومان"})</th>
                <th className="px-6 py-4">عملیات پیگیری</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {overdueInstallments.map((inst, idx) => (
                <motion.tr 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  key={inst.id} 
                  className="hover:bg-rose-50/30 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900">{inst.person?.name || 'نامشخص'}</div>
                    <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <Phone className="w-3 h-3"/> {inst.person?.phone || 'ندارد'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    <div>وام: <span className="font-mono">{inst.loan?.loanNumber || inst.loan?.id || inst.loanId}</span></div>
                    <div className="text-xs mt-1">قسط شماره: {inst.installmentNumber}</div>
                    <div className="text-xs mt-1 text-gray-400 font-mono">کد: {inst.installmentCode}</div>
                  </td>
                  <td className="px-6 py-4 text-rose-600 font-medium font-mono" dir="ltr">{formatDateDisplay(inst.dueDate)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                      inst.daysOverdue > 30 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {inst.daysOverdue} روز
                    </span>
                  </td>
                  <td className="px-6 py-4 font-black font-mono text-gray-900" dir="ltr">
                    {addCommas(inst.amount)} {storeSettings?.currency || "تومان"}
                    {inst.loan && Math.max(0, calculatePenalty(inst.loan, inst) - (inst.penaltyPaidAmount || 0)) > 0 && (
                       <div className="text-xs text-rose-600 mt-1 block">+ {addCommas(Math.max(0, calculatePenalty(inst.loan, inst) - (inst.penaltyPaidAmount || 0)))} جریمه</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                     <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
                        <MessageCircle className="w-3.5 h-3.5" />
                        ثبت پیگیری
                     </button>
                     <button 
                        onClick={() => navigate(`/loans_payment?code=${inst.installmentCode}`)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors">
                        <CreditCard className="w-3.5 h-3.5" />
                        پرداخت قسط
                     </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
              {overdueInstallments.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <CheckCircle className="w-12 h-12 text-emerald-200 mx-auto mb-3" />
                    موردی یافت نشد.
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
