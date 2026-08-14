import React, { useMemo } from 'react';
import { ShieldCheck, ArrowDownLeft, ArrowUpRight, TrendingDown } from 'lucide-react';

interface PersonCheckHistoryProps {
  personId: string | number;
  issuedChecks: any[];
  receivedChecks: any[];
}

export function PersonCheckHistory({ personId, issuedChecks = [], receivedChecks = [] }: PersonCheckHistoryProps) {
  
  const history = useMemo(() => {
    const personIssued = issuedChecks.filter(c => c.payeeId?.toString() === personId?.toString());
    const personReceived = receivedChecks.filter(c => c.payerId?.toString() === personId?.toString());

    let bouncedCount = 0;
    let totalClosedCount = 0;
    
    const allChecks = [
      ...personIssued.map(c => ({ ...c, _type: 'issued' })),
      ...personReceived.map(c => ({ ...c, _type: 'received' }))
    ].sort((a, b) => new Date(b.dueDate || 0).getTime() - new Date(a.dueDate || 0).getTime());

    allChecks.forEach(c => {
       if (['cashed', 'bounced', 'bounced_assigned', 'returned'].includes(c.status)) {
           totalClosedCount++;
           if (['bounced', 'bounced_assigned'].includes(c.status)) {
               bouncedCount++;
           }
       }
    });

    const bounceRateStr = totalClosedCount > 0 ? ((bouncedCount / totalClosedCount) * 100).toFixed(1) : 0;
    const bounceRate = Number(bounceRateStr);
    
    // Determine risk level based on bounce rate
    let riskLevel = { label: 'بدون ریسک (عالی)', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' };
    if (totalClosedCount > 0) {
        if (bounceRate > 20) {
            riskLevel = { label: 'ریسک بالا', color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200' };
        } else if (bounceRate > 0) {
            riskLevel = { label: 'ریسک متوسط', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' };
        }
    } else if (allChecks.length > 0) {
        riskLevel = { label: 'در حال ارزیابی', color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' };
    } else {
        riskLevel = { label: 'بدون سابقه چک', color: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-200' };
    }

    return { allChecks, bounceRate, totalClosedCount, bouncedCount, riskLevel };
  }, [personId, issuedChecks, receivedChecks]);

  if (history.allChecks.length === 0) {
      return null;
  }

  const formatCurrency = (val: number) => new Intl.NumberFormat('fa-IR').format(val);

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm md:col-span-3">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-indigo-600" />
          سابقه و اعتبار چک‌های شخص
        </h3>
        
        <div className={`flex items-center gap-3 px-4 py-2 rounded-xl border ${history.riskLevel.bg} ${history.riskLevel.border}`}>
           <div className="text-right">
              <p className={`text-xs font-bold ${history.riskLevel.color}`}>{history.riskLevel.label}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">نرخ برگشت: {history.bounceRate}٪ ({history.bouncedCount} از {history.totalClosedCount} چک)</p>
           </div>
           <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-white shadow-sm font-black text-sm ${history.riskLevel.color}`}>
             {history.bounceRate}%
           </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-right text-sm">
          <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
            <tr>
              <th className="px-4 py-3">نوع چک</th>
              <th className="px-4 py-3">شماره / بانک</th>
              <th className="px-4 py-3">تاریخ سررسید</th>
              <th className="px-4 py-3">مبلغ (تومان)</th>
              <th className="px-4 py-3">وضعیت فعلی</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {history.allChecks.map(c => (
              <tr key={c.id + c._type} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-4 py-3">
                   {c._type === 'received' ? (
                       <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg w-fit">
                         <ArrowDownLeft className="w-3 h-3" /> دریافتی
                       </span>
                   ) : (
                       <span className="flex items-center gap-1.5 text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-lg w-fit">
                         <ArrowUpRight className="w-3 h-3" /> پرداختی
                       </span>
                   )}
                </td>
                <td className="px-4 py-3">
                   <div className="font-mono font-bold text-slate-800">{c.checkNumber}</div>
                   <div className="text-[10px] text-slate-500">{c.bankName || 'نامشخص'}</div>
                </td>
                <td className="px-4 py-3 font-mono text-slate-600">{c.dueDate}</td>
                <td className="px-4 py-3 font-bold text-slate-800">{formatCurrency(Number(c.amount))}</td>
                <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-1 rounded-md font-bold ${
                      c.status === 'cashed' ? 'bg-emerald-100 text-emerald-700' : 
                      c.status === 'bounced' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700' 
                    }`}>
                        {c.status === 'cashed' ? (c._type === 'received' ? 'وصول شده' : 'پاس شده') : 
                         c.status === 'bounced' ? 'برگشتی' : 
                         c.status === 'returned' ? 'عودت داده شده' : 
                         c.status === 'assigned' ? 'واگذار شده' : 
                         c.status === 'deposited' ? 'خوابانده به حساب' : 
                         'در جریان'}
                    </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
