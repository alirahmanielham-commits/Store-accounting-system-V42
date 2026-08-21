import React, { useState, useEffect, useMemo } from 'react';
import { Users, Edit2, Search, XCircle, FileText, CheckCircle, Save } from 'lucide-react';
import { getEmployeeProfiles, addEmployeeProfile, updateEmployeeProfile } from '../../services/hrService';

export default function EmployeeProfilesManager({ personsData, showNotification }) {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    insuranceNumber: '',
    insuranceType: '',
    educationLevel: '',
    experienceYears: '',
    maritalStatus: 'single',
    studyField: '',
    jobTitle: '',
    jobCategory: '',
    employmentType: 'full_time',
    contractType: '',
    childrenCount: '0'
  });

  const fetchData = async () => {
    try {
      const data = await getEmployeeProfiles();
      setProfiles(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const employees = useMemo(() => {
    return (personsData || []).filter(p => p.role === 'employee');
  }, [personsData]);

  const filteredEmployees = useMemo(() => {
    if (!searchQuery) return employees;
    return employees.filter(e => e.name.includes(searchQuery));
  }, [employees, searchQuery]);

  const handleEdit = (personId: string) => {
    setEditingPersonId(personId);
    const existingProfile = profiles.find(p => p.personId === personId);
    if (existingProfile) {
      setFormData({
        insuranceNumber: existingProfile.insuranceNumber || '',
        insuranceType: existingProfile.insuranceType || '',
        educationLevel: existingProfile.educationLevel || '',
        experienceYears: existingProfile.experienceYears || '',
        maritalStatus: existingProfile.maritalStatus || 'single',
        studyField: existingProfile.studyField || '',
        jobTitle: existingProfile.jobTitle || '',
        jobCategory: existingProfile.jobCategory || '',
        employmentType: existingProfile.employmentType || 'full_time',
        contractType: existingProfile.contractType || '',
        childrenCount: existingProfile.childrenCount || '0'
      });
    } else {
      setFormData({
        insuranceNumber: '',
        insuranceType: '',
        educationLevel: '',
        experienceYears: '',
        maritalStatus: 'single',
        studyField: '',
        jobTitle: '',
        jobCategory: '',
        employmentType: 'full_time',
        contractType: '',
        childrenCount: '0'
      });
    }
  };

  const handleSave = async () => {
    if (!editingPersonId) return;
    try {
      const existingProfile = profiles.find(p => p.personId === editingPersonId);
      if (existingProfile) {
        await updateEmployeeProfile(existingProfile.id, { ...existingProfile, ...formData });
      } else {
        await addEmployeeProfile({
          id: Date.now().toString(),
          personId: editingPersonId,
          ...formData
        });
      }
      showNotification('اطلاعات پرسنلی با موفقیت ذخیره شد', 'success');
      setEditingPersonId(null);
      fetchData();
    } catch (e) {
      console.error(e);
      showNotification('خطا در ذخیره اطلاعات', 'error');
    }
  };

  return (
    <div className="min-h-full bg-slate-50/50 p-4 md:p-8" dir="rtl">
      <div className="max-w-[1200px] mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800">تکمیل اطلاعات پرسنلی</h1>
              <p className="text-sm text-slate-500 mt-1">مدیریت و تکمیل اطلاعات پایه و سوابق پرسنل</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
            <div className="relative w-full sm:w-96">
              <Search className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="جستجو در نام پرسنل..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pr-12 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="p-4 font-bold">نام پرسنل</th>
                  <th className="p-4 font-bold">عنوان شغل</th>
                  <th className="p-4 font-bold text-center">وضعیت تکمیل اطلاعات</th>
                  <th className="p-4 font-bold text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmployees.map(emp => {
                  const profile = profiles.find(p => p.personId === emp.id);
                  const isCompleted = profile && profile.insuranceNumber && profile.jobTitle;
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-bold text-slate-800">{emp.name}</td>
                      <td className="p-4 text-slate-600">{profile?.jobTitle || '---'}</td>
                      <td className="p-4 text-center">
                        {isCompleted ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle className="w-3.5 h-3.5" /> تکمیل شده
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <FileText className="w-3.5 h-3.5" /> ناقص
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleEdit(emp.id)}
                          className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1.5"
                        >
                          <Edit2 className="w-3.5 h-3.5" /> تکمیل اطلاعات
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      {editingPersonId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-800">
                    تکمیل اطلاعات پرسنلی: {employees.find(e => e.id === editingPersonId)?.name}
                  </h3>
                </div>
              </div>
              <button onClick={() => setEditingPersonId(null)} className="text-slate-400 hover:text-rose-500 transition-colors">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">شماره بیمه</label>
                  <input
                    type="text"
                    value={formData.insuranceNumber}
                    onChange={e => setFormData({...formData, insuranceNumber: e.target.value})}
                    className="w-full border border-slate-200 bg-slate-50 rounded-xl p-[14px] outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-bold transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">نوع بیمه</label>
                  <input
                    type="text"
                    value={formData.insuranceType}
                    onChange={e => setFormData({...formData, insuranceType: e.target.value})}
                    className="w-full border border-slate-200 bg-slate-50 rounded-xl p-[14px] outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-bold transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">مدرک تحصیلی</label>
                  <input
                    type="text"
                    value={formData.educationLevel}
                    onChange={e => setFormData({...formData, educationLevel: e.target.value})}
                    className="w-full border border-slate-200 bg-slate-50 rounded-xl p-[14px] outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-bold transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">رشته تحصیلی</label>
                  <input
                    type="text"
                    value={formData.studyField}
                    onChange={e => setFormData({...formData, studyField: e.target.value})}
                    className="w-full border border-slate-200 bg-slate-50 rounded-xl p-[14px] outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-bold transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">وضعیت تاهل</label>
                  <select
                    value={formData.maritalStatus}
                    onChange={e => setFormData({...formData, maritalStatus: e.target.value})}
                    className="w-full border border-slate-200 bg-slate-50 rounded-xl p-[14px] outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-bold transition-all"
                  >
                    <option value="single">مجرد</option>
                    <option value="married">متاهل</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">تعداد فرزندان مشمول</label>
                  <input
                    type="number"
                    value={formData.childrenCount}
                    onChange={e => setFormData({...formData, childrenCount: e.target.value})}
                    className="w-full border border-slate-200 bg-slate-50 rounded-xl p-[14px] outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-bold transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">سابقه کار (سال)</label>
                  <input
                    type="number"
                    value={formData.experienceYears}
                    onChange={e => setFormData({...formData, experienceYears: e.target.value})}
                    className="w-full border border-slate-200 bg-slate-50 rounded-xl p-[14px] outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-bold transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">عنوان شغل</label>
                  <input
                    type="text"
                    value={formData.jobTitle}
                    onChange={e => setFormData({...formData, jobTitle: e.target.value})}
                    className="w-full border border-slate-200 bg-slate-50 rounded-xl p-[14px] outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-bold transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">گروه شغلی</label>
                  <input
                    type="text"
                    value={formData.jobCategory}
                    onChange={e => setFormData({...formData, jobCategory: e.target.value})}
                    className="w-full border border-slate-200 bg-slate-50 rounded-xl p-[14px] outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-bold transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">وضعیت اشتغال</label>
                  <select
                    value={formData.employmentType}
                    onChange={e => setFormData({...formData, employmentType: e.target.value})}
                    className="w-full border border-slate-200 bg-slate-50 rounded-xl p-[14px] outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-bold transition-all"
                  >
                    <option value="full_time">تمام وقت</option>
                    <option value="part_time">پاره وقت</option>
                    <option value="contract">قراردادی</option>
                    <option value="hourly">ساعتی</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">نوع قرارداد کاری</label>
                  <input
                    type="text"
                    value={formData.contractType}
                    onChange={e => setFormData({...formData, contractType: e.target.value})}
                    className="w-full border border-slate-200 bg-slate-50 rounded-xl p-[14px] outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-bold transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 rounded-b-3xl">
              <button
                onClick={() => setEditingPersonId(null)}
                className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                انصراف
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-colors"
              >
                <Save className="w-4 h-4" /> ذخیره اطلاعات
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
