import React, { useState, useEffect, useMemo } from 'react';
import { Users, Edit2, Search, XCircle, FileText, CheckCircle, Save, Building2, CreditCard, ShieldCheck, Calendar, Phone } from 'lucide-react';
import { updatePerson } from '../../services/personService';
import { getWorkplaces } from '../../services/hrService';

export default function EmployeeProfilesManager({ personsData, fetchPersons, showNotification }: any) {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'incomplete'>('all');
  const [workplaces, setWorkplaces] = useState<any[]>([]);
  const [selectedWorkplaceFilter, setSelectedWorkplaceFilter] = useState<string>('all');
  
  const [formData, setFormData] = useState({
    personCode: '',
    nationalCode: '',
    insuranceNumber: '',
    insuranceType: 'اجباری',
    workplaceId: '',
    educationLevel: '',
    experienceYears: '',
    maritalStatus: 'single',
    studyField: '',
    jobTitle: '',
    jobCategory: '',
    employmentType: 'full_time',
    childrenCount: '0',
    bankName: '',
    accountNumber: '',
    shabaNumber: '',
    hireDate: '',
    militaryStatus: 'exempt',
    emergencyPhone: ''
  });

  useEffect(() => {
    const fetchWorkplacesList = async () => {
      try {
        const wp = await getWorkplaces();
        setWorkplaces(wp || []);
      } catch (e) {
        console.error('Error fetching workplaces:', e);
      }
    };
    fetchWorkplacesList();
  }, []);

  const employees = useMemo(() => {
    return (personsData || []).filter((p: any) => p.role === 'employee');
  }, [personsData]);

  const filteredEmployees = useMemo(() => {
    let result = employees;
    if (activeTab === 'incomplete') {
      result = result.filter((e: any) => {
        return !(e.insuranceNumber && e.jobTitle && e.workplaceId && e.shabaNumber);
      });
    }
    if (selectedWorkplaceFilter !== 'all') {
      result = result.filter((e: any) => String(e.workplaceId) === String(selectedWorkplaceFilter));
    }
    if (searchQuery) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((e: any) => 
        e.name?.toLowerCase().includes(q) || 
        e.personCode?.includes(q) || 
        e.nationalCode?.includes(q) ||
        e.jobTitle?.includes(q)
      );
    }
    return result;
  }, [employees, searchQuery, activeTab, selectedWorkplaceFilter]);

  const handleEdit = (personId: string) => {
    setEditingPersonId(personId);
    const existingPerson = employees.find((p: any) => p.id === personId);
    if (existingPerson) {
      setFormData({
        personCode: existingPerson.personCode || '',
        nationalCode: existingPerson.nationalCode || existingPerson.nationalId || '',
        insuranceNumber: existingPerson.insuranceNumber || '',
        insuranceType: existingPerson.insuranceType || 'اجباری',
        workplaceId: existingPerson.workplaceId || '',
        educationLevel: existingPerson.educationLevel || '',
        experienceYears: existingPerson.experienceYears || '',
        maritalStatus: existingPerson.maritalStatus || 'single',
        studyField: existingPerson.studyField || '',
        jobTitle: existingPerson.jobTitle || '',
        jobCategory: existingPerson.jobCategory || '',
        employmentType: existingPerson.employmentType || 'full_time',
        childrenCount: existingPerson.childrenCount || '0',
        bankName: existingPerson.bankName || '',
        accountNumber: existingPerson.accountNumber || '',
        shabaNumber: existingPerson.shabaNumber || '',
        hireDate: existingPerson.hireDate || '',
        militaryStatus: existingPerson.militaryStatus || 'exempt',
        emergencyPhone: existingPerson.emergencyPhone || ''
      });
    }
  };

  const handleSave = async () => {
    if (!editingPersonId || loading) return;
    setLoading(true);
    try {
      const existingPerson = employees.find((p: any) => p.id === editingPersonId);
      if (existingPerson) {
        await updatePerson(existingPerson.id, { ...existingPerson, ...formData });
      }
      showNotification('اطلاعات پرسنلی با موفقیت ذخیره شد', 'success');
      setEditingPersonId(null);
      if (fetchPersons) fetchPersons();
    } catch (e) {
      console.error(e);
      showNotification('خطا در ذخیره اطلاعات', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full bg-slate-50/50 p-4 md:p-8 relative" dir="rtl">
      {loading && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/20 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center gap-4 min-w-[200px] border border-slate-100">
            <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
            <span className="font-bold text-slate-700 animate-pulse">در حال ذخیره...</span>
          </div>
        </div>
      )}

      <div className="w-full mx-auto">
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
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 mb-6">
            <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
              >
                همه افراد ({employees.length})
              </button>
              <button
                onClick={() => setActiveTab('incomplete')}
                className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'incomplete' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
              >
                اطلاعات ناقص
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              {/* Workplace filter */}
              <div className="w-full sm:w-56">
                <select
                  value={selectedWorkplaceFilter}
                  onChange={(e) => setSelectedWorkplaceFilter(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-indigo-500"
                >
                  <option value="all">همه کارگاه‌ها</option>
                  {workplaces.map((wp: any) => (
                    <option key={wp.id} value={wp.id}>
                      {wp.name} {wp.code ? `(${wp.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative w-full sm:w-80">
                <Search className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="جستجو در نام، کد ملی، پرسنلی یا شغل..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pr-12 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium text-xs sm:text-sm"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="p-4 font-bold">شماره پرسنلی</th>
                  <th className="p-4 font-bold">نام پرسنل</th>
                  <th className="p-4 font-bold">کد ملی</th>
                  <th className="p-4 font-bold">کارگاه تخصیص‌یافته</th>
                  <th className="p-4 font-bold">عنوان شغل</th>
                  <th className="p-4 font-bold text-center">وضعیت تکمیل</th>
                  <th className="p-4 font-bold text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      پرسنلی با شرایط جستجو یافت نشد
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp: any) => {
                    const isCompleted = emp.insuranceNumber && emp.jobTitle && emp.workplaceId && emp.shabaNumber;
                    const matchedWorkplace = workplaces.find(w => String(w.id) === String(emp.workplaceId));
                    return (
                      <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-mono text-slate-500">{emp.personCode || "-"}</td>
                        <td className="p-4 font-bold text-slate-800">{emp.name}</td>
                        <td className="p-4 font-mono text-slate-600">{emp.nationalCode || emp.nationalId || "-"}</td>
                        <td className="p-4 text-slate-600">
                          {matchedWorkplace ? (
                            <span className="inline-flex items-center gap-1 text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md font-medium">
                              <Building2 className="w-3 h-3" />
                              {matchedWorkplace.name}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">بدون کارگاه</span>
                          )}
                        </td>
                        <td className="p-4 text-slate-600">{emp.jobTitle || '---'}</td>
                        <td className="p-4 text-center">
                          {isCompleted ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle className="w-3.5 h-3.5" /> تکمیل شده
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <FileText className="w-3.5 h-3.5" /> نیازمند تکمیل
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleEdit(emp.id)}
                            className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1.5"
                          >
                            <Edit2 className="w-3.5 h-3.5" /> ویرایش پرونده
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      {editingPersonId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100">
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-800">
                    پرونده پرسنلی: {employees.find((e: any) => e.id === editingPersonId)?.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">تکمیل مشخصات استخدامی، بیمه‌ای، بانکی و کارگاهی</p>
                </div>
              </div>
              <button onClick={() => setEditingPersonId(null)} className="text-slate-400 hover:text-rose-500 transition-colors p-1">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-8">
              {/* Section 1: Workplace & Job */}
              <div>
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                  <h4 className="font-black text-sm text-slate-800">مشخصات سازمانی، شغلی و کارگاه</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">کارگاه محل خدمت *</label>
                    <select
                      value={formData.workplaceId}
                      onChange={e => setFormData({...formData, workplaceId: e.target.value})}
                      className="w-full border border-slate-200 bg-slate-50 rounded-xl p-3 outline-none focus:bg-white focus:border-indigo-500 text-xs font-bold transition-all"
                    >
                      <option value="">-- انتخاب کارگاه --</option>
                      {workplaces.map((wp: any) => (
                        <option key={wp.id} value={wp.id}>
                          {wp.name} {wp.code ? `(کد کارگاه: ${wp.code})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">شماره / کد پرسنلی</label>
                    <input
                      type="text"
                      placeholder="مثلاً 1001"
                      value={formData.personCode}
                      onChange={e => setFormData({...formData, personCode: e.target.value})}
                      className="w-full border border-slate-200 bg-slate-50 rounded-xl p-3 outline-none focus:bg-white focus:border-indigo-500 text-xs font-bold font-mono transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">عنوان شغل *</label>
                    <input
                      type="text"
                      placeholder="مثلاً کارشناس حسابداری، تکنسین و..."
                      value={formData.jobTitle}
                      onChange={e => setFormData({...formData, jobTitle: e.target.value})}
                      className="w-full border border-slate-200 bg-slate-50 rounded-xl p-3 outline-none focus:bg-white focus:border-indigo-500 text-xs font-bold transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">گروه / رسته شغلی</label>
                    <input
                      type="text"
                      placeholder="مثلاً اداری، فنی، خدماتی"
                      value={formData.jobCategory}
                      onChange={e => setFormData({...formData, jobCategory: e.target.value})}
                      className="w-full border border-slate-200 bg-slate-50 rounded-xl p-3 outline-none focus:bg-white focus:border-indigo-500 text-xs font-bold transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">نوع قرارداد / اشتغال</label>
                    <select
                      value={formData.employmentType}
                      onChange={e => setFormData({...formData, employmentType: e.target.value})}
                      className="w-full border border-slate-200 bg-slate-50 rounded-xl p-3 outline-none focus:bg-white focus:border-indigo-500 text-xs font-bold transition-all"
                    >
                      <option value="full_time">تمام وقت (قانون کار)</option>
                      <option value="part_time">پاره وقت</option>
                      <option value="contract">قراردادی معین</option>
                      <option value="hourly">ساعتی</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">تاریخ شروع به کار / استخدام</label>
                    <input
                      type="text"
                      placeholder="مثلاً 1403/01/01"
                      value={formData.hireDate}
                      onChange={e => setFormData({...formData, hireDate: e.target.value})}
                      className="w-full border border-slate-200 bg-slate-50 rounded-xl p-3 outline-none focus:bg-white focus:border-indigo-500 text-xs font-bold font-mono transition-all text-left"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Identity & Personal */}
              <div>
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
                  <ShieldCheck className="w-5 h-5 text-indigo-600" />
                  <h4 className="font-black text-sm text-slate-800">مشخصات هویتی و پرسنلی</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">کد ملی</label>
                    <input
                      type="text"
                      maxLength={10}
                      placeholder="۱۰ رقم کد ملی"
                      value={formData.nationalCode}
                      onChange={e => setFormData({...formData, nationalCode: e.target.value})}
                      className="w-full border border-slate-200 bg-slate-50 rounded-xl p-3 outline-none focus:bg-white focus:border-indigo-500 text-xs font-bold font-mono transition-all text-left"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">وضعیت تاهل</label>
                    <select
                      value={formData.maritalStatus}
                      onChange={e => setFormData({...formData, maritalStatus: e.target.value})}
                      className="w-full border border-slate-200 bg-slate-50 rounded-xl p-3 outline-none focus:bg-white focus:border-indigo-500 text-xs font-bold transition-all"
                    >
                      <option value="single">مجرد</option>
                      <option value="married">متاهل</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">تعداد فرزندان مشمول حق اولاد</label>
                    <input
                      type="number"
                      min={0}
                      value={formData.childrenCount}
                      onChange={e => setFormData({...formData, childrenCount: e.target.value})}
                      className="w-full border border-slate-200 bg-slate-50 rounded-xl p-3 outline-none focus:bg-white focus:border-indigo-500 text-xs font-bold transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">مدرک تحصیلی</label>
                    <select
                      value={formData.educationLevel}
                      onChange={e => setFormData({...formData, educationLevel: e.target.value})}
                      className="w-full border border-slate-200 bg-slate-50 rounded-xl p-3 outline-none focus:bg-white focus:border-indigo-500 text-xs font-bold transition-all"
                    >
                      <option value="">-- انتخاب مدرک --</option>
                      <option value="diploma">دیپلم</option>
                      <option value="associate">کاردانی (فوق دیپلم)</option>
                      <option value="bachelor">کارشناسی (لیسانس)</option>
                      <option value="master">کارشناسی ارشد (فوق لیسانس)</option>
                      <option value="doctorate">دکتری و بالاتر</option>
                      <option value="under_diploma">زیر دیپلم</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">رشته تحصیلی</label>
                    <input
                      type="text"
                      placeholder="مثلاً مهندسی صنایع، مدیریت، و..."
                      value={formData.studyField}
                      onChange={e => setFormData({...formData, studyField: e.target.value})}
                      className="w-full border border-slate-200 bg-slate-50 rounded-xl p-3 outline-none focus:bg-white focus:border-indigo-500 text-xs font-bold transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">سابقه کار مرتبط (سال)</label>
                    <input
                      type="number"
                      min={0}
                      value={formData.experienceYears}
                      onChange={e => setFormData({...formData, experienceYears: e.target.value})}
                      className="w-full border border-slate-200 bg-slate-50 rounded-xl p-3 outline-none focus:bg-white focus:border-indigo-500 text-xs font-bold transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">وضعیت نظام وظیفه</label>
                    <select
                      value={formData.militaryStatus}
                      onChange={e => setFormData({...formData, militaryStatus: e.target.value})}
                      className="w-full border border-slate-200 bg-slate-50 rounded-xl p-3 outline-none focus:bg-white focus:border-indigo-500 text-xs font-bold transition-all"
                    >
                      <option value="served">پایان خدمت</option>
                      <option value="exempt">معافیت دائم</option>
                      <option value="educational_exemption">معافیت تحصیلی</option>
                      <option value="not_applicable">عدم نیاز (بانوان)</option>
                      <option value="subject">مشمول</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">شماره تماس اضطراری</label>
                    <input
                      type="text"
                      placeholder="مثلاً شماره همراه بستگان"
                      value={formData.emergencyPhone}
                      onChange={e => setFormData({...formData, emergencyPhone: e.target.value})}
                      className="w-full border border-slate-200 bg-slate-50 rounded-xl p-3 outline-none focus:bg-white focus:border-indigo-500 text-xs font-bold font-mono transition-all text-left"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Insurance & Banking */}
              <div>
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
                  <CreditCard className="w-5 h-5 text-indigo-600" />
                  <h4 className="font-black text-sm text-slate-800">اطلاعات بیمه تأمین اجتماعی و واریز بانکی</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">شماره بیمه تأمین اجتماعی</label>
                    <input
                      type="text"
                      placeholder="۱۰ رقم شماره بیمه"
                      value={formData.insuranceNumber}
                      onChange={e => setFormData({...formData, insuranceNumber: e.target.value})}
                      className="w-full border border-slate-200 bg-slate-50 rounded-xl p-3 outline-none focus:bg-white focus:border-indigo-500 text-xs font-bold font-mono transition-all text-left"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">نوع بیمه</label>
                    <select
                      value={formData.insuranceType}
                      onChange={e => setFormData({...formData, insuranceType: e.target.value})}
                      className="w-full border border-slate-200 bg-slate-50 rounded-xl p-3 outline-none focus:bg-white focus:border-indigo-500 text-xs font-bold transition-all"
                    >
                      <option value="اجباری">اجباری (مشمول قانون کار)</option>
                      <option value="اختیاری">اختیاری / مشاغل آزاد</option>
                      <option value="توافقی">توافقی</option>
                      <option value="فاقد بیمه">فاقد بیمه</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">نام بانک حقوق</label>
                    <input
                      type="text"
                      placeholder="مثلاً ملی، ملت، سامان و..."
                      value={formData.bankName}
                      onChange={e => setFormData({...formData, bankName: e.target.value})}
                      className="w-full border border-slate-200 bg-slate-50 rounded-xl p-3 outline-none focus:bg-white focus:border-indigo-500 text-xs font-bold transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">شماره حساب بانکی</label>
                    <input
                      type="text"
                      placeholder="شماره حساب جهت واریز"
                      value={formData.accountNumber}
                      onChange={e => setFormData({...formData, accountNumber: e.target.value})}
                      className="w-full border border-slate-200 bg-slate-50 rounded-xl p-3 outline-none focus:bg-white focus:border-indigo-500 text-xs font-bold font-mono transition-all text-left"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">شماره شبا (IBAN)</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="IR000000000000000000000000"
                        value={formData.shabaNumber}
                        onChange={e => setFormData({...formData, shabaNumber: e.target.value.toUpperCase()})}
                        className="w-full border border-slate-200 bg-slate-50 rounded-xl p-3 outline-none focus:bg-white focus:border-indigo-500 text-xs font-bold font-mono transition-all text-left uppercase"
                      />
                    </div>
                  </div>
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
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-sm"
              >
                <Save className="w-4 h-4" /> ذخیره اطلاعات پرسنلی
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
