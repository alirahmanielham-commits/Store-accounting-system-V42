import { create } from 'zustand';
import { createConfigSlice, ConfigSlice } from './slices/configSlice';
import { createStoreSelectorSlice, StoreSelectorSlice } from './slices/storeSelectorSlice';
import { createProductSlice, ProductSlice } from './slices/productSlice';
import { createWarehouseSlice, WarehouseSlice } from './slices/warehouseSlice';
import { createFinancialYearSlice, FinancialYearSlice } from './slices/financialYearSlice';
import { createInvoiceSlice, InvoiceSlice } from './slices/invoiceSlice';
import { createReceiptSlice, ReceiptSlice } from './slices/receiptSlice';
import { createAuthSlice, AuthSlice } from './slices/authSlice';
import { createProcessingSlice, ProcessingSlice } from './slices/processingSlice';

export type CombinedStore = ConfigSlice &
  StoreSelectorSlice &
  ProductSlice &
  WarehouseSlice &
  FinancialYearSlice &
  InvoiceSlice &
  ReceiptSlice &
  AuthSlice &
  ProcessingSlice;

export const useStore = create<CombinedStore>()((...a) => ({
  ...createConfigSlice(...a),
  ...createStoreSelectorSlice(...a),
  ...createProductSlice(...a),
  ...createWarehouseSlice(...a),
  ...createFinancialYearSlice(...a),
  ...createInvoiceSlice(...a),
  ...createReceiptSlice(...a),
  ...createAuthSlice(...a),
  ...createProcessingSlice(...a),
}));


