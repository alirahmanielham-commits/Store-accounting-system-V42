import { InvoiceColumnSettings, InvoicePrintSettings } from "../components/print/invoice-templates/InvoicePrintTypes";
import { ReceiptPrintFields, ReceiptPrintSettings } from "../components/print/ReceiptPrintTypes";

export type DocumentPrintCategory = 
  | 'invoice'    // فاکتورهای فروش، خرید، برگشت و پیش‌فاکتور
  | 'receipt'    // رسیدهای دریافت و پرداخت و تسویه
  | 'warehouse'  // اسناد و حواله‌های انبار
  | 'check'      // رسیدهای تحویل و اخذ چک صیادی
  | 'loan';      // دفترچه و رسید اقساط

export type PaperSizeOption = 'a4' | 'a5' | 'pos80' | 'pos58' | 'a4_2copy';
export type PaperOrientation = 'portrait' | 'landscape';
export type DesignThemeOption = 'standard' | 'official' | 'modern' | 'minimal' | 'compact' | 'thermal';
export type FontSizeOption = 'compact' | 'normal' | 'large';
export type MarginOption = 'none' | 'compact' | 'normal' | 'wide';

export interface PrintTemplateProfile {
  id: string;
  name: string;
  category: DocumentPrintCategory;
  isDefault: boolean;
  description?: string;

  // Paper & geometry
  paperSize: PaperSizeOption;
  orientation: PaperOrientation;
  designTheme: DesignThemeOption;
  fontSize: FontSizeOption;
  margin: MarginOption;
  scale: number; // 75, 90, 100, 110, 125

  // Header & Brand
  showStoreLogo: boolean;
  showStoreName: boolean;
  showStorePhone: boolean;
  showStoreAddress: boolean;
  showEconomicCode: boolean;
  showNationalId: boolean;

  // Customer / Payee
  showCustomerInfo: boolean;
  showCustomerPhone: boolean;
  showCustomerAddress: boolean;
  showCustomerBalance: boolean;

  // Table & Columns
  columns: InvoiceColumnSettings;
  boldBorders: boolean;
  paginationMode: 'auto' | 'chunked';
  itemsPerPage: number;

  // Financial & Settlement
  showSettlementDetails: boolean; // Cash, Pos, Check, Remainder
  showTransactions: boolean;
  showAmountInWords: boolean;

  // Signatures
  showSignatures: boolean;
  signaturesCount: 2 | 3;
  signature1Title: string;
  signature2Title: string;
  signature3Title: string;

  // Footer & Notes
  showFooter: boolean;
  footerNote: string;
  termsAndConditions?: string;

  // Advanced & Extras
  showQrCode: boolean;
  showWatermark: boolean; // ابطال شد / پیش‌نویس
  showBarcode: boolean;

  // Receipt specific extensions
  receiptFields?: Partial<ReceiptPrintFields>;

  updatedAt: string;
}

export const defaultInvoiceColumnSettings: InvoiceColumnSettings = {
  rowIndex: true,
  productCode: false,
  productName: true,
  quantity: true,
  unit: true,
  unitPrice: true,
  grossAmount: true,
  discountPercent: true,
  discountAmount: true,
  tax: true,
  totalPrice: true,
};

export const defaultPrintProfiles: PrintTemplateProfile[] = [
  // 1. فاکتور رسمی دارایی
  {
    id: 'invoice_official_a4',
    name: 'فاکتور رسمی دارایی (A4 استاندارد)',
    category: 'invoice',
    isDefault: true,
    description: 'قالب رسمی و استاندارد ماده ۱۶۹ مکرر قانون مالیات‌های مستقیم با تفکیک مالیات و شماره اقتصادی',
    paperSize: 'a4',
    orientation: 'portrait',
    designTheme: 'official',
    fontSize: 'normal',
    margin: 'normal',
    scale: 100,
    showStoreLogo: true,
    showStoreName: true,
    showStorePhone: true,
    showStoreAddress: true,
    showEconomicCode: true,
    showNationalId: true,
    showCustomerInfo: true,
    showCustomerPhone: true,
    showCustomerAddress: true,
    showCustomerBalance: true,
    columns: {
      ...defaultInvoiceColumnSettings,
      productCode: true,
      discountPercent: true,
      discountAmount: true,
      tax: true,
    },
    boldBorders: true,
    paginationMode: 'auto',
    itemsPerPage: 10,
    showSettlementDetails: true,
    showTransactions: true,
    showAmountInWords: true,
    showSignatures: true,
    signaturesCount: 2,
    signature1Title: 'مهر و امضای خریدار',
    signature2Title: 'مهر و امضای فروشنده',
    signature3Title: 'تحویل‌گیرنده',
    showFooter: true,
    footerNote: 'صورتحساب فوق بر اساس استانداردهای سازمان امور مالیاتی کشور صادر گردیده است.',
    termsAndConditions: 'اجناس فروخته شده پس از خروج از انبار تنها با رعایت قوانین و بسته بندی اولیه تا ۴۸ ساعت قابل تعویض می‌باشند.',
    showQrCode: true,
    showWatermark: true,
    showBarcode: true,
    updatedAt: new Date().toISOString(),
  },

  // 2. فاکتور بازرگانی مدرن (A4 / A5)
  {
    id: 'invoice_modern_a4',
    name: 'فاکتور فروش بازرگانی مدرن',
    category: 'invoice',
    isDefault: false,
    description: 'طراحی شیک، مناسب شرکت‌ها و فروشگاه‌های توزیع با ظاهر متمایز و کادربندی بهینه',
    paperSize: 'a4',
    orientation: 'portrait',
    designTheme: 'standard',
    fontSize: 'normal',
    margin: 'compact',
    scale: 100,
    showStoreLogo: true,
    showStoreName: true,
    showStorePhone: true,
    showStoreAddress: true,
    showEconomicCode: false,
    showNationalId: false,
    showCustomerInfo: true,
    showCustomerPhone: true,
    showCustomerAddress: true,
    showCustomerBalance: true,
    columns: {
      ...defaultInvoiceColumnSettings,
      productCode: false,
      grossAmount: false,
    },
    boldBorders: false,
    paginationMode: 'auto',
    itemsPerPage: 14,
    showSettlementDetails: true,
    showTransactions: true,
    showAmountInWords: true,
    showSignatures: true,
    signaturesCount: 2,
    signature1Title: 'امضای خریدار',
    signature2Title: 'امضای فروشنده',
    signature3Title: '',
    showFooter: true,
    footerNote: 'با تشکر از حسن انتخاب و خرید شما.',
    showQrCode: true,
    showWatermark: true,
    showBarcode: false,
    updatedAt: new Date().toISOString(),
  },

  // 3. فیش حرارتی فروشگاهی (POS 80mm)
  {
    id: 'invoice_thermal_pos80',
    name: 'فیش حرارتی فروشگاه (POS 80mm)',
    category: 'invoice',
    isDefault: false,
    description: 'قالب مخصوص پرینترهای حرارتی رول ۸۰ میلی‌متری، مناسب صندوق‌های فروشگاهی با چاپ سریع',
    paperSize: 'pos80',
    orientation: 'portrait',
    designTheme: 'thermal',
    fontSize: 'compact',
    margin: 'none',
    scale: 90,
    showStoreLogo: false,
    showStoreName: true,
    showStorePhone: true,
    showStoreAddress: true,
    showEconomicCode: false,
    showNationalId: false,
    showCustomerInfo: true,
    showCustomerPhone: false,
    showCustomerAddress: false,
    showCustomerBalance: true,
    columns: {
      rowIndex: false,
      productCode: false,
      productName: true,
      quantity: true,
      unit: false,
      unitPrice: true,
      grossAmount: false,
      discountPercent: false,
      discountAmount: false,
      tax: false,
      totalPrice: true,
    },
    boldBorders: false,
    paginationMode: 'auto',
    itemsPerPage: 30,
    showSettlementDetails: true,
    showTransactions: false,
    showAmountInWords: false,
    showSignatures: false,
    signaturesCount: 2,
    signature1Title: '',
    signature2Title: '',
    signature3Title: '',
    showFooter: true,
    footerNote: 'لطفا در نگهداری این فیش کوشا باشید.',
    termsAndConditions: 'ارائه فیش هنگام تعویض کالا الزامی است.',
    showQrCode: true,
    showWatermark: false,
    showBarcode: true,
    updatedAt: new Date().toISOString(),
  },

  // 4. فاکتور فشرده دونسخه‌ای (A4 2-Copy)
  {
    id: 'invoice_compact_2up',
    name: 'فاکتور دو نسخه‌ای فشرده (2 در A4)',
    category: 'invoice',
    isDefault: false,
    description: 'چاپ دو نسخه فاکتور در یک برگ A4 همراه با خط برش جهت صرفه‌جویی در مصرف کاغذ',
    paperSize: 'a4_2copy',
    orientation: 'portrait',
    designTheme: 'compact',
    fontSize: 'compact',
    margin: 'compact',
    scale: 90,
    showStoreLogo: true,
    showStoreName: true,
    showStorePhone: true,
    showStoreAddress: false,
    showEconomicCode: false,
    showNationalId: false,
    showCustomerInfo: true,
    showCustomerPhone: true,
    showCustomerAddress: false,
    showCustomerBalance: true,
    columns: {
      rowIndex: true,
      productCode: false,
      productName: true,
      quantity: true,
      unit: true,
      unitPrice: true,
      grossAmount: false,
      discountPercent: false,
      discountAmount: true,
      tax: false,
      totalPrice: true,
    },
    boldBorders: false,
    paginationMode: 'auto',
    itemsPerPage: 6,
    showSettlementDetails: true,
    showTransactions: false,
    showAmountInWords: true,
    showSignatures: true,
    signaturesCount: 2,
    signature1Title: 'امضای خریدار',
    signature2Title: 'امضای فروشنده',
    signature3Title: '',
    showFooter: false,
    footerNote: '',
    showQrCode: false,
    showWatermark: true,
    showBarcode: false,
    updatedAt: new Date().toISOString(),
  },

  // 5. رسید دریافت/پرداخت مدرن (A5 افقی)
  {
    id: 'receipt_modern_a5_landscape',
    name: 'رسید خزانه‌داری مدرن (A5 افقی)',
    category: 'receipt',
    isDefault: true,
    description: 'قالب رسمی و آراسته رسید صندوق و حواله بانکی در قطع A5 افقی با جزئیات کامل پرداخت',
    paperSize: 'a5',
    orientation: 'landscape',
    designTheme: 'modern',
    fontSize: 'normal',
    margin: 'normal',
    scale: 100,
    showStoreLogo: true,
    showStoreName: true,
    showStorePhone: true,
    showStoreAddress: true,
    showEconomicCode: false,
    showNationalId: false,
    showCustomerInfo: true,
    showCustomerPhone: true,
    showCustomerAddress: false,
    showCustomerBalance: true,
    columns: defaultInvoiceColumnSettings,
    boldBorders: false,
    paginationMode: 'auto',
    itemsPerPage: 10,
    showSettlementDetails: true,
    showTransactions: true,
    showAmountInWords: true,
    showSignatures: true,
    signaturesCount: 2,
    signature1Title: 'مهر و امضای پرداخت‌کننده',
    signature2Title: 'مهر و امضای دریافت‌کننده / صندوق',
    signature3Title: '',
    showFooter: true,
    footerNote: 'این رسید به منزله سند قطعی پرداخت/دریافت بوده و فاقد خدشه معتبر می‌باشد.',
    showQrCode: true,
    showWatermark: true,
    showBarcode: false,
    updatedAt: new Date().toISOString(),
  },

  // 6. اسناد و حواله انبار استاندارد
  {
    id: 'warehouse_standard_a4',
    name: 'حواله و رسید انبار استاندارد (A4)',
    category: 'warehouse',
    isDefault: true,
    description: 'قالب تفصیلی ورود و خروج کالا با کادرهای تایید انباردار، تحویل‌گیرنده و کنترل کیفی',
    paperSize: 'a4',
    orientation: 'portrait',
    designTheme: 'standard',
    fontSize: 'normal',
    margin: 'normal',
    scale: 100,
    showStoreLogo: true,
    showStoreName: true,
    showStorePhone: true,
    showStoreAddress: true,
    showEconomicCode: false,
    showNationalId: false,
    showCustomerInfo: true,
    showCustomerPhone: true,
    showCustomerAddress: false,
    showCustomerBalance: false,
    columns: {
      rowIndex: true,
      productCode: true,
      productName: true,
      quantity: true,
      unit: true,
      unitPrice: false,
      grossAmount: false,
      discountPercent: false,
      discountAmount: false,
      tax: false,
      totalPrice: false,
    },
    boldBorders: true,
    paginationMode: 'auto',
    itemsPerPage: 15,
    showSettlementDetails: false,
    showTransactions: false,
    showAmountInWords: false,
    showSignatures: true,
    signaturesCount: 3,
    signature1Title: 'تحویل‌گیرنده / راننده',
    signature2Title: 'متصدی انبار',
    signature3Title: 'تأیید مدیریت بازرگانی',
    showFooter: true,
    footerNote: 'خروج کالا تنها با ارائه نسخه امضا شده حواله انبار مجاز است.',
    showQrCode: true,
    showWatermark: true,
    showBarcode: true,
    updatedAt: new Date().toISOString(),
  },

  // 7. رسید تحویل چک صیادی
  {
    id: 'check_receipt_standard',
    name: 'رسید تحویل و اخذ چک صیادی',
    category: 'check',
    isDefault: true,
    description: 'قالب اختصاصی اسناد صیادی با تفکیک شناسه ۱۶ رقمی، تاریخ سررسید و بانک عهده',
    paperSize: 'a5',
    orientation: 'landscape',
    designTheme: 'official',
    fontSize: 'normal',
    margin: 'normal',
    scale: 100,
    showStoreLogo: true,
    showStoreName: true,
    showStorePhone: true,
    showStoreAddress: true,
    showEconomicCode: false,
    showNationalId: false,
    showCustomerInfo: true,
    showCustomerPhone: true,
    showCustomerAddress: false,
    showCustomerBalance: true,
    columns: defaultInvoiceColumnSettings,
    boldBorders: true,
    paginationMode: 'auto',
    itemsPerPage: 5,
    showSettlementDetails: true,
    showTransactions: false,
    showAmountInWords: true,
    showSignatures: true,
    signaturesCount: 2,
    signature1Title: 'امضای تحویل‌دهنده',
    signature2Title: 'امضای مسئول مالی',
    signature3Title: '',
    showFooter: true,
    footerNote: 'چک مذکور طبق قوانین جدید چک‌های صیادی و ثبت در سامانه پیچک تحویل گردید.',
    showQrCode: true,
    showWatermark: true,
    showBarcode: false,
    updatedAt: new Date().toISOString(),
  },

  // 8. دفترچه اقساط و تسهیلات
  {
    id: 'loan_booklet_standard',
    name: 'دفترچه اقساط تسهیلات (A4)',
    category: 'loan',
    isDefault: true,
    description: 'جدول کامل سررسید اقساط، شماره قسط، مانده بدهی و کادرهای مهر پرداخت ماهانه',
    paperSize: 'a4',
    orientation: 'portrait',
    designTheme: 'standard',
    fontSize: 'normal',
    margin: 'normal',
    scale: 100,
    showStoreLogo: true,
    showStoreName: true,
    showStorePhone: true,
    showStoreAddress: true,
    showEconomicCode: false,
    showNationalId: false,
    showCustomerInfo: true,
    showCustomerPhone: true,
    showCustomerAddress: true,
    showCustomerBalance: true,
    columns: defaultInvoiceColumnSettings,
    boldBorders: true,
    paginationMode: 'auto',
    itemsPerPage: 18,
    showSettlementDetails: true,
    showTransactions: false,
    showAmountInWords: true,
    showSignatures: true,
    signaturesCount: 2,
    signature1Title: 'امضا و اثرانگشت وام‌گیرنده',
    signature2Title: 'مهر و امضای صندوق تسهیلات',
    signature3Title: '',
    showFooter: true,
    footerNote: 'پرداخت به موقع اقساط موجب ارتقای رتبه اعتباری شما در دریافت تسهیلات بعدی می‌گردد.',
    showQrCode: true,
    showWatermark: false,
    showBarcode: true,
    updatedAt: new Date().toISOString(),
  }
];
