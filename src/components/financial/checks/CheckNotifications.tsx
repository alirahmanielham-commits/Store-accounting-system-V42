import React, { useMemo } from 'react';
import { AlertCircle, Calendar } from 'lucide-react';
import { getDaysRemaining, toPersianDigits } from './utils';

export function CheckNotifications({ issuedChecks, receivedChecks, formatCurrency, storeSettings }: any) {
  const notifications = useMemo(() => {
    const alerts: any[] = [];
    
    // Checks due in <= 3 days (not cashed/bounced)
    issuedChecks.forEach(c => {
      if (['issued'].includes(c.status)) {
        const days = getDaysRemaining(c.dueDate);
        if (days >= 0 && days <= 3) {
          alerts.push({
            id: `issued-${c.id}`,
            type: 'warning',
            title: 'سررسید چک پرداختی',
            message: `چک شماره ${c.checkNumber} به مبلغ ${formatCurrency(c.amount)} ${storeSettings?.currency || 'تومان'} ${days === 0 ? 'امروز' : `${days} روز دیگر`} سررسید می‌شود.`,
            days
          });
        }
      }
    });

    receivedChecks.forEach(c => {
      if (['received', 'deposited', 'assigned'].includes(c.status)) {
        const days = getDaysRemaining(c.dueDate);
        if (days >= 0 && days <= 3) {
          alerts.push({
            id: `received-${c.id}`,
            type: 'info',
            title: 'سررسید چک دریافتی',
            message: `چک شماره ${c.checkNumber} به مبلغ ${formatCurrency(c.amount)} ${storeSettings?.currency || 'تومان'} ${days === 0 ? 'امروز' : `${days} روز دیگر`} سررسید می‌شود.`,
            days
          });
        }
      }
    });

    // Sort: 0 days first
    return alerts.sort((a, b) => a.days - b.days);
  }, [issuedChecks, receivedChecks]);

  if (notifications.length === 0) return null;

  return (
    <div className="mb-6 space-y-3">
      {notifications.map(note => (
        <div key={note.id} className={`flex items-start gap-3 p-4 rounded-xl border ${note.type === 'warning' ? 'bg-orange-50 border-orange-200 text-orange-800' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
          {note.type === 'warning' ? (
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-orange-600" />
          ) : (
            <Calendar className="w-5 h-5 flex-shrink-0 mt-0.5 text-blue-600" />
          )}
          <div>
            <h4 className="font-bold text-sm">{note.title}</h4>
            <p className="text-xs mt-1 font-medium">{note.message}</p>
          </div>
        </div>
      ))}
    </div>
  );
}