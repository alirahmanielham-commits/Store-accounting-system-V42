import React, { useEffect, useState, useCallback } from 'react';
import { getSyncQueue, updateSyncTaskStatus, removeSyncTask, SyncTask } from '../../services/syncQueueService';


import { 
  addProductToServer, updateProductToServer, deleteProductToServer,
  addProductCategoryToServer, updateProductCategoryToServer, deleteProductCategoryToServer
} from '../../services/productService';
import { 
  addPersonToServer, updatePersonToServer, deletePersonToServer,
  addPersonGroupToServer, updatePersonGroupToServer, deletePersonGroupToServer,
  addPersonRoleToServer, updatePersonRoleToServer, deletePersonRoleToServer,
  addPersonCategoryToServer, updatePersonCategoryToServer, deletePersonCategoryToServer
} from '../../services/personService';


export default function BackgroundSync() {
  const [isSyncing, setIsSyncing] = useState(false);

  const processQueue = useCallback(async () => {
    if (isSyncing) return;
    const queue = getSyncQueue();
    
    const tasksToProcess = [];
    for (const task of queue) {
      if (task.status === 'ERROR') {
        break; // Stop auto-processing if there is an error
      }
      if (task.status === 'PENDING') {
        tasksToProcess.push(task);
      }
    }

    if (tasksToProcess.length === 0) return;
    setIsSyncing(true);

    for (const task of tasksToProcess) {
      updateSyncTaskStatus(task.id, 'SYNCING');
      try {
        if (task.operation === 'ADD_PERSON') {
          const { isLocalUnsynced, ...payload } = task.payload;
          await addPersonToServer(payload);
        } else if (task.operation === 'UPDATE_PERSON') {
          await updatePersonToServer(task.payload.id, task.payload.person);
        } else if (task.operation === 'DELETE_PERSON') {
          await deletePersonToServer(task.payload.id);
        } else if (task.operation === 'ADD_PERSON_GROUP') {
          const { isLocalUnsynced, ...payload } = task.payload;
          await addPersonGroupToServer(payload);
        } else if (task.operation === 'UPDATE_PERSON_GROUP') {
          await updatePersonGroupToServer(task.payload.id, task.payload.group);
        } else if (task.operation === 'DELETE_PERSON_GROUP') {
          await deletePersonGroupToServer(task.payload.id);
        } else if (task.operation === 'ADD_PERSON_ROLE') {
          const { isLocalUnsynced, ...payload } = task.payload;
          await addPersonRoleToServer(payload);
        } else if (task.operation === 'UPDATE_PERSON_ROLE') {
          await updatePersonRoleToServer(task.payload.id, task.payload.role);
        } else if (task.operation === 'DELETE_PERSON_ROLE') {
          await deletePersonRoleToServer(task.payload.id);
        } else if (task.operation === 'ADD_PERSON_CATEGORY') {
          const { isLocalUnsynced, ...payload } = task.payload;
          await addPersonCategoryToServer(payload);
        } else if (task.operation === 'UPDATE_PERSON_CATEGORY') {
          await updatePersonCategoryToServer(task.payload.id, task.payload.category);
        } else if (task.operation === 'DELETE_PERSON_CATEGORY') {
          await deletePersonCategoryToServer(task.payload.id);
        } else if (task.operation === 'ADD_PRODUCT') {
          const { isLocalUnsynced, ...payload } = task.payload;
          await addProductToServer(payload);
        } else if (task.operation === 'UPDATE_PRODUCT') {
          await updateProductToServer(task.payload.id, task.payload.product);
        } else if (task.operation === 'DELETE_PRODUCT') {
          await deleteProductToServer(task.payload.id);
        } else if (task.operation === 'ADD_PRODUCT_CATEGORY') {
          const { isLocalUnsynced, ...payload } = task.payload;
          await addProductCategoryToServer(payload);
        } else if (task.operation === 'UPDATE_PRODUCT_CATEGORY') {
          await updateProductCategoryToServer(task.payload.id, task.payload.category);
        } else if (task.operation === 'DELETE_PRODUCT_CATEGORY') {
          await deleteProductCategoryToServer(task.payload.id);
        }

        // Successfully synced!
        removeSyncTask(task.id);
      } catch (error: any) {
        console.error('Failed to sync task:', task, error);
        updateSyncTaskStatus(task.id, 'ERROR', error.message || 'Unknown error');
        // Stop syncing rest of queue to maintain order consistency
        break; 
      }
    }

    setIsSyncing(false);
  }, [isSyncing]);

  useEffect(() => {
    // Initial sync attempt
    processQueue();

    // Listen for manual triggers
    const handleTrigger = () => processQueue();
    window.addEventListener('trigger_background_sync', handleTrigger);
    
    // Poll every 10 seconds just in case
    const interval = setInterval(() => {
       processQueue();
    }, 10000);

    return () => {
      window.removeEventListener('trigger_background_sync', handleTrigger);
      clearInterval(interval);
    };
  }, [processQueue]);

  return null; // Silent background component
}
