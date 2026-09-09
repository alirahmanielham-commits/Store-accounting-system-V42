export interface InvoiceColumnSettings {
  rowIndex: boolean;        // شماره ردیف
  productCode: boolean;     // کد کالا
  productName: boolean;     // شرح کالا یا خدمات
  quantity: boolean;        // مقدار / تعداد
  unit: boolean;            // واحد سنجش
  unitPrice: boolean;       // مبلغ واحد (فی)
  grossAmount: boolean;     // مبلغ ناخالص
  discountPercent: boolean; // درصد تخفیف (%)
  discountAmount: boolean;  // مبلغ تخفیف
  tax: boolean;             // مالیات و عوارض
  totalPrice: boolean;      // مبلغ نهایی سطر
}

export interface InvoicePrintSettings {
  showStoreLogo?: boolean;
  showSignatures?: boolean;
  showTransactions?: boolean;
  showBalance?: boolean;
  showNotes?: boolean;
  showFooter?: boolean;
  designType?: string;
  paperSize?: "a4" | "a5";
  columns?: InvoiceColumnSettings;
  boldBorders?: boolean;
}

export interface InvoicePrintTemplateProps {
  data: any;
  storeSettings: any;
  persons: any[];
  transactions?: any[];
  invoices?: any[];
  personOpeningBalances?: any[];
  issuedChecks?: any[];
  receivedChecks?: any[];
  printSettings?: InvoicePrintSettings;
  paperSize?: "a4" | "a5";
}

