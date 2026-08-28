import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import BackgroundSync from './components/common/BackgroundSync';
import SyncStatusModal from './components/common/SyncStatusModal';
import { useSyncQueueLength } from './services/syncQueueService';
import { CloudOff } from 'lucide-react';

import { SystemUpdatePage } from "./components/admin/SystemUpdatePage";
import { PersonalNotesManager } from "./components/notes/PersonalNotesManager";
import changelogData from './data/changelog.json';
import React, { useState, useEffect, useMemo, useRef, Suspense } from "react";
import SidebarNavigation from "./components/SidebarNavigation";
import Barcode from "react-barcode";
import {
  Building,
  ScanLine,
  Shield,
  Key,
  Maximize,
  Minimize,
  Tag,
  Plus,
  Trash2,
  Edit2,
  Image,
  Save,
  FileText,
  User,
  ShoppingCart,
  Calculator,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  FilePlus,
  Calendar,
  List,
  Receipt,
  Search,
  DollarSign,
  Package,
  X,
  Zap,
  RefreshCw,
  Menu,
  Github,
  CreditCard,
  Wallet,
  Store,
  Settings,
  TrendingUp,
  TrendingDown,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Printer,
  Eye,
  ListTodo,
  CheckSquare,
  LogOut,
  LogIn,
  Database,
  ArrowDownToLine,
  ArrowUpFromLine,
  FileSpreadsheet,
  Users,
  BookOpen,
  ClipboardList,
  Activity,
  Clock,
  History,
  ArrowRightLeft,
  Percent,
  LayoutList,
  GripHorizontal,
  Box,
  CornerDownLeft,
  CornerUpRight,
  Banknote,
  PackagePlus,
  Copy,
  LayoutDashboard,
  Layers,
  Phone,
  MapPin,
  PlusCircle,
  MinusCircle,
  Barcode as BarcodeIcon,
  LayoutGrid,
  Table,
  Download,
  Globe,
  Bell,
  Sparkles,
  Ban,
  Pencil,
  Check,
} from "lucide-react";
import * as XLSX from "xlsx";
import { playAudioFeedback } from "./utils/audio";
import { motion, AnimatePresence } from "motion/react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  Line,
  ComposedChart,
  Cell,
} from "recharts";
import {
  addCommas,
  removeCommas,
  numberToWords,
  getBaseValueInToman,
  getDefaultExchangeRate,
  showInvoiceCurrency,
  numToPersianWords,
  toPersianDigits,
  formatDateDisplay, convertToGregorian, customPersonFilter,
} from "./utils/format";
import html2pdf from "html2pdf.js";
import DateObject from "react-date-object";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import LinkPerson from "./components/profile/LinkPerson";
import Select from "react-select";
import { useAuth } from "./context/AuthContext";
import {
  generateId,
  getUsers,
  addUser,
  updateUser,
  deleteUser,
  getCheckbooks,
  addCheckbook,
  updateCheckbook,
  deleteCheckbook,
  getIssuedChecks,
  addIssuedCheck,
  updateIssuedCheck,
  deleteIssuedCheck,
  getReceivedChecks,
  addReceivedCheck,
  updateReceivedCheck,
  deleteReceivedCheck,
  getLocalData,
  saveLocalData,
  getStoreSettings,
  saveStoreSettings,
  getSmsMessages,
  addSmsMessage,
  deleteSmsMessage,
  getPersonGroups,
  addPersonGroup,
  updatePersonGroup,
  deletePersonGroup,
  getPersonRoles,
  addPersonRole,
  updatePersonRole,
  deletePersonRole,
  getPersons,
  addPerson,
  updatePerson,
  deletePerson,
  getPersonOpeningBalances,
  addPersonOpeningBalance,
  updatePersonOpeningBalance,
  deletePersonOpeningBalance,
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  getProductCategories,
  addProductCategory,
  updateProductCategory,
  deleteProductCategory,
  getAccounts,
  addAccount,
  updateAccount,
  deleteAccount,
  getCashboxes,
  addCashbox,
  updateCashbox,
  deleteCashbox,
  getWarehouses,
  addWarehouse,
  updateWarehouse,
  deleteWarehouse,
  getInvoices,
  getInventoryTransactions,
  addInvoice,
  generateDocNumber,
  updateDocCounter,
  updateInvoice,
  deleteInvoice,
  voidInvoice,
  getTransactions,
  addTransaction,
  getPayslips,
  addPayslip,
  updateTransaction,
  deleteTransaction,
  getWarehouseStocks,
  getProductPriceHistory,
  updateProductPriceHistory,
  recalculateAllWarehouseStocks,
  getFinancialYears,
  getActiveFinancialYear,
  addFinancialYear,
  closeFinancialYear,
  getAccountingDocuments,
} from "./services/dataService";
import {
  Person,
  PersonGroup,
  Product,
  Account,
  Cashbox,
  Warehouse,
  InvoiceItem,
  WarehouseStock,
} from "./types";
import appVersion from "./version.json";
import { useAppController } from "./hooks/useAppController";
import PreviewModals from "./components/modals/PreviewModals";
import ExtraModals from "./components/modals/ExtraModals";
import GlobalProcessingOverlay from "./components/GlobalProcessingOverlay";
import ConfirmModal from "./components/modals/ConfirmModal";
const BusinessManager = React.lazy(() => import('./components/admin/BusinessManager'));
const FastStocktakingMobile = React.lazy(() => import('./components/inventory/FastStocktakingMobile'));
const PricingWizardModal = React.lazy(() => import('./components/modals/PricingWizardModal'));
const SalePaymentModal = React.lazy(() => import('./components/invoices/SalePaymentModal'));
const ReceiptsList = React.lazy(() => import('./components/financial/ReceiptsList'));
const InvoicesList = React.lazy(() => import('./components/invoices/InvoicesList'));
const CurrencyInput = React.lazy(() => import('./components/common/CurrencyInput'));
const FastBarcodeScanner = React.lazy(() => import('./components/common/FastBarcodeScanner'));
const PersonLedgerActionsDropdown = React.lazy(() => import('./components/persons/PersonLedgerActionsDropdown'));
const ChangelogModal = React.lazy(() => import('./components/ChangelogModal'));
const ReceiveReceiptModal = React.lazy(() => import('./components/financial/ReceiveReceiptModal'));
const PayReceiptModal = React.lazy(() => import('./components/financial/PayReceiptModal'));
const AccountsManager = React.lazy(() => import('./components/accounts/AccountsManager'));
const CashboxesManager = React.lazy(() => import('./components/accounts/CashboxesManager'));
const PersonsManager = React.lazy(() => import('./components/persons/PersonsManager'));
const DebtorsNotification = React.lazy(() => import('./components/DebtorsNotification'));
const BeautifulLoading = React.lazy(() => import('./components/BeautifulLoading'));
const DataReconciliation = React.lazy(() => import('./components/DataReconciliation'));

const PayrollSettings = React.lazy(() => import('./components/payroll/PayrollSettings'));

const EmployeeProfilesManager = React.lazy(() => import("./components/payroll/EmployeeProfilesManager"));
const ContractsManager = React.lazy(() => import('./components/payroll/ContractsManager'));
const EmployeeOrdersManager = React.lazy(() => import('./components/payroll/EmployeeOrdersManager'));
const DailyAttendanceManager = React.lazy(() => import('./components/payroll/DailyAttendanceManager'));
const MonthlyAttendance = React.lazy(() => import('./components/payroll/MonthlyAttendance'));
const PayslipsManager = React.lazy(() => import('./components/payroll/PayslipsManager'));

const ProductsTab = React.lazy(() => import('./components/products/ProductsTab'));
const BulkBarcodeGenerator = React.lazy(() => import('./components/products/BulkBarcodeGenerator'));
const PersonOpeningBalances = React.lazy(() => import('./components/persons/PersonOpeningBalances'));
const PersonLedger = React.lazy(() => import('./components/persons/PersonLedger'));
const SettingsTab = React.lazy(() => import('./components/admin/SettingsTab'));
const WelcomePage = React.lazy(() => import('./components/WelcomePage'));
const SyncManager = React.lazy(() => import('./components/admin/SyncManager'));
const MobileRestrictedMenu = React.lazy(() => import('./components/MobileRestrictedMenu'));
const MinimalMobilePersonModal = React.lazy(() => import('./components/modals/MinimalMobilePersonModal'));

const WarehouseManager = React.lazy(() => import('./components/warehouses/WarehouseManager'));

const PersonGroupsManager = React.lazy(() => import('./components/persons/PersonGroupsManager'));
const PersonCategoriesManager = React.lazy(() => import('./components/persons/PersonCategoriesManager'));
const PersonRolesManager = React.lazy(() => import('./components/persons/PersonRolesManager'));

// { useState, useEffect, useMemo, useRef } from "react";
const WarehouseDocCreate = React.lazy(() => import('./components/warehouses/WarehouseDocCreate'));
const SaleInvoiceCreate = React.lazy(() => import('./components/invoices/SaleInvoiceCreate'));
const CalculatorModal = React.lazy(() => import('./components/modals/CalculatorModal'));
const SaleReturnInvoiceCreate = React.lazy(() => import('./components/invoices/SaleReturnInvoiceCreate'));
const PurchaseInvoiceCreate = React.lazy(() => import('./components/invoices/PurchaseInvoiceCreate'));
const PurchaseReturnInvoiceCreate = React.lazy(() => import('./components/invoices/PurchaseReturnInvoiceCreate'));
const CustomDatePicker = React.lazy(() => import('./components/ui/CustomDatePicker'));
const DatePicker = CustomDatePicker;

const ProductFormModal = React.lazy(() => import('./components/modals/ProductFormModal'));
const PersonFormModal = React.lazy(() => import('./components/modals/PersonFormModal'));
const AccountFormModal = React.lazy(() => import('./components/modals/AccountFormModal'));
const CashboxFormModal = React.lazy(() => import('./components/modals/CashboxFormModal'));
const WarehouseFormModal = React.lazy(() => import('./components/modals/WarehouseFormModal'));

const SendMessageView = React.lazy(() => import('./components/messaging/SendMessageView'));
const MessagingChannelsView = React.lazy(() => import('./components/messaging/MessagingChannelsView'));
const MessagingLogsView = React.lazy(() => import('./components/messaging/MessagingLogsView'));
const SmsTemplatesView = React.lazy(() => import('./components/messaging/SmsTemplatesView'));


const ModuleSelector = React.lazy(() => import('./components/ui/ModuleSelector'));
const DatabaseReconciliation = React.lazy(() => import('./components/admin/DatabaseReconciliation'));
const DatabaseDashboard = React.lazy(() => import('./components/admin/DatabaseDashboard'));
const SystemChecklist = React.lazy(() => import('./components/admin/SystemChecklist'));
const SystemLogs = React.lazy(() => import('./components/admin/SystemLogs'));
const DatabaseLogs = React.lazy(() => import('./components/admin/DatabaseLogs'));

const GroupPriceUpdateWizard = React.lazy(() => import('./components/modals/GroupPriceUpdateWizard'));
const ProductPriceChangeModal = React.lazy(() => import('./components/modals/ProductPriceChangeModal'));
const PrintBarcodeModal = React.lazy(() => import('./components/modals/PrintBarcodeModal'));
const ProductCardModal = React.lazy(() => import('./components/modals/ProductCardModal'));
const ProductLastPricesView = React.lazy(() => import('./components/reports/ProductLastPricesView'));
const QuickPriceInquiry = React.lazy(() => import('./components/inventory/QuickPriceInquiry'));
const CheckManagement = React.lazy(() => import('./components/financial/CheckManagement'));
const CheckbooksManager = React.lazy(() => import('./components/financial/CheckbooksManager'));
const IssuedChecksPage = React.lazy(() => import('./components/financial/IssuedChecksPage'));
const IssueCheckStandalone = React.lazy(() => import('./components/financial/IssueCheckStandalone'));
const CheckCardPage = React.lazy(() => import('./components/financial/checks/CheckCardPage'));

const PersonNotesAndAttachments = React.lazy(() => import('./components/financial/PersonNotesAndAttachments'));
const InvoiceAllocation = React.lazy(() => import('./components/financial/InvoiceAllocation'));

const SearchableSelect = React.lazy(() => import('./components/ui/SearchableSelect'));
const BarcodeScannerModal = React.lazy(() => import('./components/modals/BarcodeScannerModal'));
const EditReceiptModal = React.lazy(() => import('./components/modals/EditReceiptModal'));
const FinancialTransfer = React.lazy(() => import('./components/financial/FinancialTransfer'));
const QuickRefund = React.lazy(() => import('./components/financial/QuickRefund'));
const UserManager = React.lazy(() => import('./components/admin/UserManager'));
const ProfileModal = React.lazy(() => import('./components/profile/advanced/AdvancedProfileModal'));
const InventoryReport = React.lazy(() => import('./components/reports/InventoryReport'));
const KardexReport = React.lazy(() => import('./components/reports/KardexReport'));
const CRMDashboard = React.lazy(() => import('./components/crm/CRMDashboard'));
const SystemDiagnostics = React.lazy(() => import('./components/admin/SystemDiagnostics'));
const SystemInfo = React.lazy(() => import('./components/admin/SystemInfo'));
const StocktakingManager = React.lazy(() => import('./components/inventory/StocktakingManager'));
const AnalyticalDashboard = React.lazy(() => import('./components/reports/AnalyticalDashboard'));
const FinancialDashboard = React.lazy(() => import('./components/reports/FinancialDashboard'));
const AccountLedgerReport = React.lazy(() => import('./components/accounting/AccountLedgerReport'));
const DebtsCreditsReport = React.lazy(() => import('./components/reports/DebtsCreditsReport'));
const LoansManager = React.lazy(() => import('./components/loans/LoansManager'));
const LoanCardPage = React.lazy(() => import('./pages/loans/LoanCardPage'));
const ChartOfAccounts = React.lazy(() => import('./components/accounting/ChartOfAccounts'));
const AccountingDocsList = React.lazy(() => import('./components/accounting/AccountingDocsList'));
const AccountingDocCreate = React.lazy(() => import('./components/accounting/AccountingDocCreate'));
const AccountingDocView = React.lazy(() => import('./components/accounting/AccountingDocView'));
const AccountingAutoSync = React.lazy(() => import('./components/accounting/AccountingAutoSync'));
const AccountingVerification = React.lazy(() => import('./components/accounting/AccountingVerification'));
const OpeningBalances = React.lazy(() => import('./components/accounting/OpeningBalances'));
const FinancialYearManager = React.lazy(() => import('./components/accounting/FinancialYearManager'));
const WarehousePrintTemplate = React.lazy(() => import('./components/print/WarehousePrintTemplate'));
const InvoicePrintTemplate = React.lazy(() => import('./components/print/InvoicePrintTemplate'));
const AIProductSearchModal = React.lazy(() => import('./components/products/AIProductSearchModal'));
const BulkProductImportModal = React.lazy(() => import('./components/products/BulkProductImportModal'));
const FastProductCreateModal = React.lazy(() => import('./components/products/FastProductCreateModal'));
const PersonProfileView = React.lazy(() => import('./components/persons/PersonProfileView'));
const PersonIOModal = React.lazy(() => import('./components/modals/PersonIOModal'));
const ProductCategoriesView = React.lazy(() => import('./components/products/ProductCategoriesView'));
const OrderList = React.lazy(() => import('./components/inventory/OrderList'));






import AdminLTELayout from "./layouts/AdminLTE/AdminLTELayout";

export default function App() {
  const syncQueueLength = useSyncQueueLength();
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);


        const [invoicePrintFormat, setInvoicePrintFormat] = useState<'a4' | 'a5' | 'pos80'>('a4');
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [isModuleMenuOpen, setIsModuleMenuOpen] = useState(false);
  const headerMenuRef = useRef<HTMLDivElement>(null);
  const moduleMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (headerMenuRef.current && !headerMenuRef.current.contains(event.target as Node)) {
        setIsHeaderMenuOpen(false);
      }
      if (moduleMenuRef.current && !moduleMenuRef.current.contains(event.target as Node)) {
        setIsModuleMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getModuleName = (mod: string) => {
    switch (mod) {
      case 'all': return 'همه بخش‌ها';
      case 'commerce': return 'بازرگانی';
      case 'inventory': return 'انبارداری';
      case 'accounting': return 'حسابداری';
      case 'admin': return 'مدیریت';
      case 'crm': return 'CRM';
      case 'hr': return 'منابع انسانی';
      case 'reports_module': return 'گزارشات';
      case 'selector': return 'انتخاب بخش';
      default: return 'بخش کاری';
    }
  };
  
  const INVOICE_PRINT_FORMATS = {
    a4: { name: 'کاغذ A4', css: `@page { size: A4 portrait; margin: 5mm; } .print-section { width: 210mm !important; }` },
    a5: { name: 'کاغذ A5', css: `@page { size: A5 portrait; margin: 5mm; } .print-section { width: 148mm !important; font-size: 0.85em; }` },
    pos80: { name: 'فیش پرینتر (80mm)', css: `@page { size: 80mm auto; margin: 1mm; } .print-section { width: 78mm !important; padding: 2mm !important; font-size: 0.75em; } .print-section table { font-size: 0.85em; }` }
  };

  const appState = useAppController();
      const {
        isFastStocktaking, activeFinancialYear,
        hasCheckedFinancialYears,
        isComposeOpen,
        setIsComposeOpen,
        priceChangeProduct,
        setPriceChangeProduct,
        confirmState,
        setConfirmState,
        confirmAction,
        user,
        signOut,
        activeTab,
        setRawActiveTab,
        setActiveTab,
        systemModule,
        setSystemModule,
        isSidebarOpen,
        setIsSidebarOpen,
        isCalculatorOpen,
        setIsCalculatorOpen,
        isProfileModalOpen,
        setIsProfileModalOpen,
        setIsChangelogModalOpen,
        isFullWidth,
        setIsFullWidth,
        menuLayout,
        setMenuLayout,
        expandedGroups,
        setExpandedGroups,
        persons,
        setPersons,
        personOpeningBalances,
        isOpeningBalanceModalOpen,
        setIsOpeningBalanceModalOpen,
        editingOpeningBalanceId,
        setEditingOpeningBalanceId,
        selectedOpeningBalancePersonId,
        setSelectedOpeningBalancePersonId,
        openingBalanceAmount,
        setOpeningBalanceAmount,
        openingBalanceType,
        setOpeningBalanceType,
        openingBalanceDate,
        setOpeningBalanceDate,
        openingBalanceDescription,
        setOpeningBalanceDescription,
        openingBalanceSearch,
        setOpeningBalanceSearch,
        submittingOpeningBalance,
        setSubmittingOpeningBalance,
        personGroups,
        personRoles,
        products,
        setProducts,
        invoices,
        accounts,
        setAccounts,
        cashboxes,
        warehouses,
        warehouseStocks,
        loans,
        setLoans,
        installments,
        setInstallments,
        warehouseSubTab,
        setWarehouseSubTab,
        recalculating,
        personSearchTerm,
        setPersonSearchTerm,
        selectedProductIds,
        setSelectedProductIds,
        whStockSearch,
        setWhStockSearch,
        selectedPersonGroup,
        setSelectedPersonGroup,
        selectedPersonRole,
        setSelectedPersonRole,
        personCurrentPage,
        setPersonCurrentPage,
        personPageSize,
        setPersonPageSize,
        personsViewMode,
        setPersonsViewMode,
        getRoleName,
        getRoleBadgeClasses,
        mapPersonToOption,
        activePersonsOnly,
        filteredPersons,
        transactions,
        setTransactions,
        payslips,
        accountingDocuments,
        checkbooks,
        issuedChecks,
        receivedChecks,
        storeSettings,
        setStoreSettings,
        isGmailTheme,
        loading,
        authLoading,
        requiresInitSetup,
        sendNotification,
        receiptNumber,
        setReceiptPersonId,
        printingTransaction,
        setPrintingTransaction,
        receiptLinkedInvoices,
        submittingReceipt,
        viewingPayslip,
        setViewingPayslip,
        printingPersonLedger,
        setPrintingPersonLedger,
        printingBarcodeProduct,
        setPrintingBarcodeProduct,
        ledgerPersonId,
        setLedgerPersonId,
        profilePersonId,
        setProfilePersonId,
        ledgerTab,
        setLedgerTab,
        reportDateRange,
        setReportDateRange,
        viewingInvoice,
        setViewingInvoice,
        viewingCheck,
        setViewingCheck,
        viewingAccountingDoc,
        setViewingAccountingDoc,
        isAccountingDocModalOpen,
        setIsAccountingDocModalOpen,
        editingAccountingDoc,
        setEditingAccountingDoc,
        pricingWizardInvoice,
        setPricingWizardInvoice,
        pricingWizardItems,
        setPricingWizardItems,
        previewInvoiceData,
        setPreviewInvoiceData,
        previewReceiptData,
        setPreviewReceiptData,
        editingReceipt,
        setEditingReceipt,
        isEditReceiptModalOpen,
        setIsEditReceiptModalOpen,
        showProductBarcodesList,
        setShowProductBarcodesList,
        invoiceType,
        invoiceNumber,
        date,
        setCustomerId,
        items,
        submitting,
        transferProposal,
        setTransferProposal,
        clearDraft,
        notification,
        setNotification,
        showNotification,
        setSuccessMsg,
        customAlert,
        successMsg,
        isScannerOpen,
        setIsScannerOpen,
        isBulkImportOpen,
        setIsBulkImportOpen,
        handleBulkImportItems,
        handleBarcodeScan,
        productCategories,
        isCategoryModalOpen,
        setIsCategoryModalOpen,
        newCatName,
        setNewCatName,
        newCatParentId,
        setNewCatParentId,
        editingCategoryId,
        newCatDesc,
        setNewCatDesc,
        submittingProduct,
        setNewCashboxBalance,
        setNewWarehouseName,
        setNewWarehouseManager,
        setNewWarehouseLocation,
        setNewWarehouseIsActive,
        handleSubmitPerson,
        isProductModalOpen,
        setIsProductModalOpen,
        isFastProductModalOpen,
        setIsFastProductModalOpen,
        isGenerateBarcodesModalOpen,
        setIsGenerateBarcodesModalOpen,
        barcodeFormat,
        setBarcodeFormat,
        barcodePrefix,
        setBarcodePrefix,
        barcodeLength,
        setBarcodeLength,
        barcodeStartNumber,
        setBarcodeStartNumber,
        isGroupPriceModalOpen,
        setIsGroupPriceModalOpen,
        isPersonModalOpen,
        setIsPersonModalOpen,
        newPersonType,
        setNewPersonType,
        setNewPersonTitle,
        setNewPersonAlias,
        newPersonFirstName,
        setNewPersonFirstName,
        newPersonLastName,
        setNewPersonLastName,
        newPersonCompanyName,
        setNewPersonCompanyName,
        setNewPersonFatherName,
        setNewPersonNationalId,
        setNewPersonAddress,
        setNewPersonImage,
        newPersonRole,
        setNewPersonRole,
        setNewPersonAccountingCode,
        newPersonPhone,
        setNewPersonPhone,
        setNewPersonContacts,
        setNewPersonInitialBalance,
        setNewPersonInitialBalanceType,
        setNewPersonCreditLimit,
        submittingPerson,
        isPersonExtraModalOpen,
        setIsPersonExtraModalOpen,
        personExtraId,
        setPersonExtraId,
        setPersonBankName,
        setPersonBankAcc,
        setPersonCard,
        setPersonSheba,
        personBankAccounts,
        setPersonBankAccounts,
        personNotes,
        setPersonNotes,
        isPersonIOModalOpen,
        setIsPersonIOModalOpen,
        personIOAction,
        setPersonIOAction,
        isAccountModalOpen,
        setIsAccountModalOpen,
        isCashboxModalOpen,
        setIsCashboxModalOpen,
        isWarehouseModalOpen,
        setIsWarehouseModalOpen,
        viewingProduct,
        setViewingProduct,
        editingProductId,
        setEditingProductId,
        editingPersonId,
        setEditingPersonId,
        editingAccountId,
        setEditingAccountId,
        editingCashboxId,
        setEditingCashboxId,
        editingWarehouseId,
        setEditingWarehouseId,
        settingsForm,
        setSettingsForm,
        submittingSettings,
        settingsTab,
        setSettingsTab,
        fetchInvoices,
        fetchProducts,
        handleExportProductsData,
        handleDownloadProductsTemplate,
        handleImportProductsData,
        handleFastSaveProduct,
        handleSaveCategory,
        handleGenerateBarcodes,
        fetchPersons,
        fetchPersonOpeningBalances,
        handleDeletePerson,
        isGeneratingCodes,
        handleGenerateMissingAccountingCodes,
        fetchAccounts,
        handleDeleteAccount,
        fetchCashboxes,
        fetchWarehouses,
        setSalaryPersonId,
        fetchTransactions,
        fetchAccountingDocuments,
        confirmReceiptSubmit,
        handleEditReceiptByCheck,
        handleSaveReceipt,
        handleDeleteCashbox,
        handleDeleteWarehouse,
        handleRecalculateStocks,
        handleEditWarehouse,
        handleToggleProductActive,
        handleDuplicateProduct,
        handleEditPerson,
        handleEditAccount,
        handleEditCashbox,
        handleSaveSettings,
        handleLogoUpload,
        fetchDataSilent,
        fetchData,
        getLastPriceForProduct,
        handleFastAddProduct,
        handleFastBarcodeScan,
        getPersonDisplayName,
        renderPersonLink,
        handleEditInvoiceAction,
        saveInvoiceData,
        handleExecuteTransferAndSubmit,
        formatProductStockDetails,
        calculatePersonBalance,
        formatCurrency,
        toPersianDigits,
        formatNumber,
        renderTabContent,
      } = appState;

  const appRoutes = (
    <Routes>
<Route path="/bulk_barcode_generator" element={<BulkBarcodeGenerator showNotification={showNotification} products={products} categories={productCategories} toPersianDigits={toPersianDigits} updateProduct={updateProduct} fetchProducts={fetchProducts} storeSettings={storeSettings}
                             onViewAccountingDoc={(doc) => {
                               setViewingAccountingDoc(doc);
                               setIsAccountingDocModalOpen(true);
                             }} />} />
<Route path="/products" element={<ProductsTab
                        {...appState}
                        
                        toPersianDigits={toPersianDigits}
                        numToPersianWords={numToPersianWords}
                        DatePicker={DatePicker}
                        persian={persian}
                        persian_fa={persian_fa}
                        AIProductSearchModal={AIProductSearchModal} />} />
<Route path="/person_opening_balances" element={<PersonOpeningBalances 
                        setActiveTab={setActiveTab}
                        setLedgerPersonId={setLedgerPersonId}
                        formatDateDisplay={formatDateDisplay}
                        persons={persons}
                        setPersons={setPersons}
                        fetchPersons={fetchPersons}
                        confirmAction={confirmAction}
                    
                        customAlert={customAlert}
                        showNotification={showNotification}
                        
                        toPersianDigits={toPersianDigits}
                        numToPersianWords={numToPersianWords}
                        DatePicker={DatePicker}
                        persian={persian}
                        persian_fa={persian_fa}
                        storeSettings={storeSettings}
                        user={user}
                         setIsOpeningBalanceModalOpen={setIsOpeningBalanceModalOpen} isOpeningBalanceModalOpen={isOpeningBalanceModalOpen} editingOpeningBalanceId={editingOpeningBalanceId} addPersonOpeningBalance={addPersonOpeningBalance} fetchPersonOpeningBalances={fetchPersonOpeningBalances} setSubmittingOpeningBalance={setSubmittingOpeningBalance} Select={Select} selectedOpeningBalancePersonId={selectedOpeningBalancePersonId} personOpeningBalances={personOpeningBalances} setSelectedOpeningBalancePersonId={setSelectedOpeningBalancePersonId} setOpeningBalanceAmount={setOpeningBalanceAmount} setOpeningBalanceType={setOpeningBalanceType} Info={Info} openingBalanceType={openingBalanceType} CurrencyInput={CurrencyInput} openingBalanceAmount={openingBalanceAmount} openingBalanceDate={openingBalanceDate} setOpeningBalanceDate={setOpeningBalanceDate} activeFinancialYear={activeFinancialYear} openingBalanceDescription={openingBalanceDescription} setOpeningBalanceDescription={setOpeningBalanceDescription} submittingOpeningBalance={submittingOpeningBalance} RefreshCw={RefreshCw}
                      FileSpreadsheet={FileSpreadsheet}
                        setEditingOpeningBalanceId={setEditingOpeningBalanceId}
                        DateObject={DateObject}
                        openingBalanceSearch={openingBalanceSearch}
                        setOpeningBalanceSearch={setOpeningBalanceSearch}
                        addCommas={addCommas}
                        Edit2={Edit2}
                        deletePersonOpeningBalance={deletePersonOpeningBalance}
                        updatePersonOpeningBalance={updatePersonOpeningBalance} />} />
<Route path="/persons" element={<PersonsManager
                        filteredPersons={filteredPersons} personPageSize={personPageSize} personCurrentPage={personCurrentPage} calculatePersonBalance={calculatePersonBalance} formatNumber={formatNumber} personSearchTerm={personSearchTerm} setPersonSearchTerm={setPersonSearchTerm} selectedPersonGroup={selectedPersonGroup} setSelectedPersonGroup={setSelectedPersonGroup} personGroups={personGroups} selectedPersonRole={selectedPersonRole} setSelectedPersonRole={setSelectedPersonRole} personRoles={personRoles}
  personCategories={appState.personCategories} personsViewMode={personsViewMode} setPersonsViewMode={setPersonsViewMode} setIsPersonModalOpen={setIsPersonModalOpen} setPersonCurrentPage={setPersonCurrentPage} getRoleBadgeClasses={getRoleBadgeClasses} getRoleName={getRoleName} handleEditPerson={handleEditPerson} setProfilePersonId={setProfilePersonId} setLedgerPersonId={setLedgerPersonId} setRawActiveTab={setRawActiveTab} handleDeletePerson={handleDeletePerson} setPrintingPersonLedger={setPrintingPersonLedger} fetchPersons={fetchPersons} activePersonsOnly={activePersonsOnly} clearDraft={clearDraft} handleGenerateMissingAccountingCodes={handleGenerateMissingAccountingCodes} isGeneratingCodes={isGeneratingCodes} setPersonIOAction={setPersonIOAction} setIsPersonIOModalOpen={setIsPersonIOModalOpen} setEditingPersonId={setEditingPersonId} setNewPersonType={setNewPersonType} setNewPersonTitle={setNewPersonTitle} setNewPersonAlias={setNewPersonAlias} setNewPersonFirstName={setNewPersonFirstName} setNewPersonLastName={setNewPersonLastName} setNewPersonCompanyName={setNewPersonCompanyName} setNewPersonFatherName={setNewPersonFatherName} setNewPersonNationalId={setNewPersonNationalId} setNewPersonAccountingCode={setNewPersonAccountingCode} setNewPersonAddress={setNewPersonAddress} setNewPersonImage={setNewPersonImage} setNewPersonPhone={setNewPersonPhone} setNewPersonContacts={setNewPersonContacts} setNewPersonRole={setNewPersonRole} newPersonTaxNumber={appState.newPersonTaxNumber} setNewPersonTaxNumber={appState.setNewPersonTaxNumber} newPersonRegistrationNumber={appState.newPersonRegistrationNumber} setNewPersonRegistrationNumber={appState.setNewPersonRegistrationNumber} newPersonRoles={appState.newPersonRoles} setNewPersonRoles={appState.setNewPersonRoles} newPersonCategories={appState.newPersonCategories} setNewPersonCategories={appState.setNewPersonCategories} duplicatePersonsWarning={appState.duplicatePersonsWarning} setDuplicatePersonsWarning={appState.setDuplicatePersonsWarning} setNewPersonInitialBalance={setNewPersonInitialBalance} setNewPersonInitialBalanceType={setNewPersonInitialBalanceType} setNewPersonCreditLimit={setNewPersonCreditLimit} successMsg={successMsg} getPersonDisplayName={getPersonDisplayName} toPersianDigits={toPersianDigits} storeSettings={storeSettings}  setCustomerId={setCustomerId} setReceiptPersonId={setReceiptPersonId} setPersonExtraId={setPersonExtraId} setPersonBankName={setPersonBankName} setPersonBankAcc={setPersonBankAcc} setPersonCard={setPersonCard} setPersonSheba={setPersonSheba} setPersonBankAccounts={setPersonBankAccounts} setPersonNotes={setPersonNotes} setIsPersonExtraModalOpen={setIsPersonExtraModalOpen} confirmAction={confirmAction} setPersonPageSize={setPersonPageSize} setActiveTab={setActiveTab} />} />
<Route path="/person_groups" element={<PersonGroupsManager showNotification={showNotification} />} />
<Route path="/person_categories" element={<PersonCategoriesManager showNotification={showNotification} />} />
<Route path="/person_roles" element={<PersonRolesManager showNotification={showNotification} />} />
<Route path="/accounts" element={<AccountsManager
                        setEditingAccountId={setEditingAccountId}
                        setIsAccountModalOpen={setIsAccountModalOpen}
                        successMsg={successMsg}
                        accounts={accounts}
                        formatNumber={formatNumber}
                        handleEditAccount={handleEditAccount}
                        confirmAction={confirmAction}
                        handleDeleteAccount={handleDeleteAccount}
                        toPersianDigits={toPersianDigits}
                        storeSettings={storeSettings} />} />
<Route path="/cashboxes" element={<CashboxesManager
                        setEditingCashboxId={setEditingCashboxId}
                        setNewCashboxBalance={setNewCashboxBalance}
                        setIsCashboxModalOpen={setIsCashboxModalOpen}
                        successMsg={successMsg}
                        cashboxes={cashboxes}
                        formatNumber={formatNumber}
                        handleEditCashbox={handleEditCashbox}
                        confirmAction={confirmAction}
                    
                        handleDeleteCashbox={handleDeleteCashbox}
                        toPersianDigits={toPersianDigits}
                        storeSettings={storeSettings} />} />
<Route path="/warehouses" element={<WarehouseManager 
                        showNotification={showNotification}
                        warehouseSubTab={warehouseSubTab}
                        setWarehouseSubTab={setWarehouseSubTab}
                        warehouses={warehouses}
                        products={products}
                        setEditingWarehouseId={setEditingWarehouseId}
                        setIsWarehouseModalOpen={setIsWarehouseModalOpen}
                        setNewWarehouseName={setNewWarehouseName}
                        setNewWarehouseManager={setNewWarehouseManager}
                        setNewWarehouseLocation={setNewWarehouseLocation}
                        setNewWarehouseIsActive={setNewWarehouseIsActive}
                        recalculating={recalculating}
                        handleRecalculateStocks={handleRecalculateStocks}
                        handleEditWarehouse={handleEditWarehouse}
                        confirmAction={confirmAction}
                        handleDeleteWarehouse={handleDeleteWarehouse}
                        whStockSearch={whStockSearch}
                        setWhStockSearch={setWhStockSearch}
                        warehouseStocks={warehouseStocks}
                        formatNumber={formatNumber} />} />
<Route path="/account_ledger" element={<AccountLedgerReport
                        showNotification={showNotification}
                        onNavigateToDoc={(docId: any) => {
                          const doc = accountingDocuments.find(d => d.id.toString() === docId.toString());
                          if (doc) {
                             setViewingAccountingDoc(doc);
                             setIsAccountingDocModalOpen(true);
                          }
                        }
} />} />
<Route path="/financial_report" element={<FinancialDashboard
                        invoices={invoices}
                        persons={persons}
                        storeSettings={storeSettings}
                        reportDateRange={reportDateRange}
                        setReportDateRange={setReportDateRange}
                        issuedChecks={issuedChecks}
                        receivedChecks={receivedChecks}
                        accounts={accounts}
                        cashboxes={cashboxes}
                        transactions={transactions}
                        calculatePersonBalance={calculatePersonBalance}
                        getPersonDisplayName={getPersonDisplayName}
                        formatNumber={formatNumber}
                        setActiveTab={setActiveTab}
                        fetchData={fetchData}
                        getDefaultExchangeRate={getDefaultExchangeRate}
                        currentUser={user} />} />
<Route path="/person_profile" element={<PersonProfileView formatCurrency={formatCurrency} 

                        personId={profilePersonId}
                        persons={persons}
                        invoices={invoices}
                        transactions={transactions}
                        issuedChecks={issuedChecks}
                        receivedChecks={receivedChecks}
                        accountingDocuments={accountingDocuments}
                        storeSettings={storeSettings}
                        calculatePersonBalance={calculatePersonBalance}
                        onBack={() => setActiveTab("persons")}
                        onEdit={handleEditPerson}
                        onViewExtraInfo={(p: any) => {
                          setPersonExtraId(p.id);
                          setPersonBankAccounts(p.bankAccounts || []);
                          setPersonNotes(p.additionalNotes || "");
                          setIsPersonExtraModalOpen(true);
                        }}
                        onViewLedger={(id) => {
                          setLedgerPersonId(id);
                          setActiveTab("person_ledger");
                        }}
                        onCreateSale={(id) => {
                          setCustomerId(id);
                          setActiveTab("sale_invoice_create");
                        }}
                        onCreatePurchase={(id) => {
                          setCustomerId(id);
                          setActiveTab("purchase_invoice_create");
                        }}
                        onCreateReceive={(id) => {
                          setReceiptPersonId(id);
                          setActiveTab("receipt_create");
                        }}
                        onCreatePay={(id) => {
                          setReceiptPersonId(id);
                          setActiveTab("payment_create");
                        }}
                        getPersonDisplayName={getPersonDisplayName}
                        getRoleName={getRoleName}
                        getRoleBadgeClasses={getRoleBadgeClasses}
                        
                        toPersianDigits={toPersianDigits}
                        formatDateDisplay={formatDateDisplay} />} />
<Route path="/person_ledger" element={<PersonLedger 
                        persons={persons}
                        setPersons={setPersons}
                        fetchPersons={fetchPersons}
                        confirmAction={confirmAction}
                    
                        customAlert={customAlert}
                        showNotification={showNotification}
                        
                        toPersianDigits={toPersianDigits}
                        numToPersianWords={numToPersianWords}
                        DatePicker={DatePicker}
                        persian={persian}
                        persian_fa={persian_fa}
                        storeSettings={storeSettings}
                        user={user}
                        PersonLedgerActionsDropdown={PersonLedgerActionsDropdown} ledgerPersonId={ledgerPersonId} setActiveTab={setActiveTab} setCustomerId={setCustomerId} setReceiptPersonId={setReceiptPersonId} handleEditPerson={handleEditPerson} setIsPersonModalOpen={setIsPersonModalOpen} sendNotification={sendNotification} setPrintingPersonLedger={setPrintingPersonLedger} fetchInvoices={fetchInvoices} fetchTransactions={fetchTransactions} fetchAccountingDocuments={fetchAccountingDocuments} User={User} Select={Select} mapPersonToOption={mapPersonToOption} setLedgerPersonId={setLedgerPersonId} customPersonFilter={customPersonFilter} accountingDocuments={accountingDocuments} payslips={payslips} invoices={invoices} convertToGregorian={convertToGregorian} printingPersonLedger={printingPersonLedger} getPersonDisplayName={getPersonDisplayName} formatNumber={formatNumber} formatDateDisplay={formatDateDisplay} getRoleBadgeClasses={getRoleBadgeClasses} getRoleName={getRoleName} setLedgerTab={setLedgerTab} ledgerTab={ledgerTab} PersonNotesAndAttachments={PersonNotesAndAttachments} List={List} setViewingInvoice={setViewingInvoice} transactions={transactions} setViewingPayslip={setViewingPayslip} setPreviewReceiptData={setPreviewReceiptData} setPrintingTransaction={setPrintingTransaction} issuedChecks={issuedChecks} setViewingCheck={setViewingCheck} receivedChecks={receivedChecks} Calendar={Calendar} Tag={Tag} />} />
<Route path="/debts_credits" element={<DebtsCreditsReport showNotification={showNotification} />} />
<Route path="/transfer" element={<motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <FinancialTransfer showNotification={showNotification} />
                      </motion.div>} />
<Route path="/invoice_allocation" element={<motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <InvoiceAllocation formatCurrency={formatCurrency}
                          customAlert={customAlert}
                          
                          getDefaultExchangeRate={getDefaultExchangeRate} />
                      </motion.div>} />
<Route path="/quick_refund" element={<QuickRefund
                        showNotification={showNotification}
                        onComplete={() => {
                          fetchDataSilent();
                          fetchPersons();
                          fetchAccounts();
                          fetchCashboxes();
                        }} />} />

<Route path="/issued_checks_page" element={<IssuedChecksPage showNotification={showNotification} currentUser={user?.name || "کاربر سیستم"} setViewingCheck={setViewingCheck} onEditReceiptByCheck={handleEditReceiptByCheck} />} />
<Route path="/issue_check_form" element={<motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="h-full overflow-y-auto"
                      >
                        <IssueCheckStandalone />
                      </motion.div>} />


<Route path="/check_card" element={<motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="h-full overflow-y-auto bg-gray-50/50"
                      >
                        <CheckCardPage 
                             checkId={viewingCheck?.id || null} checkType={viewingCheck?._type || 'issued'}
                             onClose={() => {
                               setViewingCheck(null);
                               setActiveTab('check_panel');
                             }}
                             showNotification={showNotification}
                             currentUser={user?.name || 'سیستم'}
                             storeSettings={storeSettings}
                             onViewAccountingDoc={(doc) => {
                               setViewingAccountingDoc(doc);
                               setIsAccountingDocModalOpen(true);
                             }}
                           />
                      </motion.div>} />

<Route path="/checkbooks" element={<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="h-full"><CheckbooksManager storeSettings={storeSettings} showNotification={showNotification} /></motion.div>} />
<Route path="/check_panel" element={<motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="h-full"
                      >
                        <CheckManagement
                          onEditReceiptByCheck={handleEditReceiptByCheck}
                          showNotification={showNotification}
                          currentUser={user?.name || "کاربر سیستم"}
                        
                          sendNotification={sendNotification}
                          storeSettings={storeSettings}
                          setViewingCheck={setViewingCheck} />
                      </motion.div>} />

<Route path="/loan/:id" element={<LoanCardPage showNotification={showNotification} userRole={user?.role} formatCurrency={formatCurrency} storeSettings={storeSettings} />} />
<Route path="/loans_dashboard" element={<LoansManager activeTab="dashboard" showNotification={showNotification} persons={persons} accounts={accounts} loans={loans} setLoans={setLoans} installments={installments} setInstallments={setInstallments} currentUser={user?.name || "کاربر سیستم"} userRole={user?.role} setAccounts={setAccounts} transactions={transactions} setTransactions={setTransactions} storeSettings={storeSettings} />} />
<Route path="/loans_list" element={<LoansManager activeTab="list" showNotification={showNotification} persons={persons} accounts={accounts} loans={loans} setLoans={setLoans} installments={installments} setInstallments={setInstallments} currentUser={user?.name || "کاربر سیستم"} userRole={user?.role} setAccounts={setAccounts} transactions={transactions} setTransactions={setTransactions} storeSettings={storeSettings} />} />
<Route path="/loans_create" element={<LoansManager activeTab="create" showNotification={showNotification} persons={persons} accounts={accounts} loans={loans} setLoans={setLoans} installments={installments} setInstallments={setInstallments} currentUser={user?.name || "کاربر سیستم"} userRole={user?.role} setAccounts={setAccounts} transactions={transactions} setTransactions={setTransactions} storeSettings={storeSettings} />} />
<Route path="/loans_payment" element={<LoansManager activeTab="payment" showNotification={showNotification} persons={persons} accounts={accounts} loans={loans} setLoans={setLoans} installments={installments} setInstallments={setInstallments} currentUser={user?.name || "کاربر سیستم"} userRole={user?.role} setAccounts={setAccounts} transactions={transactions} setTransactions={setTransactions} storeSettings={storeSettings} />} />
<Route path="/loans_arrears" element={<LoansManager activeTab="arrears" showNotification={showNotification} persons={persons} accounts={accounts} loans={loans} setLoans={setLoans} installments={installments} setInstallments={setInstallments} currentUser={user?.name || "کاربر سیستم"} userRole={user?.role} setAccounts={setAccounts} transactions={transactions} setTransactions={setTransactions} storeSettings={storeSettings} />} />
<Route path="/loans_reports" element={<LoansManager activeTab="reports" showNotification={showNotification} persons={persons} accounts={accounts} loans={loans} setLoans={setLoans} installments={installments} setInstallments={setInstallments} currentUser={user?.name || "کاربر سیستم"} userRole={user?.role} setAccounts={setAccounts} transactions={transactions} setTransactions={setTransactions} storeSettings={storeSettings} />} />
<Route path="/loans_settings" element={<LoansManager activeTab="settings" showNotification={showNotification} persons={persons} accounts={accounts} loans={loans} setLoans={setLoans} installments={installments} setInstallments={setInstallments} currentUser={user?.name || "کاربر سیستم"} userRole={user?.role} setAccounts={setAccounts} transactions={transactions} setTransactions={setTransactions} storeSettings={storeSettings} />} />

<Route path="/system_info" element={<SystemInfo />} />
<Route path="/system_diagnostics" element={<SystemDiagnostics persons={persons} products={products}
                       
                        invoices={invoices}
                       
                        transactions={transactions}
                        warehouseStocks={warehouseStocks}
                        issuedChecks={issuedChecks}
                        receivedChecks={receivedChecks} />} />
<Route path="/users_manager" element={<UserManager />} />
<Route path="/settings" element={<SettingsTab storeSettings={storeSettings} 
                        
                        user={user}
                      settingsForm={settingsForm}
                        setSettingsForm={setSettingsForm}
                        CurrencyInput={CurrencyInput}
                        AlertTriangle={AlertTriangle}
                        AlertCircle={AlertCircle}
                      confirmAction={confirmAction}
                        handleSaveSettings={handleSaveSettings}
                        submittingSettings={submittingSettings}
                        Box={Box}
                        settingsTab={settingsTab}
                        setSettingsTab={setSettingsTab}
                        successMsg={successMsg}
                        Trash2={Trash2}
                        Image={Image}
                        handleLogoUpload={handleLogoUpload}
                        Globe={Globe}
                        CheckSquare={CheckSquare}
                        productCategories={productCategories}
                        ChevronDown={ChevronDown}
                        ChevronUp={ChevronUp}
                        Check={Check}
                        X={X} />} />
<Route path="/inventory_report" element={<InventoryReport showNotification={showNotification} categories={productCategories} />} />
<Route path="/order_list" element={<OrderList formatCurrency={formatCurrency} 
                        products={products}
                        categories={productCategories}
                        
                        toPersianDigits={toPersianDigits} />} />
<Route path="/kardex" element={<KardexReport />} />
<Route path="/crm_dashboard" element={<CRMDashboard persons={persons} showNotification={showNotification} confirmAction={confirmAction} />} />
<Route path="/analytical_dashboard" element={<AnalyticalDashboard showNotification={showNotification} />} />
<Route path="/send_message" element={<SendMessageView showNotification={showNotification} persons={persons} personGroups={personGroups} />} />
<Route path="/messaging_channels" element={<MessagingChannelsView showNotification={showNotification} />} />
<Route path="/messaging_logs" element={<MessagingLogsView showNotification={showNotification} />} />
<Route path="/sms_templates" element={<SmsTemplatesView showNotification={showNotification} />} />
<Route path="/sync_manager" element={<SyncManager confirmAction={confirmAction} />} />
<Route path="/system_logs" element={<motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <SystemLogs />
                      </motion.div>} />
<Route path="/database_logs" element={<motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <DatabaseLogs />
                      </motion.div>} />
<Route path="/data_reconciliation" element={<DatabaseReconciliation />} />
<Route path="/database" element={<DatabaseDashboard showNotification={showNotification} />} />
<Route path="/personal_notes" element={<PersonalNotesManager storeSettings={storeSettings} />} />
<Route path="/update" element={<SystemUpdatePage storeSettings={storeSettings} setActiveTab={setActiveTab} />} />
<Route path="/quick_price_inquiry" element={<QuickPriceInquiry products={products}
                       
                        settings={storeSettings} />} />
<Route path="/product_view" element={<div className="flex flex-col h-full gap-4">
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`bg-white rounded-2xl shadow-sm border border-gray-100 shrink-0 ${viewingProduct ? 'p-4 mx-4 mt-4' : 'p-8 max-w-3xl mx-auto mt-10 w-full'}`}
                        >
                          <h2 className={`${viewingProduct ? 'text-lg mb-4' : 'text-2xl mb-6'} font-bold text-gray-800 flex items-center gap-2`}>
                            <Package className={`${viewingProduct ? 'w-5 h-5' : 'w-8 h-8'} text-indigo-600`} />
                            جستجوی پیشرفته کارت کالا
                          </h2>
                          <div className="relative">
                            <SearchableSelect
                              options={(products || []).map((p) => ({
                                value: p.id,
                                label: p.name,
                                subLabel: formatProductStockDetails(p),
                                badge: p.type === "service" ? "خدمات" : "کالا",
                                searchStr: `${p.code || ""} ${p.barcode || ""}`,
                              }))}
                              value={viewingProduct ? viewingProduct.id.toString() : ""}
                              onChange={(val) => {
                                const p = products.find(
                                  (prod) => prod.id.toString() === val,
                                );
                                if (p) setViewingProduct(p);
                                else setViewingProduct(null);
                              }}
                              placeholder="جستجو کالا (نام، کد، بارکد)..."
                              searchPlaceholder="نام، کد یا بارکد کالا را وارد کنید..." /></div>
                          {!viewingProduct && (
                            <div className="mt-8 text-center text-gray-500 text-sm">
                              جهت مشاهده تاریخچه و گردش کالا، جستجو و انتخاب کنید
                            </div>
                          )}
                        
                        
                        {viewingProduct && (
                          <div className="flex-1 min-h-[500px]">
                            <ProductCardModal
                              product={viewingProduct}
                              warehouses={warehouses}
                              currency={storeSettings?.currency || "تومان"}
                              isModal={false}
                              persons={persons}
                              storeSettings={storeSettings}
                              onClose={() => {
                                setViewingProduct(null);
                              }} />
                          </div>
                        )}
                      </motion.div>
                      </div>} />
<Route path="/checklist" element={<SystemChecklist />} />
<Route path="/stocktaking" element={<StocktakingManager
                        showNotification={showNotification}
                        currentUser={user?.name}
                        onNavigateToDocs={() =>
                          setActiveTab("create_warehouse_doc")} />} />
<Route path="/financial_years" element={<FinancialYearManager showNotification={showNotification} />} />
<Route path="/chart_of_accounts" element={<ChartOfAccounts
                        showNotification={showNotification}
                        currentUser={user?.name} />} />
<Route path="/accounting_docs_list" element={<AccountingDocsList
                        showNotification={showNotification}
                        onNavigateToCreate={() => {
                          setEditingAccountingDoc(null);
                          setActiveTab("accounting_doc_create");
                        }}
                        onNavigateToView={(doc: any) => {
                          setViewingAccountingDoc(doc);
                          setIsAccountingDocModalOpen(true);
                        }}
                        onNavigateToEdit={(doc: any) => {
                          setEditingAccountingDoc(doc);
                          setActiveTab("accounting_doc_create");
                        }} />} />
<Route path="/accounting_doc_create" element={<AccountingDocCreate
                        showNotification={showNotification}
                        initialDoc={editingAccountingDoc}
                        onBack={() => {
                          setEditingAccountingDoc(null);
                          setActiveTab("accounting_docs_list");
                        }} />} />

<Route path="/payroll_settings" element={<PayrollSettings showNotification={showNotification} storeSettings={storeSettings} />} />

<Route path="/employee_profiles" element={<EmployeeProfilesManager personsData={persons} fetchPersons={fetchPersons} showNotification={showNotification} />} />
<Route path="/employee_contracts" element={<ContractsManager personsData={persons} personGroups={personGroups} storeSettings={storeSettings} showNotification={showNotification} DatePicker={DatePicker} persian={persian} persian_fa={persian_fa} />} />
<Route path="/employee_orders" element={<EmployeeOrdersManager personsData={persons} storeSettings={storeSettings} showNotification={showNotification} DatePicker={DatePicker} persian={persian} persian_fa={persian_fa} />} />
<Route path="/daily_attendance" element={<DailyAttendanceManager personsData={persons} storeSettings={storeSettings} showNotification={showNotification} DatePicker={DatePicker} persian={persian} persian_fa={persian_fa} />} />
<Route path="/monthly_attendance" element={<MonthlyAttendance personsData={persons} showNotification={showNotification} />} />
<Route path="/payslips" element={<PayslipsManager personsData={persons} storeSettings={storeSettings} showNotification={showNotification} />} />
<Route path="/" element={<Navigate to="/welcome_page" replace />} />
  <Route path="*" element={<AnimatePresence mode="wait"><motion.div key={location.pathname} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.2 }} className="h-full flex flex-col">{renderTabContent()}</motion.div></AnimatePresence>} />
</Routes>
  );



if (appState.isStoreSelectionOpen) {
    return (
      <BusinessManager 
        showNotification={showNotification}
        availableStores={appState.availableStores} 
        setAvailableStores={appState.setAvailableStores} 
        onSelectStore={(id: string) => {
          localStorage.setItem("activeStoreId", id);
          window.location.reload();
        }}
        onClose={localStorage.getItem("activeStoreId") ? () => appState.setIsStoreSelectionOpen(false) : undefined}
      />
    );
  }

if (loading || authLoading) {
    const textStr = authLoading ? "در حال بررسی احراز هویت..." : "در حال بارگذاری اطلاعات و تنظیمات سیستم...";
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center relative overflow-hidden" dir="rtl">
        {/* Background elements */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        
        <div className="relative z-10 flex flex-col items-center">
          {/* Animated Logo/Icon */}
          <div className="relative w-24 h-24 mb-8">
            <motion.div
              className="absolute inset-0 border-4 border-indigo-200 rounded-2xl"
              animate={{ rotate: 180, scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute inset-2 border-4 border-blue-400 rounded-xl"
              animate={{ rotate: -180, scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute inset-4 bg-gradient-to-tr from-indigo-600 to-blue-500 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/30"
              animate={{ scale: [1, 0.9, 1] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            >
              <LayoutDashboard className="w-6 h-6 text-white" />
            </motion.div>
          </div>

          {/* Loading Text */}
          <div className="flex flex-col items-center gap-3">
            <h2 className="text-xl font-black text-slate-800 tracking-tight">
              نرم‌افزار جامع مدیریت مالی
            </h2>
            <div className="flex items-center gap-3 bg-white px-5 py-2.5 rounded-2xl shadow-sm border border-slate-100">
              <motion.div
                 animate={{ rotate: 360 }}
                 transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                 className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full"
              />
              <span className="text-sm font-bold text-slate-500">{textStr}</span>
            </div>
          </div>
        </div>

        {/* Decorative progress bar */}
        <div className="fixed bottom-0 left-0 right-0 h-1 bg-slate-100">
          <motion.div 
            className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 2.5, ease: "easeInOut", repeat: Infinity }}
          />
        </div>
      </div>
    );
  }

if (requiresInitSetup && user) {
    return (
      <div
        className="min-h-screen bg-slate-50 flex items-center justify-center p-4 pt-10 pb-10"
        dir="rtl"
      >
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden max-w-xl w-full">
          <div className="bg-slate-900 p-10 text-center text-white relative overflow-hidden">
            <h1 className="text-2xl font-black mb-3 relative z-10 tracking-tight">
              خوش آمدید
            </h1>
            <p className="text-slate-300 font-medium relative z-10 text-sm">
              جهت ورود به سیستم، تنظیمات اولیه را تکمیل نمایید
            </p>
          </div>
          <div className="p-8">
            <div className="bg-amber-50 text-amber-800 p-4 rounded-xl text-sm font-bold flex items-start gap-3 mb-8 border border-amber-100 shadow-sm">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                توجه: <strong>نوع تقویم</strong> و <strong>واحد پولی</strong> پس
                از ثبت برای حفظ یکپارچگی پایگاه داده سیستم{" "}
                <strong>غیرقابل تغییر</strong> خواهند بود.
              </p>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  نام مجموعه / شرکت
                </label>
                <input
                  type="text"
                  required
                  value={settingsForm.storeName}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      storeName: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 bg-slate-50/50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-800 focus:border-slate-800 focus:bg-white transition-colors font-semibold text-slate-900"
                  placeholder="عنوان کسب و کار خود را وارد کنید..."
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  واحد پولی سیستم
                </label>
                <select
                  value={settingsForm.currency}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      currency: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 bg-slate-50/50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-800 focus:border-slate-800 focus:bg-white transition-colors font-semibold text-slate-900"
                >
                  <option value="ریال">ریال</option>
                  <option value="تومان">تومان</option>
                  <option value="دلار">دلار (USD)</option>
                  <option value="افغانی">افغانی</option>
                  <option value="درهم">درهم (AED)</option>
                  <option value="یورو">یورو (EUR)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  تاریخ و تقویم سیستم
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() =>
                      setSettingsForm({
                        ...settingsForm,
                        calendarType: "jalali",
                      })
                    }
                    className={`py-4 px-2 rounded-xl border flex items-center justify-center gap-2 font-bold transition-all ${settingsForm.calendarType !== "gregorian" ? "border-slate-800 bg-slate-800 text-white shadow-sm" : "border-slate-200 text-slate-500 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50"}`}
                  >
                    تقویم شمسی (جلالی)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSettingsForm({
                        ...settingsForm,
                        calendarType: "gregorian",
                      })
                    }
                    className={`py-4 px-2 rounded-xl border flex items-center justify-center gap-2 font-bold transition-all ${settingsForm.calendarType === "gregorian" ? "border-slate-800 bg-slate-800 text-white shadow-sm" : "border-slate-200 text-slate-500 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50"}`}
                  >
                    تقویم میلادی
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  فونت سیستم
                </label>
                <select
                  value={settingsForm.fontFamily || "Vazirmatn"}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      fontFamily: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 bg-slate-50/50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-800 focus:border-slate-800 focus:bg-white transition-colors font-semibold text-slate-900"
                >
                  <option value="Vazirmatn">وزیرمتن (Vazirmatn)</option>
                  <option value="IRANYekanXFaNum">
                    ایران یکان (IRANYekanX)
                  </option>
                  <option value="Lalezar">لاله‌زار (Lalezar)</option>
                  <option value="Readex Pro">ریدکس پرو (Readex Pro)</option>
                  <option value="Cairo">قاهره (Cairo)</option>
                  <option value="Amiri">امیری (Amiri)</option>
                  <option value="Changa">چنگا (Changa)</option>
                  <option value="Tahoma">تاهوما (Tahoma)</option>
                </select>
              </div>

              <div className="pt-6 border-t border-slate-100 mt-2">
                <button
                  type="submit"
                  disabled={submittingSettings}
                  className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-md active:scale-[0.98] focus:ring-4 focus:ring-slate-100"
                >
                  {submittingSettings ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <CheckCircle className="w-5 h-5" />
                  )}
                  ثبت نهایی و ورود به سیستم
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }
  

  const requiresProfileLink = user && ['admin', 'manager', 'employee'].includes(user.role) && user.isProfileRequired !== false && !user.personId;

  if (requiresProfileLink) {
    return <LinkPerson user={user} persons={persons || []} personRoles={appState.personRoles || []} personGroups={appState.personGroups || []} onPersonLinked={() => window.location.reload()} />
  }

  if (activeTab === "welcome_page") {
    return <WelcomePage onLoginClick={() => setActiveTab("financial_report")} />
  }

  return (
    <>
      <DebtorsNotification persons={persons} 
            settings={storeSettings} 
            
            calculatePersonBalance={calculatePersonBalance} 
            onOpenPersonProfile={(pid) => { 
              setProfilePersonId(pid); 
              setActiveTab("person_profile");
            }} 
          />
          <AnimatePresence>
            {notification && (
              <motion.div
                key="notification-toast"
                initial={{ opacity: 0, y: 50, x: "-50%" }}
                animate={{ opacity: 1, y: 0, x: "-50%" }}
                exit={{ opacity: 0, y: 20, x: "-50%" }}
                className={`fixed bottom-6 left-1/2 z-[99999] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 font-bold text-sm ${
                  notification.type === "success"
                    ? "bg-emerald-600 text-white"
                    : notification.type === "error"
                      ? "bg-rose-600 text-white"
                      : notification.type === "warning"
                        ? "bg-amber-500 text-white"
                        : "bg-slate-800 text-white"
                }`}
              >
                {notification.type === "success" && (
                  <CheckCircle className="w-5 h-5" />
                )}
                {notification.type === "error" && (
                  <AlertCircle className="w-5 h-5" />
                )}
                {(notification.type === "info" ||
                  notification.type === "warning") && <Info className="w-5 h-5" />}
                {notification.message}
              </motion.div>
            )}
          </AnimatePresence>
          
          

          <MobileRestrictedMenu activeTab={activeTab} setActiveTab={setActiveTab} setIsPersonModalOpen={setIsPersonModalOpen} setIsProductModalOpen={setIsProductModalOpen} />
          {/* Confirm Action Modal */}{" "}
          {confirmState.isOpen && (
            <div className="fixed inset-0 bg-slate-900/40 z-[99999] flex items-center justify-center p-4 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-xl flex flex-col items-center border border-gray-100 overflow-hidden"
                dir="rtl"
              >
                {confirmState.loading && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-[10] flex items-center justify-center">
                    <BeautifulLoading text="در حال انجام عملیات..." />
                  </div>
                )}
                <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mb-4">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="font-extrabold text-lg mb-2">تایید عملیات</h3>
                <p className="text-gray-500 text-sm text-center mb-4">
                  {confirmState.message}
                </p>
                {confirmState.details && (
                   <div className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 mb-6 text-sm text-slate-700 max-h-48 overflow-y-auto whitespace-pre-wrap text-right">
                      {confirmState.details}
                   </div>
                )}
                <div className="flex gap-3 w-full">
                  <button
                    disabled={confirmState.loading}
                    onClick={async () => {
                      setConfirmState({ ...confirmState, loading: true });
                      try {
                        await confirmState.onConfirm();
                      } finally {
                        setConfirmState({ ...confirmState, isOpen: false, loading: false });
                      }
                    }}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                  >
                    {confirmState.loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    بله، تایید
                  </button>
                  <button
                    disabled={confirmState.loading}
                    onClick={() =>
                      setConfirmState({ ...confirmState, isOpen: false })
                    }
                    className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 rounded-xl font-bold transition-colors"
                  >
                    انصراف
                  </button>
                </div>
              </motion.div>
            </div>
          )}
          {/* Gmail style Compose Quick Action Modal */}
          {isComposeOpen && (
                    <div key="isComposeOpen-modal"
                      className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-[200] p-4 print:hidden"
              dir="rtl"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col font-sans"
              >
                {/* Modal Header */}
                <div className="bg-[#f6f8fc] px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#fdf2f2] text-[#b3261e] rounded-xl flex items-center justify-center shadow-xs">
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-800">
                        ایجاد سریع سند / تراکنش
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        میانبرهای کاربردی برای ثبت سریع اطلاعات در بخش‌های مختلف
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsComposeOpen(false)}
                    className="p-1.5 hover:bg-slate-200/50 text-slate-500 rounded-lg transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 bg-white max-h-[70vh] overflow-y-auto">
                  {/* Shortcut Item 1 */}
                  <button
                    type="button"
                    onClick={() => {
                      clearDraft();
                      setActiveTab("create_sale");
                      setIsComposeOpen(false);
                    }}
                    className="p-4 border border-slate-200 hover:border-[#b3261e]/40 hover:bg-rose-50/10 rounded-2xl text-right flex gap-4 transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
                  >
                    <div className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-xl flex-shrink-0 flex items-center justify-center font-bold">
                      📑
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-800">
                        صدور فاکتور فروش کالا
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        فروش کالا و خدمات به مشتریان با ثبت خودکار سند حسابداری و
                        کاهش موجودی انبار.
                      </p>
                    </div>
                  </button>

                  {/* Shortcut Item 2 */}
                  <button
                    type="button"
                    onClick={() => {
                      clearDraft();
                      setActiveTab("create_purchase");
                      setIsComposeOpen(false);
                    }}
                    className="p-4 border border-slate-200 hover:border-[#b3261e]/40 hover:bg-rose-50/10 rounded-2xl text-right flex gap-4 transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
                  >
                    <div className="w-11 h-11 bg-rose-50 text-rose-600 rounded-xl flex-shrink-0 flex items-center justify-center font-bold">
                      🛒
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-800">
                        ثبت فاکتور خرید کالا
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        ثبت خرید کالا و خدمات از تامین‌کنندگان برای افزایش موجودی
                        انبار.
                      </p>
                    </div>
                  </button>

                  {/* Shortcut Item 3 */}
                  <button
                    type="button"
                    onClick={() => {
                      setRawActiveTab("create_receive_receipt");
                      setIsComposeOpen(false);
                    }}
                    className="p-4 border border-slate-200 hover:border-[#b3261e]/40 hover:bg-rose-50/10 rounded-2xl text-right flex gap-4 transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
                  >
                    <div className="w-11 h-11 bg-teal-50 text-teal-600 rounded-xl flex-shrink-0 flex items-center justify-center font-bold">
                      💵
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-800">
                        ثبت سند دریافت وجه
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        ثبت مبالغ دریافتی از مشتریان، صندوق یا بانک به صورت نقد یا
                        چک.
                      </p>
                    </div>
                  </button>

                  {/* Shortcut Item 4 */}
                  <button
                    type="button"
                    onClick={() => {
                      setRawActiveTab("create_pay_receipt");
                      setIsComposeOpen(false);
                    }}
                    className="p-4 border border-slate-200 hover:border-[#b3261e]/40 hover:bg-rose-50/10 rounded-2xl text-right flex gap-4 transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
                  >
                    <div className="w-11 h-11 bg-amber-50 text-amber-600 rounded-xl flex-shrink-0 flex items-center justify-center font-bold">
                      💸
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-800">
                        ثبت سند پرداخت وجه
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        ثبت پرداختی‌های نقد یا چک به تامین‌کنندگان، هزینه‌ها یا
                        پرسنل.
                      </p>
                    </div>
                  </button>

                  {/* Shortcut Item 5 */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("transfer");
                      setIsComposeOpen(false);
                    }}
                    className="p-4 border border-slate-200 hover:border-[#b3261e]/40 hover:bg-rose-50/10 rounded-2xl text-right flex gap-4 transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer md:col-span-2"
                  >
                    <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-xl flex-shrink-0 flex items-center justify-center font-bold">
                      🔄
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-800">
                        انتقال وجه بین حساب‌ها
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        جابجایی مبالغ نقدینگی بین حساب‌های بانکی و صندوق‌های مختلف
                        کسب و کار با ثبت سند معین.
                      </p>
                    </div>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
          {systemModule === "selector" ? (
            <ModuleSelector
              storeSettings={storeSettings}
              invoices={invoices}
              persons={persons}
              products={products}
              transactions={transactions}
              issuedChecks={issuedChecks}
              receivedChecks={receivedChecks}
              onSelectModule={(sel) => {
                setSystemModule(sel);
                if (sel === "commerce") setActiveTab("analytical_dashboard");
                else if (sel === "inventory") setActiveTab("inventory_report");
                else if (sel === "accounting") setActiveTab("financial_report");
                else if (sel === "admin") setActiveTab("settings");
                else if (sel === "crm") setActiveTab("crm_dashboard");
                else if (sel === "hr") setActiveTab("list_salary_payroll");
                else if (sel === "reports_module")
                  setActiveTab("analytical_dashboard");
                else setActiveTab("financial_report");
              }}
            />
          ) : storeSettings?.theme === "persian_admin_lte" ? (
             <AdminLTELayout appState={appState}>
                <Suspense fallback={<div className="flex h-full items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>}>
                    {/* We will let AdminLTELayout render its own routing if needed, but since we are extracting, we can just call renderTabContent() for now */}
                    {appRoutes}
                </Suspense>
             </AdminLTELayout>
          ) : (
            <div
              className={`flex ${menuLayout === "horizontal" ? "flex-col h-screen" : "h-screen"} overflow-hidden ${isGmailTheme ? "theme-gmail bg-[#f6f8fc]" : `theme-${storeSettings?.theme || "classic"} bg-gray-50/50`} text-gray-800 font-sans print:h-auto print:block print:overflow-visible main-app-layout-wrapper`}
              dir="rtl"
            >
              {isGmailTheme && (
                <style
                  dangerouslySetInnerHTML={{
                    __html: `
              /* Gmail theme overrides */
              .theme-gmail .bg-indigo-600 { background-color: #b3261e !important; }
              .theme-gmail .hover\\:bg-indigo-700:hover { background-color: #8c1d18 !important; }
              .theme-gmail .text-indigo-600 { color: #b3261e !important; }
              .theme-gmail .text-indigo-800 { color: #8c1d18 !important; }
              .theme-gmail .border-indigo-600 { border-color: #b3261e !important; }
              .theme-gmail .bg-indigo-50 { background-color: #fce8e6 !important; }
              .theme-gmail .text-indigo-300 { color: #b3261e !important; }
              .theme-gmail .focus\\:ring-indigo-500:focus { --tw-ring-color: #b3261e !important; ring-color: #b3261e !important; }
              .theme-gmail .focus\\:ring-indigo-600:focus { --tw-ring-color: #b3261e !important; ring-color: #b3261e !important; }
              .theme-gmail .bg-indigo-600\\/20 { background-color: rgba(253, 232, 230, 0.7) !important; }
              .theme-gmail .border-indigo-100 { border-color: #fce8e6 !important; }
              .theme-gmail .border-indigo-200 { border-color: #f9d5d3 !important; }
              .theme-gmail .text-indigo-500 { color: #b3261e !important; }
              .theme-gmail .bg-indigo-600\\/10 { background-color: rgba(253, 232, 230, 0.4) !important; }
              /* Custom overrides for cards and layouts inside Gmail theme */
              .theme-gmail .bg-gradient-to-l.from-indigo-50.to-white { background-image: linear-gradient(to left, #fce8e6, #ffffff) !important; }
              .theme-gmail .bg-gradient-to-r.from-indigo-500.to-indigo-600 { background-image: linear-gradient(to right, #b3261e, #8c1d18) !important; }
              .theme-gmail .bg-gradient-to-br.from-indigo-500.to-indigo-600 { background-image: linear-gradient(to bottom right, #b3261e, #8c1d18) !important; }
              .theme-gmail .from-indigo-600 { --tw-gradient-from: #b3261e !important; }
              .theme-gmail .to-indigo-700 { --tw-gradient-to: #8c1d18 !important; }
              .theme-gmail .text-indigo-700 { color: #b3261e !important; }
              .theme-gmail .bg-indigo-100 { background-color: #fce8e6 !important; }
              .theme-gmail .text-indigo-900 { color: #601410 !important; }
              .theme-gmail .hover\\:text-indigo-500:hover { color: #b3261e !important; }
              .theme-gmail .border-l-4.border-indigo-600 { border-left-color: #b3261e !important; }
              .theme-gmail .border-r-4.border-indigo-600 { border-right-color: #b3261e !important; }
              .theme-gmail .accent-indigo-600 { accent-color: #b3261e !important; }
              .theme-gmail .bg-indigo-900 { background-color: #3f0c0a !important; }
              `
                  }}
                />
              )}
              {storeSettings?.theme === "emerald" && (
                <style
                  dangerouslySetInnerHTML={{
                    __html: `
              /* Emerald theme overrides */
              .theme-emerald .bg-indigo-600 { background-color: #059669 !important; }
              .theme-emerald .hover\\:bg-indigo-700:hover { background-color: #047857 !important; }
              .theme-emerald .text-indigo-600 { color: #059669 !important; }
              .theme-emerald .text-indigo-800 { color: #064e3b !important; }
              .theme-emerald .border-indigo-600 { border-color: #059669 !important; }
              .theme-emerald .bg-indigo-50 { background-color: #ecfdf5 !important; }
              .theme-emerald .text-indigo-300 { color: #6ee7b7 !important; }
              .theme-emerald .focus\\:ring-indigo-500:focus, .theme-emerald .focus\\:ring-indigo-600:focus { --tw-ring-color: #059669 !important; ring-color: #059669 !important; }
              .theme-emerald .bg-indigo-600\\/20 { background-color: rgba(16, 185, 129, 0.2) !important; }
              .theme-emerald .border-indigo-100 { border-color: #d1fae5 !important; }
              .theme-emerald .border-indigo-200 { border-color: #a7f3d0 !important; }
              .theme-emerald .text-indigo-500 { color: #10b981 !important; }
              .theme-emerald .bg-indigo-600\\/10 { background-color: rgba(16, 185, 129, 0.1) !important; }
              .theme-emerald .bg-gradient-to-l.from-indigo-50.to-white { background-image: linear-gradient(to left, #ecfdf5, #ffffff) !important; }
              .theme-emerald .bg-gradient-to-r.from-indigo-500.to-indigo-600 { background-image: linear-gradient(to right, #10b981, #059669) !important; }
              .theme-emerald .from-indigo-600 { --tw-gradient-from: #059669 !important; }
              .theme-emerald .to-indigo-700 { --tw-gradient-to: #047857 !important; }
              .theme-emerald .text-indigo-700 { color: #047857 !important; }
              .theme-emerald .bg-indigo-100 { background-color: #d1fae5 !important; }
              .theme-emerald .text-indigo-900 { color: #064e3b !important; }
              .theme-emerald .hover\\:text-indigo-500:hover { color: #10b981 !important; }
              .theme-emerald .border-l-4.border-indigo-600 { border-left-color: #059669 !important; }
              .theme-emerald .border-r-4.border-indigo-600 { border-right-color: #059669 !important; }
              .theme-emerald .accent-indigo-600 { accent-color: #059669 !important; }
              .theme-emerald .bg-indigo-900 { background-color: #064e3b !important; }
              .theme-emerald .from-indigo-900 { --tw-gradient-from: #064e3b !important; }
              .theme-emerald.bg-indigo-900 { background-color: #064e3b !important; }
            `
                  }}
                />
              )}
              {storeSettings?.theme === "ocean" && (
                <style
                  dangerouslySetInnerHTML={{
                    __html: `
              /* Ocean theme overrides */
              .theme-ocean .bg-indigo-600 { background-color: #0284c7 !important; }
              .theme-ocean .hover\\:bg-indigo-700:hover { background-color: #0369a1 !important; }
              .theme-ocean .text-indigo-600 { color: #0284c7 !important; }
              .theme-ocean .text-indigo-800 { color: #075985 !important; }
              .theme-ocean .border-indigo-600 { border-color: #0284c7 !important; }
              .theme-ocean .bg-indigo-50 { background-color: #f0f9ff !important; }
              .theme-ocean .text-indigo-300 { color: #7dd3fc !important; }
              .theme-ocean .focus\\:ring-indigo-500:focus, .theme-ocean .focus\\:ring-indigo-600:focus { --tw-ring-color: #0284c7 !important; ring-color: #0284c7 !important; }
              .theme-ocean .bg-indigo-600\\/20 { background-color: rgba(2, 132, 199, 0.2) !important; }
              .theme-ocean .border-indigo-100 { border-color: #e0f2fe !important; }
              .theme-ocean .border-indigo-200 { border-color: #bae6fd !important; }
              .theme-ocean .text-indigo-500 { color: #0ea5e9 !important; }
              .theme-ocean .bg-indigo-600\\/10 { background-color: rgba(2, 132, 199, 0.1) !important; }
              .theme-ocean .bg-gradient-to-l.from-indigo-50.to-white { background-image: linear-gradient(to left, #f0f9ff, #ffffff) !important; }
              .theme-ocean .bg-gradient-to-r.from-indigo-500.to-indigo-600 { background-image: linear-gradient(to right, #0ea5e9, #0284c7) !important; }
              .theme-ocean .from-indigo-600 { --tw-gradient-from: #0284c7 !important; }
              .theme-ocean .to-indigo-700 { --tw-gradient-to: #0369a1 !important; }
              .theme-ocean .text-indigo-700 { color: #0369a1 !important; }
              .theme-ocean .bg-indigo-100 { background-color: #e0f2fe !important; }
              .theme-ocean .text-indigo-900 { color: #0c4a6e !important; }
              .theme-ocean .hover\\:text-indigo-500:hover { color: #0ea5e9 !important; }
              .theme-ocean .border-l-4.border-indigo-600 { border-left-color: #0284c7 !important; }
              .theme-ocean .border-r-4.border-indigo-600 { border-right-color: #0284c7 !important; }
              .theme-ocean .accent-indigo-600 { accent-color: #0284c7 !important; }
              .theme-ocean .bg-indigo-900 { background-color: #0c4a6e !important; }
              .theme-ocean .from-indigo-900 { --tw-gradient-from: #0c4a6e !important; }
              .theme-ocean.bg-indigo-900 { background-color: #0c4a6e !important; }
            `
                  }}
                />
              )}
              
              {storeSettings?.theme === "hacker" && (
                <style
                  dangerouslySetInnerHTML={{
                    __html: `
              /* Hacker theme overrides */
              body {
                font-family: "JetBrains Mono", "Courier New", "IRANYekanXFaNum", monospace !important;
                background-color: #000000 !important;
                color: #00ff00 !important;
                text-shadow: 0 0 2px rgba(0, 255, 0, 0.4);
              }

              body::after {
                content: " ";
                display: block;
                position: fixed;
                top: 0;
                left: 0;
                bottom: 0;
                right: 0;
                background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06));
                z-index: 9999;
                background-size: 100% 2px, 3px 100%;
                pointer-events: none;
              }

              .theme-hacker * {
                border-radius: 0 !important;
                border-color: #004400 !important;
              }

              .theme-hacker .bg-white, .theme-hacker .bg-slate-50, .theme-hacker .bg-gray-50, .theme-hacker .bg-slate-900, .theme-hacker .bg-slate-800 {
                background-color: #020202 !important;
                color: #00ff00 !important;
              }
              
              .theme-hacker .text-slate-900, .theme-hacker .text-gray-900, .theme-hacker .text-slate-800, .theme-hacker .text-slate-700, .theme-hacker .text-gray-700, .theme-hacker .text-slate-600, .theme-hacker .text-gray-600, .theme-hacker .text-slate-500, .theme-hacker .text-gray-500 {
                color: #00dd00 !important;
              }
              
              .theme-hacker .text-indigo-600, .theme-hacker .text-indigo-700, .theme-hacker .text-indigo-800, .theme-hacker .text-indigo-900, .theme-hacker .text-blue-600, .theme-hacker .text-emerald-600, .theme-hacker .text-rose-600, .theme-hacker .text-amber-600 {
                color: #00ff00 !important;
              }

              .theme-hacker .bg-indigo-600, .theme-hacker .bg-blue-600, .theme-hacker .bg-emerald-600, .theme-hacker .bg-rose-600 {
                background-color: #005500 !important;
                color: #00ff00 !important;
                border: 1px solid #00ff00 !important;
              }
              
              .theme-hacker .bg-indigo-50, .theme-hacker .bg-blue-50, .theme-hacker .bg-emerald-50, .theme-hacker .bg-rose-50, .theme-hacker .bg-amber-50, .theme-hacker .bg-gray-100, .theme-hacker .bg-slate-100 {
                background-color: #001100 !important;
                border-color: #004400 !important;
              }

              .theme-hacker input, .theme-hacker select, .theme-hacker textarea {
                background-color: #000000 !important;
                color: #00ff00 !important;
                border: 1px solid #00aa00 !important;
              }

              .theme-hacker input:focus, .theme-hacker select:focus, .theme-hacker textarea:focus {
                outline: none !important;
                box-shadow: 0 0 8px rgba(0, 255, 0, 0.6) !important;
                border-color: #00ff00 !important;
              }

              .theme-hacker button {
                text-shadow: none !important;
              }

              .theme-hacker .shadow-sm, .theme-hacker .shadow, .theme-hacker .shadow-md, .theme-hacker .shadow-lg, .theme-hacker .shadow-xl, .theme-hacker .shadow-2xl {
                box-shadow: 0 0 10px rgba(0, 255, 0, 0.1) !important;
              }
              
              .theme-hacker svg {
                color: #00ff00 !important;
              }
              
              .theme-hacker table th {
                background-color: #002200 !important;
                color: #00ff00 !important;
                border-color: #00ff00 !important;
              }
              
              .theme-hacker table td {
                border-color: #004400 !important;
              }
              
              .theme-hacker tr:hover td {
                background-color: #001100 !important;
              }
            `
                  }}
                />
              )}
              {storeSettings?.theme === "rose" && (
                <style
                  dangerouslySetInnerHTML={{
                    __html: `
              /* Rose theme overrides */
              .theme-rose .bg-indigo-600 { background-color: #e11d48 !important; }
              .theme-rose .hover\\:bg-indigo-700:hover { background-color: #be123c !important; }
              .theme-rose .text-indigo-600 { color: #e11d48 !important; }
              .theme-rose .text-indigo-800 { color: #881337 !important; }
              .theme-rose .border-indigo-600 { border-color: #e11d48 !important; }
              .theme-rose .bg-indigo-50 { background-color: #fff1f2 !important; }
              .theme-rose .text-indigo-300 { color: #fda4af !important; }
              .theme-rose .focus\\:ring-indigo-500:focus, .theme-rose .focus\\:ring-indigo-600:focus { --tw-ring-color: #e11d48 !important; ring-color: #e11d48 !important; }
              .theme-rose .bg-indigo-600\\/20 { background-color: rgba(225, 29, 72, 0.2) !important; }
              .theme-rose .border-indigo-100 { border-color: #ffe4e6 !important; }
              .theme-rose .border-indigo-200 { border-color: #fecdd3 !important; }
              .theme-rose .text-indigo-500 { color: #f43f5e !important; }
              .theme-rose .bg-indigo-600\\/10 { background-color: rgba(225, 29, 72, 0.1) !important; }
              .theme-rose .bg-gradient-to-l.from-indigo-50.to-white { background-image: linear-gradient(to left, #fff1f2, #ffffff) !important; }
              .theme-rose .bg-gradient-to-r.from-indigo-500.to-indigo-600 { background-image: linear-gradient(to right, #f43f5e, #e11d48) !important; }
              .theme-rose .from-indigo-600 { --tw-gradient-from: #e11d48 !important; }
              .theme-rose .to-indigo-700 { --tw-gradient-to: #be123c !important; }
              .theme-rose .text-indigo-700 { color: #be123c !important; }
              .theme-rose .bg-indigo-100 { background-color: #ffe4e6 !important; }
              .theme-rose .text-indigo-900 { color: #881337 !important; }
              .theme-rose .hover\\:text-indigo-500:hover { color: #f43f5e !important; }
              .theme-rose .border-l-4.border-indigo-600 { border-left-color: #e11d48 !important; }
              .theme-rose .border-r-4.border-indigo-600 { border-right-color: #e11d48 !important; }
              .theme-rose .accent-indigo-600 { accent-color: #e11d48 !important; }
              .theme-rose .bg-indigo-900 { background-color: #881337 !important; }
              .theme-rose .from-indigo-900 { --tw-gradient-from: #881337 !important; }
              .theme-rose.bg-indigo-900 { background-color: #881337 !important; }
            `
                  }}
                />
              )}
              <div className="block">
                <SidebarNavigation
                  mode="sidebar"
                user={user}
                signOut={signOut}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                systemModule={systemModule}
                hasCheckedFinancialYears={hasCheckedFinancialYears}
                activeFinancialYear={activeFinancialYear}
                isGmailTheme={isGmailTheme}
                storeSettings={storeSettings}
                isSidebarOpen={isSidebarOpen}
                setIsSidebarOpen={setIsSidebarOpen}
                menuLayout={menuLayout}
                setIsComposeOpen={setIsComposeOpen}
                expandedGroups={expandedGroups}
                setExpandedGroups={setExpandedGroups}
              />
    </div>
                        {/* Main Content Area */}
              <div
                className={`flex-1 flex flex-col w-full min-w-0 min-h-0 transition-all duration-300 overflow-hidden print:overflow-visible print:bg-white print:h-auto ${isGmailTheme ? "bg-white md:rounded-3xl md:border md:border-slate-200/80 md:m-3 md:shadow-xs" : ""}`}
              >
                {/* Top Header */}
                <div
                  className={`flex flex-col sticky top-0 z-[60] print:hidden ${isGmailTheme ? "bg-[#f6f8fc]" : "bg-white border-b border-gray-100 shadow-sm"}`}
                >
                  <div
                    className={`flex flex-row items-center justify-between p-3 md:p-4 relative z-[70] ${
                      isGmailTheme
                        ? "bg-[#f6f8fc] border-none"
                        : "bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-xs"
                    }`}
                    dir="rtl"
                  >
                    <div className="flex items-center gap-2 md:gap-3">
                      <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="flex md:hidden p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 rounded-xl transition-colors cursor-pointer shadow-3xs border border-slate-100 bg-white"
                        title="منوی اصلی"
                      >
                        <Menu className="w-5 h-5" />
                      </button>
                      <div className="font-extrabold text-slate-900 flex items-center gap-2">
                        {storeSettings.logoUrl ? (
                          <img
                            src={storeSettings.logoUrl}
                            className={`w-6 h-6 rounded object-contain ${menuLayout === "vertical" ? "md:hidden" : ""}`}
                            alt="logo"
                          />
                        ) : (
                          <div className={`w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-md shadow-indigo-600/20 relative overflow-hidden shrink-0 ${menuLayout === "vertical" ? "md:hidden" : ""}`}>
                            <div className="absolute inset-0 bg-white/20 transform -rotate-45 translate-x-4"></div>
                            <Layers className="w-4 h-4 relative z-10" />
                          </div>
                        )}
                        <div className={`flex items-center gap-2 ${menuLayout === "vertical" ? "md:hidden" : ""}`}>
                          <span className="text-indigo-600 tracking-widest text-lg font-black">تراز</span>
                          <span className="text-slate-300 font-normal hidden sm:inline">|</span>
                          <span className="text-sm text-slate-700 truncate max-w-[120px] md:max-w-[150px] hidden sm:inline">{storeSettings.storeName || "سیستم مدیریت"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Google style centered Search bar */}
                    {isGmailTheme && (
                      <div className="hidden lg:flex flex-1 max-w-xl mx-8 relative">
                        <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                          <svg
                            className="h-5 w-5 text-slate-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            />
                          </svg>
                        </div>
                        <input
                          type="text"
                          placeholder="جستجو در میان اسناد، تراکنش‌ها، فاکتورها و اشخاص..."
                          className="w-full pr-11 pl-4 py-2 bg-[#eaf1fb] hover:bg-[#e3ecf8] focus:bg-white text-slate-800 placeholder-slate-500 rounded-full outline-none focus:ring-2 focus:ring-[#b3261e]/30 border-none font-bold text-sm transition-all shadow-3xs"
                        />
                      </div>
                    )}

                    <div className="flex items-center gap-2 md:gap-3">
                      
                      {/* Fast Module Switcher Button & Dropdown */}
                      <div className="relative" ref={moduleMenuRef}>
                        <button
                          onClick={() => setIsModuleMenuOpen(!isModuleMenuOpen)}
                          className="flex items-center gap-1.5 md:gap-2 px-2.5 py-1.5 md:px-3.5 md:py-2 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 border border-indigo-200/90 text-indigo-700 shadow-2xs hover:shadow-xs active:scale-95 transition-all cursor-pointer group"
                          title="تغییر سریع بخش کاری و داشبوردها"
                        >
                          <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform shrink-0">
                            <LayoutGrid className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex items-center gap-1.5 text-xs font-black">
                            <span className="hidden lg:inline text-slate-700">بخش کاری:</span>
                            <span className="text-indigo-700 font-extrabold bg-white/90 px-2 py-0.5 rounded-md border border-indigo-100 shadow-2xs">
                              {getModuleName(systemModule)}
                            </span>
                          </div>
                          <ChevronDown className={`w-3.5 h-3.5 text-indigo-500 transition-transform duration-300 ${isModuleMenuOpen ? "rotate-180" : ""}`} />
                        </button>

                        <AnimatePresence>
                          {isModuleMenuOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: 10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 10, scale: 0.95 }}
                              transition={{ duration: 0.15 }}
                              className="absolute left-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-[110] p-2"
                            >
                              <div className="px-3 py-2 text-[11px] font-black text-slate-400 border-b border-slate-100 mb-1 flex items-center justify-between">
                                <span>انتخاب و تغییر سریع بخش کاری</span>
                                <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-bold">داشبوردها</span>
                              </div>

                              <div className="space-y-1 max-h-80 overflow-y-auto p-1">
                                {[
                                  { id: 'all', name: 'همه بخش‌ها (سامانه کامل)', desc: 'دسترسی همزمان به تمامی امکانات', icon: <LayoutGrid className="w-4 h-4 text-indigo-600" /> },
                                  { id: 'commerce', name: 'تجاری و بازرگانی', desc: 'فروش، خرید و پیش‌فاکتورها', icon: <ShoppingCart className="w-4 h-4 text-emerald-600" /> },
                                  { id: 'inventory', name: 'انبارداری و کالاها', desc: 'موجودی انبار، گردش و کاردکس', icon: <Box className="w-4 h-4 text-blue-600" /> },
                                  { id: 'accounting', name: 'حسابداری و خزانه‌داری', desc: 'اسناد، دریافت/پرداخت و چک', icon: <Calculator className="w-4 h-4 text-amber-600" /> },
                                  { id: 'crm', name: 'ارتباط با مشتریان (CRM)', desc: 'مدیریت اشخاص، پرونده و پیگیری‌ها', icon: <Users className="w-4 h-4 text-purple-600" /> },
                                  { id: 'hr', name: 'منابع انسانی و حقوق', desc: 'کارکرد، پرسنل و لیست حقوق', icon: <Clock className="w-4 h-4 text-rose-600" /> },
                                  { id: 'reports_module', name: 'گزارشات و تحلیل‌ها', desc: 'ترازنامه‌ها، سود و زیان و نمودارها', icon: <BarChart3 className="w-4 h-4 text-cyan-600" /> },
                                  { id: 'admin', name: 'تنظیمات و مدیریت', desc: 'تنظیمات سیستم، کاربران و پشتیبان', icon: <Settings className="w-4 h-4 text-slate-600" /> },
                                ].map((item) => {
                                  const isActive = systemModule === item.id;
                                  
return (
                                    <button
                                      key={item.id}
                                      onClick={() => {
                                        setSystemModule(item.id as any);
                                        setIsModuleMenuOpen(false);
                                      }}
                                      className={`w-full text-right p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-between ${
                                        isActive
                                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                                          : "hover:bg-slate-50 text-slate-700"
                                      }`}
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isActive ? "bg-white/20 text-white" : "bg-slate-100"}`}>
                                          {item.icon}
                                        </div>
                                        <div className="flex flex-col text-right truncate">
                                          <span className={`text-xs font-black truncate ${isActive ? "text-white" : "text-slate-800"}`}>
                                            {item.name}
                                          </span>
                                          <span className={`text-[10px] truncate ${isActive ? "text-indigo-100" : "text-slate-400"}`}>
                                            {item.desc}
                                          </span>
                                        </div>
                                      </div>
                                      {isActive && <Check className="w-4 h-4 text-white shrink-0 mr-1" />}
                                    </button>
                                  );
                                })}
                              </div>

                              <div className="mt-1 pt-2 border-t border-slate-100">
                                <button
                                  onClick={() => {
                                    setSystemModule("selector");
                                    setIsModuleMenuOpen(false);
                                  }}
                                  className="w-full text-center p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                  <LayoutDashboard className="w-4 h-4 text-indigo-600" />
                                  داشبورد اصلی انتخاب بخش‌ها
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      
                      <button
                        onClick={() => { setRawActiveTab("sync_manager"); }}
                        className="relative p-2 border rounded-xl transition-all cursor-pointer shadow-3xs active:scale-95 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 bg-white border-slate-200"
                        title="وضعیت همگام‌سازی"
                      >
                        <CloudOff className="w-5 h-5" />
                        {syncQueueLength > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full animate-pulse shadow-sm shadow-rose-500/40">
                            {syncQueueLength}
                          </span>
                        )}
                      </button>
                      {/* NotificationBell */}
                      <button
                        onClick={() => setIsCalculatorOpen(true)}
                        className="p-2 border rounded-xl transition-all cursor-pointer shadow-3xs active:scale-95 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 bg-white border-slate-200"
                        title="ماشین حساب"
                      >
                        <Calculator className="w-5 h-5" />
                      </button>

                      <div className="relative" ref={headerMenuRef}>
                        <button
                          onClick={() => setIsHeaderMenuOpen(!isHeaderMenuOpen)}
                          className={`w-10 h-10 border rounded-xl transition-all cursor-pointer flex items-center justify-center shadow-3xs active:scale-95 ${isHeaderMenuOpen ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "bg-white border-slate-200 text-slate-600 hover:text-indigo-700 hover:bg-indigo-50"}`}
                          title="تنظیمات و مدیریت"
                        >
                          <Settings className={`w-5 h-5 transition-transform duration-500 ${isHeaderMenuOpen ? "rotate-90" : ""}`} />
                        </button>
                        
                        <AnimatePresence>
                          {isHeaderMenuOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: 10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 10, scale: 0.95 }}
                              transition={{ duration: 0.15 }}
                              className="absolute left-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-[100] flex flex-col"
                            >
                              <div className="p-3 border-b border-slate-100 bg-slate-50/50">
                                <div className="text-xs font-black text-slate-500 mb-2">عملیات مدیریت</div>
                                <button
                                  onClick={() => {
                                    setIsHeaderMenuOpen(false);
                                    appState.confirmAction('آیا از خروج از کسب و کار فعلی و رفتن به صفحه مدیریت کسب و کارها اطمینان دارید؟', () => { appState.setIsStoreSelectionOpen(true); })
                                  }}
                                  className="w-full text-right px-3 py-2.5 rounded-xl transition-all cursor-pointer font-black gap-2 flex items-center text-xs hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 mb-1"
                                >
                                  <Database className="w-4 h-4" />
                                  تغییر فروشگاه
                                </button>
                                <button
                                  onClick={() => {
                                    setIsHeaderMenuOpen(false);
                                    setSystemModule("selector");
                                  }}
                                  className="w-full text-right px-3 py-2.5 rounded-xl transition-all cursor-pointer font-black gap-2 flex items-center text-xs hover:bg-emerald-50 text-slate-700 hover:text-emerald-700"
                                >
                                  <LayoutDashboard className="w-4 h-4" />
                                  تغییر بخش کاری
                                </button>
                                <button
                                  onClick={() => {
                                    setIsHeaderMenuOpen(false);
                                    setActiveTab("sync_manager");
                                  }}
                                  className="w-full text-right px-3 py-2.5 rounded-xl transition-all cursor-pointer font-black gap-2 flex items-center text-xs hover:bg-orange-50 text-slate-700 hover:text-orange-700 mt-1"
                                >
                                  <RefreshCw className="w-4 h-4" />
                                  مدیریت همگام‌سازی
                                </button>
                              </div>
                              
                              <div className="p-3 border-b border-slate-100">
                                <div className="text-xs font-black text-slate-500 mb-2">تنظیمات نما</div>
                                <button
                                  onClick={async () => {
                                    setIsHeaderMenuOpen(false);
                                    const newVal = menuLayout === "vertical" ? "horizontal" : "vertical";
                                    setMenuLayout(newVal);
                                    const updated = { ...storeSettings, menuLayout: newVal };
                                    setStoreSettings(updated);
                                    setSettingsForm(updated);
                                    try { await saveStoreSettings(updated); } catch(e){}
                                  }}
                                  className="w-full text-right px-3 py-2.5 rounded-xl transition-all cursor-pointer font-black gap-2 flex items-center text-xs hover:bg-slate-50 text-slate-700 mb-1"
                                >
                                  {menuLayout === "vertical" ? <LayoutList className="w-4 h-4" /> : <GripHorizontal className="w-4 h-4" />}
                                  {menuLayout === "vertical" ? "نمایش منوی افقی" : "نمایش منوی عمودی"}
                                </button>
                                <button
                                  onClick={async () => {
                                    setIsHeaderMenuOpen(false);
                                    const newVal = !isFullWidth;
                                    setIsFullWidth(newVal);
                                    const updated = { ...storeSettings, isFullWidth: newVal };
                                    setStoreSettings(updated);
                                    setSettingsForm(updated);
                                    try { await saveStoreSettings(updated); } catch(e){}
                                  }}
                                  className={`w-full text-right px-3 py-2.5 rounded-xl transition-all cursor-pointer font-black gap-2 flex items-center text-xs ${isFullWidth ? "text-indigo-700 bg-indigo-50" : "hover:bg-slate-50 text-slate-700"}`}
                                >
                                  {isFullWidth ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                                  {isFullWidth ? "بازگشت به نمایش کلاسیک" : "حالت تمام صفحه گسترده"}
                                </button>
                              </div>
                              
                              {user && (
                                <div className="p-3 bg-slate-50">
                                  <div className="flex items-center gap-3 mb-3 px-2">
                                    <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-xl flex items-center justify-center font-black shadow-sm shrink-0">
                                      {(() => {
                                        const p = user.personId ? persons?.find(x => String(x.id) === String(user.personId)) : null;
                                        const dName = p ? p.name : user.name;
                                        return dName?.charAt(0) || <User className="w-5 h-5" />;
                                      })()}
                                    </div>
                                    <div className="flex flex-col overflow-hidden">
                                      <div className="text-sm font-black text-slate-800 truncate">
                                        {(() => {
                                           const p = user.personId ? persons?.find(x => String(x.id) === String(user.personId)) : null;
                                           return p ? p.name : user.name;
                                        })()}
                                      </div>
                                      <div className="text-[10px] font-bold text-slate-500 uppercase truncate">
                                        {user.role === "admin" ? "مدیر سیستم" : user.role === "accountant" ? "حسابدار" : user.role === "cashier" ? "صندوق‌دار" : "کاربر عادی"}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => { setIsHeaderMenuOpen(false); setIsProfileModalOpen(true); }}
                                      className="flex-1 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors flex items-center justify-center gap-1.5"
                                    >
                                      <User className="w-3.5 h-3.5" /> پروفایل
                                    </button>
                                    <button
                                      onClick={() => { setIsHeaderMenuOpen(false); signOut(); }}
                                      className="flex-1 py-2 bg-white border border-rose-200 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors flex items-center justify-center gap-1.5"
                                    >
                                      <LogOut className="w-3.5 h-3.5" /> خروج
                                    </button>
                                  </div>
                                </div>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>

                  <div className="block relative z-[60]">
                  <SidebarNavigation
                    mode="horizontal"
                    user={user}
                    signOut={signOut}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    systemModule={systemModule}
                    hasCheckedFinancialYears={hasCheckedFinancialYears}
                    activeFinancialYear={activeFinancialYear}
                    isGmailTheme={isGmailTheme}
                    storeSettings={storeSettings}
                    isSidebarOpen={isSidebarOpen}
                    setIsSidebarOpen={setIsSidebarOpen}
                    menuLayout={menuLayout}
                    setIsComposeOpen={setIsComposeOpen}
                    expandedGroups={expandedGroups}
                    setExpandedGroups={setExpandedGroups}
                  />
    </div>
                </div>
                <main className="flex-1 overflow-y-auto min-h-0 p-4 pb-24 md:p-8 bg-slate-50/50 print:overflow-visible print:bg-white print:p-0">
                  <div
                    className={`mx-auto transition-all duration-300 print:max-w-none print:w-full print:px-0 ${isFullWidth ? "max-w-full xl:px-14" : "max-w-6xl"}`}
                  >
                    <Suspense fallback={<div className="flex h-full items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>}>
                    {appRoutes}
                    </Suspense>
                  </div>
                </main>
</div>
</div>
)}
<Suspense fallback={null}><SalePaymentModal
      isOpen={appState.isSalePaymentModalOpen}
      onClose={() => appState.setIsSalePaymentModalOpen(false)}
      payload={appState.salePaymentModalPayload}
      saveInvoiceData={appState.saveInvoiceData}
      accounts={appState.accounts}
      cashboxes={appState.cashboxes}
      transactions={appState.transactions}
      formatCurrency={appState.formatCurrency}
      addCommas={(val) => {
        return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      }}
      persons={appState.persons}
      setViewingInvoice={appState.setViewingInvoice}
  /></Suspense>
  <PricingWizardModal
            pricingWizardInvoice={pricingWizardInvoice} setPricingWizardInvoice={setPricingWizardInvoice} pricingWizardItems={pricingWizardItems} setPricingWizardItems={setPricingWizardItems} products={products} storeSettings={storeSettings} toPersianDigits={toPersianDigits} formatDateDisplay={formatDateDisplay} formatNumber={formatNumber} setSuccessMsg={setSuccessMsg} fetchProducts={fetchProducts} updateProduct={updateProduct} List={List}
          />
          {isAccountingDocModalOpen && viewingAccountingDoc && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm" dir="rtl">
              <div className="bg-white rounded-3xl w-full max-w-5xl h-[90vh] overflow-hidden flex flex-col shadow-2xl relative">
                 <button onClick={() => setIsAccountingDocModalOpen(false)} className="absolute top-4 left-4 z-50 p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors">
                   <X className="w-5 h-5 text-slate-600" />
                 </button>
                 <div className="flex-1 overflow-y-auto w-full">
                   <AccountingDocView
                      doc={viewingAccountingDoc}
                      storeSettings={storeSettings}
                      onBack={() => setIsAccountingDocModalOpen(false)}
                   />
                 </div>
              </div>
            </div>
          )}
          <FastProductCreateModal
            isOpen={isFastProductModalOpen}
            onClose={() => setIsFastProductModalOpen(false)}
            onSave={handleFastSaveProduct}
          />
          <BulkProductImportModal products={products}
            isOpen={isBulkImportOpen}
            onClose={() => setIsBulkImportOpen(false)}
           
            onImport={handleBulkImportItems}
            isPurchase={
              activeTab === "create_purchase" ||
              (activeTab === "create_warehouse_doc" &&
                invoiceType === "warehouse_receipt")
            }
            getLastPriceForProduct={getLastPriceForProduct}
          />
          {isProfileModalOpen && (
            <ProfileModal onClose={() => setIsProfileModalOpen(false)} />
          )}
          {submitting && !previewInvoiceData && (
            <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-[99999] flex flex-col items-center justify-center p-8 text-center cursor-wait select-none" dir="rtl">
              <div className="w-16 h-16 relative flex items-center justify-center mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20"></div>
                <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 animate-spin"></div>
                <RefreshCw className="w-6 h-6 text-indigo-400 animate-pulse" />
              </div>
              
              <h3 className="text-lg font-black text-white mb-2">در حال ثبت اطلاعات فاکتور و بروزرسانی انبارها...</h3>
              <p className="text-slate-400 text-xs max-w-xs leading-relaxed mb-6 font-bold">
                لطفاً منتظر بمانید. تمامی اسناد فاکتور، حواله‌ها و رسیدهای انبار و تراکنش‌های مالی مرتبط به صورت یکپارچه و ایمن در حال محاسبه و ذخیره‌سازی است.
              </p>

              <div className="w-48 h-1.5 bg-slate-800 rounded-full overflow-hidden relative">
                <div className="absolute h-full w-1/2 bg-indigo-500 rounded-full animate-loading-bar"></div>
              </div>
            </div>
          )}


    

          {submittingReceipt && !previewReceiptData && (
            <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-[99999] flex flex-col items-center justify-center p-8 text-center cursor-wait select-none" dir="rtl">
              <div className="w-16 h-16 relative flex items-center justify-center mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20"></div>
                <div className="absolute inset-0 rounded-full border-4 border-t-emerald-500 animate-spin"></div>
                <RefreshCw className="w-6 h-6 text-emerald-400 animate-pulse" />
              </div>
              
              <h3 className="text-lg font-black text-white mb-2">در حال ثبت تراکنش مالی...</h3>
              <p className="text-slate-400 text-xs max-w-xs leading-relaxed mb-6 font-bold">
                لطفاً منتظر بمانید. سیستم در حال بررسی، تایید و ثبت نهایی اسناد و بروزرسانی حساب‌های مرتبط به صورت یکپارچه می‌باشد.
              </p>
              <div className="w-48 h-1.5 bg-slate-800 rounded-full overflow-hidden relative">
                <div className="absolute h-full w-1/2 bg-emerald-500 rounded-full animate-loading-bar"></div>
              </div>
            </div>
          )}

          {isPersonModalOpen && (
            <PersonFormModal
              isOpen={isPersonModalOpen}
              onClose={() => {
                setIsPersonModalOpen(false);
                setEditingPersonId(null);
              }}
              editingPersonId={editingPersonId}
              persons={persons}
              personGroups={personGroups}
              personRoles={personRoles}
  personCategories={appState.personCategories}
              storeSettings={storeSettings}
              activeTab={activeTab}
              setReceiptPersonId={setReceiptPersonId}
              setCustomerId={setCustomerId}
              setSalaryPersonId={setSalaryPersonId}
              deletePerson={deletePerson}
              fetchPersons={fetchPersons}
              setActiveTab={setActiveTab}
              setLedgerPersonId={setLedgerPersonId}
              onSuccess={(addedPerson) => {
                fetchPersons?.();
                showNotification('اطلاعات شخص با موفقیت ثبت شد', 'success');
                setIsPersonModalOpen(false);
                setEditingPersonId(null);
              }}
              showNotification={showNotification}
              confirmAction={confirmAction}
            />
          )}

          {isPersonIOModalOpen && (
            <PersonIOModal
              isOpen={isPersonIOModalOpen}
              onClose={() => setIsPersonIOModalOpen(false)}
              action={personIOAction}
              setAction={setPersonIOAction}
              persons={persons}
              storeSettings={storeSettings}
              addPerson={addPerson}
              showNotification={showNotification}
              confirmAction={confirmAction}
              getRoleName={getRoleName}
              fetchPersons={fetchPersons}
            />
          )}

          {isProductModalOpen && (
            <ProductFormModal
              isOpen={isProductModalOpen}
              onClose={() => {
                setIsProductModalOpen(false);
                setEditingProductId(null);
              }}
              editingProductId={editingProductId}
              products={products}
              productCategories={productCategories}
              warehouses={warehouses}
              storeSettings={storeSettings}
              onSuccess={() => {
                fetchProducts?.();
                showNotification('اطلاعات کالا با موفقیت ثبت شد', 'success');
                setIsProductModalOpen(false);
                setEditingProductId(null);
              }}
              showNotification={showNotification}
              confirmAction={confirmAction}
              activeTab={activeTab}
              handleFastAddProduct={handleFastAddProduct}
            />
          )}

          {isAccountModalOpen && (
            <AccountFormModal
              isOpen={isAccountModalOpen}
              onClose={() => {
                setIsAccountModalOpen(false);
                setEditingAccountId(null);
              }}
              editingAccountId={editingAccountId}
              accounts={accounts}
              storeSettings={storeSettings}
              onSuccess={() => {
                fetchAccounts?.();
                showNotification('اطلاعات حساب با موفقیت ثبت شد', 'success');
                setIsAccountModalOpen(false);
                setEditingAccountId(null);
              }}
              showNotification={showNotification}
              confirmAction={confirmAction}
            />
          )}

          {isCashboxModalOpen && (
            <CashboxFormModal
              isOpen={isCashboxModalOpen}
              onClose={() => {
                setIsCashboxModalOpen(false);
                setEditingCashboxId(null);
              }}
              editingCashboxId={editingCashboxId}
              cashboxes={cashboxes}
              storeSettings={storeSettings}
              onSuccess={() => {
                fetchCashboxes?.();
                showNotification('اطلاعات صندوق با موفقیت ثبت شد', 'success');
                setIsCashboxModalOpen(false);
                setEditingCashboxId(null);
              }}
              showNotification={showNotification}
              confirmAction={confirmAction}
            />
          )}

          {isWarehouseModalOpen && (
            <WarehouseFormModal
              isOpen={isWarehouseModalOpen}
              onClose={() => {
                setIsWarehouseModalOpen(false);
                setEditingWarehouseId(null);
              }}
              editingWarehouseId={editingWarehouseId}
              warehouses={warehouses}
              storeSettings={storeSettings}
              onSuccess={() => {
                fetchWarehouses?.();
                showNotification('اطلاعات انبار با موفقیت ثبت شد', 'success');
                setIsWarehouseModalOpen(false);
                setEditingWarehouseId(null);
              }}
              showNotification={showNotification}
              confirmAction={confirmAction}
            />
          )}

          {/* Mobile Floating Quick Action Footer Bar */}
          <div className="md:hidden fixed bottom-3 left-3 right-3 z-[80] bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-2xl rounded-2xl p-2 flex items-center justify-between gap-2 no-print">
            <button
              onClick={() => setIsModuleMenuOpen(!isModuleMenuOpen)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer"
            >
              <LayoutGrid className="w-4 h-4" />
              <span>تغییر بخش کاری:</span>
              <span className="bg-white/20 text-white px-2 py-0.5 rounded-md text-[10px] font-extrabold">
                {getModuleName(systemModule)}
              </span>
            </button>

            <button
              onClick={() => setIsCalculatorOpen(true)}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer"
              title="ماشین حساب"
            >
              <Calculator className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => appState.confirmAction('آیا از خروج از کسب و کار فعلی و رفتن به صفحه مدیریت کسب و کارها اطمینان دارید؟', () => { appState.setIsStoreSelectionOpen(true); })}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer"
              title="تغییر فروشگاه"
            >
              <Database className="w-4 h-4" />
            </button>
          </div>

          <CalculatorModal isOpen={isCalculatorOpen} onClose={() => setIsCalculatorOpen(false)} />
        <SyncStatusModal isOpen={isSyncModalOpen} onClose={() => setIsSyncModalOpen(false)} />
        <BackgroundSync />
          <PreviewModals {...appState} />
          <ExtraModals {...appState} />
          <ConfirmModal confirmState={appState.confirmState} setConfirmState={appState.setConfirmState} />
          <GlobalProcessingOverlay />
        </>
      );
      }
