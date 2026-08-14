import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Phone, Briefcase, Building, Save, DollarSign, Wallet } from 'lucide-react';
import Select from 'react-select';

export default function MinimalMobilePersonModal(props: any) {
  const {
    isOpen,
    onClose,
    newPersonType, setNewPersonType,
    newPersonFirstName, setNewPersonFirstName,
    newPersonLastName, setNewPersonLastName,
    newPersonCompanyName, setNewPersonCompanyName,
    newPersonPhone, setNewPersonPhone,
    newPersonRole, setNewPersonRole,
    handleSubmitPerson,
    submittingPerson,
    personRoles,
    newPersonInitialBalance, setNewPersonInitialBalance,
    newPersonInitialBalanceType, setNewPersonInitialBalanceType
  } = props;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[999999] flex items-end justify-center bg-slate-900/40 backdrop-blur-sm sm:items-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          dir="rtl"
        >
          <div className="flex items-center justify-between px-5 py-4 bg-indigo-50 text-indigo-900 border-b border-indigo-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-indigo-200/50 text-indigo-700">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black">ثبت شخص جدید</h3>
                <p className="text-xs opacity-70 font-bold">افزودن مشتری یا تامین‌کننده</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-5 space-y-4 overflow-y-auto overflow-x-hidden">
            <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setNewPersonType("real")}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${newPersonType === "real" ? 'bg-white text-indigo-700 shadow-sm border border-indigo-100' : 'text-slate-500 hover:text-slate-700'}`}
              >
                شخص حقیقی
              </button>
              <button
                type="button"
                onClick={() => setNewPersonType("legal")}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${newPersonType === "legal" ? 'bg-white text-indigo-700 shadow-sm border border-indigo-100' : 'text-slate-500 hover:text-slate-700'}`}
              >
                شخص حقوقی
              </button>
            </div>
            
            {newPersonType === "real" ? (
              <div className="flex gap-2">
                <div className="w-1/2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">نام</label>
                  <input
                    type="text"
                    value={newPersonFirstName}
                    onChange={(e) => setNewPersonFirstName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-sm"
                    placeholder="مثال: علی"
                  />
                </div>
                <div className="w-1/2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">نام خانوادگی</label>
                  <input
                    type="text"
                    value={newPersonLastName}
                    onChange={(e) => setNewPersonLastName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-sm"
                    placeholder="مثال: محمدی"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                  <Building className="w-4 h-4" /> نام شرکت / سازمان
                </label>
                <input
                  type="text"
                  value={newPersonCompanyName}
                  onChange={(e) => setNewPersonCompanyName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-sm"
                  placeholder="مثال: شرکت راهکار نوین"
                />
              </div>
            )}
            
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                <Phone className="w-4 h-4" /> شماره موبایل
              </label>
              <input
                type="tel"
                dir="ltr"
                value={newPersonPhone}
                onChange={(e) => setNewPersonPhone(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-sm text-left"
                placeholder="0912..."
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                <Briefcase className="w-4 h-4" /> نقش / دسته‌بندی شخص
              </label>
              <Select
                options={(personRoles || []).map((r: any) => ({ value: r.id, label: r.name }))}
                value={newPersonRole ? { value: newPersonRole, label: (personRoles || []).find((r: any) => r.id === newPersonRole)?.name } : null}
                onChange={(val: any) => setNewPersonRole(val ? val.value : '')}
                placeholder="انتخاب نقش..."
                className="font-bold text-sm"
                noOptionsMessage={() => "نقشی یافت نشد"}
                styles={{
                  control: (base) => ({
                    ...base,
                    borderRadius: '0.75rem',
                    borderColor: '#e2e8f0',
                    padding: '2px',
                    boxShadow: 'none',
                    '&:hover': { borderColor: '#cbd5e1' }
                  })
                }}
              />
            </div>
          </div>
          
          <div className="p-5 border-t border-slate-100 bg-slate-50/50">
            <button
              onClick={(e) => handleSubmitPerson(e)}
              disabled={submittingPerson || (newPersonType === "real" ? (!newPersonFirstName || !newPersonLastName) : !newPersonCompanyName) || !newPersonRole}
              className={`w-full py-4 rounded-xl font-black text-white flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98] ${
                submittingPerson || (newPersonType === "real" ? (!newPersonFirstName || !newPersonLastName) : !newPersonCompanyName) || !newPersonRole
                  ? 'bg-slate-300 shadow-none cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'
              }`}
            >
              {submittingPerson ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              {submittingPerson ? 'در حال ثبت...' : 'ثبت سریع شخص'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
