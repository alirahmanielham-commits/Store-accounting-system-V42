import React, { useState, useEffect } from 'react';
import { getSyncQueue, SyncTask, removeSyncTask, updateSyncTaskStatus, saveSyncQueue } from '../../services/syncQueueService';
import { RefreshCw, Trash2, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SyncManager({ confirmAction }: { confirmAction?: any }) {
  const [tasks, setTasks] = useState<SyncTask[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadTasks = () => {
    setTasks(getSyncQueue());
  };

  useEffect(() => {
    loadTasks();
    const handler = () => loadTasks();
    window.addEventListener('sync_queue_changed', handler);
    // polling just in case
    const interval = setInterval(loadTasks, 2000);
    return () => {
      window.removeEventListener('sync_queue_changed', handler);
      clearInterval(interval);
    };
  }, []);

  const handleRemove = (id: string) => {
    if (confirmAction) {
      confirmAction('آیا از حذف این رکورد اطمینان دارید؟', () => removeSyncTask(id));
    } else {
      if (window.confirm('آیا از حذف این رکورد اطمینان دارید؟')) {
        removeSyncTask(id);
      }
    }
  };

  const handleRetry = (id: string) => {
    updateSyncTaskStatus(id, 'PENDING');
    window.dispatchEvent(new Event('trigger_background_sync'));
  };

  const handleClearCompleted = () => {
    const queue = getSyncQueue();
    const pending = queue.filter(t => t.status !== 'SYNCING' && t.status !== 'ERROR' && t.status !== 'PENDING'); // if any
    // Wait, getSyncQueue removes completed tasks usually. But if they are stuck as ERROR we can clear errors.
    const filtered = queue.filter(t => t.status === 'PENDING' || t.status === 'SYNCING');
    saveSyncQueue(filtered);
  };

  const triggerSync = () => {
    setIsRefreshing(true);
    window.dispatchEvent(new Event('trigger_background_sync'));
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING': return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'SYNCING': return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'ERROR': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING': return 'در صف انتظار';
      case 'SYNCING': return 'در حال همگام‌سازی';
      case 'ERROR': return 'خطا';
      default: return status;
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto pb-24">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-xl font-bold text-gray-800">مدیریت همگام‌سازی (آفلاین/آنلاین)</h2>
          <p className="text-sm text-gray-500 mt-1">مدیریت رکوردهایی که منتظر ارسال به سرور هستند یا با خطا مواجه شده‌اند.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button 
            onClick={triggerSync}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            تلاش مجدد برای همه
          </button>
          <button 
            onClick={handleClearCompleted}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-red-50 text-red-700 px-4 py-2 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
          >
            <Trash2 className="w-4 h-4" />
            پاکسازی خطادارها
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {tasks.length === 0 ? (
          <div className="p-12 text-center text-gray-500 flex flex-col items-center">
            <CheckCircle className="w-12 h-12 text-green-400 mb-4 opacity-50" />
            <p className="text-lg font-medium text-gray-700">همه اطلاعات همگام‌سازی شده‌اند</p>
            <p className="text-sm mt-1">صف همگام‌سازی در حال حاضر خالی است.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-gray-50 text-gray-600 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 font-semibold">عملیات</th>
                  <th className="px-6 py-4 font-semibold">وضعیت</th>
                  <th className="px-6 py-4 font-semibold">جزئیات خطا</th>
                  <th className="px-6 py-4 font-semibold">زمان ثبت</th>
                  <th className="px-6 py-4 font-semibold text-center">اقدامات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tasks.map(task => (
                  <tr key={task.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-800">{task.operation}</div>
                      <div className="text-xs text-gray-500 font-mono mt-1 w-48 truncate" title={JSON.stringify(task.payload)}>
                        {JSON.stringify(task.payload)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(task.status)}
                        <span className="font-medium">{getStatusText(task.status)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-red-600 text-xs max-w-xs">
                      {task.error ? (
                        <div className="flex items-start gap-1">
                          <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                          <span className="line-clamp-2" title={task.error}>{task.error}</span>
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 text-gray-500 font-mono text-xs" dir="ltr">
                      {new Date(task.createdAt).toLocaleString('fa-IR')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        {task.status === 'ERROR' && (
                          <button
                            onClick={() => handleRetry(task.id)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title="تلاش مجدد"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleRemove(task.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="حذف از صف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
