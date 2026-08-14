import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Check, X, AlertTriangle, Send, ArrowDownLeft, Trash2 } from 'lucide-react';
import { formatDateDisplay } from '../../../utils/format';

export function PendingCheckApprovals({
  issuedChecks, receivedChecks, persons, accounts, checkbooks, showNotification, userRole, currentUserId, onCheckUpdated, storeSettings
}: any) {
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const pendingIssued = issuedChecks.filter((c: any) => c.approvalStatus === 'pending_approval');
  const pendingReceived = receivedChecks.filter((c: any) => c.approvalStatus === 'pending_approval');
  
  const allPending = [
    ...pendingIssued.map((c: any) => ({ ...c, _type: 'issued' })),
    ...pendingReceived.map((c: any) => ({ ...c, _type: 'received' }))
  ].sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  const handleAction = async (check: any, action: 'approve' | 'reject') => {
    try {
      setApprovingId(check.id);
      const res = await fetch(`/api/data/checks/${check._type}/${check.id}/${action}`, {
        method: 'POST',
        headers: {
           'Authorization': 'Bearer ' + (localStorage.getItem('access_token') || ''),
           'x-store-id': localStorage.getItem('activeStoreId') || 'default'
        }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'خطا در عملیات');
      }
      showNotification(data.message, 'success');
      if (onCheckUpdated) onCheckUpdated();
    } catch (e: any) {
      showNotification(e.message, 'error');
    } finally {
      setApprovingId(null);
    }
  };

  const getPayeeName = (id: string) => {
    if (!id) return '-';
    return persons.find((p: any) => String(p.id) === String(id))?.name || 'نامشخص';
  };

  const getAccountName = (id: string) => {
    if (!id) return '-';
    return accounts.find((a: any) => String(a.id) === String(id))?.bankName || 'نامشخص';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
         <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            چک‌های در انتظار تأیید
         </h2>
         <div className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold">
            {allPending.length} مورد
         </div>
      </div>
      
      {userRole !== 'admin' && userRole !== 'manager' && userRole !== 'financial_manager' && (
         <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl mb-6 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
            <p className="text-sm font-medium">شما دسترسی لازم برای تأیید یا رد چک‌ها را ندارید. فقط مدیر سیستم یا مدیر مالی می‌تواند چک‌ها را تأیید کند.</p>
         </div>
      )}

      {allPending.length === 0 ? (
        <div className="text-center py-12">
           <ShieldCheck className="w-12 h-12 text-gray-200 mx-auto mb-3" />
           <p className="text-gray-500 font-medium">هیچ چکی در انتظار تأیید نیست.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="pb-3 text-xs font-black text-gray-500 w-12">نوع</th>
                <th className="pb-3 text-xs font-black text-gray-500">شماره چک</th>
                <th className="pb-3 text-xs font-black text-gray-500">طرف حساب</th>
                <th className="pb-3 text-xs font-black text-gray-500">مبلغ</th>
                <th className="pb-3 text-xs font-black text-gray-500">تاریخ سررسید</th>
                <th className="pb-3 text-xs font-black text-gray-500">ثبت‌کننده</th>
                <th className="pb-3 text-xs font-black text-gray-500 w-32">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {allPending.map(check => (
                <tr key={check.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="py-3">
                    {check._type === 'issued' ? (
                       <span className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center" title="چک پرداختی">
                          <Send className="w-4 h-4" />
                       </span>
                    ) : (
                       <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center" title="چک دریافتی">
                          <ArrowDownLeft className="w-4 h-4" />
                       </span>
                    )}
                  </td>
                  <td className="py-3 font-bold text-gray-800 text-sm">
                    {check.checkNumber}
                    <div className="text-[10px] text-gray-400 font-normal mt-0.5 font-sans tracking-widest">{check.sayadId}</div>
                  </td>
                  <td className="py-3 text-sm text-gray-700 font-medium">
                    {check._type === 'issued' ? getPayeeName(check.payeeId) : getPayeeName(check.payerId)}
                    <div className="text-[10px] text-gray-500 font-normal mt-0.5">
                       {check._type === 'issued' ? (
                          check.checkbookId ? 'از دسته‌چک ثبت شده' : 'بدون دسته‌چک'
                       ) : (
                          check.bankName ? `بانک ${check.bankName}` : 'نامشخص'
                       )}
                    </div>
                  </td>
                  <td className="py-3">
                    <span className="font-black text-gray-900 font-sans text-sm">
                      {Number(check.amount).toLocaleString()}
                    </span>
                    <span className="text-[10px] text-gray-400 mr-1">{storeSettings?.currency || 'تومان'}</span>
                  </td>
                  <td className="py-3 text-sm text-gray-600">
                    <span className="font-sans" dir="ltr">{formatDateDisplay(check.dueDate)}</span>
                  </td>
                  <td className="py-3 text-sm text-gray-600">
                     <span className="bg-gray-100 px-2 py-1 rounded-md text-xs">{check.creatorId || 'نامشخص'}</span>
                     {check.creatorId === currentUserId && (
                        <div className="text-[10px] text-rose-500 mt-1">ثبت شده توسط شما</div>
                     )}
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                       <button
                         onClick={() => handleAction(check, 'approve')}
                         disabled={approvingId === check.id || check.creatorId === currentUserId || (userRole !== 'admin' && userRole !== 'manager' && userRole !== 'financial_manager')}
                         className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white p-1.5 rounded-lg flex items-center justify-center transition-colors shadow-sm"
                         title="تأیید چک"
                       >
                         <Check className="w-4 h-4" />
                       </button>
                       <button
                         onClick={() => handleAction(check, 'reject')}
                         disabled={approvingId === check.id || check.creatorId === currentUserId || (userRole !== 'admin' && userRole !== 'manager' && userRole !== 'financial_manager')}
                         className="flex-1 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white p-1.5 rounded-lg flex items-center justify-center transition-colors shadow-sm"
                         title="رد چک"
                       >
                         <X className="w-4 h-4" />
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
