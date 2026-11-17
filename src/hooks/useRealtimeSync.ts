import { useEffect, useRef, useState } from 'react';
import { getClientSessionId, invalidateCache } from '../services/coreService';

export interface RealtimeSyncOptions {
  activeStoreId?: string;
  setTransactions?: React.Dispatch<React.SetStateAction<any[]>>;
  setInvoices?: React.Dispatch<React.SetStateAction<any[]>>;
  setPersons?: React.Dispatch<React.SetStateAction<any[]>>;
  setAllPersons?: React.Dispatch<React.SetStateAction<any[]>>;
  setAccountingDocuments?: React.Dispatch<React.SetStateAction<any[]>>;
  setAccounts?: React.Dispatch<React.SetStateAction<any[]>>;
  setCashboxes?: React.Dispatch<React.SetStateAction<any[]>>;
  setProducts?: React.Dispatch<React.SetStateAction<any[]>>;
  fetchTransactions?: () => Promise<void>;
  fetchInvoices?: (params?: any) => Promise<void>;
  fetchPersons?: (params?: any) => Promise<void>;
  fetchAllPersons?: () => Promise<any>;
  fetchAccountingDocuments?: () => Promise<void>;
  fetchChecks?: () => Promise<void>;
  fetchAccounts?: () => Promise<void>;
  fetchCashboxes?: () => Promise<void>;
  fetchPersonOpeningBalances?: () => Promise<void>;
  fetchProducts?: () => Promise<any>;
  showNotification?: (msg: string, type?: 'success' | 'info' | 'error' | 'warning', skipAudio?: boolean) => void;
}

const TX_TABLES = new Set([
  'transactions',
  'receipt_transactions',
  'payment_transactions',
  'salary_transactions',
]);

const INVOICE_TABLES = new Set([
  'invoices',
  'sales_invoices',
  'purchase_invoices',
  'warehouse_receipts',
  'warehouse_remittances',
  'sale_returns',
  'purchase_returns',
  'wastes',
  'proforma_invoices',
]);

const CHECK_TABLES = new Set([
  'issued_checks',
  'received_checks',
  'checkbooks',
  'checks',
]);

export function useRealtimeSync(options: RealtimeSyncOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  const retryCountRef = useRef(0);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const lastToastAtRef = useRef<number>(0);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;

    const storeId =
      options.activeStoreId ||
      window.sessionStorage?.getItem('activeStoreId') ||
      window.localStorage?.getItem('activeStoreId') ||
      'default';
    const clientId = getClientSessionId();

    let isSubscribed = true;

    const notifySubtle = (message: string) => {
      const now = Date.now();
      if (now - lastToastAtRef.current < 900) return;
      lastToastAtRef.current = now;
      optionsRef.current.showNotification?.(message, 'info', true);
    };

    const mergeRecord = (list: any[], record: any, targetId: string | number) => {
      if (!record) return list;
      const strId = String(record.id ?? targetId);
      const exists = list.some(item => item && String(item.id) === strId);
      if (exists) {
        return list.map(item => (item && String(item.id) === strId ? { ...item, ...record } : item));
      }
      return [record, ...list];
    };

    function handleIncomingSyncEvent(payload: {
      table: string;
      action: 'create' | 'update' | 'delete' | 'batch';
      data: any;
      entityId?: string | number;
      timestamp?: number;
    }) {
      const opts = optionsRef.current;
      const { table, action, data, entityId } = payload;
      const targetId = entityId ?? data?.id;

      // Always clear stale HTTP cache for fresh follow-up queries
      try {
        invalidateCache();
      } catch (_) {}

      // Broadcast DOM event for standalone pages (DebtsCredits, Checks, Reports, PersonLedger)
      try {
        window.dispatchEvent(new CustomEvent('realtime_sync_update', { detail: payload }));
      } catch (_) {}

      // 1. Transactions (Financial Receipts & Payments)
      if (TX_TABLES.has(table)) {
        if (action === 'create' && data) {
          opts.setTransactions?.(prev => {
            if (prev.some(t => t && String(t.id) === String(data.id))) return prev;
            return [data, ...prev];
          });
          const typeLabel =
            data.type === 'receive' || table === 'receipt_transactions'
              ? 'رسید دریافت'
              : data.type === 'salary'
                ? 'فیش حقوق'
                : 'رسید پرداخت';
          const amtStr = data.amount ? Number(data.amount).toLocaleString('fa-IR') : '';
          notifySubtle(`${typeLabel} جدید${amtStr ? ` (مبلغ ${amtStr})` : ''} از سیستم دیگر ثبت و همگام‌سازی شد.`);
        } else if (action === 'update' && data) {
          opts.setTransactions?.(prev => mergeRecord(prev, data, targetId));
          notifySubtle('تراکنش مالی از سیستم دیگر به‌روزرسانی شد.');
        } else if (action === 'delete') {
          opts.setTransactions?.(prev => prev.filter(t => t && String(t.id) !== String(targetId)));
          notifySubtle('یک رسید/تراکنش از سیستم دیگر حذف شد.');
        } else if (action === 'batch') {
          opts.fetchTransactions?.();
        }
        return;
      }

      // 2. Invoices & Warehouse Documents
      if (INVOICE_TABLES.has(table)) {
        if (action === 'create' && data) {
          opts.setInvoices?.(prev => {
            if (prev.some(i => i && String(i.id) === String(data.id))) return prev;
            return [data, ...prev];
          });
          const invNum = data.invoiceNumber || data.id || '';
          notifySubtle(`سند / فاکتور جدید${invNum ? ` #${invNum}` : ''} از سیستم دیگر همگام‌سازی شد.`);
        } else if (action === 'update' && data) {
          opts.setInvoices?.(prev => mergeRecord(prev, data, targetId));
          notifySubtle(`سند / فاکتور${data.invoiceNumber ? ` #${data.invoiceNumber}` : ''} از سیستم دیگر به‌روزرسانی شد.`);
        } else if (action === 'delete') {
          opts.setInvoices?.(prev => prev.filter(i => i && String(i.id) !== String(targetId)));
          notifySubtle('یک سند / فاکتور از سیستم دیگر حذف شد.');
        } else if (action === 'batch') {
          opts.fetchInvoices?.();
        }
        return;
      }

      // 3. Persons (Customers, Suppliers, Employees)
      if (table === 'persons') {
        if (action === 'create' && data) {
          opts.setAllPersons?.(prev => mergeRecord(prev, data, data.id));
          opts.setPersons?.(prev => mergeRecord(prev, data, data.id));
          notifySubtle(`طرف‌حساب جدید «${data.alias || data.name || ''}» از سیستم دیگر افزوده شد.`);
        } else if (action === 'update' && data) {
          opts.setAllPersons?.(prev => mergeRecord(prev, data, targetId));
          opts.setPersons?.(prev => mergeRecord(prev, data, targetId));
        } else if (action === 'delete') {
          opts.setAllPersons?.(prev => prev.filter(p => p && String(p.id) !== String(targetId)));
          opts.setPersons?.(prev => prev.filter(p => p && String(p.id) !== String(targetId)));
        } else if (action === 'batch') {
          opts.fetchAllPersons?.();
          opts.fetchPersons?.();
        }
        return;
      }

      // 4. Person Opening Balances
      if (table === 'person_opening_balances') {
        opts.fetchPersonOpeningBalances?.();
        return;
      }

      // 5. Accounting Documents (auto-generated with receipts/invoices or manual)
      if (table === 'accounting_documents') {
        if (action === 'create' && data) {
          opts.setAccountingDocuments?.(prev => mergeRecord(prev, data, data.id));
          notifySubtle('سند حسابداری جدید از سیستم دیگر همگام‌سازی شد.');
        } else if (action === 'update' && data) {
          opts.setAccountingDocuments?.(prev => mergeRecord(prev, data, targetId));
        } else if (action === 'delete') {
          opts.setAccountingDocuments?.(prev => prev.filter(d => d && String(d.id) !== String(targetId)));
        } else if (action === 'batch') {
          opts.fetchAccountingDocuments?.();
        }
        return;
      }

      // 6. Bank Accounts & Cashboxes (balance deltas from receipts)
      if (table === 'accounts') {
        if (action === 'update' && data) {
          opts.setAccounts?.(prev => mergeRecord(prev, data, targetId));
        } else if (action === 'create' && data) {
          opts.setAccounts?.(prev => mergeRecord(prev, data, data.id));
        } else if (action === 'delete') {
          opts.setAccounts?.(prev => prev.filter(a => a && String(a.id) !== String(targetId)));
        } else {
          opts.fetchAccounts?.();
        }
        return;
      }

      if (table === 'cashboxes') {
        if (action === 'update' && data) {
          opts.setCashboxes?.(prev => mergeRecord(prev, data, targetId));
        } else if (action === 'create' && data) {
          opts.setCashboxes?.(prev => mergeRecord(prev, data, data.id));
        } else if (action === 'delete') {
          opts.setCashboxes?.(prev => prev.filter(c => c && String(c.id) !== String(targetId)));
        } else {
          opts.fetchCashboxes?.();
        }
        return;
      }

      // 7. Checks
      if (CHECK_TABLES.has(table)) {
        opts.fetchChecks?.();
        notifySubtle('تغییرات اسناد چک از سیستم دیگر همگام‌سازی شد.');
        return;
      }

      // 8. Products
      if (table === 'products') {
        if (action === 'create' && data) {
          opts.setProducts?.(prev => mergeRecord(prev, data, data.id));
        } else if (action === 'update' && data) {
          opts.setProducts?.(prev => mergeRecord(prev, data, targetId));
        } else if (action === 'delete') {
          opts.setProducts?.(prev => prev.filter(p => p && String(p.id) !== String(targetId)));
        } else {
          opts.fetchProducts?.();
        }
      }
    }

    function connect() {
      if (!isSubscribed) return;

      try {
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }

        const sseUrl = `/api/events?storeId=${encodeURIComponent(storeId)}&clientId=${encodeURIComponent(clientId)}`;
        const es = new EventSource(sseUrl);
        eventSourceRef.current = es;

        es.addEventListener('connected', () => {
          if (!isSubscribed) return;
          setIsConnected(true);
          retryCountRef.current = 0;
        });

        es.addEventListener('sync', (e: MessageEvent) => {
          if (!isSubscribed) return;
          try {
            const payload = JSON.parse(e.data);
            handleIncomingSyncEvent(payload);
          } catch (err) {
            console.error('[useRealtimeSync] Error parsing sync event:', err);
          }
        });

        es.onerror = () => {
          if (!isSubscribed) return;
          setIsConnected(false);
          es.close();
          eventSourceRef.current = null;

          // Exponential backoff reconnect: 1s, 2s, 4s, max 10s
          const backoff = Math.min(1000 * Math.pow(2, retryCountRef.current), 10000);
          retryCountRef.current += 1;
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = setTimeout(() => {
            if (isSubscribed) connect();
          }, backoff);
        };
      } catch (err) {
        console.error('[useRealtimeSync] Connection initialization failed:', err);
      }
    }

    connect();

    return () => {
      isSubscribed = false;
      clearTimeout(reconnectTimeoutRef.current);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setIsConnected(false);
    };
  }, [options.activeStoreId]);

  return { isConnected };
}
