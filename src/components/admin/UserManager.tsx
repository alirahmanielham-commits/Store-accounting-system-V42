import React, { useState, useEffect } from 'react';
import { Shield, Plus, Edit2, Trash2, CheckCircle, User as UserIcon, Lock, Settings } from 'lucide-react';
import { User, UserRole } from '../../types';
import { getUsers, addUser, updateUser, deleteUser, getPersons } from '../../services/dataService';
import { motion } from 'motion/react';
import AdvancedProfileModal from '../profile/advanced/AdvancedProfileModal';

export default function UserManager() {
  const [users, setUsers] = useState<User[]>([]);
  const [persons, setPersons] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [profileModalId, setProfileModalId] = useState<string | number | null>(null);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  const [form, setForm] = useState({
    username: '',
    password: '',
    name: '',
    role: 'employee' as UserRole,
    isActive: true,
    requires2FA: false
  });

  const loadUsers = async () => {
    const data = await getUsers();
    setUsers(data);
    const pData = await getPersons();
    setPersons(pData);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleEdit = (u: User) => {
    setEditingId(u.id);
    setForm({
      username: u.username,
      password: u.password || '',
      name: u.name,
      role: u.role,
      isActive: u.isActive,
      requires2FA: u.requires2FA || false
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
       await updateUser(editingId.toString(), form);
       setSuccessMsg('کاربر با موفقیت ویرایش شد.');
    } else {
       await addUser(form);
       setSuccessMsg('کاربر با موفقیت اضافه شد.');
    }
    setIsModalOpen(false);
    loadUsers();
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleDelete = async (id: string | number) => {
    if (confirm('آیا از حذف این کاربر اطمینان دارید؟')) {
       await deleteUser(id.toString());
       loadUsers();
    }
  };

  const roleLabels: Record<UserRole, string> = {
    admin: 'مدیر کل',
    manager: 'مدیر',
    employee: 'کارمند',
    customer: 'مشتری',
    guest: 'مهمان',
    accountant: 'حسابدار',
    cashier: 'صندوق‌دار'
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden text-right" dir="rtl">
       <div className="bg-gradient-to-l from-indigo-50 to-white px-8 py-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
                <Shield className="w-6 h-6 text-indigo-600" />
                مدیریت کاربران و سطوح دسترسی
              </h1>
              <p className="text-sm text-gray-500 font-medium mt-1">مدیریت مدیران، صندوق‌داران و حسابداران سیستم</p>
            </div>
            <button onClick={() => {
                setEditingId(null);
                setForm({ username: '', password: '', name: '', role: 'employee', isActive: true, requires2FA: false });
                setIsModalOpen(true);
            }} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2 transition-colors text-sm font-medium">
               <Plus className="w-4 h-4"/> ایجاد کاربر جدید
            </button>
       </div>

       {successMsg && (
         <div className="mx-6 mt-6 bg-green-50 text-green-700 px-4 py-3 rounded-xl flex items-center gap-2 border border-green-100">
           <CheckCircle className="w-5 h-5" />
           {successMsg}
         </div>
       )}

       <div className="p-0 overflow-x-auto">
          <table className="w-full text-right">
             <thead>
               <tr className="bg-gray-50 border-b border-gray-100 text-sm font-medium text-gray-500 text-right">
                 <th className="px-6 py-4">نام کامل</th>
                 <th className="px-6 py-4">نام کاربری</th>
                 <th className="px-6 py-4">نقش سیستمی</th>
                 <th className="px-6 py-4">وضعیت</th>
                 <th className="px-6 py-4">پروفایل شخص</th>
                 <th className="px-6 py-4 text-center">عملیات</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-gray-50 text-sm">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 font-bold text-gray-800">{u.name}</td>
                    <td className="px-6 py-4 text-gray-600 font-mono text-left" dir="ltr">{u.username}</td>
                    <td className="px-6 py-4">
                       <span className="inline-block px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-md text-xs font-bold border border-indigo-100">
                          {roleLabels[u.role] || u.role}
                       </span>
                    </td>
                    <td className="px-6 py-4 flex flex-col gap-2">
                       {u.isActive ? (
                         <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded text-xs text-center">فعال</span>
                       ) : (
                         <span className="text-rose-600 font-bold bg-rose-50 px-2 py-1 rounded text-xs text-center">غیرفعال</span>
                       )}
                       {u.requires2FA && (
                         <span className="text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded text-[10px] text-center border border-blue-100">OTP روشن</span>
                       )}
                    </td>
                    <td className="px-6 py-4">
                       {(() => {
                         if (!u.personId) return <span className="text-gray-400 text-xs">متصل نیست</span>;
                         const p = persons.find(x => String(x.id) === String(u.personId));
                         return p ? <span className="text-indigo-600 font-bold text-xs">{p.name}</span> : <span className="text-gray-400 text-xs">یافت نشد</span>;
                       })()}
                    </td>
                    <td className="px-6 py-4 flex gap-2 justify-center">
                       <button onClick={() => setProfileModalId(u.id)} title="پروفایل پیشرفته" className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg">
                          <Settings className="w-4 h-4"/>
                       </button>
                       <button onClick={() => handleEdit(u)} className="p-2 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg">
                          <Edit2 className="w-4 h-4"/>
                       </button>
                       {u.username !== 'admin' && (
                         <button onClick={() => handleDelete(u.id)} className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg">
                            <Trash2 className="w-4 h-4"/>
                         </button>
                       )}
                    </td>
                  </tr>
                ))}
             </tbody>
          </table>
       </div>

       {profileModalId && (
         <AdvancedProfileModal 
           onClose={() => {
             setProfileModalId(null);
             loadUsers();
           }} 
           targetUserId={profileModalId} 
         />
       )}

       {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
               <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                     {editingId ? <Edit2 className="w-5 h-5 text-indigo-500"/> : <Plus className="w-5 h-5 text-indigo-500"/>}
                     {editingId ? 'ویرایش کاربر' : 'کاربر جدید'}
                  </h3>
               </div>
               <form onSubmit={handleSave} className="p-6 space-y-5">
                  <div>
                     <label className="block text-sm font-bold mb-1">نام کامل</label>
                     <input type="text" required value={form.name} onChange={e=>setForm({...form, name: e.target.value})} className="w-full p-2 border rounded-xl focus:ring-2 focus:ring-indigo-500"/>
                  </div>
                  <div>
                     <label className="block text-sm font-bold mb-1">نام کاربری</label>
                     <input type="text" required value={form.username} onChange={e=>setForm({...form, username: e.target.value})} className="w-full p-2 border rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono text-left" dir="ltr"/>
                  </div>
                  <div>
                     <label className="block text-sm font-bold mb-1">رمز عبور</label>
                     <input type="text" required={!editingId} value={form.password} onChange={e=>setForm({...form, password: e.target.value})} className="w-full p-2 border rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono text-left" dir="ltr" placeholder={editingId ? 'جهت تغییر رمز وارد کنید' : ''}/>
                  </div>
                  <div>
                     <label className="block text-sm font-bold mb-1">نقش دسترسی</label>
                     <select value={form.role} onChange={e=>setForm({...form, role: e.target.value as UserRole})} className="w-full p-2 border rounded-xl focus:ring-2 focus:ring-indigo-500">
                        {Object.entries(roleLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                     </select>
                  </div>
                  <div className="flex items-center gap-3">
                     <label className="text-sm font-bold">وضعیت حساب:</label>
                     <label className="flex items-center gap-1 cursor-pointer">
                        <input type="checkbox" checked={form.isActive} onChange={e=>setForm({...form, isActive: e.target.checked})}/>
                        <span>فعال است</span>
                     </label>
                  </div>
                  <div className="flex items-center gap-3">
                     <label className="text-sm font-bold">ورود دو مرحله‌ای (OTP):</label>
                     <label className="flex items-center gap-1 cursor-pointer">
                        <input type="checkbox" checked={form.requires2FA} onChange={e=>setForm({...form, requires2FA: e.target.checked})}/>
                        <span>فعال است</span>
                     </label>
                  </div>
                  <div className="pt-4 flex gap-3">
                     <button type="submit" className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700">ذخیره اطلاعات</button>
                     <button type="button" onClick={()=>setIsModalOpen(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200">انصراف</button>
                  </div>
               </form>
            </div>
          </div>
       )}
    </motion.div>
  );
}
