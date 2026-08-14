import React, { useState } from 'react';
import { User } from '../../types';
import Select from 'react-select';
import { UserSquare, Plus, CheckCircle, Search, AlertCircle, LogOut } from 'lucide-react';
import { updateUser, addPerson, generateId } from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';
import PersonFormModal from '../modals/PersonFormModal';

export default function LinkPerson({ user, persons, personRoles, personGroups, onPersonLinked }: { user: User, persons: any[], personRoles: any[], personGroups: any[], onPersonLinked: () => void }) {
  const [activeTab, setActiveTab] = useState<'link' | 'create'>('link');
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [isPersonModalOpen, setIsPersonModalOpen] = useState(false);
  
  const { signOut, signIn } = useAuth();

  const personOptions = persons.filter(p => p.role === 'employee').map(p => ({
    value: String(p.id),
    label: `[${p.personCode || 'بدون کد'}] ${p.name} - ${p.nationalId || 'بدون کدملی'} - ${p.phone || 'بدون تلفن'}`,
    person: p
  }));

  const handleLink = async () => {
    if (!selectedPersonId) {
      setError('لطفا یک شخص را انتخاب کنید.');
      return;
    }
    try {
      setLoading(true);
      setError('');
      const updatedUser = { ...user, personId: selectedPersonId, profileLinkedAt: new Date().toISOString() };
      await updateUser(user.id.toString(), updatedUser);
      await signIn(updatedUser as any);
      onPersonLinked();
    } catch (err: any) {
      setError(err.message || 'خطا در ارتباط پروفایل');
      setLoading(false);
    }
  };

  const handlePersonCreated = async (addedPerson: any) => {
    if (!addedPerson || !addedPerson.id) return;
    try {
      setLoading(true);
      setError('');
      const updatedUser = { ...user, personId: addedPerson.id, profileLinkedAt: new Date().toISOString() };
      await updateUser(user.id.toString(), updatedUser);
      await signIn(updatedUser as any);
      onPersonLinked();
    } catch (err: any) {
      setError(err.message || 'خطا در ارتباط پروفایل');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden animate-in slide-in-from-bottom-8 fade-in duration-500">
        <div className="bg-indigo-600 p-8 text-center text-white">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <UserSquare className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-black mb-2">تکمیل اطلاعات حساب کاربری</h1>
          <p className="text-indigo-100 font-medium">
            برای استفاده از سیستم، لطفاً حساب خود را به یک پروفایل شخص متصل کنید.
          </p>
        </div>
        
        <div className="flex border-b">
           <button onClick={() => { setActiveTab('link'); setError(''); }} className={`flex-1 py-4 font-bold text-sm ${activeTab === 'link' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500'}`}>اتصال به شخص موجود</button>
           <button onClick={() => { setActiveTab('create'); setError(''); }} className={`flex-1 py-4 font-bold text-sm ${activeTab === 'create' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500'}`}>تعریف شخص جدید</button>
        </div>
        
        <div className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-rose-50 text-rose-700 rounded-xl flex items-start gap-3 font-medium">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {activeTab === 'link' ? (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <Search className="w-4 h-4 text-slate-400" />
                    جستجو و انتخاب شخص
                  </label>
                  <Select
                    options={personOptions}
                    placeholder="نام، کد ملی یا شماره تماس..."
                    noOptionsMessage={() => "شخصی یافت نشد"}
                    onChange={(option: any) => setSelectedPersonId(option?.value)}
                    isClearable
                    className="react-select-container"
                    classNamePrefix="react-select"
                    styles={{
                      control: (base, state) => ({
                        ...base,
                        borderRadius: '1rem',
                        padding: '0.25rem',
                        borderColor: state.isFocused ? '#4f46e5' : '#e2e8f0',
                        boxShadow: state.isFocused ? '0 0 0 2px rgba(79, 70, 229, 0.1)' : 'none',
                        '&:hover': {
                          borderColor: '#4f46e5'
                        }
                      })
                    }}
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    * فقط اشخاص با نقش "کارمند" را باید انتخاب کنید.
                  </p>
                </div>

                <button
                  onClick={handleLink}
                  disabled={loading || !selectedPersonId}
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      تایید و اتصال پروفایل
                    </>
                  )}
                </button>
              </div>
          ) : (
              <div className="space-y-6">
                <div className="text-center">
                  <p className="text-slate-600 font-medium mb-6">
                    برای ثبت اطلاعات دقیق و کامل، از فرم استاندارد تعریف شخص استفاده کنید.
                  </p>
                  <button
                    onClick={() => setIsPersonModalOpen(true)}
                    className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-600/20 transition-all"
                  >
                    <Plus className="w-5 h-5" />
                    باز کردن فرم ثبت شخص جدید
                  </button>
                </div>
              </div>
          )}
          
          <button
            onClick={signOut}
            className="w-full mt-4 py-3 text-slate-500 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-100 transition-all"
          >
            <LogOut className="w-4 h-4" />
            خروج از حساب
          </button>
        </div>
      </div>
      
      {isPersonModalOpen && (
        <PersonFormModal
          isOpen={isPersonModalOpen}
          onClose={() => setIsPersonModalOpen(false)}
          editingPersonId={null}
          persons={persons}
          personGroups={personGroups}
          personRoles={personRoles}
          onSuccess={handlePersonCreated}
          confirmAction={(msg, onConfirm) => { if (window.confirm(msg)) onConfirm(); }}
          showNotification={(msg, type) => {
            if (type === 'error') setError(msg);
          }}
        />
      )}
    </div>
  );
}
