import React, { useState, useMemo } from 'react';
import { Users, Search, Save, User, CheckCircle, FileText } from 'lucide-react';
import { updatePerson } from '../../services/dataService';
import { toPersianDigits } from '../../utils/format';

export default function PersonnelCodesManager({ personsData, showNotification, fetchPersons }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingCodeId, setEditingCodeId] = useState(null);
  const [tempCode, setTempCode] = useState('');
  const [loadingId, setLoadingId] = useState(null);

  const employees = useMemo(() => {
    let list = (personsData || []).filter(p => p.role === 'employee');
    if (searchQuery) {
      list = list.filter(p => p.name.includes(searchQuery) || (p.personnelCode && p.personnelCode.includes(searchQuery)));
    }
    return list;
  }, [personsData, searchQuery]);

  const handleSaveCode = async (personId) => {
    try {
      setLoadingId(personId);
      const person = (personsData || []).find(p => p.id === personId);
      if (!person) return;
      await updatePerson(personId, { ...person, personnelCode: tempCode });
      showNotification('کد پرسنلی با موفقیت ثبت شد', 'success');
      setEditingCodeId(null);
      if (fetchPersons) fetchPersons();
    } catch(e) {
      console.error(e);
      showNotification('خطا در ذخیره کد پرسنلی', 'error');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="min-h-full bg-slate-50/50 p-4 md:p-8" dir="rtl">
      <div className="max-w-[1200px] mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <User className="w-8 h-8 text-indigo-600" />
              مدیریت کدهای پرسنلی
            </h1>
            <p className="text-sm text-slate-500 mt-2 font-medium">اختصاص و ویرایش شماره پرسنلی برای کارمندان</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
            <div className="relative max-w-md w-full">
              <Search className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="جستجوی نام یا کد پرسنلی..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-medium transition-all"
              />
            </div>
            <div className="text-sm text-slate-500 font-bold bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm">
              مجموع کارمندان: <span className="text-indigo-600">{toPersianDigits(employees.length)}</span>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-white text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="p-4 font-bold text-slate-600">کارمند</th>
                  <th className="p-4 font-bold text-slate-600 text-center">کد پرسنلی (ثبت شده)</th>
                  <th className="p-4 font-bold text-slate-600 text-center">عملیات تخصیص</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.map(p => {
                  const isEditing = editingCodeId === p.id;
                  return (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-lg flex-shrink-0">
                          {p.name.substring(0, 1)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800">{p.name}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{p.phone || 'بدون شماره تماس'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      {isEditing ? (
                        <div className="flex justify-center">
                          <input 
                            type="text" 
                            value={tempCode}
                            onChange={(e) => setTempCode(e.target.value)}
                            placeholder="مثلا 100234"
                            className="border border-indigo-200 bg-white rounded-lg px-3 py-2 text-center outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-bold font-mono transition-all w-32"
                            dir="ltr"
                            autoFocus
                          />
                        </div>
                      ) : (
                        p.personnelCode ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-700 rounded-lg font-mono font-bold border border-slate-200">
                             {p.personnelCode}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium px-2 py-1 bg-slate-50 rounded">ثبت نشده</span>
                        )
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {isEditing ? (
                          <>
                            <button 
                              onClick={() => handleSaveCode(p.id)} 
                              disabled={loadingId === p.id}
                              className="px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 rounded-xl text-sm font-bold transition-all flex items-center gap-1 disabled:opacity-50"
                            >
                              {loadingId === p.id ? '...' : <><Save className="w-4 h-4"/> ثبت</>}
                            </button>
                            <button 
                              onClick={() => { setEditingCodeId(null); setTempCode(''); }}
                              className="px-3 py-2 bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-bold transition-all"
                            >
                              <X className="w-4 h-4"/>
                            </button>
                          </>
                        ) : (
                          <button 
                            onClick={() => { setEditingCodeId(p.id); setTempCode(p.personnelCode || ''); }}
                            className="px-4 py-2 bg-indigo-50 border border-indigo-100 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-bold transition-all"
                          >
                            {p.personnelCode ? 'ویرایش کد' : 'تخصیص کد جدید'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )})}
                {employees.length === 0 && (
                  <tr><td colSpan={3} className="p-12 text-center text-slate-400 font-medium">هیچ کارمندی یافت نشد</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
