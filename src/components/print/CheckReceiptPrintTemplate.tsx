import React from 'react';
import { toPersianDigits } from '../financial/checks/utils';

export function CheckReceiptPrintTemplate({ check, persons, storeSettings }: any) {
  if (!check) return null;
  const person = persons.find((p: any) => p.id === check.personId || p.id === check.payeeId || p.id === check.payerId);

  return (
    <div className="bg-white p-8 font-sans border-2 border-slate-800 rounded-xl max-w-3xl mx-auto" dir="rtl">
      <div className="flex justify-between items-center mb-8 border-b-2 border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">{storeSettings?.storeName || 'شرکت / فروشگاه'}</h1>
          <p className="text-sm font-bold text-slate-600 mt-1">رسید {check._type === 'issued' ? 'پرداخت' : 'دریافت'} چک</p>
        </div>
        <div className="text-left">
          <p className="text-sm font-bold text-slate-700">تاریخ چاپ: {new Date().toLocaleDateString('fa-IR')}</p>
          <p className="text-sm font-bold text-slate-700 mt-1">شماره رسید: {toPersianDigits(check.id.substring(0, 6).toUpperCase())}</p>
        </div>
      </div>

      <div className="mb-6 leading-10 text-lg text-slate-800 text-justify">
        بدینوسیله گواهی می‌شود که یک فقره چک به شماره <span className="font-black border-b border-dashed border-slate-400 px-2">{toPersianDigits(check.checkNumber)}</span> 
        عهده بانک <span className="font-black border-b border-dashed border-slate-400 px-2">{check.bankName || '................'}</span> 
        مبلغ <span className="font-black border-b border-dashed border-slate-400 px-2">{toPersianDigits(Number(check.amount).toLocaleString())} ریال</span> 
        به تاریخ سررسید <span className="font-black border-b border-dashed border-slate-400 px-2">{check.dueDate}</span> 
        {check._type === 'issued' ? ' در وجه ' : ' از جناب آقای/شرکت '} 
        <span className="font-black border-b border-dashed border-slate-400 px-2">{person?.name || '................'}</span> 
        {check._type === 'issued' ? ' صادر و تحویل گردید.' : ' دریافت گردید.'}
      </div>

      {check.description && (
        <div className="mb-8 p-4 bg-slate-50 border border-slate-200 rounded-lg">
          <p className="text-sm font-bold text-slate-600 mb-1">بابت / توضیحات:</p>
          <p className="text-base text-slate-800">{check.description}</p>
        </div>
      )}

      <div className="flex justify-between items-end mt-16 pt-8 border-t border-slate-200">
        <div className="text-center w-1/3">
          <p className="font-bold text-slate-700 mb-12">مهر و امضای {check._type === 'issued' ? 'تحویل گیرنده' : 'تحویل دهنده'}</p>
        </div>
        <div className="text-center w-1/3">
          <p className="font-bold text-slate-700 mb-12">مهر و امضای امور مالی</p>
        </div>
      </div>
    </div>
  );
}
