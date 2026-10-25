/**
 * Debtor Analytics & Notification Unification Service
 * Unifies calculations for outstanding debts, overdue days, risk categorization,
 * and snooze mechanisms between DebtorsShowcase and DebtorsNotification.
 */

import { Person } from '../types';

export type DebtorRiskLevel = 'critical' | 'warning' | 'normal';

export interface UnifiedDebtorInfo {
  id: string | number;
  person: Person;
  name: string;
  phone?: string;
  debtAmount: number;
  lastActivityDate: string | null;
  overdueDays: number;
  riskLevel: DebtorRiskLevel;
  riskLabel: string;
  isSnoozed?: boolean;
}

const SNOOZE_STORAGE_KEY = 'taraz_debtor_snoozes_v1';

/**
 * Gets currently active snoozed persons map { [personId]: expirationTimestamp }
 */
export function getDebtorSnoozes(): Record<string, number> {
  try {
    const raw = localStorage.getItem(SNOOZE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const now = Date.now();
    const valid: Record<string, number> = {};
    Object.entries(parsed).forEach(([key, exp]) => {
      if (typeof exp === 'number' && exp > now) {
        valid[key] = exp;
      }
    });
    return valid;
  } catch {
    return {};
  }
}

/**
 * Snoozes a person debtor alert for a given duration in hours
 */
export function snoozeDebtorAlert(personId: string | number, hours: number): void {
  try {
    const current = getDebtorSnoozes();
    const exp = Date.now() + hours * 3600 * 1000;
    current[String(personId)] = exp;
    localStorage.setItem(SNOOZE_STORAGE_KEY, JSON.stringify(current));
  } catch (e) {
    console.error('Failed to save debtor snooze:', e);
  }
}

/**
 * Checks if a person is currently snoozed
 */
export function isDebtorSnoozed(personId: string | number): boolean {
  const snoozes = getDebtorSnoozes();
  const exp = snoozes[String(personId)];
  return typeof exp === 'number' && exp > Date.now();
}

/**
 * Calculates days between a past date string and now
 */
export function calculateDaysAgo(dateStr: string | null): number {
  if (!dateStr) return 0;
  try {
    const past = new Date(dateStr).getTime();
    if (isNaN(past)) return 0;
    const now = Date.now();
    const diffDays = Math.max(0, Math.floor((now - past) / (1000 * 60 * 60 * 24)));
    return diffDays;
  } catch {
    return 0;
  }
}

/**
 * Evaluates debtor risk level based on overdue days and debt amount
 */
export function evaluateDebtorRisk(debtAmount: number, overdueDays: number, threshold: number): {
  riskLevel: DebtorRiskLevel;
  riskLabel: string;
} {
  // If overdue > 60 days or debt > 3x threshold, it is critical
  if (overdueDays >= 60 || (threshold > 0 && debtAmount >= threshold * 3)) {
    return { riskLevel: 'critical', riskLabel: 'ریسک بحرانی معوقه' };
  }
  // If overdue > 30 days or debt > 1.5x threshold, warning
  if (overdueDays >= 30 || (threshold > 0 && debtAmount >= threshold * 1.5)) {
    return { riskLevel: 'warning', riskLabel: 'هشدار تأخیر پرداخت' };
  }
  return { riskLevel: 'normal', riskLabel: 'مطالبه در جریان' };
}

/**
 * Computes unified list of active debtors from persons and accounting documents / balance helper
 */
export function getUnifiedDebtorsList({
  persons,
  accountingDocuments = [],
  calculatePersonBalance,
  threshold = 0,
  minOverdueDays = 0,
  filterSnoozed = true,
}: {
  persons: Person[];
  accountingDocuments?: any[];
  calculatePersonBalance?: (id: string | number) => { status: string; amount: number };
  threshold?: number;
  minOverdueDays?: number;
  filterSnoozed?: boolean;
}): UnifiedDebtorInfo[] {
  const snoozes = filterSnoozed ? getDebtorSnoozes() : {};

  const list: UnifiedDebtorInfo[] = [];

  persons.forEach((person) => {
    if (person.isActive === false) return;
    const pIdStr = String(person.id);

    // If snoozed and filtering enabled, skip
    if (filterSnoozed && snoozes[pIdStr] && snoozes[pIdStr] > Date.now()) {
      return;
    }

    let debtAmount = 0;
    let lastActivityDate: string | null = null;

    // 1. Calculate balance from calculatePersonBalance if provided
    if (calculatePersonBalance) {
      const bal = calculatePersonBalance(person.id);
      if (bal && bal.status === 'بدهکار') {
        debtAmount = bal.amount || 0;
      }
    }

    // 2. Discover last activity date from accounting documents if balance isn't tracked or to get last doc
    if (accountingDocuments && accountingDocuments.length > 0) {
      accountingDocuments.forEach((doc) => {
        if (doc.status === 'draft' || doc.isDeleted) return;
        if (doc.items && Array.isArray(doc.items)) {
          let hasActivity = false;
          let docDebit = 0;
          let docCredit = 0;

          doc.items.forEach((item: any) => {
            if (item.detailedAccountId?.toString() === pIdStr) {
              docDebit += Number(item.debit) || 0;
              docCredit += Number(item.credit) || 0;
              hasActivity = true;
            }
          });

          // If calculatePersonBalance was not supplied, compute directly
          if (!calculatePersonBalance && hasActivity) {
            debtAmount += docDebit - docCredit;
          }

          if (hasActivity && doc.date) {
            if (!lastActivityDate || new Date(doc.date) > new Date(lastActivityDate)) {
              lastActivityDate = doc.date;
            }
          }
        }
      });
    }

    if (debtAmount <= 0) return;
    if (threshold > 0 && debtAmount < threshold) return;

    const overdueDays = calculateDaysAgo(lastActivityDate);
    if (minOverdueDays > 0 && overdueDays < minOverdueDays) return;

    const { riskLevel, riskLabel } = evaluateDebtorRisk(debtAmount, overdueDays, threshold);

    list.push({
      id: person.id,
      person,
      name: person.name,
      phone: person.phone || (person as any).mobile,
      debtAmount,
      lastActivityDate,
      overdueDays,
      riskLevel,
      riskLabel,
      isSnoozed: Boolean(snoozes[pIdStr]),
    });
  });

  return list;
}
