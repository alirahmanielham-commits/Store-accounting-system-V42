import { StateCreator } from 'zustand';
import {
  getInvoices,
  addInvoice,
  updateInvoice,
  deleteInvoice,
  voidInvoice
} from '../../services/invoiceService';

export interface InvoiceSlice {
  invoices: any[];
  isLoadingInvoices: boolean;
  invoiceSearchTerm: string;
  selectedInvoiceType: string;

  fetchInvoices: () => Promise<void>;
  addInvoice: (invoice: any, skipRecalc?: boolean) => Promise<any>;
  updateInvoice: (id: string | number, updated: any, skipRecalc?: boolean) => Promise<any>;
  deleteInvoice: (id: string, forceDelete?: boolean, skipRecalc?: boolean) => Promise<void>;
  voidInvoice: (id: string | number) => Promise<any>;
  setInvoiceSearchTerm: (term: string) => void;
  setSelectedInvoiceType: (type: string) => void;
}

export const createInvoiceSlice: StateCreator<InvoiceSlice> = (set, get) => ({
  invoices: [],
  isLoadingInvoices: false,
  invoiceSearchTerm: '',
  selectedInvoiceType: 'all',

  fetchInvoices: async () => {
    set({ isLoadingInvoices: true });
    try {
      const data = await getInvoices();
      set({ invoices: data || [] });
    } catch (e) {
      console.error('Error fetching invoices in store:', e);
    } finally {
      set({ isLoadingInvoices: false });
    }
  },

  addInvoice: async (invoiceData, skipRecalc = false) => {
    const store = get() as any;
    store.updateProcessingStatus?.("ثبت فاکتور در پایگاه داده...");
    const created = await addInvoice(invoiceData, skipRecalc);
    store.updateProcessingStatus?.("بروزرسانی کش سیستم...");
    await get().fetchInvoices();
    return created;
  },
  updateInvoice: async (id, updatedData, skipRecalc = false) => {
    const store = get() as any;
    store.updateProcessingStatus?.("ثبت تغییرات فاکتور...");
    const updated = await updateInvoice(id, updatedData, skipRecalc);
    store.updateProcessingStatus?.("بروزرسانی کش سیستم...");
    await get().fetchInvoices();
    return updated;
  },
  deleteInvoice: async (id, forceDelete = false, skipRecalc = false) => {
    const store = get() as any;
    store.updateProcessingStatus?.("حذف فاکتور...");
    await deleteInvoice(id, forceDelete, skipRecalc);
    store.updateProcessingStatus?.("بروزرسانی کش سیستم...");
    await get().fetchInvoices();
  },

  voidInvoice: async (id) => {
    const res = await voidInvoice(id);
    await get().fetchInvoices();
    return res;
  },

  setInvoiceSearchTerm: (term) => set({ invoiceSearchTerm: term }),
  setSelectedInvoiceType: (type) => set({ selectedInvoiceType: type }),
});
