import React, { useMemo } from 'react';
import { Loan, Installment, Person } from '../../types';
import { addCommas, formatDateDisplay } from '../../utils/format';
import { calculateDaysPastDue } from '../../utils/penaltyUtils';
import { Activity, AlertCircle, Calendar, CheckCircle, TrendingUp, Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface LoansDashboardProps {
  formatCurrency?: (val: number) => string;
  loans: Loan[];
  installments: Installment[];
  persons: Person[];
  storeSettings?: any;
}

export default function LoansDashboard({ 
  formatCurrency = (val: number) => Number(val).toLocaleString("fa-IR") + " " + (storeSettings?.currency || "تومان"),
  loans, installments, persons, storeSettings
}: LoansDashboardProps) {
  const today = new Date().toLocaleDateString('fa-IR').replace(/\//g, '-');
  const todayDate = new Date();
  todayDate.setHours(0,0,0,0);
  const nextMonthDate = new Date(todayDate);
  nextMonthDate.setDate(nextMonthDate.getDate() + 30); // Approx 30 days for upcoming

  const kpis = useMemo(() => {
    let activeLoans = 0;
    let totalOutstanding = 0;
    let totalArrears = 0;
    let overdueCount = 0;
    let upcomingCount = 0;
    let totalPaid = 0;

    loans.forEach(loan => {
      if (loan.status === 'active' || loan.status === 'overdue') activeLoans++;
    });

    installments.forEach(inst => {
      const loan = loans.find(l => l.id.toString() === inst.loanId.toString());
      if (!loan || (loan.status !== 'active' && loan.status !== 'overdue' && loan.status !== 'completed')) return;
      
      const dueD = new Date(inst.dueDate);
      
      if (inst.status === 'pending' || inst.status === 'overdue') {
        totalOutstanding += (inst.amount || 0);
        if (dueD < todayDate) {
          totalArrears += (inst.amount || 0);
          overdueCount++;
        } else if (dueD >= todayDate && dueD <= nextMonthDate) {
           upcomingCount++;
        }
      } else if (inst.status === 'paid') {
        totalPaid += (inst.paidAmount || inst.amount || 0);
      }
    });

    return { activeLoans, totalOutstanding, totalArrears, overdueCount, upcomingCount, totalPaid };
  }, [loans, installments, todayDate, nextMonthDate]);

  // Chart data: Group installments by month
  const chartData = useMemo(() => {
    const dataMap: Record<string, { month: string, expected: number, received: number }> = {};
    
    installments.forEach(inst => {
      const loan = loans.find(l => l.id.toString() === inst.loanId.toString());
      if (!loan || (loan.status !== 'active' && loan.status !== 'overdue' && loan.status !== 'completed')) return;
      // Extract YYYY-MM
      const month = inst.dueDate.substring(0, 7);
      if (!dataMap[month]) {
        dataMap[month] = { month, expected: 0, received: 0 };
      }
      
      dataMap[month].expected += (inst.amount || 0);
      if (inst.status === 'paid') {
        dataMap[month].received += (inst.paidAmount || inst.amount || 0);
      }
    });

    // Sort by month
    return Object.values(dataMap).sort((a, b) => a.month.localeCompare(b.month)).slice(-6); // Last 6 months
  }, [installments]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
           <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
             <Activity className="w-6 h-6" />
           </div>
           <div>
             <p className="text-sm text-gray-500 font-medium">وام‌های فعال</p>
             <p className="text-2xl font-black text-gray-900 mt-1">{kpis.activeLoans}</p>
           </div>
        </div>
        
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
           <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
             <TrendingUp className="w-6 h-6" />
           </div>
           <div>
             <p className="text-sm text-gray-500 font-medium">مانده مطالبات ({storeSettings?.currency || "تومان"})</p>
             <p className="text-xl font-black text-gray-900 mt-1 font-mono">{addCommas(kpis.totalOutstanding)}</p>
           </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-red-100 shadow-sm flex items-center gap-4">
           <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center shrink-0">
             <AlertCircle className="w-6 h-6" />
           </div>
           <div>
             <p className="text-sm text-red-500 font-medium">مجموع معوقات ({storeSettings?.currency || "تومان"})</p>
             <p className="text-xl font-black text-red-700 mt-1 font-mono">{addCommas(kpis.totalArrears)}</p>
             <p className="text-xs text-red-500 mt-1">{kpis.overdueCount} قسط معوق</p>
           </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-sm flex items-center gap-4">
           <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
             <Calendar className="w-6 h-6" />
           </div>
           <div>
             <p className="text-sm text-amber-600 font-medium">سررسید ماه جاری</p>
             <p className="text-2xl font-black text-amber-700 mt-1">{kpis.upcomingCount}</p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-lg font-black text-gray-800 mb-6 flex items-center gap-2">
             <TrendingUp className="w-5 h-5 text-indigo-500" />
             روند پرداخت و وصول اقساط
          </h3>
          <div className="h-80 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} width={80} tickFormatter={(value) => addCommas(value)} />
                <Tooltip 
                   formatter={(value: number) => [formatCurrency(value), '']}
                   contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                />
                <Legend iconType="circle" />
                <Bar dataKey="expected" name="پیش‌بینی وصول" fill="#93C5FD" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="received" name="وصول شده" fill="#34D399" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 overflow-hidden flex flex-col">
          <h3 className="text-lg font-black text-gray-800 mb-6 flex items-center gap-2">
             <AlertCircle className="w-5 h-5 text-rose-500" />
             اقساط نیازمند پیگیری
          </h3>
          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
             {installments.filter(i => {
                if (i.status !== 'pending' && i.status !== 'overdue') return false;
                if (calculateDaysPastDue(i.dueDate) <= 0) return false;
                const loan = loans.find(l => l.id.toString() === i.loanId.toString());
                if (!loan || (loan.status !== 'active' && loan.status !== 'overdue' && loan.status !== 'completed')) return false;
                return true;
             }).sort((a,b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 10).map(inst => {
                const loan = loans.find(l => l.id === inst.loanId);
                const person = persons.find(p => p.id === loan?.personId);
                return (
                  <div key={inst.id} className="p-3 bg-rose-50/50 rounded-xl border border-rose-100 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-gray-800 text-sm">{person?.name || 'نامشخص'}</p>
                      <p className="text-xs text-rose-600 mt-1">سررسید: {inst.dueDate}</p>
                    </div>
                    <div className="text-left">
                      <p className="font-mono font-bold text-gray-900 text-sm" dir="ltr">{addCommas(inst.amount)}</p>
                      <p className="text-[10px] text-gray-500 mt-1">{storeSettings?.currency || "تومان"}</p>
                    </div>
                  </div>
                )
             })}
             {kpis.overdueCount === 0 && (
               <div className="text-center py-12">
                 <CheckCircle className="w-12 h-12 text-emerald-200 mx-auto mb-3" />
                 <p className="text-gray-500 font-medium">هیچ قسط معوقی وجود ندارد</p>
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}
