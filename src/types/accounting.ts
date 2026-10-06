/**
 * Accounting Domain Types
 * Defines interfaces for General Ledger, Double-Entry Vouchers, and Fiscal Years
 */

export type AccountGroup =
  | 'current_assets'
  | 'non_current_assets'
  | 'current_liabilities'
  | 'non_current_liabilities'
  | 'equity'
  | 'revenue'
  | 'cost_of_goods_sold'
  | 'operating_expenses'
  | 'non_operating';

export interface LedgerAccount {
  id: string;
  code: string;
  name: string;
  level: 'group' | 'general' | 'subsidiary' | 'detailed'; // گروه، کل، معین، تفصیلی
  parentId?: string | null;
  nature: 'debtor' | 'creditor' | 'dual'; // ماهیت حساب: بدهکار / بستانکار
  accountGroup: AccountGroup;
  isActive: boolean;
  description?: string;
  openingBalance?: number;
  currentBalance?: number;
  createdAt?: number | string;
  updatedAt?: number | string;
}

export interface AccountingDocumentItem {
  id?: string;
  ledgerAccountId: string;
  detailedAccountId?: string;
  debit: number;
  credit: number;
  description: string;
  trackingNumber?: string;
  currency?: string;
  exchangeRate?: number;
}

export interface AccountingDocument {
  id: string;
  documentNumber: number | string;
  manualNumber?: string;
  date: string; // ISO format or Jalali YYYY/MM/DD
  description: string;
  status: 'draft' | 'temporary' | 'permanent' | 'voided';
  sourceType?: 'manual' | 'invoice' | 'transaction' | 'opening_balance' | 'closing' | 'depreciation';
  sourceId?: string;
  fiscalYearId?: string;
  totalDebit: number;
  totalCredit: number;
  items: AccountingDocumentItem[];
  createdBy?: string;
  approvedBy?: string;
  createdAt: number | string;
  updatedAt: number | string;
}

export interface FinancialYear {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  status: 'open' | 'closed' | 'locked';
  openingDocumentId?: string;
  closingDocumentId?: string;
  createdAt: number | string;
}
