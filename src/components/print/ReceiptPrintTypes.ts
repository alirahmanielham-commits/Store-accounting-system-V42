export type ReceiptPaperSize = 'a5_landscape' | 'a5_portrait' | 'a4_portrait' | 'a4_2copy' | 'pos80' | 'pos58';
export type ReceiptDesignTheme = 'modern' | 'official' | 'minimal' | 'thermal' | 'classic' | 'compact';

export interface ReceiptPrintFields {
  // Store details
  showStoreName: boolean;
  showStoreLogo: boolean;
  showStorePhone: boolean;
  showStoreAddress: boolean;
  showEconomicCode: boolean;
  showNationalId?: boolean;

  // Document metadata
  showReceiptNumber: boolean;
  showDate: boolean;
  showTime: boolean;
  showTrackingCode: boolean;

  // Person details
  showPersonName: boolean;
  showPersonCode: boolean;
  showPersonPhone: boolean;
  showPersonAddress: boolean;
  showPersonBalance: boolean;

  // Financial & settlement
  showAmountNumber: boolean;
  showAmountWords: boolean;
  showPaymentMethod: boolean;
  showResourceDetails: boolean;
  showCheckDetails: boolean;
  showLinkedInvoices: boolean;
  showDetailedSettlementTable?: boolean;
  showBalanceBeforeAndAfter?: boolean;

  // Descriptions & notes
  showDescription: boolean;
  showNote: boolean;

  // Signatures & footer
  showSignatures: boolean;
  signatureCount: 2 | 3;
  signature1Title?: string;
  signature2Title?: string;
  signature3Title?: string;
  showFooterNote: boolean;
  customFooterText: string;
  showSoftwareWatermark: boolean;
}

export interface ReceiptPrintSettings {
  paperSize: ReceiptPaperSize;
  designTheme: ReceiptDesignTheme;
  fields: ReceiptPrintFields;
  scale: number; // 75, 90, 100, 115
}

export const defaultReceiptPrintFields: ReceiptPrintFields = {
  showStoreName: true,
  showStoreLogo: true,
  showStorePhone: true,
  showStoreAddress: true,
  showEconomicCode: false,
  showNationalId: false,

  showReceiptNumber: true,
  showDate: true,
  showTime: true,
  showTrackingCode: true,

  showPersonName: true,
  showPersonCode: true,
  showPersonPhone: true,
  showPersonAddress: false,
  showPersonBalance: true,

  showAmountNumber: true,
  showAmountWords: true,
  showPaymentMethod: true,
  showResourceDetails: true,
  showCheckDetails: true,
  showLinkedInvoices: true,
  showDetailedSettlementTable: true,
  showBalanceBeforeAndAfter: true,

  showDescription: true,
  showNote: false,

  showSignatures: true,
  signatureCount: 2,
  signature1Title: 'امضای پرداخت‌کننده / مشتری',
  signature2Title: 'مهر و امضای صندوق‌دار / دریافت‌کننده',
  signature3Title: 'تأیید مدیریت حسابداری',
  showFooterNote: true,
  customFooterText: 'این رسید به منزله سند قطعی پرداخت/دریافت بوده و فاقد خدشه معتبر می‌باشد.',
  showSoftwareWatermark: true,
};

export const defaultReceiptPrintSettings: ReceiptPrintSettings = {
  paperSize: 'a5_landscape',
  designTheme: 'modern',
  fields: defaultReceiptPrintFields,
  scale: 100,
};
