/**
 * Invoice Domain Types
 * Defines interfaces for Sales, Purchases, Proforma, and Line Items
 */

export type InvoiceType =
  | 'sale'
  | 'purchase'
  | 'proforma'
  | 'sale_return'
  | 'purchase_return';

export type PaymentStatus = 'unpaid' | 'partial' | 'paid';

export interface InvoiceItem {
  id: string;
  productId: string;
  productName?: string;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  discountAmount?: number;
  taxPercent?: number;
  taxAmount?: number;
  selectedUnit?: string;
  isSecondaryUnit?: boolean;
  unitRatio?: number;
  unitRatioDirection?: 'main_to_secondary' | 'secondary_to_main';
  baseQuantity?: number;
  costPrice?: number;
  totalPrice?: number;
  lineTotal: number;
  description?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string | number;
  type: InvoiceType;
  date: string;
  dueDate?: string;
  customerId?: string;
  customerName?: string;
  sellerInvoiceNumber?: string;
  warehouseId?: string;
  status: 'draft' | 'confirmed' | 'finalized' | 'voided';
  paymentStatus: PaymentStatus;
  paidAmount: number;
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  grandTotal: number;
  items: InvoiceItem[];
  accountingDocumentId?: string;
  description?: string;
  isDraft?: boolean;
  isDeleted?: boolean;
  createdAt: number | string;
  updatedAt: number | string;
}
