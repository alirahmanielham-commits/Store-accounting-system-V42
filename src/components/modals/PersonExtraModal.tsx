import React, { useState, useEffect } from 'react';
import { X, Check, FileText, CreditCard, Plus, Trash2, Building2, Hash, Edit3 } from 'lucide-react';
import { updatePerson } from '../../services/dataService';

export default function PersonExtraModal({
  isOpen,
  onClose,
  personId,
  persons,
  onSuccess,
  showNotification
}: any) {
  const person = persons?.find((p: any) => p.id === personId);
  const [notes, setNotes] = useState('');
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (person) {
      setNotes(person.additionalNotes || '');
      // Migrate old format if exists (accountNo -> accountNumber, etc.)
      const migratedAccounts = (person.bankAccounts || []).map((acc: any) => ({
        id: acc.id || Date.now().toString() + Math.random(),
        title: acc.title || '',
        bankName: acc.bankName || '',
        accountNumber: acc.accountNumber || acc.accountNo || '',
        cardNumber: acc.cardNumber || acc.cardNo || '',
        shebaNumber: acc.shebaNumber || acc.sheba || '',
      }));
      setBankAccounts(migratedAccounts);
    }
  }, [person]);

  if (!isOpen || !person) return null;

  const handleAddAccount = () => {
    setBankAccounts([
      ...bankAccounts, 
      { id: Date.now().toString(), title: '', bankName: '', accountNumber: '', cardNumber: '', shebaNumber: '' }
    ]);
  };

  const handleAccountChange = (id: string, field: string, value: string) => {
    setBankAccounts(bankAccounts.map(acc => acc.id === id ? { ...acc, [field]: value } : acc));
  };

  const handleRemoveAccount = (id: string) => {
    setBankAccounts(bankAccounts.filter(acc => acc.id !== id));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const validAccounts = bankAccounts.filter(a => a.bankName || a.accountNumber || a.cardNumber || a.shebaNumber);
      
      await updatePerson(person.id, {
        ...person,
        additionalNotes: notes,
        bankAccounts: validAccounts
      });
      
      if (onSuccess) onSuccess();
      onClose();
    } catch (e: any) {
      if (showNotification) showNotification(e.message || 'خطا در ذخیره اطلاعات', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800">حساب‌های بانکی و یادداشت‌ها</h2>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">{person.name || `${person.firstName || ''} ${person.lastName || ''}`.trim()}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-500 flex items-center justify-center hover:bg-slate-100 hover:text-slate-800 transition-colors shadow-sm"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-8 flex-1 custom-scrollbar">
          {/* Notes Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-bold text-slate-700">یادداشت‌های اختصاصی شخص</h3>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="هرگونه یادداشت، توافقات، شرایط پرداخت، یا سوابق پیگیری را اینجا بنویسید..."
              className="w-full h-28 p-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700 resize-none outline-none leading-relaxed text-sm bg-slate-50 hover:bg-white transition-colors placeholder:text-slate-400"
            ></textarea>
          </div>

          <hr className="border-slate-100" />

          {/* Bank Accounts Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-400" />
                <h3 className="text-sm font-bold text-slate-700">مشخصات حساب‌های بانکی</h3>
              </div>
              <button
                onClick={handleAddAccount}
                className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-2 rounded-xl hover:bg-indigo-100 transition-colors flex items-center gap-1.5 border border-indigo-100"
              >
                <Plus className="w-4 h-4" />
                افزودن حساب جدید
              </button>
            </div>
            
            <div className="space-y-4">
              {bankAccounts.length === 0 ? (
                <div className="text-center p-8 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50 flex flex-col items-center justify-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-slate-600 font-bold text-sm">هیچ حساب بانکی ثبت نشده است</p>
                    <p className="text-slate-400 font-medium text-xs mt-1">برای ثبت اطلاعات حساب، شماره کارت یا شبا روی دکمه افزودن کلیک کنید</p>
                  </div>
                  <button
                    onClick={handleAddAccount}
                    className="mt-2 text-xs font-bold text-indigo-600 bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-sm hover:bg-slate-50 transition-colors"
                  >
                    افزودن اولین حساب
                  </button>
                </div>
              ) : (
                bankAccounts.map((acc, index) => (
                  <div key={acc.id} className="bg-white border border-slate-200 p-5 rounded-3xl space-y-4 relative group shadow-sm hover:shadow-md transition-shadow">
                    <div className="absolute top-5 left-5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleRemoveAccount(acc.id)}
                        className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-100 transition-colors"
                        title="حذف حساب"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 font-bold text-xs flex items-center justify-center">
                        {index + 1}
                      </div>
                      <h4 className="text-sm font-bold text-slate-700">اطلاعات حساب</h4>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1.5 flex items-center gap-1.5">
                          <Edit3 className="w-3.5 h-3.5" />
                          عنوان حساب <span className="text-slate-400 font-normal">(اختیاری)</span>
                        </label>
                        <input
                          type="text"
                          value={acc.title}
                          onChange={(e) => handleAccountChange(acc.id, 'title', e.target.value)}
                          placeholder="مثال: حساب جاری شرکت"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all placeholder:text-slate-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1.5 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5" />
                          نام بانک
                        </label>
                        <input
                          type="text"
                          value={acc.bankName}
                          onChange={(e) => handleAccountChange(acc.id, 'bankName', e.target.value)}
                          placeholder="مثال: ملت، ملی، سامان"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all placeholder:text-slate-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1.5 flex items-center gap-1.5">
                          <Hash className="w-3.5 h-3.5" />
                          شماره حساب
                        </label>
                        <input
                          type="text"
                          value={acc.accountNumber}
                          onChange={(e) => handleAccountChange(acc.id, 'accountNumber', e.target.value)}
                          placeholder="شماره حساب بانکی"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all text-left dir-ltr placeholder:text-slate-300 placeholder:font-sans"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1.5 flex items-center gap-1.5">
                          <CreditCard className="w-3.5 h-3.5" />
                          شماره کارت
                        </label>
                        <input
                          type="text"
                          value={acc.cardNumber}
                          onChange={(e) => {
                            // Basic formatting for card number (groups of 4)
                            let val = e.target.value.replace(/\D/g, '').substring(0, 16);
                            val = val.replace(/(.{4})/g, '$1 ').trim();
                            handleAccountChange(acc.id, 'cardNumber', val);
                          }}
                          placeholder="0000 0000 0000 0000"
                          maxLength={19}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all text-left dir-ltr tracking-wider placeholder:text-slate-300 placeholder:tracking-normal placeholder:font-sans"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 mb-1.5 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5" />
                          شماره شبا (IBAN)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm font-mono pointer-events-none">IR</span>
                          <input
                            type="text"
                            value={acc.shebaNumber}
                            onChange={(e) => {
                              let val = e.target.value.replace(/[^0-9]/g, '').substring(0, 24);
                              handleAccountChange(acc.id, 'shebaNumber', val);
                            }}
                            placeholder="000000000000000000000000"
                            maxLength={24}
                            className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all text-left dir-ltr tracking-widest placeholder:text-slate-300 placeholder:tracking-normal placeholder:font-sans"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        
        <div className="px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-end gap-3 rounded-b-3xl">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            انصراف
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-2 transition-colors disabled:opacity-50 shadow-sm shadow-indigo-600/20"
          >
            {isSaving ? 'در حال ذخیره...' : (
              <>
                <Check className="w-5 h-5" />
                ذخیره اطلاعات
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
