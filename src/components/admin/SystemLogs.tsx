import React, { useState, useEffect } from 'react';
import { Search, Clock, Activity, User, Database, Filter } from 'lucide-react';
import { getSystemLogs } from '../../services/dataService';
import { SystemLog } from '../../types';

export default function SystemLogs() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState('ALL');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await getSystemLogs();
      setLogs(data as SystemLog[]);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionName = (action: string) => {
    if (action === 'CREATE' || action.startsWith('ADD_')) return 'ثبت جدید';
    if (action === 'UPDATE' || action.startsWith('UPDATE_')) return 'ویرایش';
    if (action === 'DELETE' || action.startsWith('DELETE_')) return 'حذف';
    return action;
  };

  const getActionColor = (action: string) => {
    if (action === 'CREATE' || action.startsWith('ADD_')) return 'bg-emerald-50 text-emerald-600 border-emerald-100';
    if (action === 'UPDATE' || action.startsWith('UPDATE_')) return 'bg-blue-50 text-blue-600 border-blue-100';
    if (action === 'DELETE' || action.startsWith('DELETE_')) return 'bg-rose-50 text-rose-600 border-rose-100';
    return 'bg-gray-50 text-gray-600 border-gray-100';
  };

  const getEntityName = (type: string) => {
    const map: Record<string, string> = {
      'products': 'کالاها و خدمات',
      'invoices': 'فاکتورها و اسناد',
      'persons': 'اشخاص (مشتریان/تامین‌کنندگان)',
      'transactions': 'تراکنش‌های مالی',
      'accounts': 'حساب‌های بانکی',
      'cashboxes': 'صندوق‌ها',
      'users': 'کاربران',
      'settings': 'تنظیمات',
      'product_categories': 'گروه‌های کالا',
      'person_groups': 'گروه‌بندی اشخاص',
      'financial_years': 'سال‌های مالی',
      'company_profile': 'پروفایل شرکت',
      'warehouses': 'انبارها'
    };
    return map[type] || type;
  };

  const filteredLogs = logs.filter(log => {
    if (filterAction !== 'ALL' && !log.action.startsWith(filterAction)) return false;
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!log.details.toLowerCase().includes(q) && 
          !log.entityType.toLowerCase().includes(q) &&
          !log.action.toLowerCase().includes(q)) {
        return false;
      }
    }
    
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Activity className="w-6 h-6 text-indigo-600" />
            لاگ سیستم (تاریخچه عملیات)
          </h2>
          <p className="text-sm font-bold text-slate-500 mt-1">رهگیری تمامی عملیات‌های انجام شده در سیستم</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-5 h-5 text-gray-400 absolute right-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="جستجو در لاگ‌ها..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pr-10 pl-4 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all placeholder-slate-400 font-bold"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select 
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer"
          >
            <option value="ALL">همه عملیات‌ها</option>
            <option value="ADD">فقط ثبت‌ها</option>
            <option value="UPDATE">فقط ویرایش‌ها</option>
            <option value="DELETE">فقط حذف‌ها</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 font-bold">در حال بارگذاری لاگ‌ها...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
             <Filter className="w-12 h-12 text-slate-300 mb-3" />
             <div className="text-slate-500 font-bold">لاگی یافت نشد!</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="bg-slate-50 text-sm text-slate-500 border-b border-slate-200 text-right">
                  <th className="p-4 font-black">زمان</th>
                  <th className="p-4 font-black">کاربر</th>
                  <th className="p-4 font-black">عملیات</th>
                  <th className="p-4 font-black">موجودیت</th>
                  <th className="p-4 font-black">جزئیات / اطلاعات تراکنش</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => {
                  const dateObj = new Date(log.timestamp);
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 text-xs font-bold text-slate-600">
                        <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5"/>
                           <span dir="ltr">{dateObj.toLocaleDateString('fa-IR')} - {dateObj.toLocaleTimeString('fa-IR')}</span>
                        </div>
                      </td>
                      <td className="p-4 font-bold text-slate-700 text-xs">
                        <div className="flex items-center gap-1.5"><User className="w-3.5 h-3.5"/> {log.userId === 'system' ? 'سیستم' : log.userId}</div>
                      </td>
                      <td className="p-4">
                        <span className={'px-2 py-1 rounded inline-block text-[10px] font-black border ' + getActionColor(log.action)}>
                          {getActionName(log.action)}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-slate-700 text-xs text-left" dir="ltr">
                        <div className="flex justify-end items-center gap-1.5">{getEntityName(log.entityType)} <Database className="w-3.5 h-3.5"/></div>
                      </td>
                      <td className="p-4 font-medium text-xs text-slate-600 w-1/3">
                        <div className="truncate max-w-sm">{log.details}</div>
                        {log.changes && (
                          <div className="mt-2 p-2 bg-slate-100 rounded-lg text-left overflow-x-auto max-h-32 text-[10px] font-mono whitespace-pre-wrap break-all" dir="ltr">
                            {(() => {
                              try {
                                const parsed = JSON.parse(log.changes);
                                return JSON.stringify(parsed, null, 2);
                              } catch(e) {
                                return log.changes;
                              }
                            })()}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}