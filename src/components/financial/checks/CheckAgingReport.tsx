import React, { useMemo } from 'react';
import { AlertTriangle, Clock, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { IssuedCheck, ReceivedCheck } from '../../../types';

interface CheckAgingReportProps {
  issuedChecks: IssuedCheck[];
  receivedChecks: ReceivedCheck[];
  storeSettings?: any;
}

export function CheckAgingReport({ issuedChecks, receivedChecks, storeSettings }: CheckAgingReportProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const calculateBuckets = (checks: any[], isIssued: boolean) => {
    const buckets = {
      notDue: { count: 0, amount: 0 },
      days1To7: { count: 0, amount: 0 },
      days8To30: { count: 0, amount: 0 },
      over30: { count: 0, amount: 0 }
    };

    checks.forEach(c => {
      // Only consider pending checks
      if (isIssued && c.status !== 'issued') return;
      if (!isIssued && !['received', 'deposited'].includes(c.status)) return;
      
      if (!c.dueDate) return;
      const dueDate = new Date(c.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      const amount = Number(c.amount || 0);

      const diffTime = today.getTime() - dueDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 0) {
        buckets.notDue.count++;
        buckets.notDue.amount += amount;
      } else if (diffDays <= 7) {
        buckets.days1To7.count++;
        buckets.days1To7.amount += amount;
      } else if (diffDays <= 30) {
        buckets.days8To30.count++;
        buckets.days8To30.amount += amount;
      } else {
        buckets.over30.count++;
        buckets.over30.amount += amount;
      }
    });

    return buckets;
  };

  const issuedBuckets = useMemo(() => calculateBuckets(issuedChecks, true), [issuedChecks]);
  const receivedBuckets = useMemo(() => calculateBuckets(receivedChecks, false), [receivedChecks]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('fa-IR').format(val);
  const formatNumber = (val: number) => new Intl.NumberFormat('fa-IR').format(val);

  const renderTable = (buckets: any, title: string, isIssued: boolean) => {
    const totalAmount = buckets.notDue.amount + buckets.days1To7.amount + buckets.days8To30.amount + buckets.over30.amount;
    const totalCount = buckets.notDue.count + buckets.days1To7.count + buckets.days8To30.count + buckets.over30.count;

    return (
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
        <div className={`px-5 py-4 border-b flex items-center gap-3 ${isIssued ? 'bg-orange-50/50 border-orange-100' : 'bg-emerald-50/50 border-emerald-100'}`}>
          {isIssued ? (
             <ArrowUpRight className="w-5 h-5 text-orange-600" />
          ) : (
             <ArrowDownLeft className="w-5 h-5 text-emerald-600" />
          )}
          <div>
             <h3 className="font-bold text-gray-800 text-sm">{title}</h3>
             <p className="text-xs text-gray-500 mt-0.5 font-medium">گزارش سنی (Aging) بر اساس تاریخ سررسید</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-100">
              <tr>
                <th className="px-4 py-3">بازه زمانی</th>
                <th className="px-4 py-3">تعداد فقره</th>
                <th className="px-4 py-3">مجموع مبلغ ({storeSettings?.currency || 'تومان'})</th>
                <th className="px-4 py-3">% از کل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                  سررسید نشده (آینده)
                </td>
                <td className="px-4 py-3 font-mono">{formatNumber(buckets.notDue.count)}</td>
                <td className="px-4 py-3 font-bold">{formatCurrency(buckets.notDue.amount)}</td>
                <td className="px-4 py-3 text-gray-500" dir="ltr">{totalAmount ? ((buckets.notDue.amount / totalAmount) * 100).toFixed(1) : 0}%</td>
              </tr>
              <tr className="hover:bg-rose-50/50 transition-colors bg-rose-50/20 text-rose-900">
                <td className="px-4 py-3 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
                  ۱ تا ۷ روز گذشته (ریسک پایین)
                </td>
                <td className="px-4 py-3 font-mono">{formatNumber(buckets.days1To7.count)}</td>
                <td className="px-4 py-3 font-bold">{formatCurrency(buckets.days1To7.amount)}</td>
                <td className="px-4 py-3 text-rose-700 opacity-80" dir="ltr">{totalAmount ? ((buckets.days1To7.amount / totalAmount) * 100).toFixed(1) : 0}%</td>
              </tr>
              <tr className="hover:bg-rose-50/50 transition-colors bg-rose-50/50 text-rose-900">
                <td className="px-4 py-3 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                  ۸ تا ۳۰ روز گذشته (ریسک متوسط)
                </td>
                <td className="px-4 py-3 font-mono">{formatNumber(buckets.days8To30.count)}</td>
                <td className="px-4 py-3 font-bold">{formatCurrency(buckets.days8To30.amount)}</td>
                <td className="px-4 py-3 text-rose-700 opacity-80" dir="ltr">{totalAmount ? ((buckets.days8To30.amount / totalAmount) * 100).toFixed(1) : 0}%</td>
              </tr>
              <tr className="hover:bg-rose-100/50 transition-colors bg-rose-100/40 text-rose-900 font-bold">
                <td className="px-4 py-3 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse"></span>
                  بیش از ۳۰ روز گذشته (ریسک بالا)
                </td>
                <td className="px-4 py-3 font-mono">{formatNumber(buckets.over30.count)}</td>
                <td className="px-4 py-3 text-rose-700">{formatCurrency(buckets.over30.amount)}</td>
                <td className="px-4 py-3 text-rose-700 opacity-80" dir="ltr">{totalAmount ? ((buckets.over30.amount / totalAmount) * 100).toFixed(1) : 0}%</td>
              </tr>
            </tbody>
            <tfoot className="bg-gray-100 font-bold text-gray-800">
              <tr>
                <td className="px-4 py-3">جمع کل در جریان</td>
                <td className="px-4 py-3 font-mono">{formatNumber(totalCount)}</td>
                <td className="px-4 py-3">{formatCurrency(totalAmount)}</td>
                <td className="px-4 py-3 text-gray-500" dir="ltr">100%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      {renderTable(receivedBuckets, 'ریسک چک‌های دریافتی وصول‌نشده', false)}
      {renderTable(issuedBuckets, 'ریسک چک‌های پرداختی معوق', true)}
    </div>
  );
}
