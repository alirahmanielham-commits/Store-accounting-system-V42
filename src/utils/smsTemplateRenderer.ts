export interface SmsVariableData {
  name?: string;
  phone?: string;
  balance?: string;
  invoice_number?: string;
  receipt_number?: string;
  amount?: string | number;
  currency?: string;
  date?: string;
  due_date?: string;
  check_number?: string;
  bank_name?: string;
  installment_number?: string | number;
  loan_number?: string | number;
  store_name?: string;
  link?: string;
  [key: string]: any;
}

/**
 * Replaces all `{variable}` placeholders with their respective values from data.
 */
export function renderSmsTemplate(template: string, data: SmsVariableData): string {
  if (!template) return '';
  let result = template;
  for (const [key, val] of Object.entries(data)) {
    if (val !== undefined && val !== null) {
      const reg = new RegExp(`\\{${key}\\}`, 'g');
      result = result.replace(reg, String(val));
    }
  }
  return result;
}
