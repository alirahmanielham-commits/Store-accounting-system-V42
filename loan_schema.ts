import { pgTable, text, timestamp, integer, boolean, numeric, uuid, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { persons, accounts } from './src/db/schema'; // Assuming these exist, I'll adjust the imports in actual file.

export const loanTypes = pgTable('loan_types', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  type: text('type').notNull(), // 'long_term', 'short_term', 'qard_al_hasan', 'murabaha'
  interestRate: numeric('interest_rate', { precision: 5, scale: 2 }).notNull(),
  interestType: text('interest_type').notNull().default('simple'), // 'simple', 'compound', 'diminishing'
  gracePeriodDays: integer('grace_period_days').default(0),
  defaultPenaltyRate: numeric('default_penalty_rate', { precision: 5, scale: 2 }), // Daily penalty rate
  minAmount: numeric('min_amount'),
  maxAmount: numeric('max_amount'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

export const loanApplications = pgTable('loan_applications', {
  id: uuid('id').primaryKey().defaultRandom(),
  applicationNumber: text('application_number').unique().notNull(),
  customerId: text('customer_id').notNull(), // References persons
  loanTypeId: uuid('loan_type_id').references(() => loanTypes.id),
  requestedAmount: numeric('requested_amount').notNull(),
  durationMonths: integer('duration_months').notNull(),
  status: text('status').notNull().default('pending'), // 'pending', 'approved', 'rejected', 'disbursed'
  riskScore: integer('risk_score'),
  approvedAmount: numeric('approved_amount'),
  rejectionReason: text('rejection_reason'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const collaterals = pgTable('collaterals', {
  id: uuid('id').primaryKey().defaultRandom(),
  applicationId: uuid('application_id').references(() => loanApplications.id),
  customerId: text('customer_id'),
  type: text('type').notNull(), // 'real_estate', 'bank_guarantee', 'promissory_note', 'check'
  value: numeric('value').notNull(),
  description: text('description'),
  status: text('status').default('active'), // 'active', 'released', 'liquidated'
  createdAt: timestamp('created_at').defaultNow(),
});

export const loanAccounts = pgTable('loan_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  loanNumber: text('loan_number').unique().notNull(),
  applicationId: uuid('application_id').references(() => loanApplications.id),
  customerId: text('customer_id').notNull(),
  loanTypeId: uuid('loan_type_id').references(() => loanTypes.id),
  principalAmount: numeric('principal_amount').notNull(),
  totalInterest: numeric('total_interest').notNull(),
  totalPenalty: numeric('total_penalty').default('0'),
  paidAmount: numeric('paid_amount').default('0'),
  remainingBalance: numeric('remaining_balance').notNull(),
  disbursementDate: timestamp('disbursement_date'),
  status: text('status').notNull().default('active'), // 'active', 'closed', 'defaulted', 'written_off'
  createdAt: timestamp('created_at').defaultNow(),
});

export const repaymentSchedules = pgTable('repayment_schedules', {
  id: uuid('id').primaryKey().defaultRandom(),
  loanAccountId: uuid('loan_account_id').references(() => loanAccounts.id),
  installmentNumber: integer('installment_number').notNull(),
  dueDate: timestamp('due_date').notNull(),
  principalPortion: numeric('principal_portion').notNull(),
  interestPortion: numeric('interest_portion').notNull(),
  totalAmount: numeric('total_amount').notNull(),
  penaltyAmount: numeric('penalty_amount').default('0'),
  paidAmount: numeric('paid_amount').default('0'),
  status: text('status').default('pending'), // 'pending', 'partial', 'paid', 'overdue'
  createdAt: timestamp('created_at').defaultNow(),
});

export const repaymentTransactions = pgTable('repayment_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  loanAccountId: uuid('loan_account_id').references(() => loanAccounts.id),
  scheduleId: uuid('schedule_id').references(() => repaymentSchedules.id),
  transactionDate: timestamp('transaction_date').notNull().defaultNow(),
  amount: numeric('amount').notNull(),
  principalAllocation: numeric('principal_allocation').notNull(),
  interestAllocation: numeric('interest_allocation').notNull(),
  penaltyAllocation: numeric('penalty_allocation').notNull(),
  paymentMethod: text('payment_method'), // 'cash', 'bank_transfer', 'cheque'
  referenceNumber: text('reference_number'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const customersRiskProfile = pgTable('customers_risk_profile', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: text('customer_id').unique().notNull(),
  creditScore: integer('credit_score'),
  creditLimit: numeric('credit_limit'),
  totalActiveLoans: numeric('total_active_loans').default('0'),
  riskCategory: text('risk_category'), // 'low', 'medium', 'high'
  lastAssessmentDate: timestamp('last_assessment_date'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

