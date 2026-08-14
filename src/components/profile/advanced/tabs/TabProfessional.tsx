import React, { useState } from 'react';
import { User } from '../../../../types';
import { Briefcase, GraduationCap, Code, Plus, X } from 'lucide-react';

interface Props {
  data: User;
  onChange: (data: User) => void;
}

export default function TabProfessional({ data, onChange }: Props) {
  const [skillInput, setSkillInput] = useState('');

  const addSkill = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && skillInput.trim() !== '') {
      e.preventDefault();
      const currentSkills = data.profile?.skills || [];
      if (!currentSkills.includes(skillInput.trim())) {
        onChange({
          ...data,
          profile: {
            ...data.profile,
            skills: [...currentSkills, skillInput.trim()]
          }
        });
      }
      setSkillInput('');
    }
  };

  const removeSkill = (skillToRemove: string) => {
    const currentSkills = data.profile?.skills || [];
    onChange({
      ...data,
      profile: {
        ...data.profile,
        skills: currentSkills.filter(s => s !== skillToRemove)
      }
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Skills */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
          <Code className="w-5 h-5 text-indigo-500" />
          <div>
            <h3 className="font-bold text-slate-800">مهارت‌ها و تخصص‌ها</h3>
          </div>
        </div>
        <div className="p-6">
          <div className="mb-4">
            <input
              type="text"
              value={skillInput}
              onChange={e => setSkillInput(e.target.value)}
              onKeyDown={addSkill}
              className="w-full bg-slate-50 border border-transparent rounded-xl py-3 px-4 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-sm font-bold text-slate-700 outline-none transition-all"
              placeholder="مثال: حسابداری مالیاتی، مذاکره، اکسل پیشرفته (سپس Enter بزنید)"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(data.profile?.skills || []).map((skill, index) => (
              <span 
                key={index} 
                className="px-3 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold border border-indigo-100 flex items-center gap-2 group transition-all"
              >
                {skill}
                <button 
                  onClick={() => removeSkill(skill)}
                  className="p-1 -mr-1 rounded-full text-indigo-400 hover:text-rose-500 hover:bg-rose-50 transition-colors focus:outline-none"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            {!(data.profile?.skills?.length) && (
              <span className="text-sm text-slate-400 italic">هنوز مهارتی ثبت نشده است.</span>
            )}
          </div>
        </div>
      </div>

      {/* Experience (Placeholder for Phase 3) */}
      <div className="bg-slate-50 rounded-3xl border border-slate-200 border-dashed p-8 text-center">
        <Briefcase className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <h3 className="font-bold text-slate-600 mb-1">بخش سوابق شغلی</h3>
        <p className="text-xs text-slate-400">این بخش در فاز بعدی فعال خواهد شد و می‌توانید رزومه خود را اینجا وارد کنید.</p>
      </div>
      
      {/* Education (Placeholder for Phase 3) */}
      <div className="bg-slate-50 rounded-3xl border border-slate-200 border-dashed p-8 text-center">
        <GraduationCap className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <h3 className="font-bold text-slate-600 mb-1">تحصیلات و مدارک</h3>
        <p className="text-xs text-slate-400">مدیریت سوابق تحصیلی و گواهینامه‌ها به زودی اضافه می‌شود.</p>
      </div>
    </div>
  );
}
