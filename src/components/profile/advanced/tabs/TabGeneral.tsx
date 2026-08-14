import React, { useState, useEffect } from 'react';
import { User } from '../../../../types';
import { Camera, Mail, MapPin, Link as LinkIcon, AtSign, User as UserIcon, Briefcase, Eye, Link } from 'lucide-react';
import { z } from 'zod';
import { getPersons } from '../../../../services/dataService';

interface Props {
  data: User;
  onChange: (data: User) => void;
}

const generalSchema = z.object({
  name: z.string().min(3, "نام نمایشی باید حداقل ۳ حرف باشد"),
  email: z.string().email("فرمت ایمیل نامعتبر است").optional().or(z.literal('')),
});

export default function TabGeneral({ data, onChange }: Props) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [previewMode, setPreviewMode] = useState(false);
  const [persons, setPersons] = useState<any[]>([]);

  useEffect(() => {
    getPersons().then(setPersons);
  }, []);

  const validateField = (field: string, value: string) => {
    try {
      const fieldSchema = (generalSchema.shape as any)[field];
      if (fieldSchema) {
        fieldSchema.parse(value);
        setErrors(prev => {
          const next = { ...prev };
          delete next[field];
          return next;
        });
      }
    } catch (e: any) {
      if (e instanceof z.ZodError) {
        setErrors(prev => ({ ...prev, [field]: e.issues[0].message }));
      }
    }
  };

  const updateField = (field: keyof User, value: any) => {
    onChange({ ...data, [field]: value });
    validateField(field as string, value);
  };

  const updateProfileField = (field: string, value: any) => {
    onChange({
      ...data,
      profile: {
        ...(data.profile || {}),
        [field]: value
      }
    });
  };

  const triggerUpload = (type: 'avatar' | 'cover') => {
    // In a real app, this would open a file picker and a cropper
    console.log(`File picker and cropper for ${type} would open here.`);
  };

  if (previewMode) {
    return (
      <div className="space-y-6 pb-12">
        <div className="flex justify-between items-center bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
          <div className="flex items-center gap-2 text-indigo-700">
            <Eye className="w-5 h-5" />
            <span className="font-bold text-sm">حالت پیش‌نمایش پروفایل عمومی</span>
          </div>
          <button onClick={() => setPreviewMode(false)} className="px-4 py-2 bg-white text-indigo-600 rounded-xl font-bold text-xs shadow-sm hover:bg-indigo-50 transition-colors">
            خروج از پیش‌نمایش
          </button>
        </div>
        
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden relative">
          <div className="h-48 bg-slate-200 w-full relative">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 opacity-80"></div>
          </div>
          <div className="px-8 pb-8 relative -mt-16 text-center">
            <div className="w-32 h-32 mx-auto bg-white rounded-full p-2 shadow-xl mb-4">
              <div className="w-full h-full bg-indigo-100 rounded-full flex items-center justify-center">
                <span className="text-5xl font-black text-indigo-300">{data.name?.charAt(0)}</span>
              </div>
            </div>
            <h1 className="text-2xl font-black text-slate-800">{data.name}</h1>
            <p className="text-slate-500 font-medium mb-4">{data.profile?.headline || 'کاربر سیستم'}</p>
            {data.profile?.bio && (
              <p className="text-sm text-slate-600 max-w-2xl mx-auto leading-relaxed">{data.profile.bio}</p>
            )}
            <div className="flex justify-center gap-4 mt-6">
              {data.profile?.location && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold">
                  <MapPin className="w-4 h-4" /> {data.profile.location}
                </div>
              )}
              {data.email && data.profile?.privacySettings?.email === 'public' && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold" dir="ltr">
                  <Mail className="w-4 h-4" /> {data.email}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex justify-end">
        <button onClick={() => setPreviewMode(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-200 transition-colors">
          <Eye className="w-4 h-4" /> پیش‌نمایش پروفایل
        </button>
      </div>

      <div className="bg-white p-2 md:p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
        {/* Cover Image */}
        <div className="w-full h-32 md:h-48 bg-slate-100 rounded-2xl relative group overflow-hidden mb-16 md:mb-12">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 opacity-20"></div>
          <button 
            onClick={() => triggerUpload('cover')}
            className="absolute top-4 right-4 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 text-slate-700 shadow-sm opacity-0 group-hover:opacity-100 transition-all hover:bg-white"
          >
            <Camera className="w-4 h-4" /> تغییر کاور
          </button>
        </div>

        {/* Avatar */}
        <div className="absolute top-20 md:top-36 right-1/2 translate-x-1/2 md:right-12 md:translate-x-0 group z-10">
          <div className="w-28 h-28 md:w-32 md:h-32 bg-gradient-to-tr from-indigo-100 to-indigo-50 rounded-full border-4 border-white shadow-xl flex items-center justify-center overflow-hidden">
            <span className="text-4xl md:text-5xl font-black text-indigo-300">{data.name?.charAt(0)}</span>
          </div>
          <button 
            onClick={() => triggerUpload('avatar')}
            className="absolute bottom-0 right-0 md:right-2 w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white hover:bg-indigo-700 transition-all cursor-pointer opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 active:scale-95"
          >
            <Camera className="w-4 h-4" />
          </button>
        </div>

        <div className="text-center md:text-right pt-2 md:pt-0 md:pr-48 flex-1 z-10">
          <h3 className="text-xl font-black text-slate-800">{data.name}</h3>
          <p className="text-slate-500 font-medium text-sm mb-4" dir="ltr">@{data.username}</p>
          <div className="flex flex-wrap gap-2 justify-center md:justify-start">
            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg text-xs font-bold">نقش: {data.role}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-bold text-slate-800">اطلاعات هویتی و پایه</h3>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">نام کامل نمایشی</label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                <UserIcon className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={data.name || ''}
                onChange={e => updateField('name', e.target.value)}
                className={`w-full bg-slate-50 border rounded-xl py-3 pr-10 pl-4 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-sm font-bold text-slate-700 outline-none transition-all ${errors.name ? 'border-rose-500' : 'border-transparent'}`}
              />
            </div>
            {errors.name && <p className="text-rose-500 text-[10px] mt-1 font-bold">{errors.name}</p>}
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">نام کاربری (حروف انگلیسی)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <AtSign className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={data.username || ''}
                disabled
                className="w-full bg-slate-100 border border-transparent rounded-xl py-3 pl-10 pr-4 text-sm font-bold text-slate-500 cursor-not-allowed opacity-70 outline-none"
                dir="ltr"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">ایمیل اصلی</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                value={data.email || ''}
                onChange={e => updateField('email', e.target.value)}
                className={`w-full bg-slate-50 border rounded-xl py-3 pl-10 pr-4 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-sm font-bold text-slate-700 outline-none transition-all text-left ${errors.email ? 'border-rose-500' : 'border-transparent'}`}
                dir="ltr"
                placeholder="example@domain.com"
              />
            </div>
            {errors.email && <p className="text-rose-500 text-[10px] mt-1 font-bold">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">عنوان/تیتر کاری (Headline)</label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                <Briefcase className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={data.profile?.headline || ''}
                onChange={e => updateProfileField('headline', e.target.value)}
                className="w-full bg-slate-50 border border-transparent rounded-xl py-3 pr-10 pl-4 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-sm font-bold text-slate-700 outline-none transition-all"
                placeholder="مثال: مدیر ارشد مالی"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">اتصال به شخص (CRM)</label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                <Link className="w-4 h-4" />
              </div>
              <select
                value={data.personId || ''}
                onChange={e => updateField('personId', e.target.value)}
                className="w-full bg-slate-50 border border-transparent rounded-xl py-3 pr-10 pl-4 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-sm font-bold text-slate-700 outline-none transition-all appearance-none"
              >
                <option value="">بدون اتصال (مستقل)</option>
                {persons.map(p => (
                  <option key={p.id} value={p.id}>{p.name} {p.mobile ? `(${p.mobile})` : ''}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-bold text-slate-800">جزئیات و شبکه‌های ارتباطی</h3>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">درباره من (Bio)</label>
            <textarea
              value={data.profile?.bio || ''}
              onChange={e => updateProfileField('bio', e.target.value)}
              className="w-full bg-slate-50 border border-transparent rounded-xl p-4 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-sm font-medium text-slate-700 min-h-[100px] resize-y outline-none transition-all"
              placeholder="مختصری درباره خودتان بنویسید..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">موقعیت مکانی</label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                  <MapPin className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={data.profile?.location || ''}
                  onChange={e => updateProfileField('location', e.target.value)}
                  className="w-full bg-slate-50 border border-transparent rounded-xl py-3 pr-10 pl-4 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-sm font-bold text-slate-700 outline-none transition-all"
                  placeholder="ایران، تهران"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">لینکدین / وب‌سایت</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <LinkIcon className="w-4 h-4" />
                </div>
                <input
                  type="url"
                  value={data.profile?.socialLinks?.linkedin || ''}
                  onChange={e => {
                    onChange({
                      ...data,
                      profile: {
                        ...data.profile,
                        socialLinks: { ...(data.profile?.socialLinks || {}), linkedin: e.target.value }
                      }
                    });
                  }}
                  className="w-full bg-slate-50 border border-transparent rounded-xl py-3 pl-10 pr-4 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-sm font-bold text-slate-700 outline-none transition-all text-left"
                  dir="ltr"
                  placeholder="https://linkedin.com/in/..."
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
