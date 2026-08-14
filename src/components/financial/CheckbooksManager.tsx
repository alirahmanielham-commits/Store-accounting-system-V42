import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Building2, Edit2, Trash2, X, ChevronDown, Calendar, Save } from 'lucide-react';
import CustomDatePicker from '../ui/CustomDatePicker';
import DatePickerModule from 'react-multi-date-picker';
const DatePicker = CustomDatePicker;
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import { addCheckbook, updateCheckbook, deleteCheckbook, getCheckbooks } from '../../services/accountingService';
import { convertToGregorian, formatDateDisplay } from '../../utils/format';

export default function CheckbooksManager(props: any) {
  const { checkbooks, setCheckbooks, accounts, setIssuedCheckbookFilter, setActiveSubTab, storeSettings, showNotification } = props;
  const notify = showNotification || ((msg: any) => console.log(msg));

  const [isCheckbookModalOpen, setIsCheckbookModalOpen] = useState(false);
  const [editingCheckbookId, setEditingCheckbookId] = useState<string|number|null>(null);
  const [cbAccountId, setCbAccountId] = useState('');
  const [cbStart, setCbStart] = useState('');
  const [cbEnd, setCbEnd] = useState('');
  const [cbIssued, setCbIssued] = useState('');

  const handleSaveCheckbook = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      accountId: cbAccountId,
      startNumber: cbStart,
      endNumber: cbEnd,
      totalLeaves: Number(cbEnd) - Number(cbStart) + 1,
      issuedDate: cbIssued
    };
    try {
      if (editingCheckbookId) {
         await updateCheckbook(editingCheckbookId.toString(), payload as any);
         notify('دسته چک با موفقیت ویرایش شد', 'success');
      } else {
         await addCheckbook(payload as any);
         notify('دسته چک با موفقیت افزوده شد', 'success');
      }
      setIsCheckbookModalOpen(false);
      setCheckbooks(await getCheckbooks());
    } catch (error) {
      notify('خطا در ذخیره دسته چک', 'error');
    }
  };

  const deleteCb = async (id: string|number) => {
    if (window.confirm('آیا از حذف دسته چک مطمئن هستید؟')) {
      try {
        await deleteCheckbook(id.toString());
        notify('دسته چک با موفقیت حذف شد', 'success');
        setCheckbooks(await getCheckbooks());
      } catch(error) {
        notify('خطا در حذف دسته چک', 'error');
      }
    }
  };

  const editCheckbook = (cb: any) => {
    setEditingCheckbookId(cb.id);
    setCbAccountId(cb.accountId || '');
    setCbStart(cb.startNumber || '');
    setCbEnd(cb.endNumber || '');
    setCbIssued(cb.issuedDate || '');
    setIsCheckbookModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <span className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg">تعداد دسته چک‌ها: {(checkbooks || []).length}</span>
        <button 
          onClick={() => { 
            setEditingCheckbookId(null); 
            setCbAccountId(''); 
            setCbStart(''); 
            setCbEnd(''); 
            setCbIssued(''); 
            setIsCheckbookModalOpen(true); 
          }} 
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" /> تعریف دسته چک جدید
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(checkbooks || []).map((cb: any) => {
            const bankAccount = accounts.find((a: any) => a.id == cb.accountId);
            const bankName = bankAccount?.bankName || 'حساب بانکی نامشخص';
            const accountNo = bankAccount?.accountNumber ? `حساب: ${bankAccount.accountNumber}` : '';
            return (
              <div key={cb.id} className="border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all bg-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 left-0 h-1.5 bg-indigo-500"></div>
                <div className="text-sm font-black text-indigo-950 mb-1 flex items-center gap-1">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  {bankName}
                </div>
                <div className="text-[11px] font-mono text-gray-500 mb-3">{accountNo}</div>
                <div className="text-xs text-gray-600 mb-1">شماره شروع: <span className="font-mono text-gray-900 font-bold">{cb.startNumber}</span></div>
                <div className="text-xs text-gray-600 mb-1">شماره پایان: <span className="font-mono text-gray-900 font-bold">{cb.endNumber}</span></div>
                <div className="text-xs font-bold text-gray-700 mt-2 bg-indigo-50/50 inline-block px-2.5 py-1 rounded-lg">برگ: {cb.totalLeaves} عدد</div>
                {cb.issuedDate && <div className="text-[10px] text-gray-400 mt-2">تاریخ ثبت: {formatDateDisplay(cb.issuedDate, storeSettings?.calendarType)}</div>}
                  
                <div className="flex justify-end gap-2 absolute top-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    
                  <button 
                    onClick={() => { setIssuedCheckbookFilter(cb.id.toString()); setActiveSubTab('issued_checks'); }} 
                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-transparent hover:border-emerald-100"
                    title="مشاهده برگه‌های دسته چک"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                  </button>

                  <button 
                    onClick={() => editCheckbook(cb)} 
                    className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100"
                    title="ویرایش دسته چک"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => deleteCb(cb.id)} 
                    className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100"
                    title="حذف دسته چک"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
        })}
        {(checkbooks || []).length === 0 && (
          <div className="col-span-full py-12 flex flex-col items-center justify-center bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-200">
            <Building2 className="w-12 h-12 text-gray-300 mb-3" />
            <p className="text-gray-500 font-bold text-sm">هیچ دسته چکی یافت نشد.</p>
            <p className="text-gray-400 text-xs mt-1">با کلیک روی دکمه "تعریف دسته چک جدید" دسته چک خود را اضافه کنید.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isCheckbookModalOpen && (
          <div key="isCheckbookModalOpen-modal" className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm shadow" dir="rtl">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl border border-gray-100">
              <div className="flex justify-between items-center mb-4 border-b pb-3 border-gray-100">
                <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-indigo-600" />
                  {editingCheckbookId ? 'ویرایش دسته چک' : 'ثبت و تعریف دسته چک جدید'}
                </h3>
                <button onClick={() => setIsCheckbookModalOpen(false)} className="text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-full p-1.5 transition-colors"><X className="w-5 h-5" /></button>
              </div>
              
              <form onSubmit={handleSaveCheckbook} className="space-y-5">
                  <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100/60 space-y-4">
                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-2 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                        حساب بانکی متصل
                      </label>
                      <div className="relative">
                        <select required value={cbAccountId} onChange={e => setCbAccountId(e.target.value)} className="w-full border border-slate-200 bg-white rounded-xl px-4 py-2.5 text-sm appearance-none outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-700 font-bold shadow-sm">
                          <option value="">انتخاب حساب بانکی ...</option>
                          {(accounts || []).map((a: any, idx: number) => <option key={a.id ? `cbm-acc-${a.id}-${idx}` : `cbm-acc-idx-${idx}`} value={a.id}>{a.bankName} - {a.accountNumber || a.cardNumber}</option>)}
                        </select>
                        <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100/60">
                      <label className="block text-xs font-black text-slate-700 mb-2">شماره شروع برگه چک</label>
                      <input required type="number" min="0" value={cbStart} onChange={e => setCbStart(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono text-center outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-inner bg-white font-bold" dir="ltr" placeholder="1001" />
                    </div>
                    <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100/60">
                      <label className="block text-xs font-black text-slate-700 mb-2">شماره پایان برگه چک</label>
                      <input required type="number" min="0" value={cbEnd} onChange={e => setCbEnd(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono text-center outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-inner bg-white font-bold" dir="ltr" placeholder="1050" />
                    </div>
                  </div>
                  
                  <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100/60">
                    <label className="block text-xs font-black text-slate-700 mb-2 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                      تاریخ دریافت دسته چک
                    </label>
                    <div className="relative">
                       <DatePicker
                         value={cbIssued}
                         onChange={(d: any) => setCbIssued((d ? convertToGregorian(d) : ""))}
                         calendar={storeSettings?.calendarType === 'gregorian' ? undefined : persian}
                         locale={storeSettings?.calendarType === 'gregorian' ? undefined : persian_fa}
                         calendarPosition="bottom-right"
                         inputClass="w-full border border-slate-200 bg-white rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-700 font-bold shadow-sm"
                         placeholder="انتخاب تاریخ ..."
                       />
                    </div>
                  </div>
                
                  <div className="pt-4 flex items-center justify-end gap-3 mt-4">
                    <button type="button" onClick={() => setIsCheckbookModalOpen(false)} className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-bold transition-colors">
                      انصراف
                    </button>
                    <button type="submit" className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-md shadow-indigo-200 transition-all hover:-translate-y-0.5">
                      <Save className="w-4 h-4" /> {editingCheckbookId ? 'ذخیره تغییرات' : 'ثبت و تعریف'}
                    </button>
                  </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
