import { z } from 'zod';

// Person Schema Validation
export const personSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  type: z.enum(['real', 'legal']).optional().default('real'),
  name: z.string().min(1, { message: 'نام شخص الزامی است' }),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  companyName: z.string().optional(),
  title: z.string().optional(),
  alias: z.string().optional(),
  fatherName: z.string().optional(),
  nationalId: z.string().optional(),
  economicCode: z.string().optional(),
  registrationNumber: z.string().optional(),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  email: z.string().email({ message: 'ایمیل وارد شده نامعتبر است' }).optional().or(z.literal('')),
  address: z.string().optional(),
  province: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  role: z.string().optional(),
  group: z.string().optional(),
  creditLimit: z.union([z.number(), z.string()]).optional(),
  initialBalance: z.union([z.number(), z.string()]).optional(),
  initialBalanceType: z.enum(['debit', 'credit']).optional(),
  accountingCode: z.string().optional(),
  isActive: z.boolean().optional().default(true),
});

// Product Schema Validation
export const productSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  name: z.string().min(1, { message: 'نام کالا الزامی است' }),
  code: z.string().optional(),
  type: z.enum(['product', 'service', 'raw_material']).optional().default('product'),
  barcode: z.string().optional(),
  categoryId: z.string().optional(),
  buyPrice: z.union([z.number(), z.string()]).optional(),
  sellPrice: z.union([z.number(), z.string()]).optional(),
  wholesalePrice: z.union([z.number(), z.string()]).optional(),
  unit: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional().default('active'),
  description: z.string().optional(),
});

// Auth Schema Validation
export const loginSchema = z.object({
  username: z.string().min(1, { message: 'نام کاربری الزامی است' }),
  password: z.string().min(1, { message: 'کلمه عبور الزامی است' }),
});

export const validateData = <T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: string[] } => {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const errors = result.error.issues ? result.error.issues.map(err => err.message) : ['اطلاعات ورودی نامعتبر است'];
  return { success: false, errors };
};
