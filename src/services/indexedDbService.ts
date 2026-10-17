/**
 * IndexedDB Service for Multi-Business Architecture
 * Each business has its own completely separate IndexedDB database:
 * DB Name: hesabpak_business_<storeId>
 */

const DB_PREFIX = 'hesabpak_business_';
const DB_VERSION = 1;

export const BUSINESS_STORES = [
  'products',
  'persons',
  'invoices',
  'transactions',
  'categories',
  'accounts',
  'cashboxes',
  'warehouses',
  'financial_years',
  'settings',
  'meta'
] as const;

export type BusinessStoreName = typeof BUSINESS_STORES[number];

// Connection pool for open IDB connections per store
const dbInstances: Record<string, IDBDatabase> = {};

export function getDatabaseName(storeId: string): string {
  const cleanId = (storeId || 'default').replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${DB_PREFIX}${cleanId}`;
}

export function isIndexedDbSupported(): boolean {
  return typeof window !== 'undefined' && 'indexedDB' in window;
}

/**
 * Open or get cached IndexedDB connection for a specific business
 */
export async function openBusinessDb(storeId: string): Promise<IDBDatabase | null> {
  if (!isIndexedDbSupported()) return null;

  const dbName = getDatabaseName(storeId);
  if (dbInstances[dbName]) {
    try {
      // Test if connection is still active
      dbInstances[dbName].transaction(['meta'], 'readonly');
      return dbInstances[dbName];
    } catch {
      delete dbInstances[dbName];
    }
  }

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(dbName, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;

      BUSINESS_STORES.forEach(storeName => {
        if (!db.objectStoreNames.contains(storeName)) {
          if (storeName === 'settings' || storeName === 'meta') {
            db.createObjectStore(storeName, { keyPath: 'key' });
          } else {
            db.createObjectStore(storeName, { keyPath: 'id' });
          }
        }
      });
    };

    request.onsuccess = () => {
      const db = request.result;
      dbInstances[dbName] = db;
      db.onclose = () => {
        delete dbInstances[dbName];
      };
      resolve(db);
    };

    request.onerror = () => {
      console.warn(`Failed opening IndexedDB for business ${storeId}:`, request.error);
      resolve(null);
    };
  });
}

/**
 * Save array of records to a specific entity store in the business's IndexedDB
 */
export async function saveEntitiesToIndexedDb(
  storeId: string,
  storeName: BusinessStoreName,
  items: any[]
): Promise<void> {
  if (!isIndexedDbSupported() || !Array.isArray(items)) return;

  try {
    const db = await openBusinessDb(storeId);
    if (!db || !db.objectStoreNames.contains(storeName)) return;

    return new Promise((resolve) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);

      // Clear existing records before replacing to ensure strict consistency
      store.clear();

      items.forEach((item) => {
        if (item && typeof item === 'object') {
          try {
            store.put(item);
          } catch (e) {
            console.warn(`Error storing item in ${storeName}:`, e);
          }
        }
      });

      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch (err) {
    console.warn(`Error in saveEntitiesToIndexedDb for ${storeName}:`, err);
  }
}

/**
 * Retrieve all records from a specific entity store in the business's IndexedDB
 */
export async function getEntitiesFromIndexedDb<T = any>(
  storeId: string,
  storeName: BusinessStoreName
): Promise<T[]> {
  if (!isIndexedDbSupported()) return [];

  try {
    const db = await openBusinessDb(storeId);
    if (!db || !db.objectStoreNames.contains(storeName)) return [];

    return new Promise((resolve) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve((request.result as T[]) || []);
      };

      request.onerror = () => {
        resolve([]);
      };
    });
  } catch {
    return [];
  }
}

/**
 * Save a key-value setting in the business's settings store
 */
export async function saveSettingToIndexedDb(
  storeId: string,
  key: string,
  value: any
): Promise<void> {
  if (!isIndexedDbSupported()) return;

  try {
    const db = await openBusinessDb(storeId);
    if (!db || !db.objectStoreNames.contains('settings')) return;

    return new Promise((resolve) => {
      const tx = db.transaction('settings', 'readwrite');
      const store = tx.objectStore('settings');
      store.put({ key, value, updatedAt: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch (err) {
    console.warn(`Error in saveSettingToIndexedDb:`, err);
  }
}

/**
 * Get a setting value from the business's settings store
 */
export async function getSettingFromIndexedDb<T = any>(
  storeId: string,
  key: string
): Promise<T | null> {
  if (!isIndexedDbSupported()) return null;

  try {
    const db = await openBusinessDb(storeId);
    if (!db || !db.objectStoreNames.contains('settings')) return null;

    return new Promise((resolve) => {
      const tx = db.transaction('settings', 'readonly');
      const store = tx.objectStore('settings');
      const request = store.get(key);

      request.onsuccess = () => {
        if (request.result && request.result.value !== undefined) {
          resolve(request.result.value as T);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Wipe all data in the IndexedDB for a business
 */
export async function clearBusinessIndexedDb(storeId: string): Promise<void> {
  if (!isIndexedDbSupported()) return;

  try {
    const db = await openBusinessDb(storeId);
    if (!db) return;

    return new Promise((resolve) => {
      const storeNames = Array.from(db.objectStoreNames);
      if (storeNames.length === 0) return resolve();

      const tx = db.transaction(storeNames, 'readwrite');
      storeNames.forEach((name) => {
        try {
          tx.objectStore(name).clear();
        } catch (_) {}
      });

      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch (e) {
    console.warn(`Error clearing business ${storeId} IndexedDB:`, e);
  }
}

/**
 * Permanently drop the IndexedDB database for a business
 */
export async function deleteBusinessIndexedDb(storeId: string): Promise<void> {
  if (!isIndexedDbSupported()) return;

  const dbName = getDatabaseName(storeId);
  if (dbInstances[dbName]) {
    try {
      dbInstances[dbName].close();
    } catch (_) {}
    delete dbInstances[dbName];
  }

  return new Promise((resolve) => {
    const req = window.indexedDB.deleteDatabase(dbName);
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  });
}

/**
 * Synchronize all fetched business data into its isolated IndexedDB
 */
export async function syncBusinessDataToIndexedDb(
  storeId: string,
  bundle: {
    products?: any[];
    persons?: any[];
    invoices?: any[];
    transactions?: any[];
    categories?: any[];
    accounts?: any[];
    cashboxes?: any[];
    warehouses?: any[];
    financialYears?: any[];
    settings?: any;
    meta?: any;
  }
): Promise<void> {
  if (!isIndexedDbSupported()) return;

  try {
    const tasks: Promise<any>[] = [];

    if (bundle.products) tasks.push(saveEntitiesToIndexedDb(storeId, 'products', bundle.products));
    if (bundle.persons) tasks.push(saveEntitiesToIndexedDb(storeId, 'persons', bundle.persons));
    if (bundle.invoices) tasks.push(saveEntitiesToIndexedDb(storeId, 'invoices', bundle.invoices));
    if (bundle.transactions) tasks.push(saveEntitiesToIndexedDb(storeId, 'transactions', bundle.transactions));
    if (bundle.categories) tasks.push(saveEntitiesToIndexedDb(storeId, 'categories', bundle.categories));
    if (bundle.accounts) tasks.push(saveEntitiesToIndexedDb(storeId, 'accounts', bundle.accounts));
    if (bundle.cashboxes) tasks.push(saveEntitiesToIndexedDb(storeId, 'cashboxes', bundle.cashboxes));
    if (bundle.warehouses) tasks.push(saveEntitiesToIndexedDb(storeId, 'warehouses', bundle.warehouses));
    if (bundle.financialYears) tasks.push(saveEntitiesToIndexedDb(storeId, 'financial_years', bundle.financialYears));

    if (bundle.settings) {
      tasks.push(saveSettingToIndexedDb(storeId, 'app_settings', bundle.settings));
    }

    if (bundle.meta) {
      tasks.push(saveSettingToIndexedDb(storeId, 'sync_meta', {
        ...bundle.meta,
        lastSync: new Date().toISOString()
      }));
    }

    await Promise.all(tasks);
  } catch (err) {
    console.warn(`Failed syncing business ${storeId} to IndexedDB:`, err);
  }
}
