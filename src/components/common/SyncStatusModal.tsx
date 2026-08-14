import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { X, RefreshCw, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { getSyncQueue, removeSyncTask, SyncTask, saveSyncQueue } from '../../services/syncQueueService';

interface SyncStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SyncStatusModal({ isOpen, onClose }: SyncStatusModalProps) {
  const [tasks, setTasks] = useState<SyncTask[]>([]);

  useEffect(() => {
    if (isOpen) {
      setTasks(getSyncQueue());
      const handler = () => setTasks(getSyncQueue());
      window.addEventListener('sync_queue_changed', handler);
      return () => window.removeEventListener('sync_queue_changed', handler);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRetry = (taskId: string) => {
    const queue = getSyncQueue();
    const task = queue.find(t => t.id === taskId);
    if (task) {
      task.status = 'PENDING';
      task.error = undefined;
      saveSyncQueue(queue);
      window.dispatchEvent(new Event('trigger_background_sync'));
    }
  };

  const handleRemove = (taskId: string) => {
    removeSyncTask(taskId);
  };

  const handleRetryAll = () => {
    const queue = getSyncQueue();
    let changed = false;
    queue.forEach(task => {
      if (task.status === 'ERROR') {
        task.status = 'PENDING';
        task.error = undefined;
        changed = true;
      }
    });
    if (changed) {
      saveSyncQueue(queue);
      window.dispatchEvent(new Event('trigger_background_sync'));
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" dir="rtl">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2 text-indigo-700">
            <RefreshCw className="w-5 h-5" />
            <h2 className="text-lg font-bold">وضعیت همگام‌سازی اطلاعات</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto bg-slate-50">
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-3" />
              <p className="text-lg font-medium text-slate-700">همه اطلاعات همگام‌سازی شده‌اند</p>
              <p className="text-sm">رکوردی برای ارسال به سرور وجود ندارد</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-medium text-slate-600">
                  تعداد تراکنش‌های در صف: <strong className="text-indigo-600 mx-1">{tasks.length}</strong> مورد
                </span>
                {tasks.some(t => t.status === 'ERROR') && (
                  <button
                    onClick={handleRetryAll}
                    className="text-xs flex items-center gap-1 bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg hover:bg-amber-200"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    تلاش مجدد خطادارها
                  </button>
                )}
              </div>
              
              {tasks.map(task => (
                <div key={task.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-md ${
                        task.operation.startsWith('ADD') ? 'bg-emerald-100 text-emerald-700' :
                        task.operation.startsWith('UPDATE') ? 'bg-blue-100 text-blue-700' :
                        'bg-rose-100 text-rose-700'
                      }`}>
                        {task.operation.startsWith('ADD') ? 'افزودن' :
                         task.operation.startsWith('UPDATE') ? 'ویرایش' :
                         'حذف'}
                         {' '}
                         {task.operation.includes('PRODUCT') 
                           ? (task.operation.includes('GROUP') ? 'گروه‌بندی کالا' 
                              : task.operation.includes('CATEGORY') ? 'دسته‌بندی کالا' 
                              : 'کالا')
                           : (task.operation.includes('GROUP') ? 'گروه‌بندی شخص' 
                              : task.operation.includes('ROLE') ? 'نقش' 
                              : task.operation.includes('CATEGORY') ? 'دسته‌بندی شخص' 
                              : 'شخص')
                         }
                      </span>
                      <span className="text-sm font-medium text-slate-700">
                        {task.payload?.name || task.payload?.person?.name || task.payload?.group?.name || task.payload?.role?.name || task.payload?.category?.name || task.payload?.id}
                      </span>
                    </div>
                    <div>
                      {task.status === 'PENDING' && <span className="flex items-center gap-1 text-slate-500 text-xs bg-slate-100 px-2 py-1 rounded"><Clock className="w-3.5 h-3.5"/> در صف</span>}
                      {task.status === 'SYNCING' && <span className="flex items-center gap-1 text-indigo-500 text-xs bg-indigo-50 px-2 py-1 rounded"><RefreshCw className="w-3.5 h-3.5 animate-spin"/> در حال ارسال...</span>}
                      {task.status === 'ERROR' && <span className="flex items-center gap-1 text-rose-500 text-xs bg-rose-50 px-2 py-1 rounded"><AlertCircle className="w-3.5 h-3.5"/> خطا در ارسال</span>}
                    </div>
                  </div>
                  
                  {task.status === 'ERROR' && task.error && (
                    <div className="text-xs text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-100">
                      دلیل خطا: {task.error}
                    </div>
                  )}

                  {(task.status === 'ERROR' || task.status === 'PENDING') && (
                    <div className="flex items-center gap-2 justify-end mt-1 border-t border-slate-50 pt-2">
                      <button onClick={() => handleRemove(task.id)} className="text-xs text-slate-500 hover:text-rose-600 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition-colors">
                        حذف از صف
                      </button>
                      {task.status === 'ERROR' && (
                        <button onClick={() => handleRetry(task.id)} className="text-xs text-indigo-600 hover:bg-indigo-50 bg-indigo-50/50 border border-indigo-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                          <RefreshCw className="w-3.5 h-3.5" />
                          تلاش مجدد
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
