import React, { useState, useEffect, useMemo } from 'react';
import { Building2, Edit2, Trash2, Plus, Save, Search, X } from 'lucide-react';
import { getWorkplaces, addWorkplace, updateWorkplace, deleteWorkplace } from '../../services/hrService';
import { generateId } from '../../services/dataService';

export default function WorkplacesManager({ showNotification }) {
  const [workplaces, setWorkplaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWorkplaceId, setEditingWorkplaceId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [workplaceForm, setWorkplaceForm] = useState({
    code: '',
    name: '',
    employerName: '',
    branchCode: '',
    branchName: '',
    address: '',
    isActive: true
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getWorkplaces();
      setWorkplaces(data);
    } catch (e) {
      console.error(e);
      showNotification('خطا در دریافت لیست کارگاه‌ها', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (workplace = null) => {
    if (workplace) {
      setEditingWorkplaceId(workplace.id);
      setWorkplaceForm(workplace);
    } else {
      setEditingWorkplaceId(null);
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingWorkplaceId(null);
    resetForm();
  };

  const resetForm = () => {
    setWorkplaceForm({
      code: '',
      name: '',
      employerName: '',
      branchCode: '',
      branchName: '',
      address: '',
      isActive: true
    });
  };

  const handleSaveWorkplace = async () => {
    if (!workplaceForm.name) {
      return showNotification('لطفاً نام کارگاه را وارد کنید', 'error');
    }

    if (loading) return;
    setLoading(true);

    try {
      if (editingWorkplaceId) {
        await updateWorkplace(editingWorkplaceId, workplaceForm);
        showNotification('کارگاه با موفقیت ویرایش شد', 'success');
      } else {
        await addWorkplace({
          id: generateId(),
          ...workplaceForm
        });
        showNotification('کارگاه جدید با موفقیت ثبت شد', 'success');
      }
      handleCloseModal();
      fetchData();
    } catch (error) {
      showNotification('خطا در ذخیره کارگاه', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWorkplace = async (id: string) => {
    if (window.confirm('آیا از حذف این کارگاه مطمئن هستید؟')) {
      try {
        await deleteWorkplace(id);
        showNotification('کارگاه با موفقیت حذف شد', 'success');
        fetchData();
      } catch (error) {
        showNotification('خطا در حذف کارگاه', 'error');
      }
    }
  };

  const filteredWorkplaces = useMemo(() => {
    return workplaces.filter(w => 
      (w.name || '').includes(searchQuery) ||
      (w.code || '').includes(searchQuery) ||
      (w.employerName || '').includes(searchQuery)
    );
  }, [workplaces, searchQuery]);

  return (
    <div className="min-h-full bg-slate-50/50 p-4 md:p-8" dir="rtl">
      <div className="w-full mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800">مدیریت کارگاه‌ها</h1>
              <p className="text-sm text-slate-500 mt-1">تعریف و ویرایش اطلاعات کارگاه‌های سازمان</p>
            </div>
          </div>
          <button onClick={() => handleOpenModal()} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-sm flex items-center gap-2">
            <Plus className="w-5 h-5" /> کارگاه جدید
          </button>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
            <div className="relative w-full sm:w-96">
              <Search className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="جستجو بر اساس نام، کد یا کارفرما..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pr-12 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium text-sm"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="p-4 font-bold">نام کارگاه</th>
                  <th className="p-4 font-bold">کد کارگاه</th>
                  <th className="p-4 font-bold">نام کارفرما</th>
                  <th className="p-4 font-bold text-center">وضعیت</th>
                  <th className="p-4 font-bold text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400 font-bold">در حال بارگذاری...</td>
                  </tr>
                ) : filteredWorkplaces.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400 font-bold">هیچ کارگاهی ثبت نشده است</td>
                  </tr>
                ) : (
                  filteredWorkplaces.map(w => (
                    <tr key={w.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-bold text-slate-800">{w.name}</td>
                      <td className="p-4 text-slate-600 font-medium font-mono">{w.code || '---'}</td>
                      <td className="p-4 text-slate-600 font-medium">{w.employerName || '---'}</td>
                      <td className="p-4 text-center">
                        {w.isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            فعال
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            غیرفعال
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenModal(w)}
                            className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition-colors"
                            title="ویرایش"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteWorkplace(w.id)}
                            className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition-colors"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Workplace Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <Building2 className="w-6 h-6 text-indigo-500" />
                {editingWorkplaceId ? 'ویرایش کارگاه' : 'ثبت کارگاه جدید'}
              </h3>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 p-2 rounded-xl transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-4">
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
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className={`w-10 h-6 rounded-full transition-colors relative ${workplaceForm.isActive ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${workplaceForm.isActive ? 'left-1' : 'left-5'}`}></div>
                </div>
                <input type="checkbox" checked={workplaceForm.isActive} onChange={e => setWorkplaceForm({...workplaceForm, isActive: e.target.checked})} className="hidden" />
                <span className="text-sm font-bold text-slate-700 select-none group-hover:text-indigo-600 transition-colors">کارگاه فعال است</span>
              </label>
              
              <div className="flex items-center gap-3">
                <button onClick={handleCloseModal} className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-all text-sm">
                  انصراف
                </button>
                <button onClick={handleSaveWorkplace} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-sm flex items-center gap-2 text-sm">
                  <Save className="w-4 h-4" />
                  {editingWorkplaceId ? 'ثبت تغییرات' : 'ذخیره'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
