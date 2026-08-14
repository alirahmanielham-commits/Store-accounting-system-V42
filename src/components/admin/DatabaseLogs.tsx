import React, { useState, useEffect } from 'react';
import { Search, Clock, Database, Filter, ArrowRight, ArrowLeft } from 'lucide-react';
import { getDatabaseLogs } from '../../services/dataService';

export default function DatabaseLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState('ALL');
  const [filterEntity, setFilterEntity] = useState('ALL');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await getDatabaseLogs();
      setLogs(data);
    } catch (error) {
      console.error('Error fetching database logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    if (action === 'CREATE') return 'bg-emerald-50 text-emerald-600 border-emerald-100';
    if (action === 'UPDATE') return 'bg-blue-50 text-blue-600 border-blue-100';
    if (action === 'DELETE') return 'bg-rose-50 text-rose-600 border-rose-100';
    return 'bg-gray-50 text-gray-600 border-gray-100';
  };

  const getActionName = (action: string) => {
    if (action === 'CREATE') return 'ایجاد رکورد';
    if (action === 'UPDATE') return 'ویرایش رکورد';
    if (action === 'DELETE') return 'حذف رکورد';
    return action;
  };

  const getEntityName = (type: string) => {
    const map: Record<string, string> = {
      'products': 'کالاها',
      'invoices': 'فاکتورها',
      'persons': 'اشخاص',
      'transactions': 'تراکنش‌ها',
      'accounts': 'حساب‌ها',
      'cashboxes': 'صندوق‌ها',
      'users': 'کاربران',
      'warehouses': 'انبارها',
      'accounting_documents': 'اسناد حسابداری'
    };
    return map[type] || type;
  };

  const filteredLogs = logs.filter(log => {
    if (filterAction !== 'ALL' && log.action !== filterAction) return false;
    if (filterEntity !== 'ALL' && log.entityType !== filterEntity) return false;
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!log.entityId.toLowerCase().includes(q) &&
          !log.userId.toLowerCase().includes(q) &&
          (!log.newData || !log.newData.toLowerCase().includes(q)) &&
          (!log.oldData || !log.oldData.toLowerCase().includes(q))) {
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
            <Database className="w-6 h-6 text-indigo-600" />
            لاگ دقیق دیتابیس
          </h2>
          <p className="text-sm font-bold text-slate-500 mt-1">تغییرات جداول به همراه محتوای قبلی و جدید</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-5 h-5 text-gray-400 absolute right-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="جستجو در محتوا..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pr-10 pl-4 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all placeholder-slate-400 font-bold"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select 
            value={filterEntity}
            onChange={(e) => setFilterEntity(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            <option value="ALL">همه جداول</option>
            <option value="invoices">فاکتورها</option>
            <option value="persons">اشخاص</option>
            <option value="products">کالاها</option>
            <option value="transactions">تراکنش‌ها</option>
            <option value="accounting_documents">اسناد حسابداری</option>
            <option value="users">کاربران</option>
          </select>
          <select 
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            <option value="ALL">همه عملیات‌ها</option>
            <option value="CREATE">ایجاد</option>
            <option value="UPDATE">ویرایش</option>
            <option value="DELETE">حذف</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 font-bold">در حال بارگذاری لاگ‌ها...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
             <Filter className="w-12 h-12 text-slate-300 mb-3" />
             <div className="text-slate-500 font-bold">رکوردی یافت نشد.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="bg-slate-50 text-sm text-slate-500 border-b border-slate-200 text-right">
                  <th className="p-4 font-black">زمان / کاربر</th>
                  <th className="p-4 font-black">جدول / شناسه</th>
                  <th className="p-4 font-black">عملیات</th>
                  <th className="p-4 font-black">تغییرات محتوا</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => {
                  const dateObj = new Date(log.timestamp);
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 text-xs font-bold text-slate-600 align-top whitespace-nowrap">
                        <div className="flex flex-col gap-2">
                           <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5"/>
                              <span dir="ltr">{dateObj.toLocaleDateString('fa-IR')} {dateObj.toLocaleTimeString('fa-IR')}</span>
                           </div>
                           <div className="text-slate-500">کاربر: {log.userId}</div>
                        </div>
                      </td>
                      <td className="p-4 font-bold text-slate-700 text-xs align-top whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <span className="text-indigo-600 font-black">{getEntityName(log.entityType)}</span>
                          <span className="text-[10px] text-slate-400 font-mono" dir="ltr">{log.entityId}</span>
                        </div>
                      </td>
                      <td className="p-4 align-top">
                        <span className={'px-2 py-1 rounded inline-block text-[10px] font-black border ' + getActionColor(log.action)}>
                          {getActionName(log.action)}
                        </span>
                      </td>
                      <td className="p-4 align-top w-1/2">
                        {log.action === 'UPDATE' && (
                           <div className="grid grid-cols-2 gap-4">
                             <div className="bg-rose-50/50 p-2 rounded border border-rose-100">
                               <div className="text-xs font-black text-rose-700 mb-1 flex items-center gap-1"><ArrowRight className="w-3 h-3"/> مقدار قبلی</div>
                               <pre className="text-[10px] text-slate-600 whitespace-pre-wrap break-all font-mono" dir="ltr">
                                 {JSON.stringify(JSON.parse(log.oldData || '{}'), null, 2)}
                               </pre>
                             </div>
                             <div className="bg-emerald-50/50 p-2 rounded border border-emerald-100">
                               <div className="text-xs font-black text-emerald-700 mb-1 flex items-center gap-1"><ArrowLeft className="w-3 h-3"/> مقدار جدید</div>
                               <pre className="text-[10px] text-slate-600 whitespace-pre-wrap break-all font-mono" dir="ltr">
                                 {JSON.stringify(JSON.parse(log.newData || '{}'), null, 2)}
                               </pre>
                             </div>
                           </div>
                        )}
                        {log.action === 'CREATE' && (
                           <div className="bg-emerald-50/50 p-2 rounded border border-emerald-100">
                             <div className="text-xs font-black text-emerald-700 mb-1">رکورد جدید</div>
                             <pre className="text-[10px] text-slate-600 whitespace-pre-wrap break-all font-mono" dir="ltr">
                               {JSON.stringify(JSON.parse(log.newData || '{}'), null, 2)}
                             </pre>
                           </div>
                        )}
                        {log.action === 'DELETE' && (
                           <div className="bg-rose-50/50 p-2 rounded border border-rose-100">
                             <div className="text-xs font-black text-rose-700 mb-1">رکورد حذف شده</div>
                             <pre className="text-[10px] text-slate-600 whitespace-pre-wrap break-all font-mono" dir="ltr">
                               {JSON.stringify(JSON.parse(log.oldData || '{}'), null, 2)}
                             </pre>
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
