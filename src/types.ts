export type PersonGroup = {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  parentId?: string | null;
  sortOrder?: number;
  isActive?: boolean;
};

export type PersonRole = {
  id: string;
  name: string;
  code: string;
  description?: string;
  color?: string;
};

export type PersonCategory = {
  id: string;
  name: string;
  color?: string;
  icon?: string;
};

export type Person = { 
  id: string | number; 
  personCode?: string;
  accountingCode?: string;
  title?: string;
  gender?: string;
  name: string; 
  firstName?: string;
  lastName?: string;
  alias?: string;
  companyName?: string;
  fatherName?: string;
  nationalId?: string;
  address?: string;
  imageUrl?: string;
  personType: 'real' | 'legal';
  role: 'customer' | 'employee' | 'supplier';
  roles?: string[];
  categories?: string[];
  taxNumber?: string;
  registrationNumber?: string; 
  phone: string;
  contacts?: { id?: string; type: 'mobile' | 'phone' | 'fax' | 'other'; number: string; title?: string }[]; 
  bankName?: string;
  bankAccountNumber?: string;
  cardNumber?: string;
  shebaNumber?: string;
  bankAccounts?: { id?: string; bankName: string; accountNumber?: string; cardNumber?: string; shebaNumber?: string; title?: string }[];
  additionalNotes?: string;
  attachments?: { name: string; url: string; size?: number; type?: string; }[];
  group?: string;
  province?: string;
  city?: string;
  isActive?: boolean;
  registrationDate?: string;
  initialBalance?: number; // مانده اولیه (افتتاحیه)
  initialBalanceType?: 'debtor' | 'creditor' | 'settled';
  creditLimit?: number; // سقف اعتبار

  // Employee specific fields
  insuranceNumber?: string;
  insuranceType?: string;
  educationLevel?: string;
  experienceYears?: number | string;
  maritalStatus?: string;
  studyField?: string;
  jobTitle?: string;
  jobCategory?: string;
  employmentType?: string;
  contractType?: string;
  childrenCount?: number | string;
};

export type Checkbook = {
  id: string | number;
  accountId: string | number;
  bankName?: string;
  startNumber: string;
  endNumber: string;
  totalLeaves: number;
  issuedDate: string;
};

export type IssuedCheck = {
  id: string | number;
  checkbookId: string | number;
  checkNumber: string;
  sayadId: string;
  reason?: string;
  amount: number;
  issueDate: string;
  dueDate: string;
  payeeId: string | number;
  status: 'blank' | 'issued' | 'cashed' | 'bounced' | 'cancelled';
  receiptNumber?: string;
  assignedToId?: string | number;
  bankAccountId?: string | number;
  description?: string;
  imageUrl?: string;
  attachments?: string[];
  history?: { status: string, date: string, desc?: string, user?: string }[];
  isActive?: boolean;
  salePrice?: number;
  discountPercent?: number;
  minStockLevel?: number;
};

export type ReceivedCheck = {
  id: string | number;
  checkNumber: string;
  sayadId: string;
  reason?: string;
  bankName: string;
  branchName?: string;
  amount: number;
  receiveDate: string;
  dueDate: string;
  payerId: string | number;
  status: 'received' | 'deposited' | 'cashed' | 'bounced' | 'returned' | 'assigned' | 'bounced_assigned';
  receiptNumber?: string;
  assignedToId?: string | number;
  accountId?: string | number;
  description?: string;
  imageUrl?: string;
  attachments?: string[];
  history?: { status: string, date: string, desc?: string, user?: string }[];
};

export type ProductCategory = {
  id: string | number;
  code?: string;
  name: string;
  description?: string;
  parentId?: string | number | null;
};

export type Product = {
  id: string | number;
  code?: string;
  barcode?: string;
  name: string;
  price: number;
  purchasePrice?: number; 
  stock?: number;
  minStock?: number;
  unit?: string;
  secondaryUnit?: string;
  unitRatio?: number;
  type: 'product' | 'service';
  category: string;
  categoryId?: string | number;
  warehouseId?: string | number;
  imageUrl?: string;
  isActive?: boolean;
  salePrice?: number;
  discountPercent?: number;
  minStockLevel?: number;
  description?: string;
};

export type Account = {
  accountingCode?: string;
  id: string | number;
  bankName: string;
  branchName?: string;
  accountNumber?: string;
  cardNumber?: string;
  shebaNumber?: string;
  bankAccounts?: { id?: string; bankName: string; accountNumber?: string; cardNumber?: string; shebaNumber?: string; title?: string }[];
  balance: number;
  accountHolder?: string;
  title?: string;
};

export type Cashbox = {
  accountingCode?: string;
  id: string | number;
  name: string;
  manager?: string;
  accountNumber?: string;
  balance: number;
};

export type Warehouse = {
  id: string | number;
  name: string;
  manager?: string;
  accountNumber?: string;
  location?: string;
  isActive: boolean;
};

export type InvoiceItem = {
  id: string;
  productId: string | number | '';
  productName: string;
  quantity: number;
  unitPrice: number; // this will be price per selected unit
  discountPercent: number;
  totalPrice: number;
  selectedUnit?: string;
  unitRatio?: number;
  isSecondaryUnit?: boolean;
  warehouseId?: string | number;
  maxQuantity?: number;
};

export type UserRole = 'admin' | 'manager' | 'employee' | 'customer' | 'guest' | 'accountant' | 'cashier';

export type RefundRequest = {
  id?: string | number;
  date: string; // YYYY/MM/DD
  amount: number;
  personId?: string | null;
  profileLinkedAt?: string | null;
  isProfileRequired?: boolean; // For selected existing person
  miscName?: string; // For miscellaneous distinct from person entity
  miscGroupId?: string | number; // Group ID for new miscellaneous person
  cardNumber?: string;
  resourceType: 'bank' | 'cashbox';
  resourceId: string | number;
  description?: string;
  status: 'registered' | 'paid' | 'cancelled'; // ثبت شده، پرداخت شده، کنسل شده
  createdAt?: number;
  updatedAt?: number;
};



// --- Advanced Profile & Security Models ---
export type UserPrivacyLevel = 'public' | 'private' | 'contacts_only';

export type UserPreferences = {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  notifications: {
    email: boolean;
    sms: boolean;
    inApp: boolean;
  };
  accessibility: {
    highContrast: boolean;
    fontSize: 'small' | 'medium' | 'large';
  };
};

export type UserSecurity = {
  twoFactorEnabled: boolean;
  recoveryEmail?: string;
  lastPasswordChange?: string;
  activeSessions?: {
    id: string;
    device: string;
    ip: string;
    lastActive: string;
  }[];
};

export type UserProfileExtended = {
  bio?: string;
  headline?: string;
  location?: string;
  socialLinks?: {
    linkedin?: string;
    github?: string;
    twitter?: string;
    website?: string;
  };
  skills?: string[];
  experience?: {
    id: string;
    title: string;
    company: string;
    startDate: string;
  requestDate?: string;
  paymentDate?: string;
  firstInstallmentDate?: string;
    endDate?: string;
    current: boolean;
    description?: string;
  }[];
  education?: {
    id: string;
    institution: string;
    degree: string;
    field: string;
    graduationYear: number;
  }[];
  privacySettings?: Record<string, UserPrivacyLevel>; // e.g., { phone: 'private', email: 'public' }
  completionPercentage?: number;
};

// Update to User
export type User = {
  preferences?: UserPreferences;
  security?: UserSecurity;
  profile?: UserProfileExtended;
  lastActive?: string;
  joinDate?: string;
  email?: string;
  id: string | number;
  username: string;
  password?: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  requires2FA?: boolean;
  personId?: string | number;
  autoLogoutMinutes?: number;
  isProfileRequired?: boolean;
}; 
export type CompanySettings = {
  checkApprovalThreshold?: number;
  invoicePrintFormat?: "standard" | "minimal" | "official" | "compact" | "thermal";
  companyName: string;
  phone: string;
  contacts?: { id?: string; type: 'mobile' | 'phone' | 'fax' | 'other'; number: string; title?: string }[];
  email: string;
  address: string;
  website: string;
  taxId: string;
  registrationNumber: string;
  logoBase64?: string;
  currency?: string;
  printPaperSize: 'A4' | 'A5' | '8cm';
  printHasHeader: boolean;
  printHasFooter: boolean;
  printFooterText: string;
  taxPercent: number;
  invoiceNotes: string;
  allowNegativeStock?: boolean;
  fontFamily?: string;
  requireWarehouse?: boolean;
  invoicePrefix?: string;
  invoiceStartNumber?: string;
  invoiceNumberLength?: number;
  smsProvider?: 'online' | 'gsm';
  smsApiKey?: string;
  smsSenderNumber?: string;
  smsTemplateInvoice?: string;
  smsTemplateReceipt?: string;
  smsTemplateCheck?: string;
  smsDebtThresholdEnabled?: boolean;
  smsDebtThresholdAmount?: number;
  smsDebtThresholdMessage?: string;
  debtorNotificationEnabled?: boolean;
  debtorNotificationThreshold?: number;
  debtorNotificationRepeatValue?: number;
  debtorNotificationRepeatUnit?: number;
  debtorNotificationRedisplayValue?: number;
  debtorNotificationRedisplayUnit?: number;
  debtorNotificationLocation?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center' | 'modal';
  debtorNotificationColor?: string;
  debtorNotificationOrder?: 'random' | 'largest' | 'smallest';
  debtorNotificationMaxCount?: number;
  inventoryControlEnabled?: boolean;
  lowStockThresholdsByCategory?: Record<string, number>;
  autoReplenishPrompt?: boolean;
  [key: string]: any; // Allow custom numbering properties
};

export interface SmsMessage {
  id: string;
  recipient: string;
  message: string;
  status: 'pending' | 'sent' | 'failed';
  provider: 'online' | 'gsm';
  timestamp: number;
}

export interface WarehouseStock {
  id: string;
  productId: string | number;
  warehouseId: string | number;
  physicalStock: number;
  reservedStock: number;
  availableStock: number;
  lastUpdated: number;
}


export type StocktakingItem = {
  productId: string | number;
  productName: string;
  expectedStock: number;
  countedStock: number | null;
  difference: number; // countedStock - expectedStock
  costValue?: number; // unit cost * difference (positive for surplus, negative for deficit)
};

export type Stocktaking = {
  fiscalYearId?: string | number;
  id: string | number;
  date: string; // Jalali or ISO
  warehouseId: string | number;
  status: 'pending' | 'in_progress' | 'confirmed' | 'applied';
  items: StocktakingItem[];
  description?: string;
  createdBy?: string;
  appliedDate?: string;
  totalDeficitValue?: number;
  totalSurplusValue?: number;
};

export type LedgerAccount = {
  id: string | number;
  code: string;
  title: string;
  type: 'group' | 'general' | 'subsidiary' | 'detailed'; // گروه، کل، معین، تفصیلی
  nature: 'debit' | 'credit'; // بدهکار یا بستانکار
  parentId?: string | number | null;
};

export type AccountingDocumentItem = {
  id?: string | number;
  ledgerAccountId: string | number;
  detailedAccountId?: string | number; // references Persons, Banks, etc. if needed
  description: string;
  debit: number;
  credit: number;
  currency?: string;
};

export type AccountingDocument = {
  id: string | number;
  documentNumber: number;
  date: string;
  description: string;
  status: 'draft' | 'approved';
  items: AccountingDocumentItem[];
  sourceType?: 'manual' | 'invoice_sale' | 'invoice_purchase' | 'receipt' | 'payment';
  sourceId?: string | number; 
  createdAt?: number;
  updatedAt?: number;
  currency?: string;
  fiscalYearId?: string | number;
};

export type LoanHistoryItem = {
  id?: string | number;
  loanId: string | number;
  status: string;
  date: string;
  desc?: string;
  user?: string;
  createdAt?: string;
};

export type Loan = { 
  id: string | number; 
  personId: string | number; 
  amount: number; 
  interestRate?: number; 
  frequency?: 'monthly' | 'quarterly' | 'yearly'; 
  startDate: string; 
  totalInstallments: number; 
  installmentAmount: number; 
  description?: string; 
  status: 'requested' | 'incomplete' | 'completed_dossier' | 'approved' | 'active' | 'completed' | 'overdue'; 
  type: 'given' | 'received'; 
  accountId?: string | number; 
  loanNumber?: string; 
  history?: { status: string, date: string, desc?: string, user?: string }[];
  penaltyType?: 'none' | 'fixed_per_day' | 'percent_per_day' | 'fixed_per_month' | 'percent_per_month';
  penaltyRate?: number;
  earlySettlementPolicy?: 'none' | 'discount_interest';
  earlySettlementDiscountPercent?: number;
};

export type Installment = { id: string | number; loanId: string | number; dueDate: string; amount: number; status: 'pending' | 'paid' | 'overdue'; paidDate?: string; paidAmount?: number; penaltyPaidAmount?: number; description?: string; installmentNumber?: number; installmentCode?: string; receiptId?: string | number; receiptNumber?: string; };


export type SystemLog = {
  id: string | number;
  action: string;
  userId: string | number;
  details: string;
  entityType: string;
  entityId: string | number;
  timestamp: number;
  changes?: string;
};

export type ProductPriceHistory = {
  id: string | number;
  productId: string | number;
  date: string;
  type: 'purchase' | 'sale';
  price: number;
  invoiceId?: string | number;
  quantity?: number;
  invoiceItemId?: string | number;
};

export type ProductInventoryHistory = {
  id: string | number;
  productId: string | number;
  warehouseId: string | number;
  date: string;
  type: 'in' | 'out';
  quantity: number;
  documentType: string;
  documentId: string | number;
  documentNumber?: string | number;
  description?: string;
  balanceBefore: number;
  balanceAfter: number;
  timestamp: number;
};


export interface NoteHistory {
  date: string;
  action: string;
  details?: string;
}

export interface PersonalNote {

  id: string;
  title: string;
  content: string;
  color?: string;
  isPinned?: boolean;
  isArchived?: boolean;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  linkedPersons?: string[];
  linkedDocs?: string[];
  images?: string[];
  reminderDate?: string;
  history?: NoteHistory[];

}

