import { pgTable, serial, text, varchar, timestamp, json, integer, boolean, numeric, index, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Core Users Table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 255 }).notNull().unique(),
  password: text('password').notNull(),
  role: varchar('role', { length: 50 }).default('user'),
  personId: varchar('person_id', { length: 50 }),
  profileLinkedAt: timestamp('profile_linked_at'),
  isProfileRequired: boolean('is_profile_required').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// Settings Table
export const storeSettings = pgTable('store_settings', {
  id: serial('id').primaryKey(),
  settings: json('settings'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Legacy Key-Value table for backwards compatibility
export const legacyStore = pgTable('store', {
  key: varchar('key', { length: 255 }).primaryKey(),
  value: text('value').notNull(),
});

// --- Domain Tables ---

export const products = pgTable('products', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 50 }),
  type: varchar('type', { length: 50 }).default('product'), // product, service, raw_material
  barcode: varchar('barcode', { length: 255 }),
  categoryId: varchar('category_id', { length: 50 }),
  buyPrice: numeric('buy_price'),
  sellPrice: numeric('sell_price'),
  wholesalePrice: numeric('wholesale_price'),
  stock: numeric('stock').default('0'),
  unit: varchar('unit', { length: 50 }),
  status: varchar('status', { length: 50 }).default('active'),
  description: text('description'),
  imageUrl: text('image_url'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const productCategories = pgTable('product_categories', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  parentId: varchar('parent_id', { length: 50 }),
});

export const persons = pgTable('persons', {
  personType: varchar('person_type', { length: 50 }).default('individual'),
  taxNumber: varchar('tax_number', { length: 50 }),
  registrationNumber: varchar('registration_number', { length: 50 }),
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }),
  phone: varchar('phone', { length: 50 }),
  economicCode: varchar('economic_code', { length: 50 }),
  nationalId: varchar('national_id', { length: 50 }),
  balance: numeric('balance').default('0'),
  status: varchar('status', { length: 50 }).default('active'),
  address: text('address'),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const invoices = pgTable('invoices', {
  id: varchar('id', { length: 50 }).primaryKey(),
  invoiceNumber: varchar('invoice_number', { length: 50 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // sell, buy, return_sell, return_buy, waste
  date: varchar('date', { length: 50 }).notNull(),
  personId: varchar('person_id', { length: 50 }),
  warehouseId: varchar('warehouse_id', { length: 50 }),
  totalAmount: numeric('total_amount').default('0'),
  discount: numeric('discount').default('0'),
  tax: numeric('tax').default('0'),
  payableAmount: numeric('payable_amount').default('0'),
  paidAmount: numeric('paid_amount').default('0'),
  status: varchar('status', { length: 50 }).default('draft'),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const invoiceItems = pgTable('invoice_items', {
  id: varchar('id', { length: 50 }).primaryKey(),
  invoiceId: varchar('invoice_id', { length: 50 }).notNull(),
  productId: varchar('product_id', { length: 50 }).notNull(),
  quantity: numeric('quantity').notNull(),
  unitPrice: numeric('unit_price').notNull(),
  totalPrice: numeric('total_price').notNull(),
  discount: numeric('discount').default('0'),
  tax: numeric('tax').default('0'),
  netPrice: numeric('net_price').notNull(),
});

export const transactions = pgTable('transactions', {
  id: varchar('id', { length: 50 }).primaryKey(),
  type: varchar('type', { length: 50 }).notNull(), // receive, pay, transfer
  amount: numeric('amount').notNull(),
  date: varchar('date', { length: 50 }).notNull(),
  sourceAccountId: varchar('source_account_id', { length: 50 }),
  destinationAccountId: varchar('destination_account_id', { length: 50 }),
  personId: varchar('person_id', { length: 50 }),
  invoiceId: varchar('invoice_id', { length: 50 }),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const accounts = pgTable('accounts', {
  id: varchar('id', { length: 50 }).primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  accountNumber: varchar('account_number', { length: 50 }),
  bankName: varchar('bank_name', { length: 255 }),
  balance: numeric('balance').default('0'),
  status: varchar('status', { length: 50 }).default('active'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const cashboxes = pgTable('cashboxes', {
  id: varchar('id', { length: 50 }).primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  balance: numeric('balance').default('0'),
  status: varchar('status', { length: 50 }).default('active'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const warehouses = pgTable('warehouses', {
  id: varchar('id', { length: 50 }).primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  manager: varchar('manager', { length: 255 }),
  address: text('address'),
  status: varchar('status', { length: 50 }).default('active'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const warehouseStocks = pgTable('warehouse_stocks', {
  id: varchar('id', { length: 50 }).primaryKey(),
  warehouseId: varchar('warehouse_id', { length: 50 }).notNull(),
  productId: varchar('product_id', { length: 50 }).notNull(),
  stock: numeric('stock').default('0'),
});


export const roles = pgTable('roles', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 50 }).notNull().unique(), // admin, manager, employee, customer, guest
  title: varchar('title', { length: 255 }), // Persian title
  permissions: json('permissions'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const personCategories = pgTable('person_categories', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  color: varchar('color', { length: 50 }),
  icon: varchar('icon', { length: 50 }),
});

export const personCategoryMappings = pgTable('person_category_mappings', {
  id: varchar('id', { length: 50 }).primaryKey(),
  personId: varchar('person_id', { length: 50 }).notNull(),
  categoryId: varchar('category_id', { length: 50 }).notNull(),
});

export const personRolesMapping = pgTable('person_roles_mapping', {
  id: varchar('id', { length: 50 }).primaryKey(),
  personId: varchar('person_id', { length: 50 }).notNull(),
  roleId: varchar('role_id', { length: 50 }).notNull(),
});

export const personGroups = pgTable('person_groups', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  color: varchar('color', { length: 50 }),
  icon: varchar('icon', { length: 50 }),
  parentId: varchar('parent_id', { length: 50 }),
  sortOrder: integer('sort_order').default(0),
  isActive: boolean('is_active').default(true),
});

// --- Messaging Module (Comprehensive System) ---

export const smsProviders = pgTable('sms_providers', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  channelType: varchar('channel_type', { length: 50 }).notNull(), // sms, whatsapp, telegram, email, push
  apiEndpoint: varchar('api_endpoint', { length: 255 }),
  apiKey: text('api_key'),
  apiSecret: text('api_secret'),
  senderNumber: varchar('sender_number', { length: 100 }),
  senderName: varchar('sender_name', { length: 100 }),
  priority: integer('priority').default(0),
  isActive: boolean('is_active').default(true),
  isDefault: boolean('is_default').default(false),
  dailyLimit: integer('daily_limit'),
  hourlyLimit: integer('hourly_limit'),
  retryAttempts: integer('retry_attempts').default(3),
  timeoutSeconds: integer('timeout_seconds').default(30),
  failoverProviderId: varchar('failover_provider_id', { length: 50 }),
  metadata: json('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

export const smsProviderSettings = pgTable('sms_provider_settings', {
  id: varchar('id', { length: 50 }).primaryKey(),
  providerId: varchar('provider_id', { length: 50 }).notNull(),
  settingKey: varchar('setting_key', { length: 255 }).notNull(),
  settingValue: text('setting_value'),
  isEncrypted: boolean('is_encrypted').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  providerKeyIdx: index('idx_sms_provider_settings_provider_key').on(table.providerId, table.settingKey),
}));

export const smsTemplates = pgTable('sms_templates', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  body: text('body').notNull(),
  variables: json('variables'),
  category: varchar('category', { length: 100 }),
  providerId: varchar('provider_id', { length: 50 }),
  isVerified: boolean('is_verified').default(false),
  isActive: boolean('is_active').default(true),
  usageCount: integer('usage_count').default(0),
  createdBy: varchar('created_by', { length: 50 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const smsCampaigns = pgTable('sms_campaigns', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  templateId: varchar('template_id', { length: 50 }),
  providerId: varchar('provider_id', { length: 50 }),
  status: varchar('status', { length: 50 }).default('draft'), // draft, scheduled, sending, paused, completed, cancelled
  audienceType: varchar('audience_type', { length: 50 }),
  audienceData: json('audience_data'),
  totalRecipients: integer('total_recipients').default(0),
  sentCount: integer('sent_count').default(0),
  deliveredCount: integer('delivered_count').default(0),
  failedCount: integer('failed_count').default(0),
  scheduledAt: timestamp('scheduled_at'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdBy: varchar('created_by', { length: 50 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  statusIdx: index('idx_sms_campaigns_status').on(table.status),
}));

export const smsMessages = pgTable('sms_messages', {
  id: varchar('id', { length: 50 }).primaryKey(),
  campaignId: varchar('campaign_id', { length: 50 }),
  providerId: varchar('provider_id', { length: 50 }),
  templateId: varchar('template_id', { length: 50 }),
  recipientType: varchar('recipient_type', { length: 50 }), // user, contact, manual
  recipientId: varchar('recipient_id', { length: 50 }),
  recipientNumber: varchar('recipient_number', { length: 100 }),
  recipientName: varchar('recipient_name', { length: 255 }),
  messageBody: text('message_body'),
  messageLength: integer('message_length'),
  partsCount: integer('parts_count'),
  status: varchar('status', { length: 50 }).default('pending'), // queued, pending, sent, delivered, failed, bounced, expired, canceled
  priority: integer('priority').default(0),
  scheduledAt: timestamp('scheduled_at'),
  sentAt: timestamp('sent_at'),
  deliveredAt: timestamp('delivered_at'),
  failedAt: timestamp('failed_at'),
  cost: numeric('cost').default('0'),
  currency: varchar('currency', { length: 10 }).default('IRR'),
  providerMessageId: varchar('provider_message_id', { length: 255 }),
  providerResponse: json('provider_response'),
  errorCode: varchar('error_code', { length: 50 }),
  errorMessage: text('error_message'),
  ipAddress: varchar('ip_address', { length: 50 }),
  userAgent: text('user_agent'),
  source: varchar('source', { length: 50 }), // api, panel, webhook, campaign
  createdBy: varchar('created_by', { length: 50 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  statusIdx: index('idx_sms_messages_status').on(table.status),
  campaignIdx: index('idx_sms_messages_campaign_id').on(table.campaignId),
  recipientIdx: index('idx_sms_messages_recipient_number').on(table.recipientNumber),
  createdAtIdx: index('idx_sms_messages_created_at').on(table.createdAt),
}));

export const smsDeliveryLogs = pgTable('sms_delivery_logs', {
  id: varchar('id', { length: 50 }).primaryKey(),
  messageId: varchar('message_id', { length: 50 }).notNull(),
  providerId: varchar('provider_id', { length: 50 }),
  status: varchar('status', { length: 50 }),
  statusDetail: text('status_detail'),
  rawWebhook: json('raw_webhook'),
  receivedAt: timestamp('received_at').defaultNow(),
  processedAt: timestamp('processed_at'),
}, (table) => ({
  messageIdIdx: index('idx_sms_delivery_logs_message_id').on(table.messageId),
}));

export const smsRetryLogs = pgTable('sms_retry_logs', {
  id: varchar('id', { length: 50 }).primaryKey(),
  messageId: varchar('message_id', { length: 50 }).notNull(),
  fromProviderId: varchar('from_provider_id', { length: 50 }),
  toProviderId: varchar('to_provider_id', { length: 50 }),
  attemptNumber: integer('attempt_number'),
  reason: text('reason'),
  isSuccessful: boolean('is_successful'),
  responseData: json('response_data'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  messageIdIdx: index('idx_sms_retry_logs_message_id').on(table.messageId),
}));

export const smsSettings = pgTable('sms_settings', {
  id: varchar('id', { length: 50 }).primaryKey(),
  settingGroup: varchar('setting_group', { length: 100 }),
  settingKey: varchar('setting_key', { length: 100 }).notNull().unique(),
  settingValue: text('setting_value'),
  dataType: varchar('data_type', { length: 50 }), // string, integer, boolean, json, array
  isEditable: boolean('is_editable').default(true),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const smsQuotaLogs = pgTable('sms_quota_logs', {
  id: varchar('id', { length: 50 }).primaryKey(),
  providerId: varchar('provider_id', { length: 50 }).notNull(),
  logDate: varchar('log_date', { length: 50 }).notNull(), // format YYYY-MM-DD
  hourOfDay: integer('hour_of_day'),
  sentCount: integer('sent_count').default(0),
  deliveredCount: integer('delivered_count').default(0),
  failedCount: integer('failed_count').default(0),
  costTotal: numeric('cost_total').default('0'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  providerDateIdx: index('idx_sms_quota_logs_provider_date').on(table.providerId, table.logDate),
}));

export const smsAuditLogs = pgTable('sms_audit_logs', {
  id: varchar('id', { length: 50 }).primaryKey(),
  userId: varchar('user_id', { length: 50 }),
  action: varchar('action', { length: 100 }),
  entityType: varchar('entity_type', { length: 100 }),
  entityId: varchar('entity_id', { length: 50 }),
  oldValues: json('old_values'),
  newValues: json('new_values'),
  ipAddress: varchar('ip_address', { length: 50 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow(),
});

// --- Relations ---

export const smsProvidersRelations = relations(smsProviders, ({ many }) => ({
  settings: many(smsProviderSettings),
  templates: many(smsTemplates),
  campaigns: many(smsCampaigns),
  messages: many(smsMessages),
  deliveryLogs: many(smsDeliveryLogs),
  quotaLogs: many(smsQuotaLogs),
}));

export const smsProviderSettingsRelations = relations(smsProviderSettings, ({ one }) => ({
  provider: one(smsProviders, {
    fields: [smsProviderSettings.providerId],
    references: [smsProviders.id],
  }),
}));

export const smsTemplatesRelations = relations(smsTemplates, ({ one, many }) => ({
  provider: one(smsProviders, {
    fields: [smsTemplates.providerId],
    references: [smsProviders.id],
  }),
  campaigns: many(smsCampaigns),
  messages: many(smsMessages),
}));

export const smsCampaignsRelations = relations(smsCampaigns, ({ one, many }) => ({
  provider: one(smsProviders, {
    fields: [smsCampaigns.providerId],
    references: [smsProviders.id],
  }),
  template: one(smsTemplates, {
    fields: [smsCampaigns.templateId],
    references: [smsTemplates.id],
  }),
  messages: many(smsMessages),
}));

export const smsMessagesRelations = relations(smsMessages, ({ one, many }) => ({
  provider: one(smsProviders, {
    fields: [smsMessages.providerId],
    references: [smsProviders.id],
  }),
  template: one(smsTemplates, {
    fields: [smsMessages.templateId],
    references: [smsTemplates.id],
  }),
  campaign: one(smsCampaigns, {
    fields: [smsMessages.campaignId],
    references: [smsCampaigns.id],
  }),
  deliveryLogs: many(smsDeliveryLogs),
  retryLogs: many(smsRetryLogs),
}));

export const smsDeliveryLogsRelations = relations(smsDeliveryLogs, ({ one }) => ({
  message: one(smsMessages, {
    fields: [smsDeliveryLogs.messageId],
    references: [smsMessages.id],
  }),
  provider: one(smsProviders, {
    fields: [smsDeliveryLogs.providerId],
    references: [smsProviders.id],
  }),
}));

export const smsRetryLogsRelations = relations(smsRetryLogs, ({ one }) => ({
  message: one(smsMessages, {
    fields: [smsRetryLogs.messageId],
    references: [smsMessages.id],
  }),
  fromProvider: one(smsProviders, {
    fields: [smsRetryLogs.fromProviderId],
    references: [smsProviders.id],
  }),
  toProvider: one(smsProviders, {
    fields: [smsRetryLogs.toProviderId],
    references: [smsProviders.id],
  }),
}));

export const smsQuotaLogsRelations = relations(smsQuotaLogs, ({ one }) => ({
  provider: one(smsProviders, {
    fields: [smsQuotaLogs.providerId],
    references: [smsProviders.id],
  }),
}));


export const loanTypes = pgTable('loan_types', {
  id: varchar('id').primaryKey(),
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
  id: varchar('id').primaryKey(),
  applicationNumber: text('application_number').unique().notNull(),
  customerId: text('customer_id').notNull(), // References persons
  loanTypeId: varchar('loan_type_id').references(() => loanTypes.id),
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
  id: varchar('id').primaryKey(),
  applicationId: varchar('application_id').references(() => loanApplications.id),
  customerId: text('customer_id'),
  type: text('type').notNull(), // 'real_estate', 'bank_guarantee', 'promissory_note', 'check'
  value: numeric('value').notNull(),
  description: text('description'),
  status: text('status').default('active'), // 'active', 'released', 'liquidated'
  createdAt: timestamp('created_at').defaultNow(),
});

export const loanAccounts = pgTable('loan_accounts', {
  id: varchar('id').primaryKey(),
  loanNumber: text('loan_number').unique().notNull(),
  applicationId: varchar('application_id').references(() => loanApplications.id),
  customerId: text('customer_id').notNull(),
  loanTypeId: varchar('loan_type_id').references(() => loanTypes.id),
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
  id: varchar('id').primaryKey(),
  loanAccountId: varchar('loan_account_id').references(() => loanAccounts.id),
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
  id: varchar('id').primaryKey(),
  loanAccountId: varchar('loan_account_id').references(() => loanAccounts.id),
  scheduleId: varchar('schedule_id').references(() => repaymentSchedules.id),
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
  id: varchar('id').primaryKey(),
  customerId: text('customer_id').unique().notNull(),
  creditScore: integer('credit_score'),
  creditLimit: numeric('credit_limit'),
  totalActiveLoans: numeric('total_active_loans').default('0'),
  riskCategory: text('risk_category'), // 'low', 'medium', 'high'
  lastAssessmentDate: timestamp('last_assessment_date'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// --- Check Management Tables ---
export const checkbooks = pgTable('checkbooks', {
  id: varchar('id', { length: 50 }).primaryKey(),
  accountId: varchar('account_id', { length: 50 }),
  bankName: varchar('bank_name', { length: 255 }),
  startNumber: varchar('start_number', { length: 50 }),
  endNumber: varchar('end_number', { length: 50 }),
  totalLeaves: integer('total_leaves'),
  issuedDate: timestamp('issued_date'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
});


export const issuedChecks = pgTable('issued_checks', {
  creatorId: varchar('creator_id', { length: 50 }),
  approvalStatus: varchar('approval_status', { length: 50 }).default('approved'), // pending_approval, approved, rejected
  approvedById: varchar('approved_by_id', { length: 50 }),
  approvedAt: timestamp('approved_at'),
  id: varchar('id', { length: 50 }).primaryKey(),
  checkbookId: varchar('checkbook_id', { length: 50 }),
  checkNumber: varchar('check_number', { length: 50 }).notNull(),
  sayadId: varchar('sayad_id', { length: 16 }).notNull().default('0000000000000000'),
  reason: varchar('reason', { length: 50 }),
  amount: numeric('amount').notNull(),
  issueDate: timestamp('issue_date'),
  dueDate: timestamp('due_date'),
  payeeId: varchar('payee_id', { length: 50 }),
  status: varchar('status', { length: 50 }).default('blank'), // 'blank' | 'issued' | 'cashed' | 'bounced' | 'cancelled'
  receiptNumber: varchar('receipt_number', { length: 255 }),
  assignedToId: varchar('assigned_to_id', { length: 50 }),
  bankAccountId: varchar('bank_account_id', { length: 50 }),
  description: text('description'),
  imageUrl: text('image_url'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
}, (table) => ({
  statusDueDateIdx: index('idx_issued_checks_status_due_date').on(table.status, table.dueDate),
}));

export const receivedChecks = pgTable('received_checks', {
  creatorId: varchar('creator_id', { length: 50 }),
  approvalStatus: varchar('approval_status', { length: 50 }).default('approved'), // pending_approval, approved, rejected
  approvedById: varchar('approved_by_id', { length: 50 }),
  approvedAt: timestamp('approved_at'),
  id: varchar('id', { length: 50 }).primaryKey(),
  checkNumber: varchar('check_number', { length: 50 }).notNull(),
  sayadId: varchar('sayad_id', { length: 16 }).notNull().default('0000000000000000'),
  reason: varchar('reason', { length: 50 }),
  bankName: varchar('bank_name', { length: 255 }),
  branchName: varchar('branch_name', { length: 255 }),
  amount: numeric('amount').notNull(),
  receiveDate: timestamp('receive_date'),
  dueDate: timestamp('due_date'),
  payerId: varchar('payer_id', { length: 50 }),
  status: varchar('status', { length: 50 }).default('received'), // 'received' | 'deposited' | 'cashed' | 'bounced' | 'returned' | 'assigned' | 'bounced_assigned'
  receiptNumber: varchar('receipt_number', { length: 255 }),
  assignedToId: varchar('assigned_to_id', { length: 50 }),
  accountId: varchar('account_id', { length: 50 }),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
}, (table) => ({
  statusDueDateIdx: index('idx_received_checks_status_due_date').on(table.status, table.dueDate),
}));

export const checkAuditLogs = pgTable('check_audit_logs', {
  id: varchar('id', { length: 50 }).primaryKey(),
  checkId: varchar('check_id', { length: 50 }).notNull(),
  checkType: varchar('check_type', { length: 50 }).notNull(), // 'issued' | 'received'
  action: varchar('action', { length: 100 }), // 'create', 'update', 'status_change', 'delete'
  oldValues: json('old_values'),
  newValues: json('new_values'),
  userId: varchar('user_id', { length: 50 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const notifications = pgTable('notifications', {
  id: varchar('id', { length: 50 }).primaryKey(),
  userId: varchar('user_id', { length: 50 }),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  type: varchar('type', { length: 50 }).default('info'), // 'info', 'warning', 'success', 'error'
  read: boolean('read').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});
