import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Edit, Trash2, ChevronDown, ListTree, Save, X } from 'lucide-react';
import { getLedgerAccounts, addLedgerAccount, updateLedgerAccount, deleteLedgerAccount, addSystemLog } from '../../services/dataService';
import { LedgerAccount } from '../../types';

export default function ChartOfAccounts({ showNotification, currentUser }: any) {
  const [accounts, setAccounts] = useState<LedgerAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  const [formData, setFormData] = useState<Partial<LedgerAccount>>({
    code: '',
    title: '',
    type: 'group',
    nature: 'debit',
    parentId: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const accs = await getLedgerAccounts();
    setAccounts(accs);
    setIsLoading(false);
    
    // Auto-expand groups
    const newExpanded: any = {};
    accs.filter(a => a.type === 'group').forEach(a => newExpanded[a.id] = true);
    setExpandedNodes(newExpanded);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.title || !formData.type || !formData.nature) return;

    if (editingId) {
      await updateLedgerAccount(editingId, formData);
      showNotification('حساب با موفقیت ویرایش شد', 'success');
      addSystemLog('UPDATE_LEDGER', `ویرایش حساب ${formData.code}`, 'LedgerAccount', editingId);
    } else {
      const added = await addLedgerAccount(formData);
      showNotification('حساب با موفقیت اضافه شد', 'success');
      addSystemLog('ADD_LEDGER', `افزودن حساب ${formData.code}`, 'LedgerAccount', added.id);
    }
    setEditingId(null);
    setFormData({ code: '', title: '', type: 'group', nature: 'debit', parentId: '' });
    loadData();
  };

  const handleDelete = async (id: string | number) => {
    if (window.confirm('آیا از حذف این حساب اطمینان دارید؟')) {
      await deleteLedgerAccount(id);
      showNotification('حساب حذف شد', 'success');
      loadData();
    }
  };

  const toggleNode = (id: string | number) => {
    setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const renderTree = (parentId: string | number | null | undefined, depth = 0) => {
    const children = (accounts || []).filter(a => {
      if (!parentId) return !a.parentId;
      return a.parentId === parentId || a.parentId?.toString() === parentId.toString();
    }).sort((a, b) => a.code.localeCompare(b.code));

    if (children.length === 0) return null;

    return (
      <div className={`space-y-1 ${depth > 0 ? 'pr-6 border-r border-slate-200 mr-2 mt-1' : ''}`}>
        {children.map(acc => (
          <div key={acc.id} className="flex flex-col">
            <div className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg group">
              <div className="flex items-center gap-2">
                {['group', 'general', 'subsidiary'].includes(acc.type) ? (
                  <button onClick={() => toggleNode(acc.id)} className="p-1 rounded-md hover:bg-slate-200">
                    <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${expandedNodes[acc.id] ? 'rotate-0' : 'rotate-90'}`} />
                  </button>
                ) : (
                  <div className="w-6" /> // spacer
                )}
                <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{acc.code}</span>
                <span className={`text-sm ${acc.type === 'group' ? 'font-black text-slate-800' : acc.type === 'general' ? 'font-bold text-slate-700' : 'text-slate-600'}`}>
                  {acc.title}
                </span>
                <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-full mr-2">
                  {acc.type === 'group' ? 'گروه' : acc.type === 'general' ? 'کل' : acc.type === 'subsidiary' ? 'معین' : 'تفصیلی'}
                </span>
                <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full mr-1">
                  {acc.nature === 'debit' ? 'بدهکار' : 'بستانکار'}
                </span>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => {
                    setFormData({ ...acc, parentId: acc.parentId || '' });
                    setEditingId(acc.id);
                  }}
                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(acc.id)}
                  className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-md"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            {expandedNodes[acc.id] && renderTree(acc.id, depth + 1)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600">
          <ListTree className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-800">کدینگ حساب‌ها (جدول حساب‌ها)</h2>
          <p className="text-sm text-slate-500 mt-1">مدیریت ساختار درختی حساب‌های گروه، کل، معین و تفصیلی</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sticky top-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              {editingId ? <><Edit className="w-5 h-5 text-blue-500" /> ویرایش حساب</> : <><Plus className="w-5 h-5 text-emerald-500" /> ثبت حساب جدید</>}
            </h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">کد حساب *</label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={e => setFormData({ ...formData, code: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 font-mono text-left"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">عنوان حساب *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">سطح حساب</label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm"
                  >
                    <option value="group">گروه</option>
                    <option value="general">کل</option>
                    <option value="subsidiary">معین</option>
                    <option value="detailed">تفصیلی</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">ماهیت</label>
                  <select
                    value={formData.nature}
                    onChange={e => setFormData({ ...formData, nature: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm"
                  >
                    <option value="debit">بدهکار</option>
                    <option value="credit">بستانکار</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">حساب پدر (تودرتو)</label>
                <select
                  value={formData.parentId || ''}
                  onChange={e => setFormData({ ...formData, parentId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-sans"
                >
                  <option value="">-- فاقد پدر (سطح اول) --</option>
                  {(accounts || []).filter(a => a.id !== editingId && ['group', 'general', 'subsidiary'].includes(a.type)).map(a => (
                    <option key={a.id} value={a.id}>{a.code} - {a.title} ({a.type === 'group'?'گروه':a.type==='general'?'کل':'معین'})</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 bg-indigo-600 text-white rounded-xl py-2.5 text-sm font-bold hover:bg-indigo-700 transition flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" /> ذخیره
                </button>
                {editingId && (
                  <button type="button" onClick={() => { setEditingId(null); setFormData({ code: '', title: '', type: 'group', nature: 'debit', parentId: '' }); }} className="px-3 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 transition">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm min-h-[500px]">
             {isLoading ? (
               <div className="flex justify-center items-center h-40">
                 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
               </div>
             ) : accounts.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                 <ListTree className="w-16 h-16 mb-4 opacity-20" />
                 <p className="font-bold">هیچ حسابی تعریف نشده است</p>
                 <p className="text-sm mt-1">اولین گروه حساب خود را ایجاد کنید</p>
               </div>
             ) : (
               <div className="bg-white rounded-xl overflow-x-auto text-right" dir="rtl">
                 {renderTree(null)}
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}
