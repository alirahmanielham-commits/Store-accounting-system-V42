import { StateCreator } from 'zustand';
import {
  getTransactions,
  getSalesInvoicePayments,
  getPurchaseInvoicePayments,
  addTransaction,
  updateTransaction,
  deleteTransaction
} from '../../services/invoiceService';

export interface ReceiptSlice {
  transactions: any[];
  salesInvoicePayments: any[];
  purchaseInvoicePayments: any[];
  isLoadingTransactions: boolean;

  fetchTransactions: () => Promise<void>;
  fetchInvoicePayments: () => Promise<void>;
  addTransaction: (transaction: any) => Promise<any>;
  updateTransaction: (id: string | number, updated: any) => Promise<any>;
  deleteTransaction: (id: string) => Promise<void>;
}

export const createReceiptSlice: StateCreator<ReceiptSlice> = (set, get) => ({
  transactions: [],
  salesInvoicePayments: [],
  purchaseInvoicePayments: [],
  isLoadingTransactions: false,

  fetchTransactions: async () => {
    set({ isLoadingTransactions: true });
    try {
      const data = await getTransactions();
      set({ transactions: data || [] });
    } catch (e) {
      console.error('Error fetching transactions in store:', e);
    } finally {
      set({ isLoadingTransactions: false });
    }
  },

  fetchInvoicePayments: async () => {
    try {
      const [salesPayments, purchasePayments] = await Promise.all([
        getSalesInvoicePayments(),
        getPurchaseInvoicePayments()
      ]);
      set({
        salesInvoicePayments: salesPayments || [],
        purchaseInvoicePayments: purchasePayments || []
      });
    } catch (e) {
      console.error('Error fetching invoice payments in store:', e);
    }
  },

  addTransaction: async (transactionData) => {
    const store = get() as any;
    
      store.updateProcessingStatus?.("اعتبارسنجی اطلاعات...");
      await new Promise(r => setTimeout(r, 400));
      store.updateProcessingStatus?.("ثبت در تراکنش‌های مالی...");
      const newTx = await addTransaction(transactionData);
      store.updateProcessingStatus?.("بروزرسانی کش سیستم...");
      await get().fetchTransactions();
      await get().fetchInvoicePayments();
      return newTx;
    
  },
  updateTransaction: async (id, updatedData) => {
    const store = get() as any;
    
      store.updateProcessingStatus?.("ثبت تغییرات...");
      const updated = await updateTransaction(id, updatedData);
      store.updateProcessingStatus?.("بروزرسانی کش سیستم...");
      await get().fetchTransactions();
      await get().fetchInvoicePayments();
      return updated;
    
  },
  deleteTransaction: async (id) => {
    const store = get() as any;
    
      await deleteTransaction(id);
      store.updateProcessingStatus?.("بروزرسانی کش سیستم...");
      await get().fetchTransactions();
      await get().fetchInvoicePayments();
      
    
  },
});
