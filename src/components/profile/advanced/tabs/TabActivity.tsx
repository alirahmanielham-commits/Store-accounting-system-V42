import React, { useEffect, useState } from 'react';
import { User } from '../../../../types';
import { Activity, Clock, LogIn, Settings, Edit, FileText } from 'lucide-react';
import { getSystemLogs } from '../../../../services/dataService';

interface Props {
  data: User;
}

export default function TabActivity({ data }: Props) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLogs() {
      try {
        const allLogs = await getSystemLogs();
        // Filter logs related to this user
        const userLogs = allLogs.filter(log => log.userId === data.id || log.username === data.username);
        setLogs(userLogs.slice(0, 20)); // show last 20
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, [data.id, data.username]);

  const getLogIcon = (action: string) => {
    if (action.includes('LOGIN') || action.includes('LOGOUT')) return LogIn;
    if (action.includes('UPDATE') || action.includes('EDIT')) return Edit;
    if (action.includes('SETTINGS')) return Settings;
    return FileText;
  };

  const getLogColor = (level: string) => {
    if (level === 'ERROR') return 'text-rose-500 bg-rose-50';
    if (level === 'WARNING') return 'text-amber-500 bg-amber-50';
    return 'text-indigo-500 bg-indigo-50';
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
          <Activity className="w-5 h-5 text-indigo-500" />
          <div>
            <h3 className="font-bold text-slate-800">فعالیت‌های اخیر شما (Audit Log)</h3>
            <p className="text-xs text-slate-500 mt-1">گزارش ورودها، خروج‌ها و تغییرات انجام شده توسط شما در سیستم</p>
          </div>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center p-8">
              <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center p-8 text-slate-400">
              <Clock className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              هیچ فعالیتی برای نمایش یافت نشد.
            </div>
          ) : (
            <div className="relative border-r-2 border-slate-100 pr-6 space-y-8 my-4">
              {logs.map((log, index) => {
                const Icon = getLogIcon(log.action);
                const date = new Date(log.timestamp);
                return (
                  <div key={log.id || index} className="relative">
                    <span className={`absolute -right-[35px] w-10 h-10 rounded-full flex items-center justify-center border-4 border-white ${getLogColor(log.level)}`}>
                      <Icon className="w-4 h-4" />
                    </span>
                    <div className="bg-slate-50 p-4 rounded-2xl">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-bold text-slate-700 text-sm">{log.action}</div>
                        <div className="text-[10px] font-bold text-slate-400 bg-white px-2 py-1 rounded-lg border border-slate-200" dir="ltr">
                          {date.toLocaleDateString('fa-IR')} - {date.toLocaleTimeString('fa-IR')}
                        </div>
                      </div>
                      <p className="text-xs text-slate-500">{log.details}</p>
                      {log.ip && (
                        <div className="mt-3 text-[10px] font-mono text-slate-400" dir="ltr">IP: {log.ip}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
