import React from 'react';
import { toPersianDigits } from '../financial/checks/utils';

export function BankTransferPrintTemplate({ checks, storeSettings, account }: any) {
  if (!checks || checks.length === 0) return null;
  const totalAmount = checks.reduce((sum: number, c: any) => sum + Number(c.amount), 0);

  return (
    <div className="bg-white p-8 font-sans border-2 border-slate-800 rounded-xl max-w-4xl mx-auto" dir="rtl">
      <div className="flex justify-between items-start mb-8 border-b-2 border-slate-800 pb-4">
        <div className="text-center w-1/3 text-left">
          <p className="text-sm font-bold text-slate-700">شماره: .......................</p>
          <p className="text-sm font-bold text-slate-700 mt-2">تاریخ: {new Date().toLocaleDateString('fa-IR')}</p>
          <p className="text-sm font-bold text-slate-700 mt-2">پیوست: دارد</p>
        </div>
        <div className="text-center w-1/3">
          <h1 className="text-2xl font-black text-slate-900">{storeSettings?.storeName || 'شرکت / فروشگاه'}</h1>
          <p className="text-lg font-bold text-slate-800 mt-2">فرم واگذاری اسناد تجاری (چک) به بانک</p>
        </div>
        <div className="text-center w-1/3 text-right">
          <p className="text-sm font-bold text-slate-700">به: بانک {account?.bankName || '.......................'}</p>
          <p className="text-sm font-bold text-slate-700 mt-2">شعبه: {account?.branchName || '.......................'}</p>
          <p className="text-sm font-bold text-slate-700 mt-2">کد شعبه: .......................</p>
        </div>
      </div>

      <div className="mb-6">
        <p className="text-base font-bold text-slate-800 mb-2">ریاست محترم شعبه،</p>
        <p className="text-base text-slate-800 leading-relaxed text-justify">
          احتراماً، به پیوست تعداد {toPersianDigits(checks.length)} فقره چک به شرح جدول ذیل جهت واگذاری و وصول به حساب شماره <span className="font-black border-b border-dashed border-slate-400 px-2">{account?.accountNumber || '.......................'}</span> به نام <span className="font-black border-b border-dashed border-slate-400 px-2">{account?.accountHolder || storeSettings?.storeName || '.......................'}</span> ایفاد می‌گردد. خواهشمند است دستور فرمایید اقدامات مقتضی جهت وصول و واریز مبالغ مربوطه به حساب اینجانب/شرکت مبذول گردد.
        </p>
      </div>

      <table className="w-full mb-8 border-collapse border border-slate-800">
        <thead>
          <tr className="bg-slate-100">
            <th className="border border-slate-800 p-2 text-sm font-bold w-12">ردیف</th>
            <th className="border border-slate-800 p-2 text-sm font-bold">شماره چک</th>
            <th className="border border-slate-800 p-2 text-sm font-bold">مبلغ (ریال)</th>
            <th className="border border-slate-800 p-2 text-sm font-bold">تاریخ سررسید</th>
            <th className="border border-slate-800 p-2 text-sm font-bold">عهده بانک</th>
            <th className="border border-slate-800 p-2 text-sm font-bold">توضیحات</th>
          </tr>
        </thead>
        <tbody>
          {checks.map((check: any, idx: number) => (
            <tr key={check.id}>
              <td className="border border-slate-800 p-2 text-center text-sm font-medium">{toPersianDigits(idx + 1)}</td>
              <td className="border border-slate-800 p-2 text-center font-mono font-bold text-sm">{toPersianDigits(check.checkNumber)}</td>
              <td className="border border-slate-800 p-2 text-center font-bold text-sm">{toPersianDigits(Number(check.amount).toLocaleString())}</td>
              <td className="border border-slate-800 p-2 text-center text-sm font-bold">{check.dueDate}</td>
              <td className="border border-slate-800 p-2 text-center text-sm">{check.bankName || '-'}</td>
              <td className="border border-slate-800 p-2 text-sm">{check.description || '-'}</td>
            </tr>
          ))}
          <tr className="bg-slate-50 font-black">
            <td colSpan={2} className="border border-slate-800 p-2 text-left">جمع کل:</td>
            <td className="border border-slate-800 p-2 text-center">{toPersianDigits(totalAmount.toLocaleString())}</td>
            <td colSpan={3} className="border border-slate-800 p-2 text-sm text-slate-500 font-normal">({checks.length} فقره چک)</td>
          </tr>
        </tbody>
      </table>

      <div className="flex justify-between items-end mt-12 pt-16">
        <div className="text-center w-1/2">
          <p className="font-bold text-slate-800">مهر و امضای بانک (تحویل گیرنده)</p>
        </div>
        <div className="text-center w-1/2">
          <p className="font-bold text-slate-800">مهر و امضای واگذارکننده (امور مالی)</p>
        </div>
      </div>
    </div>
  );
}
