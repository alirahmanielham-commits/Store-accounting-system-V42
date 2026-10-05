import { z } from 'zod';

export const productSchema = z.object({
  id: z.string().or(z.number()).optional(),
  name: z.string().min(1, "نام کالا الزامی است"),
  categoryId: z.string().optional().nullable(),
  code: z.string().optional().nullable(),
  unit: z.string().optional().nullable(),
  purchasePrice: z.union([z.number(), z.string()]).optional().nullable(),
  price: z.union([z.number(), z.string()]).optional().nullable(),
  stock: z.union([z.number(), z.string()]).optional().nullable(),
  isDeleted: z.boolean().optional(),
}).passthrough();

export const personSchema = z.object({
  id: z.string().or(z.number()).optional(),
  name: z.string().min(1, "نام شخص الزامی است"),
  role: z.string().optional().nullable(),
  mobile: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  isDeleted: z.boolean().optional(),
}).passthrough();

export const invoiceItemFormSchema = z.object({
  productId: z.union([z.string(), z.number()]).refine(val => Boolean(String(val).trim()), {
    message: 'انتخاب کالا برای هر ردیف الزامی است.'
  }),
  quantity: z.preprocess(
    val => (val === '' || val === null || val === undefined ? 0 : Number(val)),
    z.number().positive('تعداد کالا باید بزرگتر از صفر باشد.')
  ),
  unitPrice: z.preprocess(
    val => (val === '' || val === null || val === undefined ? 0 : Number(val)),
    z.number().min(0, 'قیمت واحد کالا نمی‌تواند منفی باشد.')
  ),
  discountPercent: z.preprocess(
    val => (val === '' || val === null || val === undefined ? 0 : Number(val)),
    z.number().min(0, 'درصد تخفیف نمی‌تواند منفی باشد.').max(100, 'درصد تخفیف نمی‌تواند بیشتر از ۱۰۰ باشد.').optional()
  ),
  taxPercent: z.preprocess(
    val => (val === '' || val === null || val === undefined ? 0 : Number(val)),
    z.number().min(0, 'درصد مالیات نمی‌تواند منفی باشد.').max(100, 'درصد مالیات نمی‌تواند بیشتر از ۱۰۰ باشد.').optional()
  )
}).passthrough();

export const saleInvoiceFormSchema = z.object({
  invoiceNumber: z.union([z.string(), z.number()]).refine(val => Boolean(String(val).trim()), {
    message: 'شماره فاکتور الزامی است.'
  }),
  date: z.string().min(1, 'تاریخ صدور فاکتور الزامی است.'),
  customerId: z.union([z.string(), z.number()]).optional().nullable(),
  customerName: z.string().optional().nullable(),
  nationalId: z.string().optional().nullable(),
  economicCode: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  invoiceType: z.string().default('sale'),
  posFastMode: z.boolean().default(false),
  items: z.array(invoiceItemFormSchema).min(1, 'فاکتور باید حداقل شامل یک قلم کالا باشد.'),
  warehouseId: z.union([z.string(), z.number()]).optional().nullable(),
  description: z.string().optional().nullable()
}).passthrough();

export const purchaseInvoiceFormSchema = z.object({
  invoiceNumber: z.union([z.string(), z.number()]).refine(val => Boolean(String(val).trim()), {
    message: 'شماره فاکتور خرید الزامی است.'
  }),
  date: z.string().min(1, 'تاریخ فاکتور خرید الزامی است.'),
  customerId: z.union([z.string(), z.number()]).refine(val => Boolean(val && String(val).trim()), {
    message: 'انتخاب فروشنده / تامین‌کننده الزامی است.'
  }),
  sellerInvoiceNumber: z.string().optional().nullable(),
  items: z.array(invoiceItemFormSchema).min(1, 'فاکتور خرید باید حداقل شامل یک قلم کالا باشد.'),
  warehouseId: z.union([z.string(), z.number()]).optional().nullable(),
  paymentStatus: z.enum(['paid', 'partial', 'unpaid']).default('unpaid'),
  paidAmount: z.preprocess(
    val => (val === '' || val === null || val === undefined ? 0 : Number(val)),
    z.number().min(0, 'مبلغ پرداختی نمی‌تواند منفی باشد.')
  ).optional(),
  paymentAccountId: z.union([z.string(), z.number()]).optional().nullable(),
  description: z.string().optional().nullable()
}).passthrough();

export const transactionReceiptFormSchema = z.object({
  type: z.enum(['receive', 'pay'], { message: 'نوع عملیات (دریافت یا پرداخت) نامعتبر است.' }),
  personId: z.union([z.string(), z.number()]).refine(val => Boolean(val && String(val).trim()), {
    message: 'انتخاب طرف حساب برای ثبت رسید الزامی است.'
  }),
  amount: z.preprocess(
    val => (val === '' || val === null || val === undefined ? 0 : Number(val)),
    z.number().positive('مبلغ رسید مالی باید بزرگتر از صفر باشد.')
  ),
  date: z.string().min(1, 'تاریخ عملیات مالی الزامی است.'),
  resourceType: z.enum(['bank', 'cashbox'], { message: 'منبع مالی باید حساب بانکی یا صندوق باشد.' }),
  resourceId: z.union([z.string(), z.number()]).refine(val => Boolean(val && String(val).trim()), {
    message: 'انتخاب حساب بانکی یا صندوق الزامی است.'
  }),
  trackingNumber: z.string().optional().nullable(),
  description: z.string().optional().nullable()
}).passthrough();

export const accountingDocFormSchema = z.object({
  date: z.string().min(1, 'تاریخ سند حسابداری الزامی است.'),
  description: z.string().min(2, 'شرح سند حسابداری الزامی است.'),
  items: z.array(z.object({
    ledgerAccountId: z.union([z.string(), z.number()]).refine(val => Boolean(String(val).trim()), {
      message: 'انتخاب حساب برای کلیه آرتیکل‌ها الزامی است.'
    }),
    debit: z.coerce.number().min(0, 'مبلغ بدهکار نمی‌تواند منفی باشد.'),
    credit: z.coerce.number().min(0, 'مبلغ بستانکار نمی‌تواند منفی باشد.'),
    description: z.string().optional()
  })).min(2, 'سند حسابداری باید حداقل شامل دو آرتیکل باشد.').refine(items => {
    const totalDebit = items.reduce((sum, it) => sum + (Number(it.debit) || 0), 0);
    const totalCredit = items.reduce((sum, it) => sum + (Number(it.credit) || 0), 0);
    return Math.abs(totalDebit - totalCredit) < 0.001;
  }, {
    message: 'سند حسابداری تراز نیست (جمع بدهکار با جمع بستانکار برابر نیست).'
  })
}).passthrough();

export const invoiceSchema = z.object({
  id: z.string().or(z.number()).optional(),
  type: z.string(),
  date: z.string(),
  personId: z.string().or(z.number()).optional().nullable(),
  items: z.array(z.any()).optional(),
  totalPrice: z.union([z.number(), z.string()]).optional(),
  isVoided: z.boolean().optional(),
  isDeleted: z.boolean().optional(),
}).passthrough();

export const transactionSchema = z.object({
  id: z.string().or(z.number()).optional(),
  type: z.string(),
  date: z.string(),
  amount: z.union([z.number(), z.string()]),
  personId: z.string().or(z.number()).optional().nullable(),
}).passthrough();

export const schemas: Record<string, z.ZodTypeAny> = {
  products: productSchema,
  persons: personSchema,
  invoices: invoiceSchema,
  sales_invoices: invoiceSchema,
  purchase_invoices: invoiceSchema,
  transactions: transactionSchema,
  accounting_documents: accountingDocFormSchema,
};

export const validateData = (key: string, data: any) => {
  const schema = schemas[key];
  if (!schema) return { success: true, data }; // No schema defined, pass

  // Handle arrays (e.g. for bulk updates / main list endpoint)
  if (Array.isArray(data)) {
    const arraySchema = z.array(schema);
    return arraySchema.safeParse(data);
  }

  return schema.safeParse(data);
};

const cleanSayadId = (val: any) => {
  if (val === null || val === undefined) return null;
  const str = String(val).replace(/[۰-۹]/g, d => '0123456789'['۰۱۲۳۴۵۶۷۸۹'.indexOf(d)]).replace(/[\s-]/g, '').trim();
  if (str === '') return null;
  return str;
};

const cleanDigitsAndCommas = (val: any) => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const cleaned = String(val).replace(/[۰-۹]/g, d => '0123456789'['۰۱۲۳۴۵۶۷۸۹'.indexOf(d)]).replace(/,/g, '').trim();
  return Number(cleaned) || 0;
};

const cleanTextNumber = (val: any) => {
  if (val === null || val === undefined) return '';
  return String(val).replace(/[۰-۹]/g, d => '0123456789'['۰۱۲۳۴۵۶۷۸۹'.indexOf(d)]).trim();
};

export const issuedCheckSchema = z.object({
  id: z.string().or(z.number()).optional(),
  checkNumber: z.preprocess(cleanTextNumber, z.string().min(1, "شماره چک الزامی است")),
  sayadId: z.preprocess(cleanSayadId, z.string().regex(/^\d{16}$/, "شناسه صیادی باید دقیقاً ۱۶ رقم باشد").nullable().optional()),
  reason: z.string().optional().nullable(),
  amount: z.preprocess(cleanDigitsAndCommas, z.number().min(0, "مبلغ چک نامعتبر است")),
  issueDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  payeeId: z.string().or(z.number()).optional().nullable(),
  status: z.string().optional(),
}).passthrough();

export const receivedCheckSchema = z.object({
  id: z.string().or(z.number()).optional(),
  checkNumber: z.preprocess(cleanTextNumber, z.string().min(1, "شماره چک الزامی است")),
  sayadId: z.preprocess(cleanSayadId, z.string().regex(/^\d{16}$/, "شناسه صیادی باید دقیقاً ۱۶ رقم باشد").nullable().optional()),
  reason: z.string().optional().nullable(),
  amount: z.preprocess(cleanDigitsAndCommas, z.number().min(0, "مبلغ چک نامعتبر است")),
  receiveDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  payerId: z.string().or(z.number()).optional().nullable(),
  status: z.string().optional(),
}).passthrough();

schemas['issued_checks'] = issuedCheckSchema;
schemas['received_checks'] = receivedCheckSchema;
