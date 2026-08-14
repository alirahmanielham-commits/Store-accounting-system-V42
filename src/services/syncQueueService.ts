export type SyncOperation = 'ADD_PERSON' | 'UPDATE_PERSON' | 'DELETE_PERSON' | 'ADD_PERSON_GROUP' | 'UPDATE_PERSON_GROUP' | 'DELETE_PERSON_GROUP' | 'ADD_PERSON_ROLE' | 'UPDATE_PERSON_ROLE' | 'DELETE_PERSON_ROLE' | 'ADD_PERSON_CATEGORY' | 'UPDATE_PERSON_CATEGORY' | 'DELETE_PERSON_CATEGORY' | 'ADD_PRODUCT' | 'UPDATE_PRODUCT' | 'DELETE_PRODUCT' | 'ADD_PRODUCT_CATEGORY' | 'UPDATE_PRODUCT_CATEGORY' | 'DELETE_PRODUCT_CATEGORY';

export interface SyncTask {
  id: string;
  operation: SyncOperation;
  payload: any;
  status: 'PENDING' | 'SYNCING' | 'ERROR';
  error?: string;
  createdAt: number;
}

export const getSyncQueue = (): SyncTask[] => {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem('sync_queue');
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (e) {
      return [];
    }
  }
  return [];
};

export const saveSyncQueue = (queue: SyncTask[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('sync_queue', JSON.stringify(queue));
    // Trigger an event so UI can update
    window.dispatchEvent(new Event('sync_queue_changed'));
  }
};

export const enqueueSyncTask = (operation: SyncOperation, payload: any) => {
  const queue = getSyncQueue();
  const newTask: SyncTask = {
    id: 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
    operation,
    payload,
    status: 'PENDING',
    createdAt: Date.now()
  };
  queue.push(newTask);
  saveSyncQueue(queue);
  
  // Try to start sync immediately in background
  if (typeof window !== 'undefined') {
     setTimeout(() => {
        window.dispatchEvent(new Event('trigger_background_sync'));
     }, 100);
  }
  return newTask;
};

export const removeSyncTask = (taskId: string) => {
  const queue = getSyncQueue();
  const filtered = queue.filter(t => t.id !== taskId);
  saveSyncQueue(filtered);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('trigger_background_sync'));
  }
};

export const updateSyncTaskStatus = (taskId: string, status: SyncTask['status'], error?: string) => {
  const queue = getSyncQueue();
  const task = queue.find(t => t.id === taskId);
  if (task) {
    task.status = status;
    if (error) task.error = error;
    saveSyncQueue(queue);
  }
};

export const clearCompletedSyncTasks = () => {
    // Actually we remove them once synced, but this is a fallback
};

import { useState, useEffect } from 'react';
export const useSyncQueueLength = () => {
  const [count, setCount] = useState(() => getSyncQueue().length);
  useEffect(() => {
    const handler = () => setCount(getSyncQueue().length);
    window.addEventListener('sync_queue_changed', handler);
    return () => window.removeEventListener('sync_queue_changed', handler);
  }, []);
  return count;
};
