import React, { useState, useEffect, useMemo } from "react";
import DebtorsTracking from "./DebtorsTracking";

import { motion, AnimatePresence } from "motion/react";
import { Calendar, Phone, Users, CheckCircle, Clock, AlertCircle, Plus, Search, MapPin, X, Save } from "lucide-react";
import { getPersonFollowUps, addPersonFollowUp, updatePersonFollowUp, deletePersonFollowUp } from "../../services/dataService";

interface CRMDashboardProps {
  showNotification: (msg: string, type: "success" | "error") => void;
  persons: any[];
}

export default function CRMDashboard({ showNotification, persons, storeSettings, confirmAction }: any) {
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'completed' | 'all'>('pending');
  const [mainTab, setMainTab] = useState<'followups' | 'debtors'>('followups');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    personId: '',
    type: 'call',
    date: new Date().toISOString().split('T')[0],
    description: '',
    nextFollowUpDate: '',
    status: 'pending'
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await getPersonFollowUps();
      setFollowUps(data);
    } catch (error) {
      console.error(error);
      showNotification("خطا در بارگذاری اطلاعات پیگیری", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.personId || !formData.description) {
      showNotification("لطفاً شخص و توضیحات را وارد کنید", "error");
      return;
    }
    
    try {
      if (editingId) {
        await updatePersonFollowUp(editingId, formData);
        showNotification("پیگیری با موفقیت ویرایش شد", "success");
      } else {
        await addPersonFollowUp(formData);
        showNotification("پیگیری جدید ثبت شد", "success");
      }
      setIsModalOpen(false);
      loadData();
    } catch (error) {
      showNotification("خطا در ثبت پیگیری", "error");
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await updatePersonFollowUp(id, { status: newStatus });
      showNotification("وضعیت بروزرسانی شد", "success");
      loadData();
    } catch (error) {
      showNotification("خطا در بروزرسانی", "error");
    }
  };

  const openNewModal = () => {
    setEditingId(null);
    setFormData({
      personId: '',
      type: 'call',
      date: new Date().toISOString().split('T')[0],
      description: '',
      nextFollowUpDate: '',
      status: 'pending'
    });
    setIsModalOpen(true);
  };

  const filteredFollowUps = useMemo(() => {
    return followUps.filter(f => {
      if (activeTab === 'pending') return f.status === 'pending';
      if (activeTab === 'completed') return f.status === 'completed';
      return true;
    });
  }, [followUps, activeTab]);

  const pendingCount = followUps.filter(f => f.status === 'pending').length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 text-right"
      dir="rtl"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900 mb-1 flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" />
            مدیریت ارتباط با مشتری (CRM)
          </h1>
          <p className="text-slate-500 font-semibold text-sm">پیگیری‌ها، تماس‌ها و مدیریت ارتباطات</p>
        </div>
        <button
          onClick={openNewModal}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          ثبت پیگیری جدید
        </button>
      </div>

            <div className="flex flex-wrap bg-gray-100 p-1 rounded-xl w-full md:w-fit mb-6 gap-1">
        <button
          onClick={() => setMainTab('followups')}
          className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${mainTab === 'followups' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          پیگیری‌های عمومی
        </button>
        <button
          onClick={() => setMainTab('debtors')}
          className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${mainTab === 'debtors' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          بورد تخصصی اشخاص بدهکار
        </button>
      </div>

      {mainTab === 'debtors' ? (
        <DebtorsTracking persons={persons} showNotification={showNotification} storeSettings={storeSettings} confirmAction={confirmAction} />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-slate-500 font-bold text-sm">در انتظار پیگیری</div>
            <div className="text-2xl font-black text-slate-900">{pendingCount} مورد</div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-slate-500 font-bold text-sm">پیگیری‌های موفق</div>
            <div className="text-2xl font-black text-slate-900">{followUps.filter(f => f.status === 'completed').length} مورد</div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-slate-500 font-bold text-sm">کل مخاطبین ثبت شده</div>
            <div className="text-2xl font-black text-slate-900">{persons.length} شخص</div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="flex border-b border-slate-100">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex-1 py-4 text-sm font-bold transition-colors ${activeTab === 'pending' ? 'bg-indigo-50/50 text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            در حال پیگیری
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`flex-1 py-4 text-sm font-bold transition-colors ${activeTab === 'completed' ? 'bg-indigo-50/50 text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            تکمیل شده
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 py-4 text-sm font-bold transition-colors ${activeTab === 'all' ? 'bg-indigo-50/50 text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            همه موارد
          </button>
        </div>

        <div className="p-4">
          {isLoading ? (
            <div className="text-center py-10 text-slate-400 font-bold">در حال بارگذاری...</div>
          ) : filteredFollowUps.length === 0 ? (
            <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <Phone className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <div className="text-slate-500 font-bold">هیچ موردی یافت نشد.</div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredFollowUps.map(item => {
                const person = persons.find(p => String(p.id) === String(item.personId));
                return (
                  <div key={item.id} className="p-4 border border-slate-200 rounded-2xl hover:border-indigo-300 transition-colors bg-white flex flex-col md:flex-row gap-4 items-start md:items-center">
                    <div className="flex-1 w-full">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs font-bold px-2 py-1 rounded-md ${
                          item.type === 'call' ? 'bg-blue-100 text-blue-700' :
                          item.type === 'meeting' ? 'bg-purple-100 text-purple-700' :
                          item.type === 'account_followup' ? 'bg-rose-100 text-rose-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {item.type === 'call' ? 'تماس تلفنی' :
                           item.type === 'meeting' ? 'جلسه حضوری' :
                           item.type === 'account_followup' ? 'پیگیری حساب' : 'پیام'}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${item.status === 'pending' ? 'bg-amber-100 text-amber-700' : item.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                          {item.status === 'pending' ? 'در انتظار' : item.status === 'completed' ? 'تکمیل شده' : 'لغو شده'}
                        </span>
                        <span className="text-xs font-bold text-slate-500 mr-auto flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(item.date).toLocaleDateString('fa-IR')}
                        </span>
                      </div>
                      <div className="font-black text-slate-800 text-lg mb-1 flex items-center gap-2">
                        {person ? (person.name || person.companyName || 'بدون نام') : 'شخص نامشخص'}
                      </div>
                      <p className="text-slate-600 text-sm font-semibold">{item.description}</p>
                    </div>
                    
                    <div className="flex items-center gap-2 md:w-auto w-full border-t md:border-t-0 md:border-r border-slate-100 pt-3 md:pt-0 md:pr-4 mt-2 md:mt-0">
                       {item.status === 'pending' && (
                         <button
                           onClick={() => handleStatusChange(item.id, 'completed')}
                           className="flex-1 md:flex-none px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl font-bold text-xs transition-colors"
                         >
                           تکمیل شد
                         </button>
                       )}
                       <button
                         onClick={() => {
                           setEditingId(item.id);
                           setFormData({
                             personId: item.personId,
                             type: item.type,
                             date: item.date,
                             description: item.description,
                             nextFollowUpDate: item.nextFollowUpDate || '',
                             status: item.status
                           });
                           setIsModalOpen(true);
                         }}
                         className="flex-1 md:flex-none px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl font-bold text-xs transition-colors"
                       >
                         ویرایش
                       </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div key="isModalOpen-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="font-black text-lg text-slate-800">
                  {editingId ? "ویرایش پیگیری" : "ثبت پیگیری جدید"}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-slate-200 bg-slate-100 text-slate-500 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto">
                <form id="followup-form" onSubmit={handleSave} className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">مخاطب (مشتری/استادکار)</label>
                    <select
                      value={formData.personId}
                      onChange={e => setFormData({...formData, personId: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm bg-slate-50"
                      required
                    >
                      <option value="">انتخاب کنید...</option>
                      {(persons || []).map(p => (
                        <option key={p.id} value={p.id}>{p.name || p.companyName || 'بدون نام'} {p.role === 'customer' ? '(مشتری)' : p.role === 'supplier' ? '(تامین‌کننده)' : ''}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">نوع پیگیری</label>
                      <select
                        value={formData.type}
                        onChange={e => setFormData({...formData, type: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm bg-slate-50"
                      >
                        <option value="call">تماس تلفنی</option>
                        <option value="meeting">جلسه حضوری</option>
                        <option value="message">ارسال پیام</option>
                        <option value="account_followup">پیگیری حساب/بدهی</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">تاریخ</label>
                      <input
                        type="date"
                        value={formData.date}
                        onChange={e => setFormData({...formData, date: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm bg-slate-50"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">شرح مذاکره / توضیحات</label>
                    <textarea
                      value={formData.description}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                      rows={4}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm bg-slate-50 resize-none"
                      placeholder="خلاصه صحبت‌ها و توافقات..."
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">وضعیت</label>
                    <select
                      value={formData.status}
                      onChange={e => setFormData({...formData, status: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm bg-slate-50"
                    >
                      <option value="pending">در انتظار / باز</option>
                      <option value="completed">تکمیل شده</option>
                      <option value="cancelled">لغو شده</option>
                    </select>
                  </div>
                </form>
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex gap-3">
                <button
                  type="submit"
                  form="followup-form"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                  <Save className="w-5 h-5" />
                  ثبت و ذخیره
                </button>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-bold transition-colors"
                >
                  انصراف
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
        </>
      )}
    </motion.div>
  );
}
