import React, { useState, useEffect } from 'react';
import { Building2, Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { getWorkplaces, addWorkplace, updateWorkplace, deleteWorkplace } from '../../services/hrService';
import { generateId } from '../../services/dataService';

export default function WorkplacesManager({ showNotification, storeSettings }: any) {
  const [workplaces, setWorkplaces] = useState<any[]>([]);
  const [editingWorkplaceId, setEditingWorkplaceId] = useState<string | null>(null);
  const [workplaceForm, setWorkplaceForm] = useState({
    code: '', name: '', employerName: '', postalCode: '', address: '', branchCode: '', branchName: '', isActive: true
  });
  const [loading, setLoading] = useState(true);

  const fetchWorkplaces = async () => {
    setLoading(true);
    try {
      const data = await getWorkplaces();
      if (data && data.length === 0) {
        let storeName = storeSettings?.storeName || 'کسب و کار';
        try {
          const activeStoreId = localStorage.getItem('activeStoreId');
          if (activeStoreId) {
            const dbsRes = await fetch('/api/databases');
            const dbsData = await dbsRes.json();
            if (dbsData.success && dbsData.databases) {
              const currentDb = dbsData.databases.find((d: any) => d.id === activeStoreId);
              if (currentDb && currentDb.name) {
                storeName = currentDb.name;
              }
            }
          }
        } catch (e) {
          console.error('Error fetching businesses for default', e);
        }

        const defaultWorkplace = {
          id: generateId(),
          code: '1',
          name: storeName,
          employerName: '',
          postalCode: '',
          address: '',
          branchCode: '',
          branchName: '',
          isActive: true
        };
        await addWorkplace(defaultWorkplace);
        setWorkplaces([defaultWorkplace]);
      } else {
        setWorkplaces(data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkplaces();
    setEditingWorkplaceId(null);
    resetForm();
  }, []);

  const resetForm = () => {
    setWorkplaceForm({
      code: '', name: '', employerName: '', postalCode: '', address: '', branchCode: '', branchName: '', isActive: true
    });
  };

  const handleSaveWorkplace = async () => {
    if (!workplaceForm.name) {
      return showNotification('نام کارگاه الزامی است', 'error');
    }
    try {
      if (editingWorkplaceId) {
        await updateWorkplace(editingWorkplaceId, workplaceForm);
        showNotification('تغییرات کارگاه ذخیره شد', 'success');
      } else {
        await addWorkplace({ id: generateId(), ...workplaceForm });
        showNotification('کارگاه جدید ثبت شد', 'success');
      }
      setEditingWorkplaceId(null);
      resetForm();
      fetchWorkplaces();
    } catch (e) {
      showNotification('خطا در ذخیره کارگاه', 'error');
    }
  };

  const handleEditWorkplace = (w: any) => {
    setWorkplaceForm({
      code: w.code || '', name: w.name || '', employerName: w.employerName || '', postalCode: w.postalCode || '',
      address: w.address || '', branchCode: w.branchCode || '', branchName: w.branchName || '', isActive: w.isActive ?? true
    });
    setEditingWorkplaceId(w.id);
  };

  const handleDeleteWorkplace = async (id: string) => {
    if (!window.confirm('آیا از حذف این کارگاه مطمئن هستید؟')) return;
    try {
      await deleteWorkplace(id);
      showNotification('کارگاه حذف شد', 'success');
      fetchWorkplaces();
    } catch (e) {
      showNotification('خطا در حذف کارگاه', 'error');
    }
  };

  return (
    <div className="h-full bg-slate-50 flex flex-col relative overflow-hidden" dir="rtl">
      <div className="p-6 pb-2 w-full mx-auto flex items-center justify-between border-b border-slate-200 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800">مدیریت کارگاه‌ها</h1>
            <p className="text-sm text-slate-500 font-bold mt-1">تعریف و ویرایش اطلاعات کارگاه‌های سازمان</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 pt-4 w-full mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 sticky top-6">
              <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  <Building2 className="w-6 h-6 text-indigo-600" />
                  لیست کارگاه‌ها
                </h2>
                {!editingWorkplaceId && (
                  <button onClick={() => { resetForm(); setEditingWorkplaceId(null); }} className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors" title="کارگاه جدید">
                    <Plus className="w-5 h-5" />
                  </button>
                )}
              </div>
            
            {loading ? (
              <div className="p-8 text-center text-slate-400">در حال بارگذاری...</div>
            ) : (
              <div className="space-y-3">
                {workplaces.map(w => (
                  <div key={w.id} className={`p-4 rounded-2xl border transition-all ${!w.isActive ? 'bg-slate-50 border-slate-200 opacity-75' : 'bg-white border-indigo-100 shadow-sm'}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-slate-800">{w.name}</h4>
                        <div className="text-xs text-slate-500 mt-2 space-y-1">
                          <p>کد کارگاه: <span className="font-medium">{w.code || '---'}</span></p>
                          <p>کارفرما: <span className="font-medium">{w.employerName || '---'}</span></p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleEditWorkplace(w)} className="p-2 text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors" title="ویرایش">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteWorkplace(w.id)} className="p-2 text-rose-600 bg-rose-50 rounded-lg hover:bg-rose-100 transition-colors" title="حذف">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {workplaces.length === 0 && (
                  <div className="text-center p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-500">هیچ کارگاهی ثبت نشده است.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          </div>
          {/* Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
              <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                <h2 className="text-lg font-black text-slate-800">
                  {editingWorkplaceId ? 'ویرایش کارگاه' : 'ثبت کارگاه جدید'}
                </h2>
                {editingWorkplaceId && (
                  <button onClick={() => { setEditingWorkplaceId(null); resetForm(); }} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all text-sm">
                    انصراف
                  </button>
                )}
              </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">کد کارگاه</label>
                  <input type="text" value={workplaceForm.code} onChange={e => setWorkplaceForm({...workplaceForm, code: e.target.value})} className="w-full border border-slate-200 bg-white rounded-xl p-3 outline-none focus:border-indigo-500 font-mono transition-all text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">نام کارگاه</label>
                  <input type="text" value={workplaceForm.name} onChange={e => setWorkplaceForm({...workplaceForm, name: e.target.value})} className="w-full border border-slate-200 bg-white rounded-xl p-3 outline-none focus:border-indigo-500 font-bold transition-all text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">نام کارفرما</label>
                <input type="text" value={workplaceForm.employerName} onChange={e => setWorkplaceForm({...workplaceForm, employerName: e.target.value})} className="w-full border border-slate-200 bg-white rounded-xl p-3 outline-none focus:border-indigo-500 font-bold transition-all text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">کد شعبه</label>
                  <input type="text" value={workplaceForm.branchCode} onChange={e => setWorkplaceForm({...workplaceForm, branchCode: e.target.value})} className="w-full border border-slate-200 bg-white rounded-xl p-3 outline-none focus:border-indigo-500 font-mono transition-all text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">نام شعبه</label>
                  <input type="text" value={workplaceForm.branchName} onChange={e => setWorkplaceForm({...workplaceForm, branchName: e.target.value})} className="w-full border border-slate-200 bg-white rounded-xl p-3 outline-none focus:border-indigo-500 font-bold transition-all text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">آدرس کارگاه</label>
                <textarea value={workplaceForm.address} onChange={e => setWorkplaceForm({...workplaceForm, address: e.target.value})} rows={2} className="w-full border border-slate-200 bg-white rounded-xl p-3 outline-none focus:border-indigo-500 font-bold transition-all resize-none text-sm"></textarea>
              </div>
              
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className={`w-10 h-6 rounded-full transition-colors relative ${workplaceForm.isActive ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${workplaceForm.isActive ? 'left-1' : 'left-5'}`}></div>
                  </div>
                  <input type="checkbox" checked={workplaceForm.isActive} onChange={e => setWorkplaceForm({...workplaceForm, isActive: e.target.checked})} className="hidden" />
                  <span className="text-sm font-bold text-slate-700 select-none group-hover:text-indigo-600 transition-colors">کارگاه فعال است</span>
                </label>
                <button onClick={handleSaveWorkplace} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-sm flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  {editingWorkplaceId ? 'ثبت تغییرات' : 'ذخیره'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
      </div>
  );
}
