import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, User as UserIcon, Shield, Settings, Briefcase, Save, CheckCircle, Lock, Activity } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { updateUser, getUsers } from "../../../services/dataService";
import { User } from "../../../types";

import TabGeneral from "./tabs/TabGeneral";
import TabProfessional from "./tabs/TabProfessional";
import TabSecurity from "./tabs/TabSecurity";
import TabPreferences from "./tabs/TabPreferences";
import TabPrivacy from "./tabs/TabPrivacy";
import TabActivity from "./tabs/TabActivity";

interface Props {
  onClose: () => void;
  targetUserId?: string | number;
}

type TabType = 'general' | 'professional' | 'security' | 'preferences' | 'privacy' | 'activity';

export default function AdvancedProfileModal({ onClose, targetUserId }: Props) {
  const { user, checkAuth } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [editData, setEditData] = useState<User | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    const loadUser = async () => {
      if (targetUserId) {
        const users = await getUsers();
        const target = users.find((u: User) => String(u.id) === String(targetUserId));
        if (target) {
          setEditData(JSON.parse(JSON.stringify(target)));
        }
      } else if (user) {
        setEditData(JSON.parse(JSON.stringify(user)));
      }
    };
    loadUser();
  }, [user, targetUserId]);

  const calculateCompletion = () => {
    if (!editData) return 0;
    let score = 0;
    if (editData.name) score += 20;
    if (editData.username) score += 10;
    if (editData.email) score += 20;
    if (editData.profile?.bio) score += 10;
    if (editData.profile?.skills?.length) score += 15;
    if (editData.profile?.experience?.length) score += 15;
    if (editData.security?.twoFactorEnabled || editData.requires2FA) score += 10;
    return score;
  };

  const handleSave = async () => {
    if (!editData) return;
    setIsSaving(true);
    try {
      await updateUser(String(editData.id), editData);
      if (!targetUserId || targetUserId === user?.id) {
        await checkAuth();
      }
      setSaveMessage('تغییرات با موفقیت ذخیره شد.');
      setTimeout(() => {
        setSaveMessage('');
      }, 3000);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!editData) return null;

  const tabs = [
    { id: 'general', label: 'مشخصات فردی', icon: UserIcon, desc: 'اطلاعات پایه و هویتی' },
    { id: 'professional', label: 'سوابق و تخصص', icon: Briefcase, desc: 'مهارت‌ها، رزومه و تحصیلات' },
    { id: 'preferences', label: 'تنظیمات برنامه', icon: Settings, desc: 'ظاهر، زبان و اعلان‌ها' },
    { id: 'privacy', label: 'حریم خصوصی', icon: Lock, desc: 'نمایش اطلاعات و حذف حساب' },
    { id: 'security', label: 'امنیت و نشست‌ها', icon: Shield, desc: 'رمز عبور، 2FA و دستگاه‌ها' },
    { id: 'activity', label: 'فعالیت‌های اخیر', icon: Activity, desc: 'گزارش ورود و تغییرات شما' },
  ] as const;

  const progress = calculateCompletion();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-slate-50 w-full max-w-6xl h-[90vh] md:h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        dir="rtl"
      >
        <div className="bg-white px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner">
              <UserIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800">پروفایل کاربری من</h2>
              <p className="text-xs font-bold text-slate-500">مدیریت حساب کاربری، امنیت و تنظیمات شخصی</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end gap-1 mr-4">
              <div className="text-xs font-bold text-slate-500">میزان تکمیل پروفایل</div>
              <div className="w-32 h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                <div className="h-full bg-emerald-500 transition-all duration-1000 ease-out" style={{ width: `${progress}%` }} />
              </div>
            </div>
            <div className="h-8 w-px bg-slate-200 mx-2 hidden md:block"></div>
            <button 
              onClick={onClose}
              className="w-10 h-10 bg-slate-100 text-slate-500 rounded-xl flex items-center justify-center hover:bg-rose-100 hover:text-rose-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
          <div className="w-full md:w-72 bg-white border-l border-slate-200 shrink-0 p-4 flex flex-col gap-2 overflow-y-auto z-10">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`w-full text-right p-4 rounded-2xl transition-all flex items-center gap-4 ${
                    isActive 
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' 
                      : 'hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <div className={`p-2 rounded-xl ${isActive ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold">{tab.label}</div>
                    <div className={`text-[10px] mt-0.5 ${isActive ? 'text-indigo-100' : 'text-slate-400'}`}>
                      {tab.desc}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="max-w-4xl mx-auto space-y-8"
              >
                {activeTab === 'general' && <TabGeneral data={editData} onChange={setEditData} />}
                {activeTab === 'professional' && <TabProfessional data={editData} onChange={setEditData} />}
                {activeTab === 'preferences' && <TabPreferences data={editData} onChange={setEditData} />}
                {activeTab === 'privacy' && <TabPrivacy data={editData} onChange={setEditData} />}
                {activeTab === 'security' && <TabSecurity data={editData} onChange={setEditData} />}
                {activeTab === 'activity' && <TabActivity data={editData} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className="bg-white p-4 border-t border-slate-200 shrink-0 flex items-center justify-between z-10">
          <div>
            {saveMessage && (
              <span className="text-sm font-bold text-emerald-600 flex items-center gap-2 animate-in fade-in slide-in-from-right-4">
                <CheckCircle className="w-4 h-4" />
                {saveMessage}
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="px-6 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
            >
              بستن
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2 disabled:opacity-50 active:scale-95"
            >
              {isSaving ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              ذخیره تغییرات
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
