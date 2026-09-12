export type ReceiptPaperSize = 'a5_landscape' | 'a5_portrait' | 'a4_portrait' | 'a4_2copy';
export type ReceiptDesignTheme = 'modern' | 'classic' | 'minimal';

export interface ReceiptPrintFields {
  // Store details
  showStoreName: boolean;
  showStoreLogo: boolean;
  showStorePhone: boolean;
  showStoreAddress: boolean;
  showEconomicCode: boolean;

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

  // Descriptions & notes
  showDescription: boolean;
  showNote: boolean;

  // Signatures & footer
  showSignatures: boolean;
  signatureCount: 2 | 3;
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

  showDescription: true,
  showNote: false,

  showSignatures: true,
  signatureCount: 2,
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
