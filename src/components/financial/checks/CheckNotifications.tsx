import React, { useMemo, useState } from 'react';
import { AlertTriangle, Calendar, Bell, ChevronDown, ChevronUp, ArrowLeft, Clock } from 'lucide-react';
import { getDaysRemaining, toPersianDigits } from './utils';

interface Props {
  issuedChecks?: any[];
  receivedChecks?: any[];
  formatCurrency?: (val: any) => string;
  storeSettings?: any;
  onNavigateToReminders?: (filter?: string) => void;
}

export function CheckNotifications({
  issuedChecks = [],
  receivedChecks = [],
  formatCurrency = (v) => Number(v).toLocaleString(),
  storeSettings,
  onNavigateToReminders
}: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const currencyUnit = storeSettings?.currency || 'تومان';

  const { overdueAlerts, upcomingAlerts } = useMemo(() => {
    const overdue: any[] = [];
    const upcoming: any[] = [];

    // Helper: is active?
    const isSettled = (status: string) => {
      return ['cashed', 'cancelled', 'returned'].includes((status || '').toLowerCase());
    };

    issuedChecks.forEach(c => {
      if (isSettled(c.status) || !c.dueDate) return;
      const days = getDaysRemaining(c.dueDate);
      if (days < 0) {
        overdue.push({
          id: `issued-overdue-${c.id}`,
          type: 'issued',
          title: 'چک پرداختی معوق (پاس‌نشده)',
          checkNumber: c.checkNumber,
          amount: c.amount,
          days: Math.abs(days),
          dueDate: c.dueDate
        });
      } else if (days <= 3) {
        upcoming.push({
          id: `issued-upcoming-${c.id}`,
          type: 'issued',
          title: days === 0 ? 'سررسید امروز (پرداختی)' : `سررسید ${days} روز دیگر (پرداختی)`,
          checkNumber: c.checkNumber,
          amount: c.amount,
          days,
          dueDate: c.dueDate
        });
      }
    });

    receivedChecks.forEach(c => {
      if (isSettled(c.status) || !c.dueDate) return;
      const days = getDaysRemaining(c.dueDate);
      if (days < 0) {
        overdue.push({
          id: `received-overdue-${c.id}`,
          type: 'received',
          title: 'چک دریافتی معوق (وصول‌نشده)',
          checkNumber: c.checkNumber,
          amount: c.amount,
          days: Math.abs(days),
          dueDate: c.dueDate
        });
      } else if (days <= 3) {
        upcoming.push({
          id: `received-upcoming-${c.id}`,
          type: 'received',
          title: days === 0 ? 'سررسید امروز (دریافتی)' : `سررسید ${days} روز دیگر (دریافتی)`,
          checkNumber: c.checkNumber,
          amount: c.amount,
          days,
          dueDate: c.dueDate
        });
      }
    });

    return {
      overdueAlerts: overdue.sort((a, b) => b.days - a.days),
      upcomingAlerts: upcoming.sort((a, b) => a.days - b.days)
    };
  }, [issuedChecks, receivedChecks]);

  const totalCount = overdueAlerts.length + upcomingAlerts.length;
  if (totalCount === 0) return null;

  return (
    <div className="mb-6 space-y-2 text-right" dir="rtl">
      {/* Alert Header Box */}
      <div className={`p-4 rounded-2xl border transition-all ${
        overdueAlerts.length > 0
          ? 'bg-rose-50/90 border-rose-200 text-rose-900 shadow-xs'
          : 'bg-amber-50/90 border-amber-200 text-amber-900 shadow-xs'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl shrink-0 ${
              overdueAlerts.length > 0 ? 'bg-rose-200/80 text-rose-700' : 'bg-amber-200/80 text-amber-700'
            }`}>
              {overdueAlerts.length > 0 ? (
                <AlertTriangle className="w-5 h-5 animate-pulse" />
              ) : (
                <Bell className="w-5 h-5" />
              )}
            </div>
            <div>
              <h4 className="font-black text-sm flex items-center gap-2 flex-wrap">
                <span>یادآوری خودکار سررسید چک‌ها</span>
                {overdueAlerts.length > 0 && (
                  <span className="bg-rose-600 text-white text-[10px] px-2 py-0.5 rounded-full font-black animate-pulse">
                    {toPersianDigits(overdueAlerts.length)} چک معوق و پاس‌نشده!
                  </span>
                )}
                {upcomingAlerts.length > 0 && (
                  <span className="bg-amber-200 text-amber-900 text-[10px] px-2 py-0.5 rounded-full font-bold">
                    {toPersianDigits(upcomingAlerts.length)} در شرف سررسید (تا ۳ روز)
                  </span>
                )}
              </h4>
              <p className="text-xs mt-0.5 opacity-90 font-medium">
                {overdueAlerts.length > 0
                  ? `تعداد ${toPersianDigits(overdueAlerts.length)} فقره چک از موعد سررسید گذشته و هنوز تسویه نشده است.`
                  : `تعداد ${toPersianDigits(upcomingAlerts.length)} فقره برگه چک در ۳ روز آینده دارای سررسید می‌باشند.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            {onNavigateToReminders && (
              <button
                type="button"
                onClick={() => onNavigateToReminders(overdueAlerts.length > 0 ? 'overdue' : 'next_3_days')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-3xs cursor-pointer ${
                  overdueAlerts.length > 0
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : 'bg-amber-600 hover:bg-amber-700 text-white'
                }`}
              >
                <span>مدیریت و پیگیری در پنل یادآور</span>
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded-xl hover:bg-black/5 text-slate-600 transition-colors"
              title={isExpanded ? 'بستن ریز چک‌ها' : 'مشاهده خلاصه چک‌ها'}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Expanded list */}
        {isExpanded && (
          <div className="mt-4 pt-3 border-t border-black/10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {[...overdueAlerts, ...upcomingAlerts].map((alert) => (
              <div
                key={alert.id}
                className="bg-white/90 p-2.5 rounded-xl border border-black/5 flex items-center justify-between text-xs"
              >
                <div>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    alert.type === 'received' ? 'bg-teal-50 text-teal-700' : 'bg-rose-50 text-rose-700'
                  }`}>
                    {alert.type === 'received' ? 'دریافتی' : 'پرداختی'}
                  </span>
                  <span className="font-bold text-slate-800 mr-1.5">
                    شماره: {toPersianDigits(alert.checkNumber)}
                  </span>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                    سررسید: {toPersianDigits(alert.dueDate)}
                  </div>
                </div>

                <div className="text-left font-bold text-slate-900">
                  <div>{formatCurrency(alert.amount)} {currencyUnit}</div>
                  <div className="text-[10px] text-rose-600 font-bold">
                    {alert.title}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
export default CheckNotifications;
