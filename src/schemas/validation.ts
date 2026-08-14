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

const sayadIdRegex = /^\d{16}$/;

export const issuedCheckSchema = z.object({
  id: z.string().or(z.number()).optional(),
  checkNumber: z.string().min(1, "شماره چک الزامی است"),
  sayadId: z.string().regex(sayadIdRegex, "شناسه صیادی باید دقیقاً ۱۶ رقم باشد").optional().nullable().or(z.literal("")),
  reason: z.string().optional().nullable(),
  amount: z.union([z.number(), z.string()]).refine(val => Number(val) >= 0, "مبلغ چک نامعتبر است"),
  issueDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  payeeId: z.string().or(z.number()).optional().nullable(),
  status: z.string().optional(),
}).passthrough();

export const receivedCheckSchema = z.object({
  id: z.string().or(z.number()).optional(),
  checkNumber: z.string().min(1, "شماره چک الزامی است"),
  sayadId: z.string().regex(sayadIdRegex, "شناسه صیادی باید دقیقاً ۱۶ رقم باشد").optional().nullable().or(z.literal("")),
  reason: z.string().optional().nullable(),
  amount: z.union([z.number(), z.string()]).refine(val => Number(val) >= 0, "مبلغ چک نامعتبر است"),
  receiveDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  payerId: z.string().or(z.number()).optional().nullable(),
  status: z.string().optional(),
}).passthrough();

schemas['issued_checks'] = issuedCheckSchema;
schemas['received_checks'] = receivedCheckSchema;
