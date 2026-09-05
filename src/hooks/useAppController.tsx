import { autoGenerateRentCommitments } from "../services/hrService";
import { suspendAppDataChanged, resumeAppDataChanged } from "../services/coreService";
import CustomDatePicker from "../components/ui/CustomDatePicker";
import { SystemUpdatePage } from "../components/admin/SystemUpdatePage";
import { PersonalNotesManager } from "../components/notes/PersonalNotesManager";
import FastStocktakingMobile from "../components/inventory/FastStocktakingMobile";
import PricingWizardModal from '../components/modals/PricingWizardModal';
import ReceiptsList from '../components/financial/ReceiptsList';
import InvoicesList from '../components/invoices/InvoicesList';
import CurrencyInput from '../components/common/CurrencyInput';
import FastBarcodeScanner from '../components/common/FastBarcodeScanner';
import PersonLedgerActionsDropdown from '../components/persons/PersonLedgerActionsDropdown';
import ChangelogModal from '../components/ChangelogModal';
import changelogData from '../data/changelog.json';
import ReceiveReceiptModal from "../components/financial/ReceiveReceiptModal";
import PayReceiptModal from "../components/financial/PayReceiptModal";
import AccountsManager from "../components/accounts/AccountsManager";
import CashboxesManager from "../components/accounts/CashboxesManager";
import PersonsManager from "../components/persons/PersonsManager";
import DebtorsNotification from "../components/DebtorsNotification";
import BeautifulLoading from "../components/BeautifulLoading";
import DataReconciliation from "../components/DataReconciliation";
import { useStore } from '../store';
import React, { useState, useEffect, useMemo, useRef } from "react";
import { globalDateFormatter } from "../utils/dateFormatter";
import { startAppProcessing, updateAppProcessing, stopAppProcessing } from "../utils/processingHelper";
import { useLocation, useNavigate } from "react-router-dom";
import ProductsTab from "../components/products/ProductsTab";
import PersonOpeningBalances from "../components/persons/PersonOpeningBalances";
import PersonLedger from "../components/persons/PersonLedger";
import SettingsTab from "../components/admin/SettingsTab";
import SidebarNavigation from "../components/SidebarNavigation";
import MobileRestrictedMenu from "../components/MobileRestrictedMenu";
import MinimalMobilePersonModal from "../components/modals/MinimalMobilePersonModal";
import WarehouseManager from '../components/warehouses/WarehouseManager';
import PersonGroupsManager from "../components/persons/PersonGroupsManager";
import PersonRolesManager from "../components/persons/PersonRolesManager";
import WarehouseDocCreate from '../components/warehouses/WarehouseDocCreate';
import SaleInvoiceCreate from '../components/invoices/SaleInvoiceCreate';
import CalculatorModal from "../components/modals/CalculatorModal";
import SaleReturnInvoiceCreate from '../components/invoices/SaleReturnInvoiceCreate';
import PurchaseInvoiceCreate from '../components/invoices/PurchaseInvoiceCreate';
import PurchaseReturnInvoiceCreate from '../components/invoices/PurchaseReturnInvoiceCreate';
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
import { playAudioFeedback } from "../utils/audio";
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
} from "../utils/format";
import html2pdf from "html2pdf.js";
import DateObject from "react-date-object";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import ProductFormModal from "../components/modals/ProductFormModal";
import PersonFormModal from "../components/modals/PersonFormModal";
import AccountFormModal from "../components/modals/AccountFormModal";
import CashboxFormModal from "../components/modals/CashboxFormModal";
import WarehouseFormModal from "../components/modals/WarehouseFormModal";
import SmsPanel from "../components/admin/SmsPanel";
import Select from "react-select";
import { useAuth } from "../context/AuthContext";
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
  getPersonCategories,
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
  addAccountingDocument,
  deleteAccountingDocument,
  getLedgerAccounts,
  addSystemLog,
  getLoans,
  getInstallments,
} from "../services/dataService";
import ModuleSelector from "../components/ui/ModuleSelector";
import DatabaseReconciliation from "../components/admin/DatabaseReconciliation";
import DatabaseDashboard from "../components/admin/DatabaseDashboard";
import SystemChecklist from "../components/admin/SystemChecklist";
import SystemLogs from "../components/admin/SystemLogs";
import DatabaseLogs from "../components/admin/DatabaseLogs";
import GroupPriceUpdateWizard from "../components/modals/GroupPriceUpdateWizard";
import ProductPriceChangeModal from "../components/modals/ProductPriceChangeModal";
import PrintBarcodeModal from "../components/modals/PrintBarcodeModal";
import ProductCardModal from "../components/modals/ProductCardModal";
import ProductLastPricesView from "../components/reports/ProductLastPricesView";
import QuickPriceInquiry from "../components/inventory/QuickPriceInquiry";
import CheckManagement from "../components/financial/CheckManagement";
import PersonNotesAndAttachments from "../components/financial/PersonNotesAndAttachments";
import InvoiceAllocation from "../components/financial/InvoiceAllocation";
import SearchableSelect from "../components/ui/SearchableSelect";
import BarcodeScannerModal from "../components/modals/BarcodeScannerModal";
import EditReceiptModal from "../components/modals/EditReceiptModal";
import FinancialTransfer from "../components/financial/FinancialTransfer";
import QuickRefund from "../components/financial/QuickRefund";
import UserManager from "../components/admin/UserManager";
import ProfileModal from "../components/profile/advanced/AdvancedProfileModal";
import InventoryReport from "../components/reports/InventoryReport";
import KardexReport from "../components/reports/KardexReport";
import CRMDashboard from "../components/crm/CRMDashboard";
import SystemDiagnostics from "../components/admin/SystemDiagnostics";
import StocktakingManager from "../components/inventory/StocktakingManager";
import AnalyticalDashboard from "../components/reports/AnalyticalDashboard";
import FinancialDashboard from "../components/reports/FinancialDashboard";
import DebtsCreditsReport from "../components/reports/DebtsCreditsReport";
import LoansManager from "../components/loans/LoansManager";
import ChartOfAccounts from "../components/accounting/ChartOfAccounts";
import AccountingDocsList from "../components/accounting/AccountingDocsList";
import AccountingDocCreate from "../components/accounting/AccountingDocCreate";
import AccountingDocView from "../components/accounting/AccountingDocView";
import AccountingAutoSync from "../components/accounting/AccountingAutoSync";
import AccountingVerification from "../components/accounting/AccountingVerification";
import OpeningBalances from "../components/accounting/OpeningBalances";
import FinancialYearManager from "../components/accounting/FinancialYearManager";
import WarehousePrintTemplate from "../components/print/WarehousePrintTemplate";
import InvoicePrintTemplate from "../components/print/InvoicePrintTemplate";
import AIProductSearchModal from "../components/products/AIProductSearchModal";
import BulkProductImportModal from "../components/products/BulkProductImportModal";
import FastProductCreateModal from "../components/products/FastProductCreateModal";
import PersonProfileView from "../components/persons/PersonProfileView";
import PersonIOModal from "../components/modals/PersonIOModal";
import ProductCategoriesView from "../components/products/ProductCategoriesView";
import {
  Person,
  PersonGroup,
  Product,
  Account,
  Cashbox,
  Warehouse,
  InvoiceItem,
  WarehouseStock,
} from "../types";
import appVersion from "../version.json";
import OrderList from "../components/inventory/OrderList";
const DatePicker = CustomDatePicker;




export function useAppController() {
const isFastStocktaking = window.location.hash.startsWith('#fast-stocktaking');

if (isFastStocktaking) { /* handled in App.tsx */ }

  const { activeStoreId, setActiveStoreId, availableStores, setAvailableStores, isStoreSelectionOpen, setIsStoreSelectionOpen } = useStore();
  const [activeFinancialYear, setActiveFinancialYearState] =
    useState<any>(null);

const [hasCheckedFinancialYears, setHasCheckedFinancialYears] =
    useState(false);

const [isComposeOpen, setIsComposeOpen] = useState(false);

const fetchFinancialYearInfo = async () => {
    try {
      const years = await getFinancialYears();
      const active = years.find((y: any) => y.status === "open") || null;
      setActiveFinancialYearState(active);
      setHasCheckedFinancialYears(true);
    } catch (e) {
      console.error("fetchFinancialYearInfo error", e);
    }
  };

const [priceChangeProduct, setPriceChangeProduct] = useState<any>(null);

const [historyProductId, setHistoryProductId] = useState<string | null>(null);

const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    message: string;
    onConfirm: () => Promise<void> | void;
    details?: React.ReactNode;
    loading?: boolean;
  }>({ isOpen: false, message: "", onConfirm: () => {} });

const confirmAction = (message: string, onConfirm: () => Promise<void> | void, details?: React.ReactNode) => {
    setConfirmState({ isOpen: true, message, onConfirm, details, loading: false });
  };

const { user, loading: authLoading, signIn, signOut } = useAuth();


// Removed activeStoreId state
// Removed availableStores state
// Removed isStoreSelectionOpen state

useEffect(() => {
  fetch('/api/databases').then(r => r.json()).then(d => {
    if (d.success) setAvailableStores(d.databases);
  }).catch(() => {});
}, []);

  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = location.pathname.substring(1) || "welcome_page";
  const setRawActiveTab = (tab: string) => navigate("/" + tab);


// Hash routing replaced by React Router

const setActiveTab = (tab: any, force: boolean = false) => {
    if (tab === activeTab) return;

    if (!force) {
      const isInvoiceTab =
        activeTab === "create_sale" ||
        activeTab === "create_purchase" ||
        activeTab === "create_warehouse_doc";
      if (isInvoiceTab && items && (items || []).length > 0) {
        confirmAction(
          "فاکتور/سند در حال ثبت است. در صورت خروج از این صفحه، اطلاعات وارد شده حذف خواهد شد. آیا مطمئن هستید؟",
          () => {
            setItems([]);
            setCustomerId("");
            setInvoicePaidAmount(0);
            setOverallDiscountPercent(0);
            setRawActiveTab(tab);
          },
        );
        return;
      }

      const isReceiptTab =
        activeTab === "create_receive_receipt" ||
        activeTab === "create_pay_receipt";
      if (
        isReceiptTab &&
        receiptLinkedInvoices &&
        Object.keys(receiptLinkedInvoices).length > 0
      ) {
        confirmAction(
          "رسید در حال ثبت است. در صورت خروج از این صفحه، اطلاعات وارد شده حذف خواهد شد. آیا مطمئن هستید؟",
          () => {
            setReceiptLinkedInvoices({});
            setReceiptPersonId("");
            setReceiptAmount("");
            setRawActiveTab(tab);
          },
        );
        return;
      }
    }

    setRawActiveTab(tab);
  };

const [systemModule, setSystemModule] = useState<"sales" | "purchase" | "accounting" | "selector" | "crm" | "hr" | "reports_module" | "all" | "commerce" | "inventory" | "admin">("selector");

const [isSidebarOpen, setIsSidebarOpen] = useState(false);

const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);

const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

const [isChangelogModalOpen, setIsChangelogModalOpen] = useState(false);

const [isFullWidth, setIsFullWidth] = useState<boolean>(false);

const [menuLayout, setMenuLayout] = useState<"vertical" | "horizontal">("vertical");

const [expandedGroups, setExpandedGroups] = useState<{ [key: string]: boolean }>({
        sales_operations: true,
        purchase_operations: false,
        receipts_payments: false,
        checks_management: false,
        loans_management: false,
        base_info: false,
        reports: true,
        settings: false,
      });

const [userSettingsLoaded, setUserSettingsLoaded] = useState(false);

useEffect(() => {
    if (user?.id) {
      
      try {
        const localSettingsStr = localStorage.getItem('user_settings_' + user.id);
        if (localSettingsStr) {
          const settings = JSON.parse(localSettingsStr);
          if (settings.systemModule) setSystemModule(settings.systemModule);
          if (settings.isFullWidth !== undefined) setIsFullWidth(settings.isFullWidth);
          if (settings.menuLayout) setMenuLayout(settings.menuLayout);
          if (settings.expandedGroups) setExpandedGroups(settings.expandedGroups);
        }
      } catch(e) {}
      setUserSettingsLoaded(true);
    } else {
      setUserSettingsLoaded(false);
    }
  }, [user?.id]);

useEffect(() => {
    if (user?.id && userSettingsLoaded) {
      localStorage.setItem('user_settings_' + user.id, JSON.stringify({
        systemModule,
        isFullWidth,
        menuLayout,
        expandedGroups
      }));
    }
  }, [user?.id, userSettingsLoaded, systemModule, isFullWidth, menuLayout, expandedGroups]);

useEffect(() => {
    setLastCreatedReceipt(null);
    if (editingInvoiceId) return; // Prevent overwriting title/type when editing
    if (activeTab === "create_sale") {
      setInvoiceType("sale");
      setInvoiceTitle("فاکتور فروش کالا");
    } else if (activeTab === "create_sale_return") {
      setInvoiceType("sale_return");
      setInvoiceTitle("فاکتور برگشت از فروش");
    } else if (activeTab === "create_purchase_return") {
      setInvoiceType("purchase_return");
      setInvoiceTitle("فاکتور برگشت از خرید");
    } else if (activeTab === "create_purchase") {
      setInvoiceType("purchase");
      setInvoiceTitle("فاکتور خرید کالا");
    } else if (activeTab === "create_warehouse_doc") {
      setInvoiceType("warehouse_receipt");
      setInvoiceTitle("اسناد انبار (ورود/خروج)");
      setWarehouseWizardStep(1);
      setWarehouseOperationType("purchase_invoice");
    }
  }, [activeTab]);

const [persons, setPersons] = useState<Person[]>([]);

const [personOpeningBalances, setPersonOpeningBalances] = useState<any[]>([]);

const [isOpeningBalanceModalOpen, setIsOpeningBalanceModalOpen] =
    useState(false);

const [editingOpeningBalanceId, setEditingOpeningBalanceId] = useState<
    string | null
  >(null);

const [selectedOpeningBalancePersonId, setSelectedOpeningBalancePersonId] =
    useState("");

const [openingBalanceAmount, setOpeningBalanceAmount] = useState("");

const [openingBalanceType, setOpeningBalanceType] = useState<
    "debtor" | "creditor"
  >("debtor");

const [openingBalanceDate, setOpeningBalanceDate] = useState<any>(
    new Date(),
  );

const [openingBalanceDescription, setOpeningBalanceDescription] =
    useState("");

const [openingBalanceSearch, setOpeningBalanceSearch] = useState("");

const [submittingOpeningBalance, setSubmittingOpeningBalance] =
    useState(false);

const [personGroups, setPersonGroups] = useState<PersonGroup[]>([]);

const [personRoles, setPersonRoles] = useState<any[]>([]);
  const [personCategories, setPersonCategories] = useState<any[]>([]);

const [products, setProducts] = useState<Product[]>([]);

const [invoices, setInvoices] = useState<any[]>([]);

const [inventoryTransactions, setInventoryTransactions] = useState<any[]>([]);

const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);

const [accounts, setAccounts] = useState<Account[]>([]);

const [cashboxes, setCashboxes] = useState<Cashbox[]>([]);

const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

const [warehouseStocks, setWarehouseStocks] = useState<WarehouseStock[]>([]);

const [loans, setLoans] = useState<import("../types").Loan[]>([]);

const [installments, setInstallments] = useState<
    import("../types").Installment[]
  >([]);

const [warehouseSubTab, setWarehouseSubTab] = useState<"list" | "stocks">(
    "list",
  );

const [recalculating, setRecalculating] = useState(false);

const [personSearchTerm, setPersonSearchTerm] = useState("");

const [productSearchTerm, setProductSearchTerm] = useState("");

const [selectedProductIds, setSelectedProductIds] = useState<(string | number)[]>([]);

const [whStockSearch, setWhStockSearch] = useState("");

const [selectedProductCategory, setSelectedProductCategory] =
    useState<string>("all");

const [selectedPersonGroup, setSelectedPersonGroup] = useState<string>("all");

const [selectedPersonRole, setSelectedPersonRole] = useState<string>("all");

const [personCurrentPage, setPersonCurrentPage] = useState<number>(1);

const [personPageSize, setPersonPageSize] = useState<number>(10);

const [personsViewMode, setPersonsViewMode] = useState<"list" | "table">(
    "table",
  );

const [productCurrentPage, setProductCurrentPage] = useState<number>(1);

const [productPageSize, setProductPageSize] = useState<number>(10);

const [invoiceCurrentPage, setInvoiceCurrentPage] = useState<number>(1);

const [invoicePageSize, setInvoicePageSize] = useState<number>(10);

const [newPersonGroupName, setNewPersonGroupName] = useState("");

const [newPersonGroupColor, setNewPersonGroupColor] = useState("indigo");

const [editingPersonGroupId, setEditingPersonGroupId] = useState<
    string | null
  >(null);

const [newPersonRoleName, setNewPersonRoleName] = useState("");

const [newPersonRoleCode, setNewPersonRoleCode] = useState("");

const [editingPersonRoleId, setEditingPersonRoleId] = useState<string | null>(
    null,
  );

const getRoleName = (roleId?: string) => {
    if (!roleId) return "نامشخص";
    const role = personRoles.find((r) => r.id === roleId);
    return role
      ? role.name
      : roleId === "customer"
        ? "مشتری"
        : roleId === "supplier"
          ? "تامین کننده"
          : roleId === "employee"
            ? "کارمند"
            : "نامشخص";
  };

const getRoleBadgeClasses = (roleId?: string) => {
    const role = personRoles.find((r) => r.id === roleId);
    if (role && role.color) return role.color;
    return roleId === "customer"
      ? "bg-emerald-50 text-emerald-800 border-emerald-100"
      : roleId === "supplier"
        ? "bg-orange-50 text-orange-850 border-orange-100"
        : "bg-purple-50 text-purple-800 border-purple-100";
  };

const mapPersonToOption = (p: any) => ({
    value: p.id.toString(),
    label:
      (p.personCode ? "[" + p.personCode + "] " : "") +
      (p.alias || p.name) +
      " (" +
      getRoleName(p.role) +
      ")",
    imageUrl: p.imageUrl,
    searchStr: `${p.alias || ""} ${p.name || ""} ${p.title || ""} ${p.firstName || ""} ${p.lastName || ""} ${p.phone || ""} ${p.nationalId || ""} ${p.personCode || ""} ${p.companyName || ""} ${p.fatherName || ""}`,
  });

const activePersonsOnly = (persons || []).filter((p) => p.isActive !== false);

const filteredPersons = (persons || []).filter((p) => {
    // 0. Role Filter
    if (selectedPersonRole !== "all" && p.role !== selectedPersonRole) {
      return false;
    }

    // 1. Group Filter
    if (selectedPersonGroup !== "all") {
      if (selectedPersonGroup === "none") {
        if (p.group && p.group.trim() !== "") return false;
      } else {
        if (p.group !== selectedPersonGroup) return false;
      }
    }

    // 2. Search Filter
    if (!personSearchTerm) return true;
    const terms = personSearchTerm.toLowerCase().split(" ").filter(Boolean);
    const grp = personGroups.find((g) => g.id === p.group);
    const searchable =
      `${p.name || ""} ${p.alias || ""} ${p.firstName || ""} ${p.lastName || ""} ${p.phone || ""} ${p.nationalId || ""} ${p.personCode || ""} ${p.accountingCode || ""} ${p.companyName || ""} ${p.fatherName || ""} ${p.taxNumber || ""} ${(p as any).mobile || ""} ${grp?.name || ""}`.toLowerCase();
    return terms.every((term) => searchable.includes(term));
  });

useEffect(() => {
    setPersonCurrentPage(1);
  }, [personSearchTerm, selectedPersonGroup, personPageSize]);

useEffect(() => {
    setProductCurrentPage(1);
  }, [productSearchTerm, selectedProductCategory, productPageSize]);

const [transactions, setTransactions] = useState<any[]>([]);

const [payslips, setPayslips] = useState<any[]>([]);

const [accountingDocuments, setAccountingDocuments] = useState<any[]>([]);

const [checkbooks, setCheckbooks] = useState<any[]>([]);

const [issuedChecks, setIssuedChecks] = useState<any[]>([]);

const [receivedChecks, setReceivedChecks] = useState<any[]>([]);

const [smsMessages, setSmsMessages] = useState<any[]>([]);

const [storeSettings, setStoreSettings] = useState<any>({
    storeName: "فروشگاه پیش‌فرض",
    address: "",
    phone: "",
    logoUrl: "",
    currency: "تومان",
    isSetup: false,
    fontFamily: "Vazirmatn",
    theme: "classic",
    dateFormat: "YYYY/MM/DD",
    dateSeparator: "/",
    dateYearFormat: "YYYY",
    dateShowTime: true,
    dateTimeFormat: "24",
    calendarType: "jalali",
  });

const isGmailTheme = storeSettings?.theme === "gmail";

const [loading, setLoading] = useState(false);

const [requiresInitSetup, setRequiresInitSetup] = useState(false);

const sendNotification = async (message, personPhone, method) => {
    if (!method || method === "none" || !personPhone) return;

    if (method === "sms" || method === "gsm") {
      const msgObj = {
        id: generateId(),
        recipient: personPhone,
        message: message,
        status: "sent",
        provider: method,
        timestamp: Date.now(),
      };
      await addSmsMessage(msgObj);
      setSmsMessages((prev) => [...prev, msgObj]);
    }

    setTimeout(() => {
      let icon = "💬";
      if (method === "sms") icon = "📱";
      if (method === "whatsapp") icon = "🟢";
      if (method === "gsm") icon = "📡";

      setSuccessMsg(
        icon + " پیامک/اطلاع‌رسانی به " + personPhone + " ارسال شد.",
      );
    }, 1500);
  };

const [receiptNumber, setReceiptNumber] = useState("");

const [receiptPersonId, setReceiptPersonId] = useState<string | number | "">(
    "",
  );

const [receiptPersonSearchText, setReceiptPersonSearchText] = useState("");

const [isReceiptPersonDropdownOpen, setIsReceiptPersonDropdownOpen] =
    useState(false);

const [printingTransaction, setPrintingTransaction] = useState<any>(null);

const [receiptDate, setReceiptDate] = useState<Date | any>(new Date());

const [receiptAmount, setReceiptAmount] = useState<string>("");

const [receiptResourceType, setReceiptResourceType] = useState<
    "bank" | "cashbox"
  >("bank");

const [receiptMethod, setReceiptMethod] = useState<"cash" | "check">("cash");

const [receiptCheckNumber, setReceiptCheckNumber] = useState("");

const [receiptCheckDueDate, setReceiptCheckDueDate] = useState<Date | any>(
    new Date(),
  );

const [receiptCheckBankName, setReceiptCheckBankName] = useState("");

const [receiptCheckbookId, setReceiptCheckbookId] = useState<
    string | number | ""
  >("");

const [receiptResourceId, setReceiptResourceId] = useState<
    string | number | ""
  >("");

const [receiptDescription, setReceiptDescription] = useState<string>("");

const [receiptNote, setReceiptNote] = useState<string>("");

const [receiptLinkedInvoices, setReceiptLinkedInvoices] = useState<
    Record<string, number>
  >({});

const [submittingReceipt, setSubmittingReceipt] = useState<boolean>(false);

const receiptSuccessMsg = false;

const [salaryPersonId, setSalaryPersonId] = useState<string | number | "">(
    "",
  );

const [salaryDate, setSalaryDate] = useState<any>(new Date());

const [salaryPeriodMonth, setSalaryPeriodMonth] = useState<string>("1");

const [salaryPeriodYear, setSalaryPeriodYear] = useState<string>("1403");

const [salaryBaseAmount, setSalaryBaseAmount] = useState<string>("");

const [salaryHousingAllowance, setSalaryHousingAllowance] =
    useState<string>("");

const [salaryGroceryAllowance, setSalaryGroceryAllowance] =
    useState<string>("");

const [salaryOtherAllowances, setSalaryOtherAllowances] =
    useState<string>("");

const [salaryInsuranceDeduction, setSalaryInsuranceDeduction] =
    useState<string>("");

const [salaryTaxDeduction, setSalaryTaxDeduction] = useState<string>("");

const [salaryOtherDeductions, setSalaryOtherDeductions] =
    useState<string>("");

const [salaryDescription, setSalaryDescription] = useState<string>("");

const [salaryResourceId, setSalaryResourceId] = useState<
    string | number | ""
  >("");

const salarySuccessMsg = false;

const [submittingSalary, setSubmittingSalary] = useState<boolean>(false);

const [viewingPayslip, setViewingPayslip] = useState<any | null>(null);

const [printingPersonLedger, setPrintingPersonLedger] = useState<any | null>(
    null,
  );

const [printingBarcodeProduct, setPrintingBarcodeProduct] = useState<
    any | null
  >(null);

const [ledgerPersonId, setLedgerPersonId] = useState<string | number | "">(
    "",
  );

const [profilePersonId, setProfilePersonId] = useState<string | number | "">(
    "",
  );

const [ledgerTab, setLedgerTab] = useState<
    "transactions" | "detailed" | "items" | "checks" | "drafts" | "notes"
  >("transactions");

const [drawerPersonId, setDrawerPersonId] = useState<string | number | "">(
    "",
  );

const [reportDateRange, setReportDateRange] = useState<Date[]>([]);

const [viewingInvoice, setViewingInvoice] = useState<any>(null);

const [viewingCheck, setViewingCheckState] = useState<any>(null);
   const setViewingCheck = (val: any) => {
     setViewingCheckState(val);
     if (val) setActiveTab('check_card');
   };

const [viewingAccountingDoc, setViewingAccountingDoc] = useState<any>(null);

const [isAccountingDocModalOpen, setIsAccountingDocModalOpen] = useState(false);

const [editingAccountingDoc, setEditingAccountingDoc] = useState<any>(null);

const [pricingWizardInvoice, setPricingWizardInvoice] = useState<any>(null);

const [pricingWizardItems, setPricingWizardItems] = useState<any[]>([]);

const [pricingPrintMode, setPricingPrintMode] = useState<"list" | "labels">(
    "list",
  );

const [invoiceSearchQuery, setInvoiceSearchQuery] = useState("");

const [invoiceGroupMode, setInvoiceGroupMode] = useState<
    "none" | "month" | "season"
  >("none");

const [previewInvoiceData, setPreviewInvoiceData] = useState<any>(null);

const [previewReceiptData, setPreviewReceiptData] = useState<any>(null);

const [editingReceipt, setEditingReceipt] = useState<any>(null);

const [isEditReceiptModalOpen, setIsEditReceiptModalOpen] = useState(false);

const [lastCreatedReceipt, setLastCreatedReceipt] = useState<any>(null);

const [showProductBarcodesList, setShowProductBarcodesList] = useState(false);

const [latestVersion, setLatestVersion] = useState<string | null>(null);

const [latestCommits, setLatestCommits] = useState<any[]>([]);

const [latestGithubSha, setLatestGithubSha] = useState<string | null>(null);

const [checkingUpdateVersion, setCheckingUpdateVersion] = useState(false);

const [hasPromptedUpdate, setHasPromptedUpdate] = useState(false);

const [didConfirmUpdate, setDidConfirmUpdate] = useState(false);

useEffect(() => {
    if (!checkingUpdateVersion && !hasPromptedUpdate) {
      const fetchLatestVersion = async () => {
        setCheckingUpdateVersion(true);
        try {
          const timestamp = new Date().getTime();
          const [resVer, resCom] = await Promise.all([
            fetch(
              `https://api.github.com/repos/bazyarlivecom/Store-accounting-system/releases/latest?t=${timestamp}`,
              { cache: "no-store" },
            ),
            fetch(
              `https://api.github.com/repos/bazyarlivecom/Store-accounting-system/commits?per_page=10&t=${timestamp}`,
              { cache: "no-store" },
            ),
          ]);
    
          let fetchedVer = "Build 2.9.0";

          if (resVer.ok) {
            const data = await resVer.json();
            fetchedVer = data.tag_name || data.name || "Build 2.9.0";
            setLatestVersion(fetchedVer);
          } else {
            setLatestVersion("Build 2.9.0");
          }
          if (resCom.ok) {
            const commits = await resCom.json();
            if (commits.length > 0) {
              setLatestGithubSha(commits[0].sha);
              let currentLocalSha = localStorage.getItem("localCommitSha");
              if (!currentLocalSha && commits.length > 2) {
                currentLocalSha = commits[2].sha;
                localStorage.setItem("localCommitSha", currentLocalSha);
              }
              const newCommits = [];
              for (const c of commits) {
                if (c.sha === currentLocalSha) break;
                newCommits.push(c);
              }
              setLatestCommits(newCommits);
            }
          }
        } catch (error) {
          setLatestVersion("Build 2.9.0");
        } finally {
          setCheckingUpdateVersion(false);
          setHasPromptedUpdate(true);
        }
      };
      fetchLatestVersion();
    }
  }, [checkingUpdateVersion, hasPromptedUpdate]);

const [invoiceType, setInvoiceType] = useState<
    | "sale"
    | "purchase"
    | "warehouse_receipt"
    | "warehouse_remittance"
    | "proforma"
    | "sale_return"
    | "purchase_return"
  >("sale");

const [listFilter, setListFilter] = useState<any>("all");

const [purchaseFilter, setPurchaseFilter] = useState<
    "all" | "received" | "pending"
  >("all");

useEffect(() => {
    setInvoiceCurrentPage(1);
  }, [
    activeTab,
    invoiceGroupMode,
    listFilter,
    invoiceSearchQuery,
    purchaseFilter,
  ]);

useEffect(() => {
    // Reset filters when changing tabs to prevent them from affecting each other
    setInvoiceSearchQuery("");
    setListFilter("all");
    setPurchaseFilter("all");
  }, [activeTab]);

const [invoiceMode, setInvoiceMode] = useState<"auto" | "manual">("auto");

const [invoiceTitle, setInvoiceTitle] = useState("فاکتور فروش کالا");

const [warehouseWizardStep, setWarehouseWizardStep] = useState(1);

const [warehouseOperationType, setWarehouseOperationType] =
    useState("purchase_invoice");

const [deletePreviousDocs, setDeletePreviousDocs] = useState(false);

const [invoiceDescription, setInvoiceDescription] = useState("");

const [invoiceNote, setInvoiceNote] = useState("");

const [invoiceWarehouseId, setInvoiceWarehouseId] = useState<
    string | number | ""
  >("");

const [invoiceCurrency, setInvoiceCurrency] = useState<string>("تومان");

const [exchangeRate, setExchangeRate] = useState<number>(1);

const [exchangeRateInput, setExchangeRateInput] = useState<string>("1");

const [invoiceNumber, setInvoiceNumber] = useState("");

const [sellerInvoiceNumber, setSellerInvoiceNumber] = useState("");

const [date, setDate] = useState<Date | any>(new Date());
const [invoiceDueDate, setInvoiceDueDate] = useState<Date | any | null>(null);

const [customerId, setCustomerId] = useState<string | number | "">("");

const [sourceInvoiceId, setSourceInvoiceId] = useState<string | number | "">(
    "",
  );

const [items, setItems] = useState<InvoiceItem[]>([]);

const [overallDiscountPercent, setOverallDiscountPercent] =
    useState<number>(0);

const [invoicePaymentStatus, setInvoicePaymentStatus] = useState<
    "paid" | "unpaid" | "partial"
  >("unpaid");
const [invoicePaymentAccountId, setInvoicePaymentAccountId] = useState<string>("");
const [invoicePaidAmount, setInvoicePaidAmount] = useState<number>(0);

const [hasDraft, setHasDraft] = useState<boolean>(false);

const [receiptHasDraft, setReceiptHasDraft] = useState<boolean>(false);

const [autoSaveInvoiceId, setAutoSaveInvoiceId] = useState<string | null>(
    null,
  );

const autoSaveDbTimer = useRef<any>(null);

const isAutoSavingDb = useRef<boolean>(false);

const [submitting, setSubmitting] = useState(false);
const [salePaymentModalPayload, setSalePaymentModalPayload] = useState<any>(null);
const [isSalePaymentModalOpen, setIsSalePaymentModalOpen] = useState(false);


const [transferProposal, setTransferProposal] = useState<{
    show: boolean;
    items: {
      productId: string | number;
      productName: string;
      unit: string;
      required: number;
      availableInTarget: number;
      deficit: number;
      remainingDeficit: number;
      transfers: {
        fromWarehouseId: string | number;
        fromWarehouseName: string;
        toWarehouseId: string | number;
        toWarehouseName: string;
        qty: number;
      }[];
    }[];
    payload: any;
  } | null>(null);

useEffect(() => {
    const isReceiptOpen = activeTab === "create_receive_receipt" || activeTab === "create_pay_receipt";
    if (isReceiptOpen) {
      if (receiptPersonId || receiptAmount) {
         if (!receiptNumber) {
             const docType = activeTab === "create_receive_receipt" ? "receive_receipt" : "pay_receipt";
             generateDocNumber(docType).then(num => {
                 setReceiptNumber(num);
                 updateDocCounter(docType, num);
             });
         }
      }
      
      const draft = {
        receiptNumber,
        receiptPersonId,
        receiptDate,
        receiptAmount,
        receiptResourceType,
        receiptMethod,
        receiptCheckNumber,
        receiptCheckDueDate,
        receiptCheckBankName,
        receiptCheckbookId,
        receiptResourceId,
        receiptDescription,
        receiptNote,
        receiptLinkedInvoices,
        activeTab
      };
      
      if (receiptPersonId || receiptAmount || receiptDescription || receiptNote) {
        localStorage.setItem("receipt_draft", JSON.stringify(draft));
        setReceiptHasDraft(true);
      } else {
        localStorage.removeItem("receipt_draft");
        setReceiptHasDraft(false);
      }
    }
  }, [
    receiptPersonId,
    receiptDate,
    receiptAmount,
    receiptResourceType,
    receiptMethod,
    receiptCheckNumber,
    receiptCheckDueDate,
    receiptCheckBankName,
    receiptCheckbookId,
    receiptResourceId,
    receiptDescription,
    receiptNote,
    receiptLinkedInvoices,
    activeTab
  ]);

useEffect(() => {
    if (localStorage.getItem("receipt_draft")) {
      setReceiptHasDraft(true);
    }
  }, []);

const restoreReceiptDraft = () => {
    const d = localStorage.getItem("receipt_draft");
    if (d) {
      try {
        const parsed = JSON.parse(d);
        if (parsed.activeTab) setActiveTab(parsed.activeTab);
        setReceiptPersonId(parsed.receiptPersonId || "");
        setReceiptDate(parsed.receiptDate || new Date());
        setReceiptAmount(parsed.receiptAmount || "");
        setReceiptResourceType(parsed.receiptResourceType || "cashbox");
        setReceiptMethod(parsed.receiptMethod || "cash");
        setReceiptCheckNumber(parsed.receiptCheckNumber || "");
        setReceiptCheckDueDate(parsed.receiptCheckDueDate || new Date());
        setReceiptCheckBankName(parsed.receiptCheckBankName || "");
        setReceiptCheckbookId(parsed.receiptCheckbookId || "");
        setReceiptResourceId(parsed.receiptResourceId || "");
        setReceiptDescription(parsed.receiptDescription || "");
        setReceiptNote(parsed.receiptNote || "");
        setReceiptLinkedInvoices(parsed.receiptLinkedInvoices || {});
        
        showNotification("پیشنویس رسید دریافت/پرداخت بازیابی شد.", "info");
      } catch (e) {}
    }
  };

const discardReceiptDraft = () => {
    localStorage.removeItem("receipt_draft");
    setReceiptHasDraft(false);
    
    // clear form
    setReceiptPersonId("");
    setReceiptAmount("");
    setReceiptDescription("");
    setReceiptNote("");
    setReceiptLinkedInvoices({});
    setReceiptMethod("cash");
    setReceiptResourceType("cashbox");
    showNotification("پیشنویس رسید حذف شد.", "info");
  };

useEffect(() => {
    if (
      [
        "create_sale",
        "create_purchase",
        "create_warehouse_doc",
        "create_sale_return",
        "create_purchase_return",
      ].includes(activeTab)
    ) {
      const draft = {
        invoiceMode,
        invoiceNumber,
        sellerInvoiceNumber,
        customerId,
        sourceInvoiceId,
        items,
        overallDiscountPercent,
        invoiceCurrency,
        exchangeRate,
        exchangeRateInput,
        invoiceType,
        invoiceTitle,
        invoiceDescription,
        invoiceNote,
        invoiceDueDate,
        activeTab,
        autoSaveInvoiceId,
      };
      if ((items || []).length > 0 || customerId) {
        localStorage.setItem("invoice_draft", JSON.stringify(draft));
        setHasDraft(true);
      } else {
        localStorage.removeItem("invoice_draft");
        setHasDraft(false);
      }

      // Auto-save to database as draft if person is selected and at least one item is present
      if (
        customerId &&
        (items || []).length > 0 &&
        !submitting &&
        invoiceType &&
        !editingInvoiceId
      ) {
        if (autoSaveDbTimer.current) clearTimeout(autoSaveDbTimer.current);
        autoSaveDbTimer.current = setTimeout(async () => {
          if (isAutoSavingDb.current) return;
          isAutoSavingDb.current = true;
          try {
            const cleanItems = (items || []).filter(
              (item) =>
                item.productName ||
                item.productId ||
                (item.quantity > 0 && item.unitPrice > 0),
            );

            if (cleanItems.length === 0) {
              isAutoSavingDb.current = false;
              return;
            }

            const existingDraft = autoSaveInvoiceId
              ? invoices.find((i) => i.id === autoSaveInvoiceId)
              : null;
            const payload = {
              id: autoSaveInvoiceId || generateId(),
              invoiceNumber:
                existingDraft?.invoiceNumber ||
                ((invoiceMode === "auto" && !invoiceNumber) ||
                !invoiceNumber
                  ? ""
                  : invoiceNumber),
              sellerInvoiceNumber: sellerInvoiceNumber || "",
              title: invoiceTitle,
              description: invoiceDescription,
          note: invoiceNote,
              warehouseId: invoiceWarehouseId,
              type: invoiceType,
              currency: invoiceCurrency,
              date:
                convertToGregorian(date),
                              
              customerId,
              sourceInvoiceId,
              items: cleanItems.map((item) => ({
                ...item,
                warehouseId:
                  (storeSettings?.requireWarehouse ||
                    activeTab.includes("warehouse") ||
                    activeTab === "create_sale" ||
                    invoiceType === "sale") &&
                  invoiceWarehouseId
                    ? invoiceWarehouseId
                    : item.warehouseId,
              })),
              overallDiscountPercent,
              totalAmount: calculateFinalTotal(),
              paymentStatus: invoicePaymentStatus,
              paidAmount: Number(invoicePaidAmount) || 0,
              isDraft: true,
              status: "draft",
            };

            if (autoSaveInvoiceId) {
              await updateInvoice(autoSaveInvoiceId, payload);
            } else {
              const added = await addInvoice(payload);
              setAutoSaveInvoiceId(added.id);
              if (added.invoiceNumber) {
                setInvoiceNumber(added.invoiceNumber);
              }
            }

            // Silent fetch to keep the list up to date in the background
            const updatedInvoices = await getInvoices();
            setInvoices(updatedInvoices);
          } catch (e) {
            console.error("Auto save to DB failed", e);
          } finally {
            isAutoSavingDb.current = false;
          }
        }, 1500);
      }
    }
  }, [
    items,
    customerId,
    invoiceNumber,
    sellerInvoiceNumber,
    sourceInvoiceId,
    overallDiscountPercent,
    invoiceCurrency,
    exchangeRate,
    invoiceMode,
    invoiceType,
    invoiceTitle,
    invoiceDescription,
    invoiceNote,
        invoiceDueDate,
        activeTab,
    editingInvoiceId,
    invoiceWarehouseId,
    date,
    invoicePaymentStatus,
    invoicePaidAmount,
    autoSaveInvoiceId,
    submitting,
  ]);

useEffect(() => {
    if (localStorage.getItem("invoice_draft")) {
      setHasDraft(true);
    }
  }, []);

const restoreDraft = () => {
    const d = localStorage.getItem("invoice_draft");
    if (d) {
      try {
        const parsed = JSON.parse(d);
        if (parsed.activeTab) setActiveTab(parsed.activeTab);
        setInvoiceMode(parsed.invoiceMode || "auto");
        setInvoiceNumber(parsed.invoiceNumber || "");
        setSellerInvoiceNumber(parsed.sellerInvoiceNumber || "");
        setCustomerId(parsed.customerId || "");
        setSourceInvoiceId(parsed.sourceInvoiceId || "");
        setItems((parsed.items || []).map(i => ({ ...i, id: i.id || generateId() })));
        setOverallDiscountPercent(parsed.overallDiscountPercent || 0);
        setInvoiceCurrency(parsed.invoiceCurrency || "تومان");
        setExchangeRate(parsed.exchangeRate || 1);
        setExchangeRateInput(parsed.exchangeRateInput || "1");
        setInvoiceDescription(parsed.invoiceDescription || "");
        setInvoiceNote(parsed.invoiceNote || "");
        setInvoiceDueDate(parsed.invoiceDueDate ? new Date(parsed.invoiceDueDate) : null);
        setAutoSaveInvoiceId(parsed.autoSaveInvoiceId || null);

        // Timeout to let activeTab's effect finish, then override
        setTimeout(() => {
          setInvoiceType(parsed.invoiceType || "sale");
          setInvoiceTitle(parsed.invoiceTitle || "");
        }, 50);

        showNotification("وضعیت ثبت نشده فاکتور، بازیابی شد.", "info");
      } catch (e) {}
    }
  };

const clearDraft = async () => {
    localStorage.removeItem("invoice_draft");
    setHasDraft(false);
    setCustomerId("");
    setItems([]);
    setOverallDiscountPercent(0);
    setSourceInvoiceId("");
    setSellerInvoiceNumber("");
    setInvoicePaymentAccountId("");
    if (invoiceMode === "manual") setInvoiceNumber("");
    setEditingInvoiceId(null);
    if (autoSaveInvoiceId) {
      await deleteInvoice(autoSaveInvoiceId);
      setAutoSaveInvoiceId(null);
      const updatedInvoices = await getInvoices();
      setInvoices(updatedInvoices);
    }
  };

useEffect(() => {
    if (hasCheckedFinancialYears && !activeFinancialYear) {
      if (activeTab !== "financial_years" && activeTab !== "settings") {
        setActiveTab("financial_years");
      }
    }
  }, [hasCheckedFinancialYears, activeFinancialYear, activeTab]);

useEffect(() => {
    if (activeTab === "financial_years") {
      fetchFinancialYearInfo();
    }
  }, [activeTab]);

const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error" | "info" | "warning";
  } | null>(null);

const showNotification = (
    message: string,
    type: "success" | "error" | "info" | "warning" = "info",
    skipAudio: boolean = false
  ) => {
    if (!skipAudio) {
      playAudioFeedback(type);
    }
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

const setSuccessMsg = (msg: string) =>
    msg ? showNotification(msg, "success") : null;

const setReceiptSuccessMsg = (msg: string) =>
    msg ? showNotification(msg, "success") : null;

const setSalarySuccessMsg = (msg: string) =>
    msg ? showNotification(msg, "success") : null;

const customAlert = (msg: string) => showNotification(msg, "error");

const successMsg = false;

const [isScannerOpen, setIsScannerOpen] = useState(false);

const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);

const handleBulkImportItems = (importedItems: any[]) => {
    if (!importedItems || importedItems.length === 0) return;

    setItems((currentItems) => {
      const newItems = [...currentItems];

      importedItems.forEach((imported) => {
        const { product, quantity, unitPrice, discountPercent } = imported;
        if (!product) return;

        // Check if exists
        const existingItemIndex = newItems.findIndex(
          (i) => i.productId?.toString() === product.id?.toString(),
        );

        if (
          existingItemIndex > -1 &&
          !storeSettings.allowDuplicateInvoiceRows
        ) {
          // Update existing
          newItems[existingItemIndex].quantity += quantity;
          if (unitPrice > 0) newItems[existingItemIndex].unitPrice = unitPrice;
          if (discountPercent > 0)
            newItems[existingItemIndex].discountPercent = discountPercent;

          newItems[existingItemIndex].totalPrice = Math.max(
            0,
            newItems[existingItemIndex].quantity *
              newItems[existingItemIndex].unitPrice *
              (1 - newItems[existingItemIndex].discountPercent / 100),
          );
        } else {
          // Add new
          const pPrice = unitPrice > 0 ? unitPrice : product.price || 0;
          const convertedPrice =
            exchangeRate > 0 ? pPrice / exchangeRate : pPrice;
          const unitPriceRounded = Number(convertedPrice.toFixed(4));

          newItems.push({
            id: generateId(),
            productId: product.id.toString(),
            productName: product.name,
            quantity: quantity > 0 ? quantity : 1,
            unitPrice: unitPriceRounded,
            discountPercent: discountPercent || 0,
            totalPrice:
              unitPriceRounded *
              (quantity > 0 ? quantity : 1) *
              (1 - (discountPercent || 0) / 100),
            selectedUnit: product.unit || "",
            unitRatio: product.unitRatio || 1,
            isSecondaryUnit: false,
          });
        }
      });
      return newItems;
    });

    showNotification(
      `${toPersianDigits(importedItems.length)} کالا با موفقیت اضافه شد.`,
      "success",
    );
  };

const handleBarcodeScan = (code: string) => {
    setIsScannerOpen(false);
    const product = products.find((p) => p.isActive !== false && p.barcode === code);
    if (product) {
      playAudioFeedback("scan" as any);
      handleFastAddProduct(String(product.id));
      showNotification("کالا با موفقیت اضافه شد", "success", true);
    } else {
      playAudioFeedback("scan_error" as any);
      showNotification("کالا با این بارکد یافت نشد", "error", true);
    }
  };


const [productCategories, setProductCategories] = useState<any[]>([]);

const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

const [newCatName, setNewCatName] = useState("");

const [newCatParentId, setNewCatParentId] = useState("");

const [editingCategoryId, setEditingCategoryId] = useState<any>(null);

const [newCatDesc, setNewCatDesc] = useState("");

const [submittingProduct, setSubmittingProduct] = useState(false);

const [submittingCategory, setSubmittingCategory] = useState(false);

const [newCashboxBalance, setNewCashboxBalance] = useState("");

const [newWarehouseName, setNewWarehouseName] = useState("");

const [newWarehouseManager, setNewWarehouseManager] = useState("");

const [newWarehouseLocation, setNewWarehouseLocation] = useState("");

const [newWarehouseIsActive, setNewWarehouseIsActive] = useState(true);

const handleSubmitPerson = async (e: any) => { e.preventDefault(); };

const [isProductModalOpen, setIsProductModalOpen] = useState(false);

const [isFastProductModalOpen, setIsFastProductModalOpen] = useState(false);

const [isProductActionsMenuOpen, setIsProductActionsMenuOpen] =
    useState(false);

const [isGenerateBarcodesModalOpen, setIsGenerateBarcodesModalOpen] =
    useState(false);

const [isAIProductSearchOpen, setIsAIProductSearchOpen] = useState(false);

const [barcodeFormat, setBarcodeFormat] = useState("prefix_serial");

const [barcodePrefix, setBarcodePrefix] = useState("PRD-");

const [barcodeLength, setBarcodeLength] = useState(6);

const [barcodeStartNumber, setBarcodeStartNumber] = useState(1000);

const [isGroupPriceModalOpen, setIsGroupPriceModalOpen] = useState(false);

const [groupUpdateType, setGroupUpdateType] = useState<"category" | "single" | "selected">(
    "category",
  );

const [groupUpdateTargetCategory, setGroupUpdateTargetCategory] =
    useState<string>("all");

const [groupUpdateTargetProduct, setGroupUpdateTargetProduct] =
    useState<string>("");

const [groupUpdateAmount, setGroupUpdateAmount] = useState<string>("");

const [groupUpdateDate, setGroupUpdateDate] = useState<string>(new Date().toISOString().split('T')[0]);

const [groupUpdatePriceTarget, setGroupUpdatePriceTarget] = useState<
    "sell" | "buy" | "both"
  >("sell");

const [isPersonModalOpen, setIsPersonModalOpen] = useState(false);

const [personLedgerActionsOpen, setPersonLedgerActionsOpen] = useState(false);

const [openPersonActionsId, setOpenPersonActionsId] = useState<
    string | number | null
  >(null);

const [newPersonType, setNewPersonType] = useState<"real" | "legal">("real");

const [newPersonGender, setNewPersonGender] = useState<
    "male" | "female" | "none"
  >("none");

const [newPersonTitle, setNewPersonTitle] = useState("");

const [newPersonAlias, setNewPersonAlias] = useState("");

const [newPersonFirstName, setNewPersonFirstName] = useState("");

const [newPersonLastName, setNewPersonLastName] = useState("");

const [newPersonCompanyName, setNewPersonCompanyName] = useState("");

const [newPersonFatherName, setNewPersonFatherName] = useState("");

const [newPersonNationalId, setNewPersonNationalId] = useState("");

const [newPersonAddress, setNewPersonAddress] = useState("");

const [newPersonImage, setNewPersonImage] = useState("");

const [newPersonRole, setNewPersonRole] = useState<string>("");

const [newPersonAccountingCode, setNewPersonAccountingCode] = useState("");

const [newPersonPhone, setNewPersonPhone] = useState("");

const [newPersonContacts, setNewPersonContacts] = useState<any[]>([]);

const [newPersonGroup, setNewPersonGroup] = useState("");

const [newPersonProvince, setNewPersonProvince] = useState("");

const [newPersonCity, setNewPersonCity] = useState("");

const [newPersonIsActive, setNewPersonIsActive] = useState(true);

const [newPersonRegistrationDate, setNewPersonRegistrationDate] = useState<
    Date | any
  >(new Date());

const [newPersonInitialBalance, setNewPersonInitialBalance] = useState("");

const [newPersonInitialBalanceType, setNewPersonInitialBalanceType] =
    useState<"debtor" | "creditor" | "settled">("settled");

const [newPersonCreditLimit, setNewPersonCreditLimit] = useState("");
  const [newPersonTaxNumber, setNewPersonTaxNumber] = useState("");
  const [newPersonRegistrationNumber, setNewPersonRegistrationNumber] = useState("");
  const [newPersonRoles, setNewPersonRoles] = useState<string[]>([]);
  const [newPersonCategories, setNewPersonCategories] = useState<string[]>([]);
  const [duplicatePersonsWarning, setDuplicatePersonsWarning] = useState<any[]>([]);
  

const [submittingPerson, setSubmittingPerson] = useState(false);

const [personModalActiveTab, setPersonModalActiveTab] = useState<
    "basic" | "contact" | "financial" | "settings"
  >("basic");

const [isPersonExtraModalOpen, setIsPersonExtraModalOpen] = useState(false);

const [personExtraId, setPersonExtraId] = useState<string | number | null>(
    null,
  );

const [personBankName, setPersonBankName] = useState("");

const [personBankAcc, setPersonBankAcc] = useState("");

const [personCard, setPersonCard] = useState("");

const [personSheba, setPersonSheba] = useState("");

const [personBankAccounts, setPersonBankAccounts] = useState<any[]>([]);

const [personNotes, setPersonNotes] = useState("");

const [isPersonIOModalOpen, setIsPersonIOModalOpen] = useState(false);

const [personIOAction, setPersonIOAction] = useState<"import" | "export">("export");

const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

const [isCashboxModalOpen, setIsCashboxModalOpen] = useState(false);

const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false);

const [viewingProduct, setViewingProduct] = useState<any>(null);

const [duplicateProductId, setDuplicateProductId] = useState<string | number | null>(null);
const [editingProductId,
    setEditingProductId] = useState<
    string | number | null
  >(null);

const [editingPersonId, setEditingPersonId] = useState<
    string | number | null
  >(null);

const [editingAccountId, setEditingAccountId] = useState<
    string | number | null
  >(null);

const [editingCashboxId, setEditingCashboxId] = useState<
    string | number | null
  >(null);

const [editingWarehouseId, setEditingWarehouseId] = useState<
    string | number | null
  >(null);

const [settingsForm, setSettingsForm] = useState<any>({
    storeName: "",
    address: "",
    phone: "",
    logoUrl: "",
    currency: "تومان",
    fontFamily: "Vazirmatn",
    theme: "classic",
    allowNegativeStock: false,
    requireWarehouse: false,
    prefix_warehouse_receipt: "REC-",
    prefix_warehouse_remittance: "REM-",
    prefix_purchase: "PUR-",
    prefix_sale: "INV-",
    prefix_receive_receipt: "RD-",
    prefix_pay_receipt: "PD-",
    prefix_proforma: "PF-",
    prefix_salary: "PAY-",
    print_footer_note: "",
    print_signature_1: "",
    print_signature_2: "",
    print_signature_3: "",
  });

const [submittingSettings, setSubmittingSettings] = useState(false);

const [settingsTab, setSettingsTab] = useState<string>("general");

const [smsPanelTab, setSmsPanelTab] = useState<"send_history" | "templates">(
    "send_history",
  );

const fetchInventoryTransactions = async () => {
    try {
      const data = await getInventoryTransactions();
      setInventoryTransactions(data as any);
    } catch (error) {
      console.error("Error fetching inventory transactions", error);
    }
  };

const fetchInvoices = async () => {
    try {
      const data = await getInvoices();
      setInvoices(data as any);
      await fetchInventoryTransactions();
    } catch (error) {
      console.error("Error fetching invoices", error);
    }
  };

const fetchProducts = async () => {
    try {
      const data = await getProducts();
      setProducts(data as any);

      const cats = await getProductCategories();
      setProductCategories(cats as any);
    } catch (error) {
      console.error("Error fetching products or categories", error);
    }
  };

const handleExportProductsData = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      (products || []).map((p) => {
        const mapped = { ...p };
        delete (mapped as any).priceHistory;
        return mapped;
      }),
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Products");
    const filename = `products_export_${new Date().toLocaleDateString(storeSettings?.calendarType === "gregorian" ? "en-US" : "fa-IR").replace(/\//g, "-")}.xlsx`;
    XLSX.writeFile(workbook, filename);
    showNotification("خروجی اکسل کالاها با موفقیت دریافت شد.", "success");
  };

const handleDownloadProductsTemplate = () => {
    const templateData = [
      {
        "نام کالا/خدمات (الزامی)": "کالای نمونه",
        "کد کالا": "1001",
        بارکد: "1234567890123",
        "نوع (product/service) (الزامی)": "product",
        دسته‌بندی: "نوشیدنی‌ها",
        "قیمت خرید (ریال)": 20000,
        "قیمت فروش (ریال) (الزامی)": 25000,
        "موجودی فعلی": 50,
        "حداقل موجودی": 10,
        "واحد اصلی (الزامی)": "عدد",
        "واحد فرعی": "بسته",
        "تعداد واحد اصلی در فرعی": 10,
        توضیحات: "این یک کالای نمونه است",
      },
    ];
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
    XLSX.writeFile(workbook, "products_import_template.xlsx");
    showNotification(
      "قالب استاندارد با موفقیت دانلود شد. لطفا اطلاعات را در این قالب وارد کرده و سپس درون‌ریزی کنید.", "success"
    );
  };

const handleImportProductsData = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".xlsx, .xls";
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (event: any) => {
        try {
          const data = new Uint8Array(event.target.result);
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const imported = XLSX.utils.sheet_to_json(worksheet);

          if (!Array.isArray(imported) || imported.length === 0) {
            customAlert("فایل نامعتبر یا خالی است.");
            return;
          }
          if (
            !confirm(
              `تعداد ${imported.length} کالا آماده درون‌ریزی است. ادامه می‌دهید؟`,
            )
          )
            return;

          setSubmittingProduct(true);
    startAppProcessing('شروع فرآیند ثبت کالا...');

          let successCount = 0;
          let skippedCount = 0;
          let duplicateMsgs: string[] = [];
          const currentProducts = [...products];

          for (const p of imported as any[]) {
            // Check if it's the standard template format
            if (p["نام کالا/خدمات (الزامی)"] !== undefined) {
              if (
                !p["نام کالا/خدمات (الزامی)"] ||
                !p["نوع (product/service) (الزامی)"] ||
                !p["قیمت فروش (ریال) (الزامی)"] ||
                !p["واحد اصلی (الزامی)"]
              ) {
                continue; // Skip invalid rows
              }

              // Duplicate checking before inserting
              const pName = String(p["نام کالا/خدمات (الزامی)"]);
              const pCode = p["کد کالا"] ? String(p["کد کالا"]) : "";
              const pBarcode = p["بارکد"] ? String(p["بارکد"]) : "";

              if (currentProducts.some((pr) => pr.name === pName)) {
                duplicateMsgs.push(
                  `نام تکراری: ${pName} - پیشنهاد: تغییر نام کالا`,
                );
                skippedCount++;
                continue;
              }
              if (pCode && currentProducts.some((pr) => pr.code === pCode)) {
                duplicateMsgs.push(
                  `کد تکراری: ${pCode} (برای ${pName}) - پیشنهاد: تغییر کد`,
                );
                skippedCount++;
                continue;
              }
              if (
                pBarcode &&
                currentProducts.some((pr) => pr.barcode === pBarcode)
              ) {
                duplicateMsgs.push(`بارکد تکراری: ${pBarcode} (برای ${pName})`);
                skippedCount++;
                continue;
              }

              // Handle category
              let catId = "";
              const catName = p["دسته‌بندی"];
              if (catName) {
                const existingCat = productCategories.find(
                  (c) => c.name === catName,
                );
                if (existingCat) {
                  catId = existingCat.id;
                } else {
                  // Create category if it doesn't exist
                  const newCat = await addProductCategory({
                    name: String(catName),
                  });
                  if (newCat) {
                    catId = newCat.id;
                    const fetchedCats = await getProductCategories();
                    setProductCategories(fetchedCats as any); // refresh categories list
                  }
                }
              }

              const payload = {
                name: pName,
                code: pCode,
                barcode: pBarcode,
                type:
                  p["نوع (product/service) (الزامی)"] === "service"
                    ? "service"
                    : "product",
                categoryId: catId,
                category: catName ? String(catName) : "",
                purchasePrice: Number(p["قیمت خرید (ریال)"] || 0),
                buyPrice: Number(p["قیمت خرید (ریال)"] || 0),
                sellPrice: Number(p["قیمت فروش (ریال) (الزامی)"] || 0),
                price: Number(p["قیمت فروش (ریال) (الزامی)"] || 0),
                stock: Number(p["موجودی فعلی"] || 0),
                minStock: Number(p["حداقل موجودی"] || 0),
                unit: String(p["واحد اصلی (الزامی)"]),
                secondaryUnit: p["واحد فرعی"] ? String(p["واحد فرعی"]) : "",
                unitRatio: Number(p["تعداد واحد اصلی در فرعی"] || 1),
                description: p["توضیحات"] ? String(p["توضیحات"]) : "",
                isActive: true,
              };
              const newProd = await addProduct(payload as any);
              currentProducts.push(newProd as any);
              successCount++;
            } else {
              // Legacy/Exported format
              const payload = { ...p };
              delete payload.id;
              delete payload.createdAt;
              delete payload.updatedAt;

              const pName = payload.name;
              const pCode = payload.code;
              const pBarcode = payload.barcode;

              if (currentProducts.some((pr) => pr.name === pName)) {
                duplicateMsgs.push(`نام تکراری: ${pName}`);
                skippedCount++;
                continue;
              }
              if (pCode && currentProducts.some((pr) => pr.code === pCode)) {
                duplicateMsgs.push(`کد تکراری: ${pCode} (برای ${pName})`);
                skippedCount++;
                continue;
              }
              if (
                pBarcode &&
                currentProducts.some((pr) => pr.barcode === pBarcode)
              ) {
                duplicateMsgs.push(`بارکد تکراری: ${pBarcode} (برای ${pName})`);
                skippedCount++;
                continue;
              }

              const newProd = await addProduct(payload);
              currentProducts.push(newProd as any);
              successCount++;
            }
          }
          
          setSubmittingProduct(false);
      stopAppProcessing();
          let finalMsg = `${successCount} کالا با موفقیت درون‌ریزی شد.`;
          if (skippedCount > 0) {
            finalMsg +=
              `

تعداد ${skippedCount} کالا به دلیل تکراری بودن رد شدند:
` +
              duplicateMsgs.slice(0, 10).join("\n")
            if (duplicateMsgs.length > 10) finalMsg += "\n...";
          }
          customAlert(finalMsg);
        } catch (err) {
          console.error(err);
          customAlert("خطا در خواندن فایل اکسل!");
          setSubmittingProduct(false);
      stopAppProcessing();
        }
      };
      reader.readAsArrayBuffer(file);
    };
    input.click();
  };

const handleGenerateDemoData = async () => {
    if (
      !confirm(
        "آیا از ایجاد اطلاعات نمونه (دسته‌بندی و کالا) اطمینان دارید؟ اطلاعات فعلی شما دست‌نخورده باقی می‌ماند.",
      )
    )
      return;

    setSubmittingProduct(true);
    startAppProcessing('شروع فرآیند ثبت کالا...');
    try {
      const cat1 = await addProductCategory({
        name: "نوشیدنی‌ها",
        description: "انواع نوشیدنی‌های گرم و سرد",
      });
      const cat2 = await addProductCategory({
        name: "تنقلات",
        description: "چیپس، پفک، بیسکویت...",
      });

      await addProduct({
        name: "نوشابه خانواده کوکاکولا",
        type: "product",
        categoryId: cat1.id,
        category: "نوشیدنی‌ها",
        price: 25000,
        purchasePrice: 20000,
        buyPrice: 20000,
        sellPrice: 25000,
        stock: 50,
        unit: "بطری",
        secondaryUnit: "باکس",
        unitRatio: 6,
      });

      await addProduct({
        name: "آب معدنی کوچک دماوند",
        type: "product",
        categoryId: cat1.id,
        category: "نوشیدنی‌ها",
        price: 5000,
        purchasePrice: 3500,
        buyPrice: 3500,
        sellPrice: 5000,
        stock: 120,
        unit: "بطری",
        secondaryUnit: "باکس",
        unitRatio: 12,
      });

      await addProduct({
        name: "چیپس نمکی مزمز",
        type: "product",
        categoryId: cat2.id,
        category: "تنقلات",
        price: 35000,
        purchasePrice: 28000,
        buyPrice: 28000,
        sellPrice: 35000,
        stock: 45,
        unit: "بسته",
        secondaryUnit: "کارتن",
        unitRatio: 10,
      });

      
    } catch (err) {
      console.error("Error generating demo data", err);
      customAlert("خطا در ایجاد دیتای نمونه");
    } finally {
      setSubmittingProduct(false);
      stopAppProcessing();
    }
  };

const handleFastSaveProduct = async (productData: any): Promise<boolean> => {
    try {
      const addedProduct = await addProduct(productData);

      if (
        ["create_sale", "create_purchase", "create_warehouse_doc"].includes(
          activeTab,
        )
      ) {
        handleFastAddProduct(addedProduct.id.toString(), addedProduct);
        setNotification({
          message: "کالا ثبت و به عنوان ردیف جدید به فاکتور اضافه شد.",
          type: "info",
        });
        setTimeout(() => setNotification(null), 3000);
      }

      
      return true;
    } catch (error) {
      console.error("Error fast saving product", error);
      showNotification("خطا در ثبت سریع کالا.", "error");
      return false;
    }
  };

const handleSaveCategory = async () => {
    if (!newCatName) return;

    try {
      if (editingCategoryId) {
        await updateProductCategory(editingCategoryId, {
          name: newCatName,
          description: newCatDesc,
          parentId: newCatParentId || null,
        });
        setSuccessMsg("گروه‌بندی با موفقیت ویرایش شد.");
      } else {
        const codechars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        let newCode = "";
        for (let i = 0; i < 3; i++) {
          newCode += codechars.charAt(
            Math.floor(Math.random() * codechars.length),
          );
        }
        await addProductCategory({
          code: newCode,
          name: newCatName,
          description: newCatDesc,
          parentId: newCatParentId || null,
        });
        setSuccessMsg("گروه‌بندی جدید ثبت شد.");
      }
      // re-fetch categories
      const fetchedCats = await getProductCategories();
      setProductCategories(fetchedCats as any);
      setIsCategoryModalOpen(false);
    } catch (err) {
      console.error("Error saving category", err);
    }
  };

const handleDeleteCategory = async (id: string) => {
    if (!confirm("آیا از حذف این گروه‌بندی اطمینان دارید؟")) return;
    try {
      await deleteProductCategory(id);
      setSuccessMsg("گروه‌بندی حذف شد.");
      const fetchedCats = await getProductCategories();
      setProductCategories(fetchedCats as any);
    } catch (err) {
      console.error("Error deleting category", err);
    }
  };

const handleEditCategory = (cat: any) => {
    setEditingCategoryId(cat.id);
    setNewCatName(cat.name);
    setNewCatDesc(cat.description || "");
    setNewCatParentId(cat.parentId || "");
    setIsCategoryModalOpen(true);
  };

const handleDeleteProduct = async (id: number | string) => {
    const isUsedInInvoices = invoices.some(
      (inv) =>
        inv.items &&
        inv.items.some(
          (item: any) => item.productId?.toString() === id.toString(),
        ),
    );
    if (isUsedInInvoices) {
      customAlert("این کالا در فاکتورها استفاده شده است و قابل حذف نمی‌باشد.");
      return;
    }
    if (!confirm("آیا از حذف این کالا اطمینان دارید؟")) return;
    try {
      await deleteProduct(id.toString());
      
    } catch (error) {
      console.error("Error deleting product", error);
    }
  };


  const handleGroupPriceUpdate = async (items: any[]) => {
    try {
      for (const item of items) {
        await updateProduct(item.id.toString(), {
          buyPrice: item.buyPrice,
          price: item.price,
        });
      }
      showNotification(`قیمت ${items.length} کالا با موفقیت بروزرسانی شد`, "success");
      setIsGroupPriceModalOpen(false);
      setSelectedProductIds([]);
      
    } catch (e) {
      console.error(e);
      showNotification("خطا در بروزرسانی گروهی قیمت", "error");
    }
  };

  const handleGenerateBarcodes = async () => {

    const productsToUpdate = (products || []).filter(
      (p) => !p.barcode || p.barcode.trim() === "",
    );
    if (productsToUpdate.length === 0) {
      showNotification("تمامی کالاها دارای بارکد هستند.", "success");
      setIsGenerateBarcodesModalOpen(false);
      return;
    }

    let currentNumber = Number(barcodeStartNumber) || 1000;

    // To ensure unique barcodes with what's already existing:
    const existingBarcodes = new Set(
      (products || []).map((p) => p.barcode).filter(Boolean),
    );

    let updatedCount = 0;
    setSubmittingProduct(true);
    startAppProcessing('شروع فرآیند ثبت کالا...');
    try {
      for (const p of productsToUpdate) {
        let newBarcode = "";
        let attempts = 0;
        do {
          if (barcodeFormat === "prefix_serial") {
            newBarcode = `${barcodePrefix}${String(currentNumber).padStart(Number(barcodeLength), "0")}`;
            currentNumber++;
          } else if (barcodeFormat === "numeric_only") {
            newBarcode = `${String(currentNumber).padStart(Number(barcodeLength), "0")}`;
            currentNumber++;
          } else if (barcodeFormat === "date_prefix") {
            const yy = new Date().getFullYear().toString().substring(2);
            const mm = String(new Date().getMonth() + 1).padStart(2, "0");
            newBarcode = `${yy}${mm}-${String(currentNumber).padStart(Number(barcodeLength), "0")}`;
            currentNumber++;
          } else if (barcodeFormat === "ean13") {
            const prefix = (barcodePrefix || "626").replace(/[^0-9]/g, '');
            const requiredSerialLength = 12 - prefix.length;
            const serialStr = String(currentNumber).padStart(requiredSerialLength, "0").slice(0, requiredSerialLength);
            const base12 = (prefix + serialStr).padStart(12, "0").slice(0, 12);
            let sum = 0;
            for (let i = 0; i < 12; i++) {
                const digit = parseInt(base12[i], 10);
                sum += (i % 2 === 0) ? digit : digit * 3;
            }
            const remainder = sum % 10;
            const checksum = remainder === 0 ? 0 : 10 - remainder;
            newBarcode = base12 + checksum.toString();
            currentNumber++;
          } else if (barcodeFormat === "random_alphanumeric") {
            const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
            let randStr = "";
            for (let i = 0; i < Number(barcodeLength); i++) {
              randStr += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            newBarcode = `${barcodePrefix}${randStr}`;
          }
          attempts++;
          if (attempts > 1000) {
            newBarcode += "-" + Math.floor(Math.random() * 1000);
          }
        } while (existingBarcodes.has(newBarcode));

        existingBarcodes.add(newBarcode);
        await updateProduct(p.id.toString(), { ...p, barcode: newBarcode });
        updatedCount++;
      }
      showNotification(
        `${updatedCount} کالا با موفقیت بارکدگذاری شدند.`,
        "success",
      );
    } catch (e) {
      console.error(e);
      showNotification("خطا در بارکدگذاری کالاها", "error");
    } finally {
      setSubmittingProduct(false);
      stopAppProcessing();
      setIsGenerateBarcodesModalOpen(false);
      fetchProducts();
    }
  };

const fetchPersonGroups = async () => {
    try {
      const data = await getPersonGroups();
      setPersonGroups(data as any);
    } catch (error) {
      console.error("Error fetching person groups", error);
    }
  };

const fetchPersonRoles = async () => {
    try {
      const data = await getPersonRoles();
      setPersonRoles(data as any);
    } catch (error) {
      console.error("Error fetching person roles", error);
    }
  };

const fetchPersons = async () => {
    try {
      const data = await getPersons();
      setPersons(data as any);
    } catch (error) {
      console.error("Error fetching persons", error);
    }
  };

const fetchPersonOpeningBalances = async () => {
    try {
      const data = await getPersonOpeningBalances();
      setPersonOpeningBalances(data as any);
    } catch (error) {
      console.error("Error fetching person opening balances", error);
    }
  };

const handleDeletePerson = async (id: number | string) => {
    const isUsedInInvoices = invoices.some(
      (inv) => inv.customerId?.toString() === id.toString(),
    );
    if (isUsedInInvoices) {
      customAlert("این شخص در فاکتورها استفاده شده است و قابل حذف نمی‌باشد.");
      return;
    }
    const isUsedInTransactions = transactions.some(
      (tx) => tx.personId?.toString() === id.toString(),
    );
    if (isUsedInTransactions) {
      customAlert(
        "برای این شخص در تراکنش‌های مالی سابقه ثبت شده است و قابل حذف نمی‌باشد.",
      );
      return;
    }
    const isUsedInIssuedChecks = issuedChecks.some(
      (chk) => chk.payeeId?.toString() === id.toString(),
    );
    const isUsedInReceivedChecks = receivedChecks.some(
      (chk) => chk.payerId?.toString() === id.toString(),
    );
    if (isUsedInIssuedChecks || isUsedInReceivedChecks) {
      customAlert("این شخص دارای چک ثبت شده است و قابل حذف نمی‌باشد.");
      return;
    }
    if (!confirm("آیا از حذف این شخص اطمینان دارید؟")) return;
    try {
      await deletePerson(id.toString());
      
    } catch (error) {
      console.error("Error deleting person", error);
    }
  };

const [isGeneratingCodes, setIsGeneratingCodes] = useState(false);

const handleGenerateMissingAccountingCodes = async () => {
    setIsGeneratingCodes(true);
    try {
      const personsWithoutCode = (persons || []).filter(
        (p) => !p.accountingCode || String(p.accountingCode).trim() === "",
      );
      if (personsWithoutCode.length === 0) {
        customAlert("تمام اشخاص در حال حاضر دارای کد حسابداری هستند.");
        setIsGeneratingCodes(false);
        return;
      }

      let generated = 0;
      for (const p of personsWithoutCode) {
        await updatePerson(p.id as string, p);
        generated++;
      }

      setSuccessMsg(`کد حسابداری برای ${generated} شخص با موفقیت صادر شد.`);
      
    } catch (error) {
      console.error(error);
      customAlert("خطا در صدور کدهای حسابداری");
    } finally {
      setIsGeneratingCodes(false);
    }
  };

const fetchAccounts = async () => {
    try {
      const data = await getAccounts();
      setAccounts(data as any);
    } catch (error) {
      console.error("Error fetching accounts", error);
    }
  };

const handleDeleteAccount = async (id: number | string) => {
    if (!confirm("آیا از حذف این حساب بانکی اطمینان دارید؟")) return;
    try {
      await deleteAccount(id.toString());
      await fetchAccounts();
    } catch (error) {
      console.error("Error deleting account", error);
    }
  };

const fetchCashboxes = async () => {
    try {
      const data = await getCashboxes();
      setCashboxes(data as any);
    } catch (error) {
      console.error("Error fetching cashboxes", error);
    }
  };

const fetchWarehouses = async () => {
    try {
      const data = await getWarehouses();
      setWarehouses(data as any);

      const stocks = await getWarehouseStocks();
      setWarehouseStocks(stocks as any);
    } catch (error) {
      console.error("Error fetching warehouses", error);
    }
  };

const fetchTransactions = async () => {
    try {
      const data = await getTransactions();
      setTransactions(data as any);
    } catch (error) {
      console.error("Error fetching transactions", error);
    }
  };

const fetchAccountingDocuments = async () => {
    try {
      const data = await getAccountingDocuments();
      setAccountingDocuments(data as any);
    } catch (error) {
      console.error("Error fetching accounting documents", error);
    }
  };

const checkDebtThreshold = async (personId: string | number) => {
    if (
      !storeSettings?.smsDebtThresholdEnabled ||
      storeSettings.smsDebtThresholdAmount === undefined ||
      !storeSettings?.notify_method ||
      storeSettings.notify_method === "none"
    )
      return;

    try {
      const [
        allPersons,
        allInvoices,
        allTransactions,
        allIssuedChecks,
        allReceivedChecks,
      ] = await Promise.all([
        getPersons(),
        getInvoices(),
        getTransactions(),
        getIssuedChecks(),
        getReceivedChecks(),
      ]);


      const person = allPersons.find(
        (p: any) => p.id.toString() === personId.toString(),
      );
      if (!person || !person.phone) return;

      let balance = 0;
      if (person.initialBalance && person.initialBalanceType !== "settled") {
        balance +=
          person.initialBalanceType === "debtor"
            ? person.initialBalance
            : -person.initialBalance;
      }

      allInvoices
        .filter(
          (i: any) =>
            i.customerId?.toString() === personId.toString() &&
            i.type !== "warehouse_receipt" &&
            i.type !== "warehouse_remittance" &&
            i.type !== "proforma" &&
            i.status !== "draft" && i.status !== "voided" && !i.isDeleted,
        )
        .forEach((inv: any) => {
          const amount =
            (inv.totalAmount || 0) *
            getDefaultExchangeRate(
              inv.currency,
              storeSettings?.currency || "تومان",
            );
          if (inv.type === "sale") balance += amount;
          else if (inv.type === "purchase") balance -= amount;
          else if (inv.type === "sale_return") balance -= amount;
          else if (inv.type === "purchase_return") balance += amount;
        });

      allTransactions
        .filter(
          (t: any) =>
            t.personId?.toString() === personId.toString() &&
            t.method !== "check",
        )
        .forEach((t: any) => {
          if (t.type === "receive") balance -= t.amount || 0;
          else if (t.type === "pay") balance += t.amount || 0;
          else if (t.type === "salary") balance -= t.amount || 0;
        });

      allIssuedChecks
        .filter(
          (c: any) =>
            c.payeeId?.toString() === personId.toString() &&
            c.status !== "cancelled" &&
            c.status !== "bounced" &&
            c.status !== "cashed",
        )
        .forEach((c: any) => {
          balance += c.amount || 0;
        });

      allReceivedChecks
        .filter(
          (c: any) =>
            c.payerId?.toString() === personId.toString() &&
            c.status !== "returned" &&
            c.status !== "bounced" &&
            c.status !== "cashed",
        )
        .forEach((c: any) => {
          balance -= c.amount || 0;
        });

      if (balance > storeSettings.smsDebtThresholdAmount) {
        const amt =
          typeof formatNumber === "function"
            ? formatNumber(balance)
            : addCommas(balance);
        let msg =
          storeSettings.smsDebtThresholdMessage ||
          "مشتری گرامی، مانده بدهی شما از سقف مجاز عبور کرده است. لطفا نسبت به تسویه حساب اقدام نمایید.";
        msg = msg
          .replace(/{name}/g, person.name)
          .replace(/{amount}/g, String(amt))
          .replace(/{date}/g, formatDateDisplay(new Date(), storeSettings?.calendarType));
        sendNotification(msg, person.phone, storeSettings.notify_method);
      }
    } catch (err) {
      console.error("Error checking debt threshold:", err);
    }
  };

const handleSubmitReceipt = (type: "receive" | "pay", e: React.FormEvent) => {
    e.preventDefault();
    if (receiptMethod === "cash") {
      if (
        !receiptPersonId ||
        !receiptAmount ||
        !receiptResourceType ||
        !receiptResourceId
      ) {
        customAlert("لطفا تمام اطلاعات الزامی فرم را وارد کنید.");
        return;
      }
    } else {
      if (
        !receiptPersonId ||
        !receiptAmount ||
        !receiptCheckNumber ||
        !receiptCheckDueDate ||
        (type === "receive" && !receiptCheckBankName) ||
        (type === "pay" && !receiptCheckbookId)
      ) {
        customAlert("لطفا تمام اطلاعات الزامی فرم چک را وارد کنید.");
        return;
      }
    }

    if (type === "pay") {
      const person = persons.find(
        (p) => p.id.toString() === receiptPersonId.toString(),
      );
      if (person && person.creditLimit && person.creditLimit > 0) {
        const currentBalanceObj = calculatePersonBalance(receiptPersonId);
        let currentDebt =
          currentBalanceObj.status === "بدهکار"
            ? currentBalanceObj.amount
            : -currentBalanceObj.amount;

        // type === "pay" means we are paying them, so their debt to us INCREASES.
        const newDebt = currentDebt + Number(receiptAmount);

        if (newDebt > person.creditLimit) {
          customAlert(
            `خطا: ثبت این سند باعث عبور از سقف اعتبار شخص می‌شود.
سقف اعتبار: ${addCommas(person.creditLimit)}
مبلغ بدهی بعد از ثبت: ${addCommas(newDebt)}`,
          );
          return;
        }
      }
    }

    // Validate allocated amounts
    const totalAllocated = Object.values(receiptLinkedInvoices).reduce(
      (a, b) => a + b,
      0,
    );
    if (totalAllocated > Number(receiptAmount)) {
      customAlert(
        `جمع مبالغ تخصیص داده شده (${totalAllocated}) از مبلغ کل رسید (${receiptAmount}) بیشتر است.`,
      );
      return;
    }

    // Generate simple receipt number for review
    const typeKey = type === "receive" ? "receive_receipt" : "pay_receipt";
    const defaultPrefix = type === "receive" ? "RD-" : "PD-";
    const receiptPrefix =
      typeof storeSettings[`prefix_${typeKey}`] !== "undefined"
        ? storeSettings[`prefix_${typeKey}`]
        : defaultPrefix;

    const existingRelated = (transactions || []).filter(
      (t: any) => t.type === type && t.receiptNumber,
    );

    // Calculate sequential number based on settings
    const startNumStr =
      storeSettings[`start_${typeKey}`] ||
      storeSettings.invoiceStartNumber ||
      "1000";
    const lenStr =
      storeSettings[`len_${typeKey}`] ||
      storeSettings.invoiceNumberLength ||
      "6";

    const startNum = parseInt(startNumStr, 10);
    const numLength = Math.max(1, parseInt(lenStr, 10));

    let maxNum = startNum - 1;

    if (existingRelated.length > 0) {
      const nums = existingRelated.map((t: any) => {
        let numStr = String(t.receiptNumber);
        if (numStr.startsWith(receiptPrefix)) {
          numStr = numStr.substring(receiptPrefix.length);
        }
        const match = numStr.match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
      });
      const maxExisting = Math.max(...nums);
      if (maxExisting > maxNum) maxNum = maxExisting;
    }
    const nextNum = maxNum + 1;
    const formattedNum = String(nextNum).padStart(numLength, "0");
    const receiptNumber = `${receiptPrefix}${formattedNum}`;

    const basePayload: any = {
      type,
      method: receiptMethod,
      personId: receiptPersonId,
      amount: Number(receiptAmount),
      date:
        convertToGregorian(receiptDate),
description: receiptDescription,
      note: receiptNote,
      receiptNumber: receiptNumber,
    };

    if (receiptMethod === "cash") {
      basePayload.resourceType = receiptResourceType;
      basePayload.resourceId = receiptResourceId;
    } else {
      basePayload.checkNumber = receiptCheckNumber;
      basePayload.checkDueDate =
        convertToGregorian(receiptCheckDueDate);
      if (type === "receive") {
        basePayload.checkBankName = receiptCheckBankName;
      } else {
        basePayload.checkbookId = receiptCheckbookId;
      }
    }

    confirmReceiptSubmit(basePayload);
  };

  const confirmReceiptSubmit = async (payload: any) => {
    if (!payload) return;
    setSubmittingReceipt(true);
    const isReceive = payload.type === "receive";
    const isCheck = payload.method === "check";

    startAppProcessing(
      isCheck
        ? (isReceive ? "شروع فرآیند دریافت چک..." : "شروع فرآیند پرداخت چک...")
        : (isReceive ? "شروع فرآیند ثبت رسید دریافت..." : "شروع فرآیند ثبت رسید پرداخت...")
    );

    const rollbackActions: (() => Promise<void>)[] = [];
    try {
      updateAppProcessing("مرحله ۱ از ۳: اعتبارسنجی اطلاعات مالی و طرف‌حساب...");

      const txPayload = {
        ...payload,
        linkedInvoices: receiptLinkedInvoices,
        skipAccounting: payload.method === "check"
      };
      let createdReceiptObj: any = { ...payload };

      if (payload.method === "check") {
        updateAppProcessing(
          isReceive
            ? "مرحله ۲ از ۳: ثبت چک در دفتر چک‌های دریافتی..."
            : "مرحله ۲ از ۳: ثبت و تخصیص چک در دفتر چک‌های پرداختی..."
        );

        if (payload.type === "receive") {
          const savedCheck = await addReceivedCheck({
            checkNumber: payload.checkNumber,
            bankName: payload.checkBankName,
            branchName: "",
            amount: payload.amount,
            payerId: payload.personId,
            receiveDate: payload.date || payload.jalaliDate,
            dueDate: payload.checkDueDate,
            status: "received",
            description:
              payload.description ||
              `چک دریافتی شماره ${payload.checkNumber} (سررسید ${payload.checkDueDate}) بابت رسید ${payload.receiptNumber}`,
            receiptNumber: payload.receiptNumber,
          });
          createdReceiptObj.id = savedCheck.id;

          rollbackActions.push(async () => {
            await deleteReceivedCheck(savedCheck.id.toString());
          });
        } else {
          const blankCheck = issuedChecks.find((c: any) => c.status === 'blank' && c.checkbookId?.toString() === payload.checkbookId?.toString() && c.checkNumber === payload.checkNumber);
          
          let savedCheckId;
          const issuedCheckPayload = {
            checkbookId: payload.checkbookId,
            checkNumber: payload.checkNumber,
            amount: payload.amount,
            payeeId: payload.personId,
            issueDate: payload.date || payload.jalaliDate,
            dueDate: payload.checkDueDate,
            status: "issued",
            description:
              payload.description ||
              `چک صادره شماره ${payload.checkNumber} (سررسید ${payload.checkDueDate}) بابت رسید ${payload.receiptNumber}`,
            receiptNumber: payload.receiptNumber,
          };
          
          if (blankCheck) {
            const originalBlankCheck = { ...blankCheck };
            await updateIssuedCheck(blankCheck.id.toString(), { ...blankCheck, ...issuedCheckPayload, status: "issued" });
            savedCheckId = blankCheck.id;

            rollbackActions.push(async () => {
              await updateIssuedCheck(blankCheck.id.toString(), originalBlankCheck);
            });
          } else {
            const savedCheck = await addIssuedCheck(issuedCheckPayload);
            savedCheckId = savedCheck.id;

            rollbackActions.push(async () => {
              await deleteIssuedCheck(savedCheck.id.toString());
            });
          }
        }
        const savedTx = await addTransaction(txPayload as any);
        createdReceiptObj = savedTx;

        rollbackActions.push(async () => {
          await deleteTransaction(savedTx.id.toString());
        });
      } else {
        updateAppProcessing("مرحله ۲ از ۳: ثبت تراکنش و به‌روزرسانی نقد/بانک...");

        const savedTx = await addTransaction(txPayload as any);
        createdReceiptObj = savedTx;

        rollbackActions.push(async () => {
          await deleteTransaction(savedTx.id.toString());
        });
      }

      updateAppProcessing("مرحله ۳ از ۳: تسویه فاکتورهای مرتبط و به‌روزرسانی مانده حساب...");

      // Update actual invoices payment status and paid amount out of linkedInvoices
      const linkedEntries = Object.entries(receiptLinkedInvoices);
      if (linkedEntries.length > 0) {
        await Promise.all(
          linkedEntries.map(async ([invId, amount]) => {
            const inv = invoices.find((i) => i.id.toString() === invId);
            if (inv && amount > 0) {
              const originalInv = { ...inv };
              const newPaid = (inv.paidAmount || 0) + amount;
              const newStatus =
                newPaid >= (inv.totalAmount || 0) ? "paid" : "partial";
              await updateInvoice(inv.id, {
                ...inv,
                paidAmount: newPaid,
                paymentStatus: newStatus,
              }, true);

              rollbackActions.push(async () => {
                await updateInvoice(inv.id, originalInv, true);
              });
            }
          })
        );
      }

      const typeTmp = payload.type;

      setReceiptPersonId("");
      setReceiptAmount("");
      setReceiptResourceType("bank");
      setReceiptResourceId("");
      setReceiptCheckNumber("");
      setReceiptCheckBankName("");
      setReceiptCheckbookId("");
      setReceiptCheckDueDate(new Date());
      setReceiptMethod("cash");
      setReceiptDescription("");
      setReceiptNote("");
      setReceiptDate(new Date());
      setReceiptLinkedInvoices({});
      setPreviewReceiptData(null);
      setReceiptPersonSearchText("");
      
      localStorage.removeItem("receipt_draft");
      setReceiptHasDraft(false);

      setLastCreatedReceipt(createdReceiptObj);
      setReceiptSuccessMsg(
        typeTmp === "receive"
          ? "رسید دریافت با موفقیت صادر شد"
          : "رسید پرداخت با موفقیت صادر شد",
      );
      if (storeSettings?.notify_on_receipt) {
        const person = persons.find(
          (p) => p.id === payload.personId,
        );
        if (person && person.phone) {
          const amt =
            typeof formatNumber === "function"
              ? formatNumber(payload.amount)
              : payload.amount;
          const isRec = typeTmp === "receive";
          let msg = `${person.name} گرامی، رسید ${isRec ? "دریافت از" : "پرداخت به"} شما به مبلغ ${amt} ${storeSettings?.currency || "تومان"} با موفقیت ثبت شد.`;
          if (storeSettings?.smsTemplateReceipt) {
            msg = storeSettings.smsTemplateReceipt
              .replace(/{name}/g, person.name)
              .replace(/{amount}/g, String(amt))
              .replace(
                /{receipt_number}/g,
                String(createdReceiptObj?.receiptNumber || ""),
              )
              .replace(/{date}/g, formatDateDisplay(new Date(), storeSettings?.calendarType));
          }
          sendNotification(msg, person.phone, storeSettings?.notify_method);
        }
      }

      checkDebtThreshold(payload.personId).catch(console.error);
      
      updateAppProcessing("عملیات با موفقیت انجام شد...");
      await new Promise(resolve => setTimeout(resolve, 20));
      
    } catch (err: any) {
      console.error("Error submitting receipt, rolling back operations...", err);
      // Run rollback operations in reverse order
      for (let i = rollbackActions.length - 1; i >= 0; i--) {
        try {
          await rollbackActions[i]();
        } catch (rErr) {
          console.error("Error executing rollback action:", rErr);
        }
      }
      customAlert(`خطا در ثبت رسید: ${err.message || "خطای ارتباط با سرور رخ داد"}`);
    } finally {
      setSubmittingReceipt(false);
      stopAppProcessing();
    }
  };

const handleEditReceiptByCheck = (check: any, type: 'issued' | 'received') => {
    const txType = type === 'issued' ? 'pay' : 'receive';
    let tx;
    if (check.receiptNumber) {
      tx = transactions.find((t) => t.type === txType && String(t.receiptNumber) === String(check.receiptNumber));
      if (!tx) {
        tx = transactions.find((t) => t.type === txType && t.method === 'check' && String(t.checkNumber) === String(check.checkNumber));
      }
    } else {
      tx = transactions.find((t) => t.type === txType && t.method === 'check' && String(t.checkNumber) === String(check.checkNumber));
    }
    
    if (tx) {
      setEditingReceipt(tx);
      setIsEditReceiptModalOpen(true);
    } else {
      customAlert("رسید مرتبط با این چک یافت نشد.");
    }
  };

const handleSaveReceipt = async (updatedFields: any) => {
    if (!editingReceipt) return;
    try {
      await updateTransaction(editingReceipt.id, updatedFields);

      // Keep related checks in sync
      if (editingReceipt.method === "check") {
        const checkNum = editingReceipt.checkNumber;
        const receiptNo = editingReceipt.receiptNumber;
        if (editingReceipt.type === "receive") {
          const matchedCheck = receivedChecks.find(
            (c) => c.receiptNumber === receiptNo || c.checkNumber === checkNum,
          );
          if (matchedCheck) {
            await updateReceivedCheck(matchedCheck.id, {
              ...matchedCheck,
              checkNumber:
                updatedFields.checkNumber || matchedCheck.checkNumber,
              bankName: updatedFields.checkBankName || matchedCheck.bankName,
              amount: updatedFields.amount || matchedCheck.amount,
              payerId: updatedFields.personId || matchedCheck.payerId,
              dueDate: updatedFields.checkDueDate || matchedCheck.dueDate,
              receiveDate: updatedFields.jalaliDate || matchedCheck.receiveDate,
            });
          }
        } else {
          const matchedCheck = issuedChecks.find(
            (c) => c.receiptNumber === receiptNo || c.checkNumber === checkNum,
          );
          if (matchedCheck) {
            await updateIssuedCheck(matchedCheck.id, {
              ...matchedCheck,
              checkNumber:
                updatedFields.checkNumber || matchedCheck.checkNumber,
              checkbookId:
                updatedFields.checkbookId || matchedCheck.checkbookId,
              amount: updatedFields.amount || matchedCheck.amount,
              payeeId: updatedFields.personId || matchedCheck.payeeId,
              dueDate: updatedFields.checkDueDate || matchedCheck.dueDate,
              issueDate: updatedFields.jalaliDate || matchedCheck.issueDate,
            });
          }
        }
      }

      showNotification(
        "تغییرات با موفقیت روی رسید ذخیره گردید و اسناد مربوطه بروز شدند.",
        "success",
      );
      checkDebtThreshold(editingReceipt.personId).catch(console.error);
    } catch (err) {
      console.error(err);
      customAlert("خطا در بروزرسانی سند رسید.");
    }
  };

const handleSubmitSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salaryPersonId || !salaryBaseAmount) {
      customAlert("لطفا کارمند و مبلغ حقوق پایه را تعیین کنید");
      return;
    }

    if (
      !window.confirm(
        "آیا از ثبت و صدور این فیش حقوقی اطمینان دارید؟ در صورت تایید، سند و گردش مالی به ثبت می‌رسد.",
      )
    )
      return;

    const base = Number(salaryBaseAmount) || 0;
    const housing = Number(salaryHousingAllowance) || 0;
    const grocery = Number(salaryGroceryAllowance) || 0;
    const otherAllow = Number(salaryOtherAllowances) || 0;
    const insDeduct = Number(salaryInsuranceDeduction) || 0;
    const taxDeduct = Number(salaryTaxDeduction) || 0;
    const penaltyDeduct = Number(salaryOtherDeductions) || 0;

    const netSalary =
      base +
      housing +
      grocery +
      otherAllow -
      (insDeduct + taxDeduct + penaltyDeduct);

    if (netSalary <= 0) {
      customAlert("مبلغ خالص حقوق باید بزرگتر از صفر باشد");
      return;
    }

    setSubmittingSalary(true);
    startAppProcessing('شروع فرآیند ثبت سند حقوق و دستمزد...');
    await new Promise(r => setTimeout(r, 20));
    try {
      updateAppProcessing('مرحله ۱ از ۴: محاسبه کارکرد، کسورات و مزایای کارمند...');
      await new Promise(r => setTimeout(r, 20));

      const p = persons.find(
        (item) => item.id.toString() === salaryPersonId.toString(),
      );
      const personName = p ? getPersonDisplayName(p) : "کارمند";

      // Build payslip breakdown to store in description as JSON string
      const pMonthName = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
      const mName = pMonthName[parseInt(salaryPeriodMonth, 10) - 1];
      const normalDescription = `سند حقوق ${mName} ماه ${salaryPeriodYear}`;
      const payslipObj: any = {
        isPayslip: true,
        employeeName: personName,
        personId: salaryPersonId,
        periodMonth: salaryPeriodMonth,
        periodYear: salaryPeriodYear,
        base,
        allowances: {
          housing,
          grocery,
          other: otherAllow,
        },
        deductions: {
          insurance: insDeduct,
          tax: taxDeduct,
          penalty: penaltyDeduct,
        },
        netSalary,
        userNote: salaryDescription || "سند حقوق و دستمزد کارمند",
      };
      const payloadDescription = normalDescription;

      updateAppProcessing('مرحله ۲ از ۴: شماره‌گذاری خودکار و ثبت تراکنش حقوق...');
      await new Promise(r => setTimeout(r, 20));

      // Auto-assign receipt number for salary
      const salaryPrefix =
        storeSettings.prefix_salary !== undefined
          ? storeSettings.prefix_salary
          : "PAY-";

      const startNumStr =
        storeSettings.start_salary ||
        storeSettings.invoiceStartNumber ||
        "1000";
      const lenStr =
        storeSettings.len_salary || storeSettings.invoiceNumberLength || "6";

      const startNum = parseInt(startNumStr, 10);
      const numLength = Math.max(1, parseInt(lenStr, 10));

      let maxNum = startNum - 1;

      const existingRelated = (transactions || []).filter(
        (t: any) => t.type === "salary" && t.receiptNumber,
      );
      if (existingRelated.length > 0) {
        const nums = existingRelated.map((t: any) => {
          let numStr = String(t.receiptNumber);
          if (numStr.startsWith(salaryPrefix)) {
            numStr = numStr.substring(salaryPrefix.length);
          }
          const match = numStr.match(/\d+/);
          return match ? parseInt(match[0], 10) : 0;
        });
        const maxExisting = Math.max(...nums);
        if (maxExisting > maxNum) maxNum = maxExisting;
      }

      const nextNum = maxNum + 1;
      const receiptNumber = `${salaryPrefix}${String(nextNum).padStart(numLength, "0")}`;

      const payload = {
        type: "salary",
        receiptNumber,
        personId: salaryPersonId,
        amount: netSalary,
        date:
          convertToGregorian(salaryDate),
                  
        resourceType: "none",
        resourceId: 0,
        description: payloadDescription,
      };
      const savedTx = await addTransaction(payload as any);
      payslipObj.transactionId = savedTx.id;
      payslipObj.receiptNumber = receiptNumber;
      payslipObj.date = payload.date;

      updateAppProcessing('مرحله ۳ از ۴: صدور فیش حقوقی پرسنل در سیستم...');
      await new Promise(r => setTimeout(r, 20));
      const savedPayslip = await addPayslip(payslipObj);
      setPayslips([...payslips, savedPayslip]);

      updateAppProcessing('مرحله ۴ از ۴: بروزرسانی کاردکس کارمند و مانده حساب...');
      await new Promise(r => setTimeout(r, 20));

      setSalarySuccessMsg("سند حقوق و دستمزد با موفقیت صادر شد.");
      setSalaryBaseAmount("");
      setSalaryHousingAllowance("");
      setSalaryGroceryAllowance("");
      setSalaryOtherAllowances("");
      setSalaryInsuranceDeduction("");
      setSalaryTaxDeduction("");
      setSalaryOtherDeductions("");
      setSalaryDescription("");
      setSalaryPeriodMonth("1");
      setSalaryPeriodYear("1403");
      setSalaryResourceId("");

    } catch (error: any) {
      console.error("Error submitting salary", error);
      customAlert(error.message || "خطای سیستمی رخ داد");
    } finally {
      setSubmittingSalary(false);
      stopAppProcessing();
    }
  };

const handleDeleteTransaction = async (id: number | string) => {
    const tx = transactions.find((t) => t.id.toString() === id.toString());
    
    let typeLabel = "سند";
    if (tx?.type === "receive") typeLabel = "دریافت";
    else if (tx?.type === "pay") typeLabel = "پرداخت";
    else if (tx?.type === "salary") typeLabel = "حقوق و دستمزد";
    else if (tx?.type === "cost") typeLabel = "هزینه";

    const personName = persons.find(p => p.id === tx?.personId)?.name;
    const accountName = accounts.find(a => a.id === tx?.accountId)?.title || accounts.find(a => a.id === tx?.accountId)?.bankName;
    const boxName = cashboxes.find(b => b.id === tx?.cashboxId)?.name;
    
    const details = tx ? (
      <div className="flex flex-col gap-2">
        <div><strong>نوع سند:</strong> {typeLabel}</div>
        {personName && <div><strong>شخص:</strong> {personName}</div>}
        {accountName && <div><strong>حساب بانکی:</strong> {accountName}</div>}
        {boxName && <div><strong>صندوق:</strong> {boxName}</div>}
        {tx.amount !== undefined && <div><strong>مبلغ:</strong> {Number(tx.amount).toLocaleString()} ریال</div>}
        <div><strong>تاریخ:</strong> {tx.date}</div>
        {tx.description && <div><strong>توضیحات:</strong> {tx.description}</div>}
      </div>
    ) : undefined;

    confirmAction(
      "آیا از حذف این سند اطمینان دارید؟ مانده حساب مربوطه اصلاح خواهد شد.",
      async () => {
        try {
          if (tx && tx.method === "check" && tx.checkNumber) {
            if (tx.type === "receive") {
              const rc = receivedChecks.find(
                (c) =>
                  c.checkNumber === tx.checkNumber && c.payerId === tx.personId,
              );
              if (rc) await deleteReceivedCheck(rc.id.toString());
            } else {
              const ic = issuedChecks.find(
                (c) =>
                  c.checkNumber === tx.checkNumber && c.payeeId === tx.personId,
              );
              if (ic) await deleteIssuedCheck(ic.id.toString());
            }
          }
          await deleteTransaction(id.toString());
        } catch (error) {
          console.error("Error deleting transaction", error);
        }
      },
      details
    );
  };

const handleDeleteCashbox = async (id: number | string) => {
    if (!confirm("آیا از حذف این صندوق اطمینان دارید؟")) return;
    try {
      await deleteCashbox(id.toString());
      await fetchCashboxes();
    } catch (error) {
      console.error("Error deleting cashbox", error);
    }
  };

const handleDeleteWarehouse = async (id: number | string) => {
    if (!confirm("آیا از حذف این انبار اطمینان دارید؟")) return;
    try {
      await deleteWarehouse(id.toString());
      await fetchWarehouses();
    } catch (error) {
      console.error("Error deleting warehouse", error);
    }
  };

const handleRecalculateStocks = async () => {
    try {
      setRecalculating(true);
      await recalculateAllWarehouseStocks();
      const stocks = await getWarehouseStocks();
      setWarehouseStocks(stocks as any);

      const fetchedProds = await getProducts();
      setProducts(fetchedProds as any);

      showNotification(
        "موجودی انبارها و کارت‌های کالا با موفقیت بر اساس اسناد فاکتورها، ورود و خروج‌ها محاسبه مجدد شد.",
        "success",
      );
    } catch (e) {
      console.error(e);
      showNotification("خطا در محاسبه مجدد موجودی انبار.", "error");
    } finally {
      setRecalculating(false);
    }
  };

const handleEditWarehouse = (w: Warehouse) => {
    setEditingWarehouseId(w.id);
    setNewWarehouseName(w.name);
    setNewWarehouseManager(w.manager || "");
    setNewWarehouseLocation(w.location || "");
    setNewWarehouseIsActive(w.isActive !== undefined ? w.isActive : true);
    setIsWarehouseModalOpen(true);
  };

const handleToggleProductActive = async (productId: string | number, currentActiveState: boolean) => {
    try {
      await updateProduct(productId.toString(), { isActive: !currentActiveState });
      
      showNotification(
        `وضعیت کالا به ${!currentActiveState ? "فعال" : "غیرفعال"} تغییر یافت.`,
        "success"
      );
    } catch (error) {
      console.error("Error toggling product active status", error);
      customAlert("خطا در تغییر وضعیت کالا");
    }
  };

const handleEditProduct = (p: Product | any) => {
    setEditingProductId(p.id);
    setIsProductModalOpen(true);
  };

const handleDuplicateProduct = (p: Product | any) => {
    setEditingProductId(null);
    setDuplicateProductId(p.id);
    setIsProductModalOpen(true);
  };

const handleAIProductsAdd = async (
    selectedProducts: any[],
    categoryId: string,
  ) => {
    try {
      let isSuccess = false;
      for (const prod of selectedProducts) {
        const newProduct = {
          name: prod.name,
          description: prod.description || "",
          price: prod.price || 0,
          type: "product",
          categoryId: categoryId || "",
          code: "",
          barcode: "",
          purchasePrice: 0,
          stock: 0,
          minStock: 0,
          unit: "عدد",
          secondaryUnit: "",
          unitRatio: 1,
        };
        await addProduct(newProduct as any);
        isSuccess = true;
      }
      if (isSuccess) {
        
        setSuccessMsg("کالاهای انتخاب شده با موفقیت افزوده شدند.");
      }
    } catch (e: any) {
      customAlert("خطا در ثبت کالاها: " + e.message);
    }
  };

const handleSavePersonRole = async () => {
    if (!newPersonRoleName.trim() || !newPersonRoleCode.trim()) {
      customAlert("تمامی فیلدها الزامی است");
      return;
    }
    try {
      if (editingPersonRoleId) {
        await updatePersonRole(editingPersonRoleId, {
          name: newPersonRoleName,
          code: newPersonRoleCode,
        });
      } else {
        await addPersonRole({
          name: newPersonRoleName,
          code: newPersonRoleCode,
        });
      }
      await fetchPersonRoles();
      setNewPersonRoleName("");
      setNewPersonRoleCode("");
      setEditingPersonRoleId(null);
    } catch (e) {
      console.error("Error saving role", e);
    }
  };

const handleDeletePersonRole = async (id: string) => {
    if (["customer", "supplier", "employee"].includes(id)) {
      customAlert("نقش‌های سیستمی پیش‌فرض قابل حذف نیستند.");
      return;
    }
    confirmAction("آیا از حذف این نقش اطمینان دارید؟", async () => {
      try {
        await deletePersonRole(id);
        await fetchPersonRoles();
      } catch (e) {
        console.error("Error deleting role", e);
      }
    });
  };

const handleSavePersonGroup = async () => {
    if (!newPersonGroupName.trim()) {
      customAlert("نام گروه الزامی است");
      return;
    }
    try {
      if (editingPersonGroupId) {
        await updatePersonGroup(editingPersonGroupId, {
          name: newPersonGroupName,
          color: newPersonGroupColor,
        });
      } else {
        await addPersonGroup({
          name: newPersonGroupName,
          color: newPersonGroupColor,
        });
      }
      await fetchPersonGroups();
      setNewPersonGroupName("");
      setNewPersonGroupColor("indigo");
      setEditingPersonGroupId(null);
    } catch (e) {
      console.error("Error saving group", e);
    }
  };

const handleDeletePersonGroup = async (id: string) => {
    confirmAction(
      "آیا از حذف این گروه اطمینان دارید؟ تمامی اشخاص این گروه فاقد گروه خواهند شد.",
      async () => {
        try {
          await deletePersonGroup(id);

          // Remove group from all persons in this group
          const affectedPersons = (persons || []).filter((p) => p.group === id);
          for (const p of affectedPersons) {
            await updatePerson(p.id as string, { ...p, group: "" });
          }

          await fetchPersonGroups();
          
        } catch (e) {
          console.error("Error deleting group", e);
        }
      },
    );
  };

const handleEditPerson = (p: Person) => {
    setEditingPersonId(p.id);
    setNewPersonType(p.personType);
    setNewPersonGender((p.gender as any) || "none");
    setNewPersonTitle(p.title || "");
    setNewPersonAlias(p.alias || "");
    setNewPersonFirstName(p.firstName || "");
    setNewPersonLastName(p.lastName || "");
    setNewPersonCompanyName(p.companyName || "");
    setNewPersonFatherName(p.fatherName || "");
    setNewPersonNationalId(p.nationalId || "");
    setNewPersonAccountingCode(p.accountingCode || "");
    setNewPersonAddress(p.address || "");
    setNewPersonImage(p.imageUrl || "");
    setNewPersonPhone(p.phone || "");
    setNewPersonContacts(p.contacts || []);
    setNewPersonGroup(p.group || "");
    setNewPersonRole(p.role);
    setNewPersonTaxNumber(p.taxNumber || "");
    setNewPersonRegistrationNumber(p.registrationNumber || "");
    setNewPersonRoles(p.roles || (p.role ? [p.role] : []));
    setNewPersonCategories(p.categories || []);

    setNewPersonProvince(p.province || "");
    setNewPersonCity(p.city || "");
    setNewPersonIsActive(p.isActive !== undefined ? p.isActive : true);
    setNewPersonRegistrationDate(
      p.registrationDate ? new Date(p.registrationDate) : new Date(),
    );
    setNewPersonInitialBalance(p.initialBalance?.toString() || "");
    setNewPersonInitialBalanceType(p.initialBalanceType || "settled");
    setNewPersonCreditLimit(p.creditLimit?.toString() || "");
    setPersonModalActiveTab("basic");
    setIsPersonModalOpen(true);
  };

const handleEditAccount = (acc: Account) => {
    setEditingAccountId(acc.id);
    setIsAccountModalOpen(true);
  };

const handleEditCashbox = (box: Cashbox) => {
    setEditingCashboxId(box.id);
    setIsCashboxModalOpen(true);
  };

const fetchSettings = async () => {
    try {
      const data = await getStoreSettings();
      const docCounters = await getLocalData<Record<string, number>>('doc_counters', {});
      if (data && (data as any).isSetup) {
        const savedData = data as any;
        const mergedSettings = {
          ...savedData,
          doc_counters: docCounters,
          theme: savedData.theme ?? "classic",
          prefix_warehouse_receipt:
            savedData.prefix_warehouse_receipt ?? "REC-",
          prefix_warehouse_remittance:
            savedData.prefix_warehouse_remittance ?? "REM-",
          prefix_purchase: savedData.prefix_purchase ?? "PUR-",
          prefix_sale: savedData.prefix_sale ?? "INV-",
          prefix_receive_receipt: savedData.prefix_receive_receipt ?? "RD-",
          prefix_pay_receipt: savedData.prefix_pay_receipt ?? "PD-",
        };
        setStoreSettings(mergedSettings);
        globalDateFormatter.updateConfig({
          dateFormat: mergedSettings.dateFormat,
          dateSeparator: mergedSettings.dateSeparator,
          dateYearFormat: mergedSettings.dateYearFormat,
          showTime: mergedSettings.dateShowTime,
          timeFormat: mergedSettings.dateTimeFormat,
          calendarType: mergedSettings.calendarType,
        });
        setSettingsForm(mergedSettings);
        setInvoiceCurrency(mergedSettings.currency || "تومان");
        setExchangeRate(1);
        setExchangeRateInput("1");
        setRequiresInitSetup(false);
        // Apply store-wide visual settings if set in Settings menu
        if (mergedSettings.menuLayout) setMenuLayout(mergedSettings.menuLayout);
        if (mergedSettings.isFullWidth !== undefined) setIsFullWidth(mergedSettings.isFullWidth);
      } else {
        setRequiresInitSetup(true);
      }
    } catch (error) {
      console.error("Error fetching settings", error);
    }
  };

const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingSettings(true);
    try {
      const payload = { ...settingsForm, isSetup: true };
      const counters = payload.doc_counters || {};
      delete payload.doc_counters;
      await saveStoreSettings(payload as any);
      // Also update the database name in global businesses table
      try {
        const activeStoreId = localStorage.getItem('activeStoreId') || 'default';
        await fetch(`/api/databases/${activeStoreId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: payload.storeName || 'کسب و کار اصلی' })
        });
      } catch (err) {
        console.error('Failed to sync business name', err);
      }
      await saveLocalData('doc_counters', counters);
      await fetchSettings();
      setSuccessMsg("تنظیمات فروشگاه با موفقیت ذخیره شد");
      setRequiresInitSetup(false);
    } catch (error) {
      console.error("Error saving settings", error);
    } finally {
      setSubmittingSettings(false);
    }
  };

const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        customAlert("حجم تصویر نباید بیشتر از 2 مگابایت باشد.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettingsForm({ ...settingsForm, logoUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

const handleCurrencyChange = (newCurrency: string) => {
    const oldRate = exchangeRate;
    const newRate = getDefaultExchangeRate(newCurrency, storeSettings.currency);
    setInvoiceCurrency(newCurrency);
    setExchangeRate(newRate);
    setExchangeRateInput(newRate.toString());

    if (oldRate > 0 && newRate > 0) {
      setItems((prevItems) =>
        prevItems.map((item) => {
          const updatedPrice = item.unitPrice * (oldRate / newRate);
          const subtotal = item.quantity * updatedPrice;
          const total = subtotal * (1 - item.discountPercent / 100);
          return {

            ...item,
            unitPrice: Number(updatedPrice.toFixed(4)),
            totalPrice: Number(total.toFixed(4)),
          };
        }),
      );
    }
  };

const handleSourceInvoiceChange = (invoiceId: string | number) => {
    setSourceInvoiceId(invoiceId);
    if (!invoiceId) {
      setInvoiceDescription("");
    setInvoiceNote("");
      return;
    }

    const sourceInv = invoices.find(
      (i) => i.id.toString() === invoiceId.toString(),
    );
    if (sourceInv) {
      if (activeTab === "create_warehouse_doc") {
        const dbDraftsStr = localStorage.getItem("drafts");
        let drafts = dbDraftsStr ? JSON.parse(dbDraftsStr) : {};
        delete drafts[invoiceId];
        localStorage.setItem("drafts", JSON.stringify(drafts));
      }

      if (sourceInv.customerId) setCustomerId(sourceInv.customerId);
      if (sourceInv.currency) {
        setInvoiceCurrency(sourceInv.currency);
        setExchangeRate(sourceInv.exchangeRate || 1);
        setExchangeRateInput(String(sourceInv.exchangeRate || 1));
      }
      if (sourceInv.items && Array.isArray(sourceInv.items)) {
        const isRemittance =
          activeTab === "create_warehouse_doc" &&
          invoiceType === "warehouse_remittance";

        // Calculate previously received/remitted amounts
        const pastDocs = (invoices || []).filter(
          (i) =>
            i.sourceInvoiceId?.toString() === invoiceId.toString() &&
            (isRemittance
              ? i.type === "warehouse_remittance"
              : i.type === "warehouse_receipt") && i.status !== "voided" && !i.isDeleted,
        );
        const processedAmounts: Record<string, number> = {};
        pastDocs.forEach((doc) => {
          if (doc.items) {
            doc.items.forEach((rt: any) => {
              const key = String(rt.productId || rt.productName || "");
              if (!key) return;
              if (!processedAmounts[key]) processedAmounts[key] = 0;
              processedAmounts[key] += Number(rt.quantity) || 0;
            });
          }
        });

        const remainingItems = sourceInv.items
          .map((it: any) => {
            const key = String(it.productId || it.productName || "");
            const processed = key ? processedAmounts[key] || 0 : 0;
            const remaining = (Number(it.quantity) || 0) - processed;
            return {

              ...it,
              id: generateId(),
              maxQuantity: remaining > 0 ? remaining : 0, // Save max
              quantity: remaining > 0 ? remaining : 0,
              warehouseId: "", // User will select destination warehouse
            };
          })
          .filter((it: any) => it.quantity > 0);

        setItems(remainingItems);
      }
    }
  };

const handleExchangeRateChange = (newRate: number) => {
    const oldRate = exchangeRate;
    setExchangeRate(newRate);

    if (oldRate > 0 && newRate > 0) {
      setItems((prevItems) =>
        prevItems.map((item) => {
          const updatedPrice = item.unitPrice * (oldRate / newRate);
          const subtotal = item.quantity * updatedPrice;
          const total = subtotal * (1 - item.discountPercent / 100);
          return {

            ...item,
            unitPrice: Number(updatedPrice.toFixed(4)),
            totalPrice: Number(total.toFixed(4)),
          };
        }),
      );
    }
  };

useEffect(() => {
    if (storeSettings?.storeName) {
      document.title = storeSettings.storeName;
    }
  }, [storeSettings?.storeName]);

useEffect(() => {
    const font =
      activeTab === "settings" && settingsForm?.fontFamily
        ? settingsForm.fontFamily
        : storeSettings?.fontFamily || "IRANYekanXFaNum";
    document.documentElement.style.setProperty(
      "--font-sans",
      `"${font}", "Vazirmatn", ui-sans-serif, system-ui, sans-serif`,
    );
    document.body.style.fontFamily = `"${font}", "Vazirmatn", sans-serif`;
  }, [settingsForm?.fontFamily, activeTab, storeSettings?.fontFamily]);

const fetchChecks = async () => {
    try {
      const cb = await getCheckbooks();
      setCheckbooks(cb as any);
      const ic = await getIssuedChecks();
      setIssuedChecks(ic as any);
      const rc = await getReceivedChecks();
      setReceivedChecks(rc as any);
    } catch (err) {
      console.error("fetchChecks error", err);
    }
  };

const fetchSmsMessages = async () => {
    try {
      const msgs = await getSmsMessages();
      setSmsMessages(msgs || []);
    } catch (err) {
      console.error("fetchSmsMessages error", err);
    }
  };


  const fetchLoansAndInstallments = async () => {
    try {
      const [lData, iData] = await Promise.all([getLoans(), getInstallments()]);
      setLoans(lData);
      setInstallments(iData);
    } catch (e) {
      console.error("Error fetching loans and installments", e);
    }
  };

  
  useEffect(() => {
    const handleDataChanged = (e: any) => {
        // debounce fetch
        if ((window as any)._dataChangeTimeout) {
            clearTimeout((window as any)._dataChangeTimeout);
        }
        (window as any)._dataChangeTimeout = setTimeout(() => {
            fetchDataSilent();
        }, 300);
    };
    if (typeof window !== 'undefined') {
        window.addEventListener('app_data_changed', handleDataChanged);
        return () => window.removeEventListener('app_data_changed', handleDataChanged);
    }
  }, []);

  const fetchDataSilent = async () => {
    try {
      await Promise.all([
        fetchPersonRoles(),
        fetchPersonGroups(),
        fetchPersons(),
        fetchPersonOpeningBalances(),
        fetchProducts(),
        fetchAccounts(),
        fetchCashboxes(),
        fetchWarehouses(),
        fetchSettings(),
        fetchTransactions(),
        fetchAccountingDocuments(),
        fetchChecks(),
        fetchSmsMessages(),
        fetchFinancialYearInfo(),
        fetchLoansAndInstallments(),
      ]);

      await fetchInvoices();
      await autoGenerateRentCommitments();
    } catch (error) {
      console.error("Error silently fetching data:", error);
    }
  };

const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchPersonRoles(),
        fetchPersonGroups(),
        fetchPersons(),
        fetchPersonOpeningBalances(),
        fetchProducts(),
        fetchAccounts(),
        fetchCashboxes(),
        fetchWarehouses(),
        fetchSettings(),
        fetchTransactions(),
        fetchAccountingDocuments(),
        fetchChecks(),
        fetchSmsMessages(),
        fetchFinancialYearInfo(),
        fetchLoansAndInstallments(),
      ]);

      
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

useEffect(() => {
    // Only fetch data
    if (user) {
      fetchData();
    }
  }, [user]);

const handleAddItem = () => {
    setItems((prevItems) => [
      ...prevItems,
      {
        id: generateId(),
        productId: "",
        productName: "",
        quantity: 1,
        unitPrice: 0,
        discountPercent: 0,
        totalPrice: 0,
      },
    ]);
  };

const handleRemoveItem = (id: string) => {
    setItems((items || []).filter((item) => item.id !== id));
  };

const getLastPriceForProduct = (
    productId: string | number,
    isPurchase: boolean,
  ) => {
    let lastPrice = 0;
    let latestDate = 0;
    const targetTypes = isPurchase
      ? ["purchase", "warehouse_receipt"]
      : ["sale", "warehouse_remittance"];

    // Use the invoice date if available, otherwise current date
    const currentInvoiceDate = date ? new Date(convertToGregorian(date)).getTime() : new Date().getTime();

    invoices.forEach((inv) => {
      if (targetTypes.includes(inv.type) && inv.items && inv.status !== 'voided' && !inv.isDeleted && inv.status !== 'draft' && !inv.isDraft) {
        inv.items.forEach((item: any) => {
          if (item.productId?.toString() === productId.toString()) {
            const invDate = new Date(inv.date || inv.createdAt || 0).getTime();
            // Ensure the invoice date is before or equal to the current invoice date
            if (invDate <= currentInvoiceDate && invDate > latestDate && (item.unitPrice || 0) > 0) {
              latestDate = invDate;
              // Normalize unit prices assuming the standard is the same unless exchange rate applies
              const rate = inv.exchangeRate || 1;
              lastPrice = (Number(item.unitPrice) || 0) * rate;
            }
          }
        });
      }
    });
    return lastPrice;
  };

const handleFastAddProduct = (
    productIdStr: string,
    forceProductObj?: any,
  ) => {
    if (!productIdStr) return;
    const product =
      forceProductObj || products.find((p) => p.isActive !== false && p.id.toString() === productIdStr);
    if (!product) return;

    if (activeTab === "create_warehouse_doc" && product.type === "service") {
      customAlert("کالای خدماتی فاقد عملیات انبارداری و مدیریت تعداد است.");
      return;
    }

    const isPurchase =
      activeTab === "create_purchase" ||
      (activeTab === "create_warehouse_doc" &&
        invoiceType === "warehouse_receipt");
    let pPrice = getLastPriceForProduct(product.id, isPurchase);
    if (!pPrice || pPrice === 0) {
      pPrice = isPurchase && product.purchasePrice
        ? product.purchasePrice
        : product.price;
    }
    const convertedPrice = exchangeRate > 0 ? pPrice / exchangeRate : pPrice;
    const unitPriceRounded = Number(convertedPrice.toFixed(4));

    setItems((currentItems) => {
      // Check if it exists
      const existingItemIndex = currentItems.findIndex(
        (i) => i.productId?.toString() === productIdStr,
      );
      if (existingItemIndex > -1 && !storeSettings.allowDuplicateInvoiceRows) {
        const newItems = [...currentItems];
        newItems[existingItemIndex].quantity =
          Number(newItems[existingItemIndex].quantity || 0) + 1;
        newItems[existingItemIndex].totalPrice = Math.max(
          0,
          newItems[existingItemIndex].quantity *
            newItems[existingItemIndex].unitPrice *
            (1 - newItems[existingItemIndex].discountPercent / 100),
        );
        return newItems;
      } else {
        return [
          ...currentItems,
          {
            id: generateId(),
            productId: productIdStr,
            productName: product.name,
            quantity: 1,
            unitPrice: unitPriceRounded,
            discountPercent: 0,
            totalPrice: unitPriceRounded,
            selectedUnit: product.unit || "",
            unitRatio: product.unitRatio || 1,
            isSecondaryUnit: false,
          },
        ];
      }
    });
  };

const handleFastBarcodeScan = (code: string) => {
    const product = products.find((p) => p.isActive !== false && (p.barcode === code || p.code === code));
    if (product) {
      playAudioFeedback("scan" as any);
      handleFastAddProduct(String(product.id), product);
      showNotification(`کالا "${product.name}" اضافه شد`, "success", true);
    } else {
      playAudioFeedback("scan_error" as any);
      showNotification("کالایی با این بارکد/کد یافت نشد", "error", true);
    }
  };

const handleItemChange = (
    id: string,
    field: keyof InvoiceItem,
    value: any,
  ) => {
    setItems(
      (items || []).map((item) => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };

          // Special handling for product selection to auto-fill details
          if (field === "productId" && value !== "") {
            const product = products.find(
              (p) => p.id.toString() === String(value),
            );
            if (product) {
              if (
                activeTab === "create_warehouse_doc" &&
                product.type === "service"
              ) {
                customAlert(
                  "کالای خدماتی فاقد عملیات انبارداری و مدیریت تعداد است.",
                );
                return item;
              }
              updatedItem.productName = product.name;
              updatedItem.selectedUnit = product.unit || "";
              updatedItem.unitRatio = product.unitRatio || 1;
              updatedItem.isSecondaryUnit = false;

              const isPurchase =
                activeTab === "create_purchase" ||
                (activeTab === "create_warehouse_doc" &&
                  invoiceType === "warehouse_receipt");
              let pPrice = getLastPriceForProduct(product.id, isPurchase);
              if (!pPrice || pPrice === 0) {
                pPrice = isPurchase && product.purchasePrice
                  ? product.purchasePrice
                  : product.price;
              }
              const convertedPrice =
                exchangeRate > 0 ? pPrice / exchangeRate : pPrice;

              updatedItem.unitPrice = Number(convertedPrice.toFixed(4));
              const subtotal = convertedPrice * updatedItem.quantity;
              updatedItem.totalPrice = Math.max(
                0,
                subtotal * (1 - updatedItem.discountPercent / 100),
              );
            }
          }

          // Special handling for pricing calculation
          if (
            field === "quantity" ||
            field === "unitPrice" ||
            field === "discountPercent" ||
            field === "isSecondaryUnit"
          ) {
            const isSec =
              field === "isSecondaryUnit"
                ? Boolean(value)
                : Boolean(updatedItem.isSecondaryUnit);

            // If we toggled the unit type, adjust the unit price relative to base price
            if (field === "isSecondaryUnit" && updatedItem.productId) {
              const product = products.find(
                (p) => p.id.toString() === String(updatedItem.productId),
              );
              if (product) {
                updatedItem.selectedUnit = isSec
                  ? product.secondaryUnit || ""
                  : product.unit || "";
              }
            }

            let qty =
              field === "quantity"
                ? Number(value)
                : Number(updatedItem.quantity);
            const isWarehouseTab = activeTab === "create_warehouse_doc";
            if (isWarehouseTab && sourceInvoiceId) {
              const sourceInv = invoices.find(
                (i) => i.id.toString() === sourceInvoiceId.toString(),
              );
              if (sourceInv) {
                const pastDocs = (invoices || []).filter(
                  (i) =>
                    i.sourceInvoiceId?.toString() ===
                      sourceInvoiceId.toString() &&
                    (invoiceType === "warehouse_remittance"
                      ? i.type === "warehouse_remittance"
                      : i.type === "warehouse_receipt") && i.status !== "voided" && !i.isDeleted,
                );
                const processedAmounts: Record<string, number> = {};
                pastDocs.forEach((doc) => {
                  if (doc.items) {
                    doc.items.forEach((rt: any) => {
                      const key = String(rt.productId || rt.productName || "");
                      if (!key) return;
                      if (!processedAmounts[key]) processedAmounts[key] = 0;
                      processedAmounts[key] += Number(rt.quantity) || 0;
                    });
                  }
                });
                const key = String(
                  updatedItem.productId || updatedItem.productName || "",
                );
                const srcItem = sourceInv.items.find(
                  (si: any) => (si.productId || si.productName) === key,
                );
                if (srcItem) {
                  const processed = processedAmounts[key] || 0;
                  let maxQty = (Number(srcItem.quantity) || 0) - processed;
                  if (typeof updatedItem.maxQuantity !== "undefined") {
                    if (qty > updatedItem.maxQuantity)
                      qty = updatedItem.maxQuantity;
                  } else {
                    if (qty > maxQty) qty = maxQty;
                    updatedItem.maxQuantity = maxQty;
                  }
                }
              }
            } else if (
              isWarehouseTab &&
              typeof updatedItem.maxQuantity !== "undefined"
            ) {
              if (qty > updatedItem.maxQuantity) qty = updatedItem.maxQuantity;
            }
            updatedItem.quantity = qty;
            const price =
              field === "unitPrice"
                ? Number(value)
                : Number(updatedItem.unitPrice);
            const discPercent =
              field === "discountPercent"
                ? Number(value)
                : Number(updatedItem.discountPercent);

            const subtotal = qty * price;
            const total = subtotal * (1 - discPercent / 100);
            updatedItem.totalPrice = total > 0 ? total : 0;
          }

          return updatedItem;
        }
        return item;
      }),
    );
  };

const getPersonDisplayName = (person: any) => {
    if (!person) return "نامشخص";
    if (person.alias) return person.alias;
    if (person.name) return person.name;
    if (person.firstName || person.lastName) return `${person.firstName || ''} ${person.lastName || ''}`.trim();
    if (person.companyName) return person.companyName;
    return "نامشخص";
  };

const getPersonDisplayNameById = (personId: string | number | undefined) => {
    if (!personId) return "نامشخص";
    const person = persons.find((p) => p.id.toString() === personId.toString());
    return getPersonDisplayName(person);
  };

const renderPersonLink = (
    personId: string | number | undefined,
    fallbackName: string | undefined = undefined,
  ) => {
    let name = "نامشخص";
    if (personId) {
      name = getPersonDisplayNameById(personId);
    }
    if (name === "نامشخص" && fallbackName) {
      name = fallbackName;
    }

    if (!personId || name === "نامشخص") return <span>{name}</span>;
    return (
      <span
        className="cursor-pointer text-indigo-600 hover:text-indigo-800 transition-colors font-bold border-b border-dashed border-indigo-300 hover:border-indigo-600 pb-[1px]"
        onClick={(e) => {
          e.stopPropagation();
          setLedgerPersonId(personId);
          setActiveTab("person_ledger");
          setDrawerPersonId("");
          setViewingInvoice(null);
          setPreviewInvoiceData(null);
          setPreviewReceiptData(null);
          setViewingPayslip(null);
        }}
        title="مشاهده کارت حساب"
      >
        {name}
      </span>
    );
  };

const handleDeleteInvoice = async (id: string | number) => {
    const invoice = invoices.find((inv) => inv.id.toString() === id.toString());
    if (!invoice) return;

    const hasLinkedWarehouseOp = invoices.some(
      (inv) =>
        (inv.type === "warehouse_receipt" ||
          inv.type === "warehouse_remittance") &&
        inv.sourceInvoiceId?.toString() === id.toString() &&
        !inv.isAutoGenerated,
    );
    if (hasLinkedWarehouseOp) {
      customAlert(
        "برای این فاکتور عملیات انبار (رسید/حواله) ثبت شده است و قابل حذف نمی‌باشد.",
      );
      return;
    }

    
    const typeLabel =
      invoice.type === "sale" ? "فاکتور فروش" :
      invoice.type === "purchase" ? "فاکتور خرید" :
      invoice.type === "return_sale" ? "برگشت از فروش" :
      invoice.type === "return_purchase" ? "برگشت از خرید" :
      invoice.type === "warehouse_receipt" ? "رسید انبار" :
      invoice.type === "warehouse_remittance" ? "حواله انبار" : "فاکتور";
      
    const personName = persons.find(p => p.id === invoice.personId)?.name || "نامشخص";
    
    const details = (
      <div className="flex flex-col gap-2">
        <div><strong>نوع:</strong> {typeLabel}</div>
        <div><strong>شماره:</strong> {invoice.invoiceNumber}</div>
        <div><strong>شخص:</strong> {personName}</div>
        {invoice.totalAmount !== undefined && <div><strong>مبلغ کل:</strong> {Number(invoice.totalAmount).toLocaleString()} ریال</div>}
        <div><strong>تاریخ:</strong> {invoice.date}</div>
      </div>
    );

    confirmAction("حذف این مورد غیرقابل بازگشت است. آیا اطمینان دارید؟", async () => {
      try {
        await deleteInvoice(id.toString());
        await fetchInvoices();
        await fetchWarehouses();
      } catch (err: any) {
        customAlert(err.message);
      }
    }, details);
  };

const handleVoidInvoice = async (id: string | number) => {
    
    const invoice = invoices.find((inv) => inv.id.toString() === id.toString());
    const typeLabel = invoice ? (
      invoice.type === "sale" ? "فاکتور فروش" :
      invoice.type === "purchase" ? "فاکتور خرید" :
      invoice.type === "return_sale" ? "برگشت از فروش" :
      invoice.type === "return_purchase" ? "برگشت از خرید" :
      invoice.type === "warehouse_receipt" ? "رسید انبار" :
      invoice.type === "warehouse_remittance" ? "حواله انبار" : "فاکتور"
    ) : "";
      
    const personName = invoice ? (persons.find(p => p.id === invoice.personId)?.name || "نامشخص") : "";
    
    const isWarehouseDoc = invoice?.type === "warehouse_receipt" || invoice?.type === "warehouse_remittance";
    const details = invoice ? (
      <div className="flex flex-col gap-2">
        <div><strong>نوع:</strong> {typeLabel}</div>
        <div><strong>شماره:</strong> {invoice.invoiceNumber}</div>
        {isWarehouseDoc ? null : <div><strong>شخص:</strong> {personName}</div>}
        {(!isWarehouseDoc && invoice.totalAmount !== undefined) && <div><strong>مبلغ کل:</strong> {Number(invoice.totalAmount).toLocaleString()} ریال</div>}
        <div><strong>تاریخ:</strong> {invoice.date}</div>
      </div>
    ) : undefined;

    confirmAction(
      isWarehouseDoc 
        ? "آیا از ابطال این سند انبار اطمینان دارید؟ سند ابطال شده در موجودی کالاها لحاظ نخواهد شد اما در سوابق باقی می‌ماند."
        : "آیا از ابطال این فاکتور اطمینان دارید؟ فاکتور ابطال شده در محاسبات لحاظ نخواهد شد اما در سوابق باقی می‌ماند.", 
      async () => {
      try {
        await voidInvoice(id.toString());
        await fetchInvoices();
        await fetchWarehouses();
      } catch (err: any) {
        customAlert(err.message);
      }
    }, details);
  };


const handleFastWarehouseReceipt = async (inv: any, warehouseId: string) => {
    if (!warehouseId) {
      customAlert("انتخاب انبار الزامی است.");
      return;
    }
    
    // Check if receipt already exists
    const existing = invoices.find(i => i.type === "warehouse_receipt" && i.sourceInvoiceId?.toString() === inv.id?.toString() && i.status !== "voided" && !i.isDeleted);
    if (existing) {
       customAlert("رسید انبار برای این فاکتور قبلا ثبت شده است.");
       return;
    }

    updateAppProcessing("در حال ثبت رسید انبار...");
    
    try {
        const payload = {
            type: "warehouse_receipt",
            operationType: "purchase_invoice",
            sourceInvoiceId: inv.id,
            customerId: inv.customerId,
            date: new Date().toISOString(),
            items: inv.items.map((item: any) => ({
                ...item,
                warehouseId: warehouseId
            })),
            status: "final",
            isDraft: false,
            totalAmount: inv.totalAmount,
            overallDiscountPercent: inv.overallDiscountPercent,
            invoiceDescription: `رسید اتوماتیک انبار برای فاکتور خرید ${inv.invoiceNumber || inv.id}`
        };
        
        await addInvoice(payload as any, false);
        await fetchInvoices();
        setSuccessMsg("رسید انبار با موفقیت ثبت شد.");
        setTimeout(() => setSuccessMsg(""), 3000);
    } catch (e) {
        console.error("Fast receipt error:", e);
        customAlert("خطا در ثبت رسید انبار");
    } finally {
        stopAppProcessing();
    }
};

const handleEditInvoiceAction = async (inv: any) => {
    const isWarehouseDoc = inv.type === "warehouse_receipt" || inv.type === "warehouse_remittance";
    const hasLinkedWarehouseOp = invoices.some(
      (val) =>
        (val.type === "warehouse_receipt" ||
          val.type === "warehouse_remittance") &&
        val.sourceInvoiceId?.toString() === inv.id.toString() &&
        !val.isAutoGenerated,
    );
    if (hasLinkedWarehouseOp) {
      customAlert(
        isWarehouseDoc 
          ? "برای این سند انبار عملیات مرتبط ثبت شده است و قابل ویرایش نمی‌باشد."
          : "برای این فاکتور عملیات انبار (رسید/حواله) مبدا ثبت شده است و قابل ویرایش نمی‌باشد.",
      );
      return;
    }

    const isDraft = inv.isDraft || inv.status === "draft";

    const proceedEdit = () => {
      setEditingInvoiceId(inv.id);
      setInvoiceMode("manual");
      setInvoiceNumber(inv.invoiceNumber);
      setSellerInvoiceNumber(inv.sellerInvoiceNumber || "");
      setInvoiceTitle(inv.title || "");
      setInvoiceType(inv.type);
      setInvoiceCurrency(inv.currency || storeSettings.currency);
      setCustomerId(inv.customerId);
      setSourceInvoiceId(inv.sourceInvoiceId || "");
      setItems((inv.items || []).map((i: any) => ({ ...i, id: i.id || generateId() })));
      setOverallDiscountPercent(inv.overallDiscountPercent || 0);

      if (inv.date) {
        try {
          setDate(new Date(inv.date));
        } catch (e) {}
      }

      setActiveTab(
        inv.type === "sale_return"
          ? "create_sale_return"
          : inv.type === "purchase_return"
            ? "create_purchase_return"
            : inv.type === "sale"
              ? "create_sale"
              : inv.type === "purchase"
                ? "create_purchase"
                : "create_warehouse_doc",
        true,
      );
    };

    if (!isDraft) {
      confirmAction(
        isWarehouseDoc 
          ? "آیا می‌خواهید این سند انبار را ویرایش کنید؟ نسخه قبلی پس از ذخیره نهایی حذف و با نسخه جدید جایگزین خواهد شد."
          : "آیا می‌خواهید این فاکتور را ویرایش کنید؟ نسخه قبلی پس از ذخیره نهایی حذف و با نسخه جدید جایگزین خواهد شد.",
        proceedEdit
      );
    } else {
      confirmAction(
        isWarehouseDoc 
          ? "آیا می‌خواهید این پیش‌نویس سند انبار را ویرایش کنید؟" 
          : "آیا می‌خواهید این فاکتور پیش‌نویس را ویرایش کنید؟", 
        proceedEdit
      );
    }
  };

const old_unused = () => { // We're stubbing the old lines to replace them without breaking the rest
  };

const hasRemainingWarehouseItems = (invoiceId: string | number) => {
    const sourceInv = invoices.find(
      (i) => i.id.toString() === invoiceId.toString(),
    );
    if (!sourceInv || !sourceInv.items) return false;

    const isRemittance =
      (activeTab === "create_warehouse_doc" &&
        invoiceType === "warehouse_remittance") ||
      activeTab === "list_warehouse_docs";
    const pastDocs = (invoices || []).filter(
      (i) =>
        i.sourceInvoiceId?.toString() === invoiceId.toString() &&
        (isRemittance
          ? i.type === "warehouse_remittance"
          : i.type === "warehouse_receipt") && i.status !== "voided" && !i.isDeleted,
    );
    const processedAmounts: Record<string, number> = {};
    pastDocs.forEach((doc) => {
      if (doc.items) {
        doc.items.forEach((rt: any) => {
          const key = String(rt.productId || rt.productName || "");
          if (!key) return;
          if (!processedAmounts[key]) processedAmounts[key] = 0;
          processedAmounts[key] += Number(rt.quantity) || 0;
        });
      }
    });

    const hasAny = sourceInv.items.some((it: any) => {
      const prod = products.find(
        (p) => p.id?.toString() === it.productId?.toString(),
      );
      if (prod?.type === "service") return false;

      const key = String(it.productId || it.productName || "");
      const processed = key ? processedAmounts[key] || 0 : 0;
      const remaining = (Number(it.quantity) || 0) - processed;
      return remaining > 0;
    });
    return hasAny;
  };

const getInvoiceNumber = (typeOverride?: string) => {
    let typeKey = typeOverride || "sale";
    if (!typeOverride) {
      if (
        (activeTab === "create_warehouse_doc" &&
          invoiceType === "warehouse_receipt") ||
        invoiceType === "warehouse_receipt"
      )
        typeKey = "warehouse_receipt";
      else if (
        (activeTab === "create_warehouse_doc" &&
          invoiceType === "warehouse_remittance") ||
        invoiceType === "warehouse_remittance"
      )
        typeKey = "warehouse_remittance";
      else if (activeTab === "create_purchase" || invoiceType === "purchase")
        typeKey = "purchase";
      else if (invoiceType === "proforma") typeKey = "proforma";
      else if (
        activeTab === "create_sale_return" ||
        invoiceType === "sale_return"
      )
        typeKey = "sale_return";
      else if (
        activeTab === "create_purchase_return" ||
        invoiceType === "purchase_return"
      )
        typeKey = "purchase_return";
    }

    // Default prefixes if not configured
    const defaultPrefixes: Record<string, string> = {
      sale: "INV-",
      purchase: "PUR-",
      proforma: "PF-",
      warehouse_receipt: "REC-",
      warehouse_remittance: "REM-",
      sale_return: "RTN-S-",
      purchase_return: "RTN-P-",
    };

    const prefix =
      (storeSettings as any)["prefix_" + typeKey] !== undefined &&
      (storeSettings as any)["prefix_" + typeKey] !== null
        ? String((storeSettings as any)["prefix_" + typeKey])
        : defaultPrefixes[typeKey] || "";

    // Calculate sequential number based on settings
    const startNumStr =
      (storeSettings as any)["start_" + typeKey] ||
      storeSettings.invoiceStartNumber ||
      "1000";
    const lenStr =
      (storeSettings as any)["len_" + typeKey] ||
      storeSettings.invoiceNumberLength ||
      "6";

    const startNum = parseInt(startNumStr, 10);
    const numLength = Math.max(1, parseInt(lenStr, 10));

    let maxNum = startNum - 1;

    invoices.forEach((inv) => {
      let invType = "sale";
      if (inv.type) invType = inv.type;

      if (invType === typeKey && inv.invoiceNumber) {
        let numStr = String(inv.invoiceNumber);
        if (prefix && numStr.startsWith(prefix)) {
          numStr = numStr.substring(prefix.length);
        }
        const num = parseInt(numStr.replace(/\D/g, ""), 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });

    const nextNum = maxNum + 1;
    const formattedNum = String(nextNum).padStart(numLength, "0");
    return prefix + formattedNum;
  };

  const saveInvoiceData = async (
    customPayload?: any,
    isDraftOverride?: boolean,
  ) => {
    setSubmitting(true);
    setSuccessMsg("");
    suspendAppDataChanged();
    startAppProcessing('شروع فرآیند ثبت فاکتور...');
    await new Promise(r => setTimeout(r, 20));

    const isDraft =
      isDraftOverride ||
      (customPayload &&
        (customPayload.isDraft || customPayload.status === "draft"));

    let finalInvoiceNumber = String(invoiceNumber || "");

    if (
      (invoiceMode === "auto" && !autoSaveInvoiceId && !editingInvoiceId) ||
      !finalInvoiceNumber
    ) {
      finalInvoiceNumber = "";
    }

    if (activeTab === "create_warehouse_doc" && !invoiceWarehouseId) {
      customAlert(
        "لطفاً در قسمت توضیحات مبدا/مقصد فرم، یک انبار را مشخص کنید.",
      );
      setSubmitting(false);
      stopAppProcessing();
      return;
    }

    if (activeTab === "create_warehouse_doc" && deletePreviousDocs && sourceInvoiceId && !isDraft) {
      const isReceipt = ["purchase_invoice", "sales_return", "transfer_in"].includes(warehouseOperationType);
      const pastDocs = invoices.filter(
         i => i.sourceInvoiceId?.toString() === sourceInvoiceId?.toString() && 
         (isReceipt ? i.type === "warehouse_receipt" : i.type === "warehouse_remittance")
      );
      for (const pd of pastDocs) {
         try {
           if (typeof deleteInvoice !== "undefined") {
             await deleteInvoice(pd.id.toString(), true);
           }
         } catch (e) {
           console.error("Error deleting previous doc", e);
         }
      }
      setDeletePreviousDocs(false);
    }

    if (
      (activeTab === "create_sale" || invoiceType === "sale") &&
      items.some(
        (i) => products.find((p) => p.id === i.productId)?.type !== "service",
      ) &&
      !invoiceWarehouseId
    ) {
      customAlert(
        "لطفاً برای فاکتور فروش، انبار فروش را انتخاب کنید. فروش حتماً باید از یک انبار مشخص انجام شود.",
      );
      setSubmitting(false);
      stopAppProcessing();
      return;
    }

    if (
      storeSettings.requireWarehouse &&
      !activeTab.includes("warehouse") &&
      activeTab !== "create_sale" &&
      items.some(
        (i) => products.find((p) => p.id === i.productId)?.type !== "service",
      ) &&
      !invoiceWarehouseId
    ) {
      customAlert(
        "لطفاً برای فاکتور فروش/خریدِ شامل کالا، انبار را انتخاب کنید.",
      );
      setSubmitting(false);
      stopAppProcessing();
      return;
    }

    const cleanItems = (items || []).filter(
      (item) =>
        item.productName ||
        item.productId ||
        (item.quantity > 0 && item.unitPrice > 0),
    );

    const actualCustomerId = customPayload?.customerId || customerId;
    const actualType = customPayload?.type || invoiceType;

    // ---- Sale Invoice Validation Gates ----
    if (!isDraft && actualType === "sale") {
      updateAppProcessing('بررسی گیت‌های ۷ گانه اعتبارسنجی فاکتور فروش...');
      await new Promise(r => setTimeout(r, 20));
      const validationErrors: string[] = [];

      // 1. فعال و معتبر بودن مشتری
      if (!actualCustomerId) {
        validationErrors.push("• گیت ۱: مشتری مشخص نشده است.");
      } else {
        const customer = persons.find(p => p.id?.toString() === actualCustomerId.toString());
        if (!customer) {
          validationErrors.push("• گیت ۱: مشتری انتخاب شده در سیستم معتبر نیست یا یافت نشد.");
        } else if (customer.isActive === false) {
          validationErrors.push(`• گیت ۱: حساب مشتری (${customer.name}) مسدود یا غیرفعال می‌باشد.`);
        }
      }

      // 2. بررسی تکراری نبودن شماره فاکتور
      const checkInvNum = (customPayload?.invoiceNumber || finalInvoiceNumber || "").trim();
      if (checkInvNum && !checkInvNum.includes("خودکار") && !checkInvNum.includes("تولید خودکار")) {
        const isDuplicate = invoices.some(i => 
          i.id?.toString() !== editingInvoiceId?.toString() &&
          i.type === "sale" &&
          i.invoiceNumber?.trim() === checkInvNum
        );
        if (isDuplicate) {
          validationErrors.push(`• گیت ۲: شماره فاکتور فروش (${checkInvNum}) تکراری بوده و قبلاً ثبت شده است.`);
        }
      }

      // 3. بررسی باز بودن دوره مالی
      const currentFY = activeFinancialYear;
      if (!currentFY) {
        validationErrors.push("• گیت ۳: هیچ دوره مالی فعالی برای ثبت این فاکتور یافت نشد.");
      } else if (currentFY.isClosed === true || currentFY.status === 'closed') {
        validationErrors.push(`• گیت ۳: دوره مالی (${currentFY.title || currentFY.name || 'جاری'}) بسته شده است و امکان ثبت وجود ندارد.`);
      } else if (currentFY.startDate && currentFY.endDate) {
        const targetDate = customPayload?.date || date;
        const invDateStr = convertToGregorian(targetDate).split('T')[0];
        const startDateStr = currentFY.startDate.split('T')[0];
        const endDateStr = currentFY.endDate.split('T')[0];
        if (invDateStr < startDateStr || invDateStr > endDateStr) {
          validationErrors.push(`• گیت ۳: تاریخ فاکتور (${invDateStr}) در محدوده دوره مالی فعال (${startDateStr} تا ${endDateStr}) قرار ندارد.`);
        }
      }

      // 4. بررسی معتبر بودن کد تمام کالا ها & 5. موجودی کافی انبار
      const itemsToCheck = customPayload ? (customPayload.items || []) : cleanItems;
      if (!itemsToCheck || itemsToCheck.length === 0) {
        validationErrors.push("• گیت ۴: فاکتور فروش حداقل باید شامل یک آیتم یا کالا باشد.");
      } else {
        itemsToCheck.forEach((item: any, idx: number) => {
          if (!item.productId) {
            validationErrors.push(`• گیت ۴: کالای ردیف ${idx + 1} (${item.productName || 'نامشخص'}) بدون شناسه/کد محصول است.`);
          } else {
            const prod = products.find(p => p.id?.toString() === item.productId.toString());
            if (!prod) {
              validationErrors.push(`• گیت ۴: کالا با شناسه ${item.productId} (ردیف ${idx + 1}) در لیست کالاهای سیستم یافت نشد.`);
            } else {
              if (!prod.code || String(prod.code).trim() === '') {
                validationErrors.push(`• گیت ۴: کالای "${prod.name}" (ردیف ${idx + 1}) فاقد کد کالا در سیستم است.`);
              }
              if (prod.isActive === false) {
                validationErrors.push(`• گیت ۴: کالای "${prod.name}" (ردیف ${idx + 1}) در سیستم غیرفعال شده است.`);
              }

              // 5. Inventory Check (Only if negative stock is not allowed)
              if (storeSettings.allowNegativeStock !== true) {
                const whId = item.warehouseId || invoiceWarehouseId;
                const stockInfo = getProductStockInfo(prod.id);
                const currentStock = stockInfo.warehouses[whId] ? stockInfo.warehouses[whId].available : 0;
                
                let originalQty = 0;
                if (editingInvoiceId) {
                  const originalInvoice = invoices.find(i => i.id?.toString() === editingInvoiceId.toString());
                  if (originalInvoice && originalInvoice.type === 'sale') {
                    const originalItem = originalInvoice.items.find((oi: any) => oi.productId?.toString() === item.productId?.toString() && (oi.warehouseId?.toString() === whId?.toString()));
                    if (originalItem) {
                       originalQty = (Number(originalItem.quantity) || 0) * ((originalItem.isSecondaryUnit && originalItem.unitRatio) ? Number(originalItem.unitRatio) : 1);
                    }
                  }
                }

                const neededQty = (Number(item.quantity) || 0) * ((item.isSecondaryUnit && item.unitRatio) ? Number(item.unitRatio) : 1);
                
                if (currentStock + originalQty < neededQty) {
                    validationErrors.push(`• گیت ۵: موجودی کالای "${prod.name}" (ردیف ${idx + 1}) در انبار کافی نیست. موجودی: ${currentStock + originalQty}، مقدار درخواستی: ${neededQty}. (فروش با موجودی منفی غیرفعال است)`);
                }
              }
            }
          }
        });
      }

      // 6. بررسی تطابق جمع ردیف ها با سرجمع فاکتور
      let rowSumCalculated = 0;
      itemsToCheck.forEach((item: any) => {
        const qty = Number(item.quantity) || 0;
        const price = Number(item.unitPrice) || 0;
        const ratio = (item.isSecondaryUnit && item.unitRatio) ? Number(item.unitRatio) : 1;
        const discPercent = Number(item.discountPercent) || 0;
        const lineTotal = (qty * price) * (1 - discPercent / 100);
        rowSumCalculated += lineTotal;
      });
      const discOverall = Number(customPayload?.overallDiscountPercent ?? overallDiscountPercent) || 0;
      const calculatedHeaderTotal = Math.round(rowSumCalculated * (1 - discOverall / 100));
      const actualHeaderTotal = Math.round(Number(customPayload?.totalAmount ?? calculateFinalTotal()) || 0);

      if (Math.abs(calculatedHeaderTotal - actualHeaderTotal) > 5) {
        validationErrors.push(`• گیت ۶: جمع محاسباتی ردیف‌های فاکتور (${formatNumber(calculatedHeaderTotal)}) با سرجمع نهایی فاکتور (${formatNumber(actualHeaderTotal)}) تطابق ندارد.`);
      }

      // 7. بررسی سقف اعتبار مشتری
      if (actualCustomerId) {
        const customer = persons.find(p => p.id?.toString() === actualCustomerId.toString());
        if (customer && customer.creditLimit && customer.creditLimit > 0) {
          const currentBalanceObj = calculatePersonBalance(actualCustomerId);
          let currentDebt = currentBalanceObj.status === "بدهکار" ? currentBalanceObj.amount : -currentBalanceObj.amount;
          
          let originalInvoiceUnpaid = 0;
          if (editingInvoiceId) {
             const originalInvoice = invoices.find(i => i.id?.toString() === editingInvoiceId.toString());
             if (originalInvoice && originalInvoice.type === 'sale') {
                originalInvoiceUnpaid = (Number(originalInvoice.totalAmount) || 0) - (Number(originalInvoice.paidAmount) || 0);
             }
          }
          
          const newInvoiceUnpaid = actualHeaderTotal - (Number(customPayload?.paidAmount ?? invoicePaidAmount) || 0);
          const expectedDebt = currentDebt - originalInvoiceUnpaid + newInvoiceUnpaid;

          if (expectedDebt > customer.creditLimit) {
            validationErrors.push(`• گیت ۷: مبلغ این فاکتور باعث عبور مانده بدهی مشتری از سقف اعتبار مجاز می‌شود. سقف اعتبار: ${formatNumber(customer.creditLimit)}، بدهی پیش‌بینی شده: ${formatNumber(expectedDebt)}.`);
          }
        }
      }

      if (validationErrors.length > 0) {
        customAlert("خطا در اعتبارسنجی فاکتور فروش (عدم عبور از گیت‌های ایمنی):\n\n" + validationErrors.join("\n\n"));
        setSubmitting(false);
        stopAppProcessing();
        return false;
      }
      
      updateAppProcessing('تمامی ۷ گیت اعتبارسنجی تایید شدند. شروع تراکنش (BEGIN TRANSACTION)...');
      await new Promise(r => setTimeout(r, 20));
    }

    // ---- Purchase Return Validation Gates (Partial) ----
    if (!isDraft && actualType === "purchase_return" && actualCustomerId) {
      const person = persons.find((p) => p.id.toString() === actualCustomerId.toString());
      if (person && person.creditLimit && person.creditLimit > 0) {
        const currentBalanceObj = calculatePersonBalance(actualCustomerId);
        let currentDebt = currentBalanceObj.status === "بدهکار" ? currentBalanceObj.amount : -currentBalanceObj.amount;
        let invTotal = customPayload ? (customPayload.totalAmount || 0) : calculateFinalTotal();
        const newDebt = currentDebt + invTotal;
        if (newDebt > person.creditLimit) {
          customAlert(`خطا: ثبت این سند باعث عبور از سقف اعتبار شخص می‌شود.\nسقف اعتبار: ${addCommas(person.creditLimit)}\nمبلغ بدهی بعد از ثبت: ${addCommas(newDebt)}`);
          setSubmitting(false);
          stopAppProcessing();
          return;
        }
      }
    }

    // ---- Purchase Invoice Validation Gates ----
    if (!isDraft && actualType === "purchase") {
      updateAppProcessing('بررسی گیت‌های ۵ گانه اعتبارسنجی فاکتور خرید...');
      await new Promise(r => setTimeout(r, 20));
      const validationErrors: string[] = [];

      // 1. فعال و معتبر بودن تامین کننده
      if (!actualCustomerId) {
        validationErrors.push("• گیت ۱: تامین‌کننده مشخص نشده است.");
      } else {
        const supplier = persons.find(p => p.id?.toString() === actualCustomerId.toString());
        if (!supplier) {
          validationErrors.push("• گیت ۱: تامین‌کننده انتخاب شده در سیستم معتبر نیست یا یافت نشد.");
        } else if (supplier.isActive === false) {
          validationErrors.push(`• گیت ۱: حساب تامین‌کننده (${supplier.name}) غیرفعال می‌باشد.`);
        }
      }

      // 2. بررسی تکراری نبودن شماره فاکتور
      const checkInvNum = (customPayload?.invoiceNumber || finalInvoiceNumber || "").trim();
      const checkSellerNum = (customPayload?.sellerInvoiceNumber || sellerInvoiceNumber || "").trim();

      if (checkInvNum && !checkInvNum.includes("خودکار") && !checkInvNum.includes("تولید خودکار")) {
        const isDuplicate = invoices.some(i => 
          i.id?.toString() !== editingInvoiceId?.toString() &&
          i.type === "purchase" &&
          i.invoiceNumber?.trim() === checkInvNum
        );
        if (isDuplicate) {
          validationErrors.push(`• گیت ۲: شماره فاکتور خرید (${checkInvNum}) تکراری بوده و قبلاً ثبت شده است.`);
        }
      }

      if (checkSellerNum && actualCustomerId) {
        const isDuplicateSeller = invoices.some(i =>
          i.id?.toString() !== editingInvoiceId?.toString() &&
          i.type === "purchase" &&
          i.customerId?.toString() === actualCustomerId.toString() &&
          i.sellerInvoiceNumber?.trim() === checkSellerNum
        );
        if (isDuplicateSeller) {
          validationErrors.push(`• گیت ۲: شماره فاکتور فروشنده (${checkSellerNum}) برای این تامین‌کننده قبلاً ثبت شده است.`);
        }
      }

      // 3. بررسی باز بودن دوره مالی
      const currentFY = activeFinancialYear;
      if (!currentFY) {
        validationErrors.push("• گیت ۳: هیچ دوره مالی فعالی برای ثبت این فاکتور یافت نشد.");
      } else if (currentFY.isClosed === true || currentFY.status === 'closed') {
        validationErrors.push(`• گیت ۳: دوره مالی (${currentFY.title || currentFY.name || 'جاری'}) بسته شده است و امکان ثبت وجود ندارد.`);
      } else if (currentFY.startDate && currentFY.endDate) {
        const targetDate = customPayload?.date || date;
        const invDateStr = convertToGregorian(targetDate).split('T')[0];
        
        const startDateStr = currentFY.startDate.split('T')[0];
        const endDateStr = currentFY.endDate.split('T')[0];
        if (invDateStr < startDateStr || invDateStr > endDateStr) {
          validationErrors.push(`• گیت ۳: تاریخ فاکتور (${invDateStr}) در محدوده دوره مالی فعال (${startDateStr} تا ${endDateStr}) قرار ندارد.`);
        }
      }

      // 4. بررسی معتبر بودن کد تمام کالا ها
      const itemsToCheck = customPayload ? (customPayload.items || []) : cleanItems;
      if (!itemsToCheck || itemsToCheck.length === 0) {
        validationErrors.push("• گیت ۴: فاکتور خرید حداقل باید شامل یک آیتم یا کالا باشد.");
      } else {
        itemsToCheck.forEach((item: any, idx: number) => {
          if (!item.productId) {
            validationErrors.push(`• گیت ۴: کالای ردیف ${idx + 1} (${item.productName || 'نامشخص'}) بدون شناسه/کد محصول است.`);
          } else {
            const prod = products.find(p => p.id?.toString() === item.productId.toString());
            if (!prod) {
              validationErrors.push(`• گیت ۴: کالا با شناسه ${item.productId} (ردیف ${idx + 1}) در لیست کالاهای سیستم یافت نشد.`);
            } else {
              if (!prod.code || String(prod.code).trim() === '') {
                validationErrors.push(`• گیت ۴: کالای "${prod.name}" (ردیف ${idx + 1}) فاقد کد کالا در سیستم است.`);
              }
              if (prod.isActive === false) {
                validationErrors.push(`• گیت ۴: کالای "${prod.name}" (ردیف ${idx + 1}) در سیستم غیرفعال شده است.`);
              }
            }
          }
        });
      }

      // 5. بررسی تطابق جمع ردیف ها با سرجمع فاکتور
      let rowSumCalculated = 0;
      itemsToCheck.forEach((item: any) => {
        const qty = Number(item.quantity) || 0;
        const price = Number(item.unitPrice) || 0;
        const ratio = (item.isSecondaryUnit && item.unitRatio) ? Number(item.unitRatio) : 1;
        const discPercent = Number(item.discountPercent) || 0;
        const lineTotal = (qty * price) * (1 - discPercent / 100);
        rowSumCalculated += lineTotal;
      });

      const discOverall = Number(customPayload?.overallDiscountPercent ?? overallDiscountPercent) || 0;
      const calculatedHeaderTotal = Math.round(rowSumCalculated * (1 - discOverall / 100));
      const actualHeaderTotal = Math.round(Number(customPayload?.totalAmount ?? calculateFinalTotal()) || 0);

      if (Math.abs(calculatedHeaderTotal - actualHeaderTotal) > 5) {
        validationErrors.push(`• گیت ۵: جمع محاسباتی ردیف‌های فاکتور (${formatNumber(calculatedHeaderTotal)}) با سرجمع نهایی فاکتور (${formatNumber(actualHeaderTotal)}) تطابق ندارد.`);
      }

      // Display ALL accumulated validation gate errors together if any failed
      if (validationErrors.length > 0) {
        customAlert("خطا در اعتبارسنجی فاکتور خرید (عدم عبور از گیت‌های ایمنی):\n\n" + validationErrors.join("\n\n"));
        setSubmitting(false);
        stopAppProcessing();
        return false;
      }
      
      updateAppProcessing('تمامی ۵ گیت اعتبارسنجی تایید شدند. شروع تراکنش (BEGIN TRANSACTION)...');
      await new Promise(r => setTimeout(r, 20));
    }

    updateAppProcessing('آماده‌سازی اطلاعات فاکتور...');
    await new Promise(r => setTimeout(r, 20));
    const payload = customPayload
      ? {
          ...customPayload,
          isDraft,
          status: isDraft ? "draft" : "final",
          invoiceNumber: (function () {
            let num = customPayload.invoiceNumber;
            if (!num || num.includes("خودکار") || num.includes("تولید خودکار")) {
                num = ""; // allow backend to generate
            }
            return num;
          })(),
        }
      : {
          invoiceNumber: finalInvoiceNumber,
          sellerInvoiceNumber: sellerInvoiceNumber || "",
          title: invoiceTitle,
          description: invoiceDescription,
          note: invoiceNote,
          warehouseId: invoiceWarehouseId,
          type: invoiceType,
          currency: invoiceCurrency,
          date:
            convertToGregorian(date),
          dueDate: invoiceDueDate ? (convertToGregorian(invoiceDueDate)) : null,
                      
          customerId,
          sourceInvoiceId,
          items: cleanItems.map((item) => ({
            ...item,
            warehouseId:
              (storeSettings.requireWarehouse ||
                activeTab.includes("warehouse") ||
                activeTab === "create_sale" ||
                invoiceType === "sale") &&
              invoiceWarehouseId
                ? invoiceWarehouseId
                : item.warehouseId,
          })),
          overallDiscountPercent,
          totalAmount: calculateFinalTotal(),
          paymentStatus: invoicePaymentStatus,
          paidAmount: Number(invoicePaidAmount) || 0,
          isDraft,
          status: isDraft ? "draft" : "final",
        };

    updateAppProcessing('اعتبارسنجی موجودی و انبار...');
    await new Promise(r => setTimeout(r, 20));
    // 1. If it's a sale and not a draft, perform the Sales Warehouse check and identify shortages
    if (payload.type === "sale" && !isDraft) {
      const shortages: any[] = [];
      const requiredQty: Record<string, number> = {};

      for (const item of payload.items) {
        if (!item.productId) continue;
        const productObj = products.find((p) => p.id === item.productId);
        if (productObj?.type === "service") continue;
        const q =
          (Number(item.quantity) || 0) *
          (item.isSecondaryUnit && item.unitRatio ? Number(item.unitRatio) : 1);
        requiredQty[item.productId] = (requiredQty[item.productId] || 0) + q;
      }

      for (const productId of Object.keys(requiredQty)) {
        const q = requiredQty[productId];
        const stockInfo = getProductStockInfo(productId);
        const targetWhId = invoiceWarehouseId
          ? invoiceWarehouseId.toString()
          : "";
        const physicalInWh = targetWhId
          ? stockInfo.warehouses[targetWhId]?.physical || 0
          : 0;

        if (physicalInWh < q) {
          const deficit = q - physicalInWh;
          const productObj = products.find(
            (p) => p.id.toString() === productId.toString(),
          );

          // Collect potential transfers from other active warehouses
          let remainingDeficit = deficit;
          const transfersList: any[] = [];

          const otherActiveWhs = (warehouses || []).filter(
            (w) => w.isActive !== false && w.id.toString() !== targetWhId,
          );
          for (const otherWh of otherActiveWhs) {
            if (remainingDeficit <= 0) break;
            const otherPhys =
              stockInfo.warehouses[otherWh.id.toString()]?.physical || 0;
            if (otherPhys > 0) {
              const transferQty = Math.min(remainingDeficit, otherPhys);
              transfersList.push({
                fromWarehouseId: otherWh.id,
                fromWarehouseName: otherWh.name,
                toWarehouseId: targetWhId,
                toWarehouseName:
                  warehouses.find((w) => w.id.toString() === targetWhId)
                    ?.name || "انبار فروش",
                qty: transferQty,
              });
              remainingDeficit -= transferQty;
            }
          }

          shortages.push({
            productId,
            productName: productObj?.name || "کالای نامشخص",
            unit: productObj?.unit || "عدد",
            required: q,
            availableInTarget: physicalInWh,
            deficit,
            remainingDeficit,
            transfers: transfersList,
          });
        }
      }

      if (!storeSettings.allowNegativeStock && shortages.length > 0) {
        const shortageMsgs = shortages.map(
          (s) =>
            `• ${s.productName}: نیاز ${s.required} ${s.unit} (موجودی در انبار: ${s.availableInTarget})`
        );
        customAlert(
          `موجودی کالا(های) زیر در انبار انتخاب شده کافی نیست:\n\n${shortageMsgs.join(
            "\n"
          )}\n\nجهت ثبت فاکتور با موجودی منفی، گزینه مربوطه را در تنظیمات سیستم فعال کنید.`
        );
        setSubmitting(false);
      stopAppProcessing();
        return false;
      }
    }

    // 2. Standard validation for other conditions or warehouse remittances
    if (
      !storeSettings.allowNegativeStock &&
      payload.type === "warehouse_remittance"
    ) {
      const requiredQty: Record<string, number> = {};

      for (const item of payload.items) {
        if (!item.productId) continue;
        const productObj = products.find((p) => p.id === item.productId);
        if (productObj?.type === "service") continue;
        const q =
          (Number(item.quantity) || 0) *
          (item.isSecondaryUnit && item.unitRatio ? Number(item.unitRatio) : 1);
        const key = item.productId + "_" + (item.warehouseId || "global");
        requiredQty[key] = (requiredQty[key] || 0) + q;
      }

      for (const key of Object.keys(requiredQty)) {
        const [productId, whId] = key.split("_");
        const q = requiredQty[key];
        const stockInfo = getProductStockInfo(productId);

        const avail = stockInfo.warehouses[whId]?.physical || 0;
        if (avail < q) {
          customAlert(
            `موجودی فیزیکی در انبار انتخاب شده کافی نیست. (موجودی: ${avail})`,
          );
          setSubmitting(false);
      stopAppProcessing();
          return false;
        }
      }
    }

    const rollbackActions: (() => Promise<void>)[] = [];
    try {
      let addedInvoice: any = null;
      
      if (!isDraft && payload.type === "purchase") {
        updateAppProcessing("مرحله ۱ از ۳: ثبت فاکتور خرید و کاردکس کالا...");
        await new Promise(r => setTimeout(r, 20));

        const finalPayload = { ...payload, status: 'final', isDraft: false };
        if (editingInvoiceId) {
          const originalInvoice = invoices.find((i) => i.id?.toString() === editingInvoiceId.toString());
          const originalInvoiceCopy = originalInvoice ? JSON.parse(JSON.stringify(originalInvoice)) : null;

          addedInvoice = await updateInvoice(editingInvoiceId, finalPayload as any, true);
          if (!isDraftOverride) {
            setEditingInvoiceId(null);
          }

          rollbackActions.push(async () => {
            if (originalInvoiceCopy) {
              await updateInvoice(editingInvoiceId, originalInvoiceCopy, true);
            }
          });
        } else {
          if (autoSaveInvoiceId) {
            const originalDraft = invoices.find((i) => i.id?.toString() === autoSaveInvoiceId.toString());
            const originalDraftObj = originalDraft ? JSON.parse(JSON.stringify(originalDraft)) : null;

            await deleteInvoice(autoSaveInvoiceId, true, true);
            setAutoSaveInvoiceId(null);

            rollbackActions.push(async () => {
              if (originalDraftObj) {
                await addInvoice(originalDraftObj, true);
              }
            });
          }
          addedInvoice = await addInvoice(finalPayload as any, true);
          rollbackActions.push(async () => {
            if (addedInvoice?.id) {
              await deleteInvoice(addedInvoice.id.toString(), true, true);
            }
          });
        }

        const invId = addedInvoice?.id || editingInvoiceId;

        // Handle cash payment receipt if specified
        const invoiceTotalAmt = Number(payload.totalAmount) || 0;
        const supplierObj = persons.find((p) => p.id?.toString() === payload.customerId?.toString());
        if ((payload.paymentStatus === 'paid' || (payload.paymentStatus === 'partial' && Number(payload.paidAmount) > 0)) && invoicePaymentAccountId) {
          const paidAmt = payload.paymentStatus === 'paid' ? invoiceTotalAmt : Number(payload.paidAmount);
          const paymentAccount = accounts.find((a: any) => a.id === invoicePaymentAccountId);
          
          if (paymentAccount) {
            updateAppProcessing("مرحله ۲ از ۳: ثبت رسید پرداخت نقدی فاکتور...");
            await new Promise(r => setTimeout(r, 20));
            
            const payTxPayload = {
              type: 'pay',
              amount: paidAmt,
              date: payload.date || new Date().toISOString().split('T')[0],
              personId: payload.customerId,
              resourceType: (paymentAccount as any).type === 'bank' ? 'bank' : 'cashbox',
              resourceId: invoicePaymentAccountId,
              method: 'cash',
              description: `بابت تسویه فاکتور خرید شماره ${payload.invoiceNumber || invId}`,
              currency: payload.currency || 'تومان',
              linkedInvoices: { [invId]: paidAmt }
            };
            const createdPayTx = await addTransaction(payTxPayload);
            if (createdPayTx?.id) {
              rollbackActions.push(async () => {
                await deleteTransaction(createdPayTx.id.toString());
              });
            }
          }
        }

        if (typeof addSystemLog !== 'undefined') {
          await addSystemLog(
            'REGISTER_PURCHASE_INVOICE_TRANSACTION',
            `ثبت فاکتور خرید شماره ${payload.invoiceNumber || invId} به مبلغ ${invoiceTotalAmt} برای ${supplierObj?.name || ''}`,
            'Invoice',
            invId
          );
        }
      } else {
        const typeTitles: Record<string, string> = {
          sale: "فاکتور فروش",
          purchase_return: "فاکتور برگشت خرید",
          sale_return: "فاکتور برگشت فروش",
          proforma: "پیش‌فاکتور",
          warehouse_receipt: "رسید ورود به انبار",
          warehouse_remittance: "حواله خروج از انبار"
        };
        const titleName = typeTitles[payload.type] || "سند";

        if (payload.type === "sale") {
          updateAppProcessing("مرحله ۱ از ۷ (BEGIN TRANSACTION): ثبت هدر فاکتور فروش...");
          await new Promise(r => setTimeout(r, 20));
          updateAppProcessing("مرحله ۲ از ۷: ثبت آیتم‌های فاکتور...");
          await new Promise(r => setTimeout(r, 20));
        } else if (payload.type === "warehouse_receipt") {
          updateAppProcessing("مرحله ۱ از ۶: هدر سند موجودی StockDocument و آیتم‌های سند موجودی StockDocumentItem ثبت شد...");
          await new Promise(r => setTimeout(r, 20));
        } else if (payload.type === "warehouse_remittance") {
          updateAppProcessing("مرحله ۱ از ۸: بررسی گیت انبار (آیا موجودی کافی است؟)...");
          await new Promise(r => setTimeout(r, 20));
          updateAppProcessing("مرحله ۲ از ۸: ثبت هدر سند و ثبت ردیف سند حواله...");
          await new Promise(r => setTimeout(r, 20));
        } else {
          updateAppProcessing(`مرحله ۱ از ۴: ثبت اولیه ${titleName}...`);
          await new Promise(r => setTimeout(r, 20));
        }
        await new Promise(r => setTimeout(r, 20));

        if (editingInvoiceId) {
          const originalInvoice = invoices.find((i) => i.id?.toString() === editingInvoiceId.toString());
          const originalInvoiceCopy = originalInvoice ? JSON.parse(JSON.stringify(originalInvoice)) : null;

          addedInvoice = await updateInvoice(editingInvoiceId, payload as any, true);
          if (!isDraftOverride) {
            setEditingInvoiceId(null);
          }

          rollbackActions.push(async () => {
            if (originalInvoiceCopy) {
              await updateInvoice(editingInvoiceId, originalInvoiceCopy, true);
            }
          });
        } else {
          let originalDraftObj = null;
          if (autoSaveInvoiceId) {
            const originalDraft = invoices.find((i) => i.id?.toString() === autoSaveInvoiceId.toString());
            originalDraftObj = originalDraft ? JSON.parse(JSON.stringify(originalDraft)) : null;

            await deleteInvoice(autoSaveInvoiceId, true, true);
            setAutoSaveInvoiceId(null);

            rollbackActions.push(async () => {
              if (originalDraftObj) {
                await addInvoice(originalDraftObj, true);
              }
            });
          }
          addedInvoice = await addInvoice(payload as any, true);
          if (isDraftOverride) {
            setEditingInvoiceId(addedInvoice.id);
          }

          rollbackActions.push(async () => {
            if (addedInvoice?.id) {
              await deleteInvoice(addedInvoice.id.toString(), true, true);
            }
          });
        }
      }

      // Auto-create warehouse remittance for purchase return
      if (!editingInvoiceId && payload.type === "purchase_return" && !isDraft) {
        updateAppProcessing("مرحله ۲ از ۴: صدور خودکار حواله مرجوعی انبار...");
        await new Promise(r => setTimeout(r, 20));
        const startNum = parseInt(
          storeSettings.invoiceStartNumber || "1000",
          10,
        );
        const autoPrefix = storeSettings.prefix_warehouse_remittance || "REM-";
        const numLength = Math.max(
          1,
          parseInt(storeSettings.invoiceNumberLength || "6", 10),
        );
        let maxNum = startNum - 1;
        invoices.forEach((inv) => {
          if (inv.invoiceNumber && inv.invoiceNumber.startsWith(autoPrefix)) {
            const num = parseInt(
              inv.invoiceNumber.substring(autoPrefix.length),
              10,
            );
            if (!isNaN(num) && num > maxNum) maxNum = num;
          }
        });
        const autoDocNumber =
          autoPrefix + String(maxNum + 1).padStart(numLength, "0");

        const autoDocPayload = {
          isAutoGenerated: true,
          invoiceNumber: autoDocNumber,
          title:
            "حواله خروج خودکار (مرتبط با برگشت خرید " +
            payload.invoiceNumber +
            ")",
          type: "warehouse_remittance",
          warehouseId: payload.warehouseId,
          currency: payload.currency,
          date: payload.date,
          customerId: payload.customerId,
          sourceInvoiceId: addedInvoice?.id || payload.invoiceNumber,
          items: payload.items.map((item: any) => ({
            ...item,
            warehouseId: item.warehouseId || payload.warehouseId,
          })),
          overallDiscountPercent: 0,
          totalAmount: 0,
        };
        const autoRem = await addInvoice(autoDocPayload as any, true);

        rollbackActions.push(async () => {
          if (autoRem?.id) {
            await deleteInvoice(autoRem.id.toString(), true, true);
          }
        });
      }

      // Auto-create warehouse remittance for sales
      if (!editingInvoiceId && payload.type === "sale" && !isDraft) {
        if (payload.type === "sale") {
          updateAppProcessing("مرحله ۳ از ۷: کسر از موجودی انبار (به‌روزرسانی کاردکس کالا) و صدور سند انبار...");
        } else {
          updateAppProcessing("مرحله ۲ از ۴: صدور خودکار حواله خروج از انبار برای فروش...");
        }
        await new Promise(r => setTimeout(r, 20));
        const startNum = parseInt(
          storeSettings.invoiceStartNumber || "1000",
          10,
        );
        const remPrefix = storeSettings.prefix_warehouse_remittance || "REM-";
        const numLength = Math.max(
          1,
          parseInt(storeSettings.invoiceNumberLength || "6", 10),
        );
        let maxNum = startNum - 1;
        invoices.forEach((inv) => {
          if (inv.invoiceNumber && inv.invoiceNumber.startsWith(remPrefix)) {
            const num = parseInt(
              inv.invoiceNumber.substring(remPrefix.length),
              10,
            );
            if (!isNaN(num) && num > maxNum) maxNum = num;
          }
        });
        const autoRemittanceNumber = `${remPrefix}${String(maxNum + 1).padStart(numLength, "0")}`;

        const remittancePayload = {
          isAutoGenerated: true,
          invoiceNumber: autoRemittanceNumber,
          title:
            "حواله خروج خودکار (مرتبط با فاکتور " + payload.invoiceNumber + ")",
          type: "warehouse_remittance",
          warehouseId: payload.warehouseId,
          currency: payload.currency,
          date: payload.date,
          customerId: payload.customerId,
          sourceInvoiceId: addedInvoice?.id || payload.invoiceNumber,
          items: payload.items.map((item: any) => ({
            ...item,
            warehouseId: item.warehouseId || payload.warehouseId,
          })),
          overallDiscountPercent: 0,
          totalAmount: 0,
        };
        const autoRem = await addInvoice(remittancePayload as any, true);

        rollbackActions.push(async () => {
          if (autoRem?.id) {
            await deleteInvoice(autoRem.id.toString(), true, true);
          }
        });
      }

      if (payload.type === "sale") {
        updateAppProcessing("مرحله ۴ از ۷: ثبت سند حسابداری (بدهکار مشتری - بستانکار فروش)...");
        await new Promise(r => setTimeout(r, 20));
        updateAppProcessing("مرحله ۵ از ۷: به‌روزرسانی کاردکس شخص (مشتری)...");
        await new Promise(r => setTimeout(r, 20));
        updateAppProcessing("مرحله ۶ از ۷: ثبت گزارش تغییرات (لاگ)...");
      } else if (payload.type === "warehouse_receipt") {
        updateAppProcessing("مرحله ۲ از ۶: محاسبه میانگین موزون جدید...");
        await new Promise(r => setTimeout(r, 20));
        updateAppProcessing("مرحله ۳ از ۶: Insert در ItemLedger (کاردکس — فقط رکورد جدید اضافه می‌شود)...");
        await new Promise(r => setTimeout(r, 20));
        updateAppProcessing("مرحله ۴ از ۶: Update در StockBalance (جدول موجودی لحظه‌ای)...");
        await new Promise(r => setTimeout(r, 20));
      } else if (payload.type === "warehouse_remittance") {
        updateAppProcessing("مرحله ۳ از ۸: محاسبه بهای تمام‌شده خروجی (طبق میانگین موزون لحظه‌ای)...");
        await new Promise(r => setTimeout(r, 20));
        updateAppProcessing("مرحله ۴ از ۸: Insert در ItemLedger (کاردکس)...");
        await new Promise(r => setTimeout(r, 20));
        updateAppProcessing("مرحله ۵ از ۸: Update در StockBalance (جدول موجودی لحظه‌ای)...");
        await new Promise(r => setTimeout(r, 20));
        updateAppProcessing("مرحله ۶ از ۸: آزادسازی رزرو...");
        await new Promise(r => setTimeout(r, 20));
      } else {
        updateAppProcessing("مرحله ۳ از ۴: محاسبه کاردکس کالا و به‌روزرسانی انبارها...");
      }
      await new Promise(r => setTimeout(r, 20));
      if (!isDraft && payload.type !== "proforma") {
        recalculateAllWarehouseStocks()
          .then(() => fetchWarehouses())
          .catch(console.error);
      }

      if (payload.type === "sale") {
        updateAppProcessing("مرحله ۷ از ۷: تثبیت نهایی و تغییر وضعیت فاکتور (COMMIT)...");
      } else if (payload.type === "warehouse_receipt") {
        updateAppProcessing("مرحله ۵ از ۶: ثبت سند حسابداری...");
        await new Promise(r => setTimeout(r, 20));
        updateAppProcessing("مرحله ۶ از ۶: ثبت لاگ تغییرات (Audit Log)...");
      } else if (payload.type === "warehouse_remittance") {
        updateAppProcessing("مرحله ۷ از ۸: ثبت سند حسابداری...");
        await new Promise(r => setTimeout(r, 20));
        updateAppProcessing("مرحله ۸ از ۸: ثبت لاگ تغییرات و COMMIT...");
      } else {
        updateAppProcessing("مرحله ۴ از ۴: تثبیت نهایی عملیات...");
      }
      await new Promise(r => setTimeout(r, 20));

      const successTypeName =
        payload.type === "warehouse_receipt"
          ? "رسید انبار"
          : payload.type === "warehouse_remittance"
            ? "حواله انبار"
            : "فاکتور";

      setSuccessMsg(
        isDraft
          ? `پیش‌نویس ${successTypeName} با موفقیت ذخیره شد!`
          : `${successTypeName} با موفقیت ثبت شد!`,
      );
      if (
        storeSettings?.notify_on_invoice &&
        (payload.type === "sale" || payload.type === "purchase") &&
        !isDraft
      ) {
        const person = persons.find((p) => p.id === payload.customerId);
        if (person && person.phone) {
          const amt =
            typeof formatNumber === "function"
              ? formatNumber(payload.totalAmount)
              : payload.totalAmount;
          const mTitle =
            payload.type === "sale" ? "مشتری گرامی" : "همکار گرامی";
          const mWord = payload.type === "sale" ? "خرید" : "فروش";
          let msg = `${mTitle}، فاکتور ${mWord} شما به مبلغ ${amt} ${storeSettings?.currency || "تومان"} در سیستم ثبت شد.`;
          if (storeSettings?.smsTemplateInvoice) {
            msg = storeSettings.smsTemplateInvoice
              .replace(/{name}/g, person.name)
              .replace(/{amount}/g, String(amt))
              .replace(/{invoice_number}/g, String(payload.invoiceNumber || ""))
              .replace(/{date}/g, formatDateDisplay(new Date(), storeSettings?.calendarType));
          }
          sendNotification(msg, person.phone, storeSettings?.notify_method);
        }
      }
      
      checkDebtThreshold(payload.customerId).catch(console.error);

      // Reset form after short delay
      clearDraft();
      setTimeout(() => {
        if (payload.type === "purchase") {
          // Open pricing wizard with the added invoice items (excluding services if possible, or all items)
          const newWizardItems = payload.items
            .filter((it: any) => {
              const prod = products.find((p) => p.id === it.productId);
              return prod && prod.type !== "service";
            })
            .map((it: any) => {
              const prod = products.find((p) => p.id === it.productId);
              let basePurchasePrice = Number(it.unitPrice) || 0;
              if (it.isSecondaryUnit && prod?.unitRatio && prod.unitRatio > 0) {
                 basePurchasePrice = Number((basePurchasePrice / prod.unitRatio).toFixed(4));
              }
              return {

                productId: it.productId,
                productName: it.productName,
                purchasePrice: basePurchasePrice,
                marginPercent: 0,
                salePrice: prod ? Number(prod.price) : 0,
              };
            });
          if (newWizardItems.length > 0) {
            setPricingWizardItems(newWizardItems);
            setPricingWizardInvoice(payload);
          }
        }

        if (invoiceMode === "manual") setInvoiceNumber("");
        setSellerInvoiceNumber("");
        setCustomerId("");
        setSourceInvoiceId("");
        setItems([]);
        setOverallDiscountPercent(0);
        setInvoiceCurrency(storeSettings.currency || "تومان");
        setExchangeRate(1);
        setExchangeRateInput("1");
        setInvoicePaymentAccountId("");
        // Re-initialize based on active tab
        if (activeTab === "create_sale") {
          setInvoiceType("sale");
          setInvoiceTitle("فاکتور فروش کالا");
          setInvoicePaymentStatus("unpaid");
          setInvoicePaidAmount(0);
        } else if (activeTab === "create_sale_return") {
          setInvoiceType("sale_return");
          setInvoiceTitle("فاکتور برگشت از فروش");
          setInvoicePaymentStatus("unpaid");
          setInvoicePaidAmount(0);
        } else if (activeTab === "create_purchase_return") {
          setInvoiceType("purchase_return");
          setInvoiceTitle("فاکتور برگشت از خرید");
          setInvoicePaymentStatus("unpaid");
          setInvoicePaidAmount(0);
        } else if (activeTab === "create_purchase") {
          setInvoiceType("purchase");
          setInvoiceTitle("فاکتور خرید کالا");
          setInvoicePaymentStatus("unpaid");
          setInvoicePaidAmount(0);
        } else if (activeTab === "create_warehouse_doc") {
          const storedDraftStr = localStorage.getItem("invoice_draft");
          const storedDraft = storedDraftStr
            ? JSON.parse(storedDraftStr)
            : null;
          if (storedDraft && storedDraft.type === "warehouse_receipt") {
            setInvoiceType("warehouse_receipt");
            setInvoiceTitle("رسید انبار (ورود کالا)");
            setWarehouseOperationType("purchase_invoice");
          } else {
            setInvoiceType("warehouse_remittance");
            setInvoiceTitle("حواله انبار (خروج کالا)");
            setWarehouseOperationType("sales_invoice");
          }
          setWarehouseWizardStep(1);
        } else {
          setInvoiceType("sale");
          setInvoiceTitle("فاکتور فروش کالا");
        }
        setSuccessMsg("");
        setPreviewInvoiceData(null); // Clear preview modal
      }, 1500);
      return addedInvoice || true;
    } catch (error: any) {
      console.error("Error submitting invoice, rolling back operations...", error);
      updateAppProcessing('خطا رخ داد! در حال بازگردانی (Rollback)...');
      await new Promise(r => setTimeout(r, 20));
      for (let i = rollbackActions.length - 1; i >= 0; i--) {
        try {
          await rollbackActions[i]();
        } catch (rErr) {
          console.error("Error executing rollback action:", rErr);
        }
      }
      customAlert(`عملیات با خطا مواجه شد و تمامی مراحل بازگردانی شدند (Rollback).\nشرح خطا: ${error.message || "خطای ارتباط با سرور رخ داد"}`);
    } finally {
      resumeAppDataChanged(true);
      setSubmitting(false);
      stopAppProcessing();
    }
    return false;
  };

const handleExecuteTransferAndSubmit = async () => {
    if (!transferProposal) return;
    setSubmitting(true);
    const rollbackActions: (() => Promise<void>)[] = [];

    try {
      const { items: proposalItems, payload: originalPayload } =
        transferProposal;

      // Let's create the transfer documents for each suggested transfer
      for (const item of proposalItems) {
        for (const tr of item.transfers) {
          // Generate warehouse remittance (exit from source warehouse) and warehouse receipt (entry to sales warehouse)
          const startNum = parseInt(
            storeSettings.invoiceStartNumber || "1000",
            10,
          );
          const remPrefix = storeSettings.prefix_warehouse_remittance || "REM-";
          const recPrefix = storeSettings.prefix_warehouse_receipt || "REC-";
          const numLength = Math.max(
            1,
            parseInt(storeSettings.invoiceNumberLength || "6", 10),
          );

          let maxNumRem = startNum - 1;
          let maxNumRec = startNum - 1;
          invoices.forEach((inv) => {
            if (inv.invoiceNumber) {
              if (inv.invoiceNumber.startsWith(remPrefix)) {
                const num = parseInt(
                  inv.invoiceNumber.substring(remPrefix.length),
                  10,
                );
                if (!isNaN(num) && num > maxNumRem) maxNumRem = num;
              }
              if (inv.invoiceNumber.startsWith(recPrefix)) {
                const num = parseInt(
                  inv.invoiceNumber.substring(recPrefix.length),
                  10,
                );
                if (!isNaN(num) && num > maxNumRec) maxNumRec = num;
              }
            }
          });

          const remNumber = `${remPrefix}${String(maxNumRem + 1).padStart(numLength, "0")}`;
          const recNumber = `${recPrefix}${String(maxNumRec + 1).padStart(numLength, "0")}`;

          const product = products.find(
            (p) => p.id.toString() === item.productId.toString(),
          );
          const transferDate = new Date();
          

          // 1. Warehouse Remittance (خروج از انبار مبدا)
          const remittancePayload = {
            isAutoGenerated: true,
            invoiceNumber: remNumber,
            title: `حواله انتقال کالا به انبار فروش (خودکار بابت فاکتور فروش ${originalPayload.invoiceNumber})`,
            description: `انتقال خودکار کالا به انبار فروش (${tr.toWarehouseName}) بابت کسر موجودی`,
            type: "warehouse_remittance",
            warehouseId: tr.fromWarehouseId,
            currency: originalPayload.currency || "تومان",
            date: transferDate.toISOString(),
                        customerId: originalPayload.customerId || "",
            items: [
              {
                id: generateId(),
                productId: item.productId,
                productName: item.productName,
                quantity: tr.qty,
                unitPrice: product?.price || 0,
                discountPercent: 0,
                totalPrice: (product?.price || 0) * tr.qty,
                selectedUnit: product?.unit || "",
                unitRatio: product?.unitRatio || 1,
                isSecondaryUnit: false,
                warehouseId: tr.fromWarehouseId,
              },
            ],
            overallDiscountPercent: 0,
            totalAmount: 0,
          };

          // 2. Warehouse Receipt (ورود به انبار مقصد/فروش)
          const receiptPayload = {
            isAutoGenerated: true,
            invoiceNumber: recNumber,
            title: `رسید انتقال کالا به انبار فروش (خودکار بابت فاکتور فروش ${originalPayload.invoiceNumber})`,
            description: `انتقال خودکار کالا از انبار مبدا (${tr.fromWarehouseName}) بابت کسر موجودی`,
            type: "warehouse_receipt",
            warehouseId: tr.toWarehouseId,
            currency: originalPayload.currency || "تومان",
            date: transferDate.toISOString(),
                        customerId: originalPayload.customerId || "",
            items: [
              {
                id: generateId(),
                productId: item.productId,
                productName: item.productName,
                quantity: tr.qty,
                unitPrice: product?.price || 0,
                discountPercent: 0,
                totalPrice: (product?.price || 0) * tr.qty,
                selectedUnit: product?.unit || "",
                unitRatio: product?.unitRatio || 1,
                isSecondaryUnit: false,
                warehouseId: tr.toWarehouseId,
              },
            ],
            overallDiscountPercent: 0,
            totalAmount: 0,
          };

          const addedRem = await addInvoice(remittancePayload as any, true);
          rollbackActions.push(async () => {
            if (addedRem?.id) await deleteInvoice(addedRem.id.toString(), true, true);
          });

          const addedRec = await addInvoice(receiptPayload as any, true);
          rollbackActions.push(async () => {
            if (addedRec?.id) await deleteInvoice(addedRec.id.toString(), true, true);
          });
        }
      }

      // Recalculate stock
      await recalculateAllWarehouseStocks();
      await fetchWarehouses();
      setTransferProposal(null);

      // Submit original invoice with bypass of shortage checks (since stock is now in target warehouse!)
      const addedInvoice = await addInvoice(originalPayload);
      rollbackActions.push(async () => {
        if (addedInvoice?.id) await deleteInvoice(addedInvoice.id.toString(), true, true);
      });

      // Code to automatically construct warehouse remittance for the sale:
      const startNum = parseInt(storeSettings.invoiceStartNumber || "1000", 10);
      const remPrefix = storeSettings.prefix_warehouse_remittance || "REM-";
      const numLength = Math.max(
        1,
        parseInt(storeSettings.invoiceNumberLength || "6", 10),
      );

      let maxNum = startNum - 1;
      const latestInvoices = await getInvoices();
      latestInvoices.forEach((inv: any) => {
        if (inv.invoiceNumber && inv.invoiceNumber.startsWith(remPrefix)) {
          const num = parseInt(
            inv.invoiceNumber.substring(remPrefix.length),
            10,
          );
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      });
      const autoRemittanceNumber = `${remPrefix}${String(maxNum + 1).padStart(numLength, "0")}`;

      const remittancePayload = {
        isAutoGenerated: true,
        invoiceNumber: autoRemittanceNumber,
        title:
          "حواله خروج خودکار (مرتبط با فاکتور " +
          originalPayload.invoiceNumber +
          ")",
        type: "warehouse_remittance",
        warehouseId: originalPayload.warehouseId,
        currency: originalPayload.currency,
        date: originalPayload.date,
                customerId: originalPayload.customerId,
        sourceInvoiceId: addedInvoice?.id || originalPayload.invoiceNumber,
        items: originalPayload.items.map((it: any) => ({
          ...it,
          warehouseId: originalPayload.warehouseId,
        })),
        overallDiscountPercent: 0,
        totalAmount: 0,
      };
      const autoRem = await addInvoice(remittancePayload as any);
      rollbackActions.push(async () => {
        if (autoRem?.id) await deleteInvoice(autoRem.id.toString(), true, true);
      });

      setSuccessMsg(
        `سند انتقال موجودی و فاکتور فروش شماره ${originalPayload.invoiceNumber} با موفقیت ثبت شدند!`,
      );

      if (storeSettings?.notify_on_invoice && originalPayload.customerId) {
        const person = persons.find((p) => p.id === originalPayload.customerId);
        if (person && person.phone) {
          const amt =
            typeof formatNumber === "function"
              ? formatNumber(originalPayload.totalAmount)
              : originalPayload.totalAmount;
          let msg = `مشتری گرامی، فاکتور خرید شما به مبلغ ${amt} ${storeSettings?.currency || "تومان"} در سیستم ثبت شد.`;
          if (storeSettings?.smsTemplateInvoice) {
            msg = storeSettings.smsTemplateInvoice
              .replace(/{name}/g, person.name)
              .replace(/{amount}/g, String(amt))
              .replace(
                /{invoice_number}/g,
                String(originalPayload.invoiceNumber || ""),
              )
              .replace(/{date}/g, formatDateDisplay(new Date(), storeSettings?.calendarType));
          }
          sendNotification(msg, person.phone, storeSettings?.notify_method);
        }
      }

      
      clearDraft();

      setTimeout(() => {
        if (invoiceMode === "manual") setInvoiceNumber("");
        setSellerInvoiceNumber("");
        setCustomerId("");
        setSourceInvoiceId("");
        setItems([]);
        setOverallDiscountPercent(0);
        setInvoiceCurrency(storeSettings.currency || "تومان");
        setExchangeRate(1);
        setExchangeRateInput("1");

        setInvoiceType("sale");
        setInvoiceTitle("فاکتور فروش کالا");
        setInvoicePaymentStatus("unpaid");
        setInvoicePaidAmount(0);
        setInvoicePaymentAccountId("");

        setSuccessMsg("");
        setPreviewInvoiceData(null);
      }, 1500);

      setActiveTab("list_sale", true);
    } catch (err: any) {
      console.error("Error executing transfer and submit, rolling back...", err);
      for (let i = rollbackActions.length - 1; i >= 0; i--) {
        try {
          await rollbackActions[i]();
        } catch (rErr) {
          console.error("Error executing rollback action:", rErr);
        }
      }
      customAlert(err.message || "خطایی در اجرای انتقال و ثبت فاکتور پیش آمد.");
    } finally {
      setSubmitting(false);
      stopAppProcessing();
    }
  };

const submitInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !customerId ||
      (items || []).length === 0 ||
      items.some((i) => !i.productId && !i.productName)
    ) {
      customAlert("لطفاً همه فیلدهای ضروری را پر کنید.");
      return;
    }
    if (activeTab === "create_warehouse_doc" && !invoiceWarehouseId) {
      customAlert("لطفاً انبار را مشخص کنید.");
      return;
    }
    if (
      storeSettings.requireWarehouse &&
      !activeTab.includes("warehouse") &&
      items.some(
        (i) => products.find((p) => p.id === i.productId)?.type !== "service",
      ) &&
      !invoiceWarehouseId
    ) {
      customAlert(
        "لطفاً برای فاکتور فروش/خریدِ شامل کالا، انبار را انتخاب کنید.",
      );
      return;
    }
    await saveInvoiceData();
  };

const handleInvoicePreviewTrigger = () => {
    if (
      !customerId ||
      (items || []).length === 0 ||
      items.some((i) => !i.productId && !i.productName)
    ) {
      customAlert("لطفاً همه فیلدهای ضروری را پر کنید.");
      return;
    }

    if (activeTab === "create_warehouse_doc" && !invoiceWarehouseId) {
      customAlert("لطفاً انبار را مشخص کنید.");
      return;
    }

    if (
      storeSettings.requireWarehouse &&
      !activeTab.includes("warehouse") &&
      items.some(
        (i) => products.find((p) => p.id === i.productId)?.type !== "service",
      ) &&
      !invoiceWarehouseId
    ) {
      customAlert(
        "لطفاً برای فاکتور فروش/خریدِ شامل کالا، انبار را انتخاب کنید.",
      );
      return;
    }

    if (
      invoiceType === "purchase" &&
      (invoicePaymentStatus === "paid" || (invoicePaymentStatus === "partial" && Number(invoicePaidAmount) > 0)) &&
      !invoicePaymentAccountId
    ) {
      customAlert("لطفاً صندوق یا حساب بانکی پرداختی را مشخص کنید.");
      return;
    }

    const finalInvoiceNumber =
      invoiceMode === "auto" || !invoiceNumber
        ? getInvoiceNumber(invoiceType)
        : invoiceNumber;
    const selectedCustomer = persons.find((p) => p.id === customerId);

    const tempPayload = {
      invoiceNumber: finalInvoiceNumber,
      sellerInvoiceNumber: sellerInvoiceNumber || "",
      title:
        invoiceTitle ||
        (invoiceType === "sale" ? "فاکتور فروش کالا" : "فاکتور خرید کالا"),
      description: invoiceDescription,
      note: invoiceNote,
      warehouseId: invoiceWarehouseId,
      type: invoiceType,
      currency: invoiceCurrency,
      date:
            convertToGregorian(date),
          dueDate: invoiceDueDate ? (convertToGregorian(invoiceDueDate)) : null,
              
      customerId,
      
      sourceInvoiceId, // Pass it correctly
      items: (items || []).map((item) => {
        const prod = products.find(
          (p) => p.id.toString() === String(item.productId),
        );
        return {

          ...item,
          warehouseId:
            (storeSettings.requireWarehouse ||
              activeTab.includes("warehouse")) &&
            invoiceWarehouseId
              ? invoiceWarehouseId
              : item.warehouseId,
          productName: prod ? prod.name : item.productName || "کالای سفارشی",
        };
      }),
      overallDiscountPercent,
      totalAmount: calculateFinalTotal(),
      paymentStatus: invoicePaymentStatus,
      paidAmount: Number(invoicePaidAmount) || 0,
    };

    if (invoiceType === "sale") {
      setSalePaymentModalPayload(tempPayload);
      setIsSalePaymentModalOpen(true);
      return;
    }
    saveInvoiceData(tempPayload);
  };

const getProductStockInfo = (productId: string | number) => {
    let baseStock = 0;
    const product = products.find(
      (p) => p.id.toString() === productId.toString(),
    );
    if (product?.stock) {
      baseStock = Number(product.stock);
    }
    const defaultWhId = product?.warehouseId?.toString() || "unknown";

    const info = {
      totalPhysical: 0,
      totalReserved: 0,
      totalAvailable: 0,
      warehouses: {} as Record<
        string,
        { physical: number; reserved: number; available: number }
      >,
    };

    if (!inventoryTransactions || inventoryTransactions.length === 0) {
      // Fallback to original calculation based on product.stock if transactions aren't loaded yet
      info.totalPhysical = baseStock;
      info.totalAvailable = baseStock;
      if (baseStock !== 0) {
        info.warehouses[defaultWhId] = {
          physical: baseStock,
          reserved: 0,
          available: baseStock,
        };
      }
      invoices.forEach((inv) => {
        if (
          !inv.items ||
          inv.isDraft ||
          inv.status === "draft" ||
          inv.type === "proforma" || inv.status === "voided" || inv.isDeleted
        )
          return;
        inv.items.forEach((i: any) => {
          if (i.productId?.toString() === productId.toString()) {
            let q = Number(i.quantity) || 0;
            if (i.isSecondaryUnit && product?.unitRatio) {
              q = q * product.unitRatio;
            }

            const whId = (
              i.warehouseId ||
              inv.warehouseId ||
              defaultWhId
            ).toString();
            if (!info.warehouses[whId]) {
              info.warehouses[whId] = { physical: 0, reserved: 0, available: 0 };
            }

            if (inv.type === "warehouse_receipt") {
              info.totalPhysical += q;
              info.warehouses[whId].physical += q;
            } else if (inv.type === "warehouse_remittance") {
              info.totalPhysical -= q;
              info.warehouses[whId].physical -= q;
            }
          }
        });
      });
    } else {
      // Direct sum from InventoryTransactions
      const prodTx = inventoryTransactions.filter(
        (t) => t.productId?.toString() === productId.toString()
      );
      prodTx.forEach((t) => {
        const whId = (t.warehouseId || defaultWhId).toString();
        const qty = t.type === "in" ? (Number(t.quantity) || 0) : -(Number(t.quantity) || 0);

        info.totalPhysical += qty;

        if (!info.warehouses[whId]) {
          info.warehouses[whId] = { physical: 0, reserved: 0, available: 0 };
        }
        info.warehouses[whId].physical += qty;
      });
    }

    const saleQtys: Record<string, number> = {};
    const remittedSaleQtys: Record<string, number> = {};
    const saleReturnQtys: Record<string, number> = {};

    invoices.forEach((inv) => {
      if (
        !inv.items ||
        inv.isDraft ||
        inv.status === "draft" ||
        inv.type === "proforma" || inv.status === "voided" || inv.isDeleted
      )
        return;
      inv.items.forEach((i: any) => {
        if (i.productId?.toString() === productId.toString()) {
          let q = Number(i.quantity) || 0;
          if (i.isSecondaryUnit && product?.unitRatio) {
            q = q * product.unitRatio;
          }

          const whId = (
            i.warehouseId ||
            inv.warehouseId ||
            defaultWhId
          ).toString();

          if (inv.type === "warehouse_remittance") {
            if (inv.sourceInvoiceId) {
              const sourceInv = invoices.find(
                (sinv) =>
                  sinv.id.toString() === inv.sourceInvoiceId?.toString(),
              );
              if (sourceInv && sourceInv.type === "sale") {
                remittedSaleQtys[whId] = (remittedSaleQtys[whId] || 0) + q;
              }
            } else {
              remittedSaleQtys[whId] = (remittedSaleQtys[whId] || 0) + q;
            }
          } else if (inv.type === "sale") {
            saleQtys[whId] = (saleQtys[whId] || 0) + q;
          } else if (inv.type === "sale_return") {
            saleReturnQtys[whId] = (saleReturnQtys[whId] || 0) + q;
          }
        }
      });
    });

    const totalSaleRaw = Object.values(saleQtys).reduce((a, b) => a + b, 0);
    const totalSaleReturn = Object.values(saleReturnQtys).reduce(
      (a, b) => a + b,
      0,
    );
    const totalSale = Math.max(0, totalSaleRaw - totalSaleReturn);
    const totalRemittedForSale = Object.values(remittedSaleQtys).reduce(
      (a, b) => a + b,
      0,
    );
    const globalUnremitted = Math.max(0, totalSale - totalRemittedForSale);

    if (globalUnremitted > 0) {
      if (!info.warehouses[defaultWhId])
        info.warehouses[defaultWhId] = {
          physical: 0,
          reserved: 0,
          available: 0,
        };
      info.warehouses[defaultWhId].reserved += globalUnremitted;
      info.totalReserved += globalUnremitted;
    }

    Object.keys(info.warehouses).forEach((whId) => {
      info.warehouses[whId].available =
        info.warehouses[whId].physical - info.warehouses[whId].reserved;
    });
    info.totalAvailable = info.totalPhysical - info.totalReserved;

    return info;
  };

const formatProductStockDetails = (product: any) => {
    const info = getProductStockInfo(product.id);
    let details = "";
    const whCount = Object.keys(info.warehouses).filter(
      (wid) => info.warehouses[wid].available > 0,
    ).length;

    if (whCount > 0) {
      details =
        ` | ` +
        Object.keys(info.warehouses)
          .filter((wid) => info.warehouses[wid].available > 0)
          .map((wid) => {
            const wName =
              warehouses.find((w) => w.id.toString() === wid)?.name ||
              "انبار نامشخص";
            return `${wName}: ${info.warehouses[wid].available}`;
          })
          .join("، ");
    }

    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        <span
          className={
            info.totalAvailable > 0
              ? "text-emerald-600 font-bold"
              : "text-rose-500 font-bold"
          }
        >
          موجودی در دسترس: {info.totalAvailable} {product.unit || ""}
        </span>
        {info.totalReserved > 0 && (
          <span className="text-amber-500 font-bold bg-amber-50 px-1 rounded">
            (رزرو شده: {info.totalReserved})
          </span>
        )}
        {(product.code || product.barcode) && (
          <span className="text-slate-400 font-mono text-[10px] pr-1 border-r border-slate-200">
            {product.code ? `کد: ${product.code}` : ""}{" "}
            {product.barcode ? `| بارکد: ${product.barcode}` : ""}
          </span>
        )}
        <span className="text-gray-400">{details}</span>
      </div>
    );
  };

const calculateProductCurrentStock = (productId: string | number) => {
    return getProductStockInfo(productId).totalAvailable;
  };

const calculatePersonBalance = (personId: string | number) => {
    const person = persons.find((p) => p.id.toString() === personId.toString());
    if (!person) return {
 amount: 0, status: "بی‌حساب" };

    let balance = 0; // positive for debtor, negative for creditor

    // Calculate purely from approved accounting documents
    accountingDocuments.forEach(doc => {
      if (doc.status === 'draft' || doc.isDeleted) return;
      if (doc.items && Array.isArray(doc.items)) {
        doc.items.forEach(item => {
          if (item.detailedAccountId?.toString() === personId.toString()) {
            balance += (Number(item.debit) || 0) - (Number(item.credit) || 0);
          }
        });
      }
    });

    if (balance > 0)
      return {

        amount: balance,
        status: "بدهکار",
        color: "text-rose-600",
        bg: "bg-rose-50",
      };
    if (balance < 0)
      return {

        amount: Math.abs(balance),
        status: "بستانکار",
        color: "text-emerald-600",
        bg: "bg-emerald-50",
      };
    return {

      amount: 0,
      status: "بی‌حساب",
      color: "text-gray-500",
      bg: "bg-gray-100",
    };
  };

const renderPersonInfoBox = (
    personId: string | number,
    themeClass: string = "bg-gray-50 border-gray-100 text-gray-600",
  ) => {
    const person = persons.find(
      (p) => p.id?.toString() === personId?.toString(),
    );
    if (!person) return null;
    const bal = calculatePersonBalance(personId);
    return (
      <div
        className={`mt-2 text-xs font-bold w-full ${themeClass} border rounded-lg p-3 flex flex-col gap-2`}
      >
        {(person.phone || person.address) && (
          <div className="flex flex-col gap-1.5 pb-2 border-b border-black/5">
            {person.phone && (
              <div className="flex items-center gap-1.5 opacity-90 font-medium">
                <Phone className="w-3.5 h-3.5" />
                <span dir="ltr" className="text-right w-full">
                  {person.phone}
                </span>
              </div>
            )}
            {person.address && (
              <div className="flex gap-1.5 opacity-90 font-medium leading-relaxed">
                <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{person.address}</span>
              </div>
            )}
          </div>
        )}
        <div className="flex justify-between items-center text-[11px] sm:text-xs">
          <span className="opacity-80">مانده حساب فعلی:</span>
          <span
            className={`${bal.bg || "bg-white"} ${bal.color || "text-slate-800"} px-2.5 py-0.5 rounded shadow-sm border border-black/5`}
          >
            {bal.amount === 0
              ? "صفر (بی‌حساب)"
              : `${formatCurrency(bal.amount)} ${storeSettings.currency || "تومان"} (${bal.status})`}
          </span>
        </div>
      </div>
    );
  };

const calculateSubtotal = () =>
    items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);

const calculateFinalTotal = () => {
    const subtotal = calculateSubtotal();
    const final = subtotal * (1 - overallDiscountPercent / 100);
    return final > 0 ? final : 0;
  };

const invoiceOriginalTotal = () => {
    return items.reduce(
      (sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0),
      0,
    );
  };

const invoiceTotalDiscount = () => {
    const original = invoiceOriginalTotal();
    const final = calculateFinalTotal();
    return Math.max(0, original - final);
  };

const formatCurrency = (amount: number) => {
    let maxDigits = 4;
    let minDigits = 0;
    if (storeSettings && storeSettings.use_decimals === false) {
      maxDigits = 0;
    } else if (storeSettings && storeSettings.use_decimals === true) {
      maxDigits = storeSettings.decimal_places || 2;
    }
    return new Intl.NumberFormat("fa-IR", { 
      maximumFractionDigits: maxDigits,
      minimumFractionDigits: minDigits
    }).format(amount || 0);
  };

const toPersianDigits = (str: string | number | undefined | null) => {
    if (str === null || str === undefined) return "";
    const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
    return str.toString().replace(/\d/g, (x) => persianDigits[parseInt(x, 10)]);
  };

const currencyLabel =
    activeTab === "create_sale" ||
    activeTab === "create_purchase" ||
    activeTab === "create_warehouse_doc" ||
    activeTab === "create_sale_return" ||
    activeTab === "create_purchase_return"
      ? invoiceCurrency
      : storeSettings.currency;

const formatNumber = (num: number) => {
    let maxDigits = 4;
    let minDigits = 0;
    if (storeSettings && storeSettings.use_decimals === false) {
      maxDigits = 0;
    } else if (storeSettings && storeSettings.use_decimals === true) {
      maxDigits = storeSettings.decimal_places || 2;
    }
    return new Intl.NumberFormat("fa-IR", { 
      maximumFractionDigits: maxDigits,
      minimumFractionDigits: minDigits
    }).format(num || 0);
  };

const openPayslip = (tx: any) => {
    let parsed = null;
    try {
      parsed = tx.description ? JSON.parse(tx.description) : null;
    } catch (e) {
      console.error(e);
    }
    const employeeName =
      persons.find((p) => p.id.toString() === tx.personId?.toString())?.name ||
      "کارمند";
    setViewingPayslip({
      ...tx,
      parsed,
      computedPersonName: employeeName,
    });
  };

const renderTabContent = () => {
    switch (activeTab) {
            case "create_receive_receipt":
        return (
          <ReceiveReceiptModal formatNumber={formatNumber}
            isOpen={true}
            onClose={() => setRawActiveTab("list_receive_receipt")}
            receiptHasDraft={receiptHasDraft}
            restoreReceiptDraft={restoreReceiptDraft}
            discardReceiptDraft={discardReceiptDraft}
            handleSubmitReceipt={handleSubmitReceipt}
            receiptPersonId={receiptPersonId}
            setReceiptPersonId={setReceiptPersonId}
            setIsPersonModalOpen={setIsPersonModalOpen}
            persons={persons}
            getPersonDisplayName={getPersonDisplayName}
            receiptMethod={receiptMethod}
            setReceiptMethod={setReceiptMethod}
            accounts={accounts}
            cashboxes={cashboxes}
            receiptAmount={receiptAmount}
            setReceiptAmount={setReceiptAmount}
            receiptDate={receiptDate}
            setReceiptDate={setReceiptDate}
            receiptNumber={receiptNumber}
            lastCreatedReceipt={lastCreatedReceipt}
            toPersianDigits={toPersianDigits}
            storeSettings={storeSettings}
            setPrintingTransaction={setPrintingTransaction}
            setLastCreatedReceipt={setLastCreatedReceipt}
            receiptSuccessMsg={receiptSuccessMsg}
            setReceiptLinkedInvoices={setReceiptLinkedInvoices}
            activePersonsOnly={activePersonsOnly}
            mapPersonToOption={mapPersonToOption}
            customPersonFilter={customPersonFilter}
            renderPersonInfoBox={renderPersonInfoBox}
            numToPersianWords={numToPersianWords}
            receiptResourceType={receiptResourceType}
            setReceiptResourceType={setReceiptResourceType}
            receiptResourceId={receiptResourceId}
            setReceiptResourceId={setReceiptResourceId}
            invoices={invoices}
            getDefaultExchangeRate={getDefaultExchangeRate}
            receiptLinkedInvoices={receiptLinkedInvoices}
            formatDateDisplay={formatDateDisplay}
            formatCurrency={formatCurrency}
            customAlert={customAlert}
            receiptCheckNumber={receiptCheckNumber}
            setReceiptCheckNumber={setReceiptCheckNumber}
            receiptCheckDueDate={receiptCheckDueDate}
            setReceiptCheckDueDate={setReceiptCheckDueDate}
            receiptCheckBankName={receiptCheckBankName}
            setReceiptCheckBankName={setReceiptCheckBankName}
            receiptNote={receiptNote}
            setReceiptNote={setReceiptNote}
          />
        );
      case "create_pay_receipt":
        return (
          <PayReceiptModal formatNumber={formatNumber}
            isOpen={true}
            onClose={() => setRawActiveTab("list_pay_receipt")}
            receiptHasDraft={receiptHasDraft}
            restoreReceiptDraft={restoreReceiptDraft}
            discardReceiptDraft={discardReceiptDraft}
            handleSubmitReceipt={handleSubmitReceipt}
            receiptPersonId={receiptPersonId}
            setReceiptPersonId={setReceiptPersonId}
            setIsPersonModalOpen={setIsPersonModalOpen}
            persons={persons}
            getPersonDisplayName={getPersonDisplayName}
            receiptMethod={receiptMethod}
            setReceiptMethod={setReceiptMethod}
            accounts={accounts}
            cashboxes={cashboxes}
            receiptAmount={receiptAmount}
            setReceiptAmount={setReceiptAmount}
            receiptDate={receiptDate}
            setReceiptDate={setReceiptDate}
            receiptNumber={receiptNumber}
            lastCreatedReceipt={lastCreatedReceipt}
            toPersianDigits={toPersianDigits}
            storeSettings={storeSettings}
            setPrintingTransaction={setPrintingTransaction}
            setLastCreatedReceipt={setLastCreatedReceipt}
            receiptSuccessMsg={receiptSuccessMsg}
            setReceiptLinkedInvoices={setReceiptLinkedInvoices}
            activePersonsOnly={activePersonsOnly}
            mapPersonToOption={mapPersonToOption}
            customPersonFilter={customPersonFilter}
            renderPersonInfoBox={renderPersonInfoBox}
            numToPersianWords={numToPersianWords}
            receiptResourceType={receiptResourceType}
            setReceiptResourceType={setReceiptResourceType}
            receiptResourceId={receiptResourceId}
            setReceiptResourceId={setReceiptResourceId}
            invoices={invoices}
            getDefaultExchangeRate={getDefaultExchangeRate}
            receiptLinkedInvoices={receiptLinkedInvoices}
            formatDateDisplay={formatDateDisplay}
            formatCurrency={formatCurrency}
            customAlert={customAlert}
            receiptCheckbookId={receiptCheckbookId}
            setReceiptCheckbookId={setReceiptCheckbookId}
            checkbooks={checkbooks}
            issuedChecks={issuedChecks}
            receiptCheckNumber={receiptCheckNumber}
            setReceiptCheckNumber={setReceiptCheckNumber}
            receiptCheckDueDate={receiptCheckDueDate}
            setReceiptCheckDueDate={setReceiptCheckDueDate}
            receiptCheckBankName={receiptCheckBankName}
            setReceiptCheckBankName={setReceiptCheckBankName}
            receiptNote={receiptNote}
            setReceiptNote={setReceiptNote}
          />
        );

      case "create_warehouse_doc":
        return (
          <WarehouseDocCreate setIsPersonModalOpen={setIsPersonModalOpen} invoiceNumber={invoiceNumber} persons={persons} date={date} setDate={setDate} persian={persian} persian_fa={persian_fa} items={items} setItems={setItems} handleItemChange={handleItemChange} products={products} handleRemoveItem={handleRemoveItem} storeSettings={storeSettings} Package={Package} invoiceWarehouseId={invoiceWarehouseId} setInvoiceWarehouseId={setInvoiceWarehouseId} warehouses={warehouses} FastBarcodeScanner={FastBarcodeScanner} handleFastBarcodeScan={handleFastBarcodeScan} SearchableSelect={SearchableSelect} handleFastAddProduct={handleFastAddProduct} invoiceTitle={invoiceTitle} invoiceMode={invoiceMode} setInvoiceMode={setInvoiceMode} setInvoiceNumber={setInvoiceNumber} setInvoiceTitle={setInvoiceTitle} User={User} activePersonsOnly={activePersonsOnly} getRoleName={getRoleName} customerId={customerId} setCustomerId={setCustomerId} renderPersonInfoBox={renderPersonInfoBox} formatCurrency={formatCurrency} submitting={submitting} handleInvoicePreviewTrigger={handleInvoicePreviewTrigger} Plus={Plus} Trash2={Trash2} Save={Save} RefreshCw={RefreshCw} FileText={FileText} Tag={Tag} setInvoiceType={setInvoiceType} DatePicker={DatePicker} invoiceDescription={invoiceDescription} setInvoiceDescription={setInvoiceDescription} invoiceNote={invoiceNote} setInvoiceNote={setInvoiceNote} formatProductStockDetails={formatProductStockDetails} warehouseOperationType={warehouseOperationType} setWarehouseOperationType={setWarehouseOperationType} warehouseWizardStep={warehouseWizardStep} setWarehouseWizardStep={setWarehouseWizardStep} setSourceInvoiceId={setSourceInvoiceId} customAlert={customAlert} invoices={invoices} hasRemainingWarehouseItems={hasRemainingWarehouseItems} sourceInvoiceId={sourceInvoiceId} deletePreviousDocs={deletePreviousDocs} setDeletePreviousDocs={setDeletePreviousDocs} setInvoiceCurrency={setInvoiceCurrency} setExchangeRate={setExchangeRate} setExchangeRateInput={setExchangeRateInput} deleteInvoice={deleteInvoice} handleVoidInvoice={handleVoidInvoice} setInvoices={setInvoices} fetchInvoices={fetchInvoices} generateId={generateId} handleAddItem={handleAddItem} />
        );

      case "create_purchase_return":
        return (
          <PurchaseReturnInvoiceCreate setIsPersonModalOpen={setIsPersonModalOpen} hasDraft={hasDraft} restoreDraft={restoreDraft} clearDraft={clearDraft} successMsg={successMsg} editingInvoiceId={editingInvoiceId} invoiceNumber={invoiceNumber} toPersianDigits={toPersianDigits} persons={persons} date={date} setDate={setDate} persian={persian} persian_fa={persian_fa} items={items} setItems={setItems} handleItemChange={handleItemChange} products={products} handleRemoveItem={handleRemoveItem} calculateFinalTotal={calculateFinalTotal} accounts={accounts} storeSettings={storeSettings} CurrencyInput={CurrencyInput} Package={Package} invoiceWarehouseId={invoiceWarehouseId} setInvoiceWarehouseId={setInvoiceWarehouseId} warehouses={warehouses} FastBarcodeScanner={FastBarcodeScanner} handleFastBarcodeScan={handleFastBarcodeScan} SearchableSelect={SearchableSelect} handleFastAddProduct={handleFastAddProduct} setIsScannerOpen={setIsScannerOpen} ScanLine={ScanLine} setIsProductModalOpen={setIsProductModalOpen} Box={Box} invoiceTitle={invoiceTitle} invoiceMode={invoiceMode} setInvoiceMode={setInvoiceMode} setInvoiceNumber={setInvoiceNumber} setInvoiceTitle={setInvoiceTitle} User={User} activePersonsOnly={activePersonsOnly} getRoleName={getRoleName} customerId={customerId} setCustomerId={setCustomerId} renderPersonInfoBox={renderPersonInfoBox} Wallet={Wallet} invoicePaymentAccountId={invoicePaymentAccountId} setInvoicePaymentAccountId={setInvoicePaymentAccountId} invoicePaymentStatus={invoicePaymentStatus} setInvoicePaymentStatus={setInvoicePaymentStatus} setInvoicePaidAmount={setInvoicePaidAmount} DollarSign={DollarSign} invoicePaidAmount={invoicePaidAmount} overallDiscountPercent={overallDiscountPercent} setOverallDiscountPercent={setOverallDiscountPercent} formatCurrency={formatCurrency} invoiceOriginalTotal={invoiceOriginalTotal} invoiceCurrency={invoiceCurrency} invoiceTotalDiscount={invoiceTotalDiscount} numToPersianWords={numToPersianWords} submitting={submitting} saveInvoiceData={saveInvoiceData} handleInvoicePreviewTrigger={handleInvoicePreviewTrigger} formatNumber={formatNumber} Calculator={Calculator} calculateSubtotal={calculateSubtotal} />
        );
      case "create_purchase":
        return (
          <PurchaseInvoiceCreate setIsPersonModalOpen={setIsPersonModalOpen} hasDraft={hasDraft} restoreDraft={restoreDraft} clearDraft={clearDraft} successMsg={successMsg} editingInvoiceId={editingInvoiceId} invoiceNumber={invoiceNumber} toPersianDigits={toPersianDigits} persons={persons} date={date} setDate={setDate} persian={persian} persian_fa={persian_fa} items={items} setItems={setItems} handleItemChange={handleItemChange} products={products} handleRemoveItem={handleRemoveItem} calculateFinalTotal={calculateFinalTotal} accounts={accounts} storeSettings={storeSettings} CurrencyInput={CurrencyInput} Package={Package} invoiceWarehouseId={invoiceWarehouseId} setInvoiceWarehouseId={setInvoiceWarehouseId} warehouses={warehouses} FastBarcodeScanner={FastBarcodeScanner} handleFastBarcodeScan={handleFastBarcodeScan} SearchableSelect={SearchableSelect} handleFastAddProduct={handleFastAddProduct} setIsScannerOpen={setIsScannerOpen} ScanLine={ScanLine} setIsProductModalOpen={setIsProductModalOpen} Box={Box} invoiceTitle={invoiceTitle} sellerInvoiceNumber={sellerInvoiceNumber} setSellerInvoiceNumber={setSellerInvoiceNumber} invoiceMode={invoiceMode} setInvoiceMode={setInvoiceMode} setInvoiceNumber={setInvoiceNumber} setInvoiceTitle={setInvoiceTitle} User={User} activePersonsOnly={activePersonsOnly} getRoleName={getRoleName} customerId={customerId} setCustomerId={setCustomerId} renderPersonInfoBox={renderPersonInfoBox} Wallet={Wallet} invoicePaymentAccountId={invoicePaymentAccountId} setInvoicePaymentAccountId={setInvoicePaymentAccountId} invoicePaymentStatus={invoicePaymentStatus} setInvoicePaymentStatus={setInvoicePaymentStatus} setInvoicePaidAmount={setInvoicePaidAmount} DollarSign={DollarSign} invoicePaidAmount={invoicePaidAmount} overallDiscountPercent={overallDiscountPercent} setOverallDiscountPercent={setOverallDiscountPercent} formatCurrency={formatCurrency} invoiceOriginalTotal={invoiceOriginalTotal} invoiceCurrency={invoiceCurrency} invoiceTotalDiscount={invoiceTotalDiscount} numToPersianWords={numToPersianWords} submitting={submitting} saveInvoiceData={saveInvoiceData} handleInvoicePreviewTrigger={handleInvoicePreviewTrigger} formatNumber={formatNumber} Calculator={Calculator} calculateSubtotal={calculateSubtotal} />
        );
      case "create_sale_return":
        return (
          <SaleReturnInvoiceCreate setIsPersonModalOpen={setIsPersonModalOpen} hasDraft={hasDraft} restoreDraft={restoreDraft} clearDraft={clearDraft} successMsg={successMsg} editingInvoiceId={editingInvoiceId} invoiceNumber={invoiceNumber} toPersianDigits={toPersianDigits} date={date} setDate={setDate} persian={persian} persian_fa={persian_fa} items={items} handleItemChange={handleItemChange} products={products} handleRemoveItem={handleRemoveItem} calculateFinalTotal={calculateFinalTotal} storeSettings={storeSettings} CurrencyInput={CurrencyInput} Package={Package} invoiceWarehouseId={invoiceWarehouseId} setInvoiceWarehouseId={setInvoiceWarehouseId} warehouses={warehouses} FastBarcodeScanner={FastBarcodeScanner} handleFastBarcodeScan={handleFastBarcodeScan} SearchableSelect={SearchableSelect} handleFastAddProduct={handleFastAddProduct} setIsScannerOpen={setIsScannerOpen} ScanLine={ScanLine} setIsProductModalOpen={setIsProductModalOpen} Box={Box} invoiceTitle={invoiceTitle} invoiceMode={invoiceMode} setInvoiceMode={setInvoiceMode} setInvoiceNumber={setInvoiceNumber} setInvoiceTitle={setInvoiceTitle} User={User} activePersonsOnly={activePersonsOnly} getRoleName={getRoleName} customerId={customerId} setCustomerId={setCustomerId} renderPersonInfoBox={renderPersonInfoBox} overallDiscountPercent={overallDiscountPercent} setOverallDiscountPercent={setOverallDiscountPercent} formatCurrency={formatCurrency} invoiceOriginalTotal={invoiceOriginalTotal} invoiceCurrency={invoiceCurrency} invoiceTotalDiscount={invoiceTotalDiscount} numToPersianWords={numToPersianWords} submitting={submitting} saveInvoiceData={saveInvoiceData} handleInvoicePreviewTrigger={handleInvoicePreviewTrigger} formatNumber={formatNumber} Plus={Plus} Trash2={Trash2} CheckCircle={CheckCircle} History={History} Save={Save} RefreshCw={RefreshCw} FileText={FileText} Info={Info} Tag={Tag} invoiceType={invoiceType} setInvoiceType={setInvoiceType} DatePicker={DatePicker} invoiceDescription={invoiceDescription} setInvoiceDescription={setInvoiceDescription} invoiceNote={invoiceNote} setInvoiceNote={setInvoiceNote} calculateProductCurrentStock={calculateProductCurrentStock} formatProductStockDetails={formatProductStockDetails} activeTab={activeTab} calculateSubtotal={calculateSubtotal} />
        );


      case "create_sale":
        return (
          <SaleInvoiceCreate invoiceDueDate={invoiceDueDate} setInvoiceDueDate={setInvoiceDueDate} setIsPersonModalOpen={setIsPersonModalOpen} hasDraft={hasDraft} restoreDraft={restoreDraft} clearDraft={clearDraft} successMsg={successMsg} editingInvoiceId={editingInvoiceId} invoiceNumber={invoiceNumber} toPersianDigits={toPersianDigits} date={date} setDate={setDate} persian={persian} persian_fa={persian_fa} items={items} handleItemChange={handleItemChange} products={products} handleRemoveItem={handleRemoveItem} calculateFinalTotal={calculateFinalTotal} storeSettings={storeSettings} CurrencyInput={CurrencyInput} Package={Package} invoiceWarehouseId={invoiceWarehouseId} setInvoiceWarehouseId={setInvoiceWarehouseId} warehouses={warehouses} FastBarcodeScanner={FastBarcodeScanner} handleFastBarcodeScan={handleFastBarcodeScan} SearchableSelect={SearchableSelect} handleFastAddProduct={handleFastAddProduct} setIsScannerOpen={setIsScannerOpen} ScanLine={ScanLine} setIsProductModalOpen={setIsProductModalOpen} Box={Box} invoiceTitle={invoiceTitle} invoiceMode={invoiceMode} setInvoiceMode={setInvoiceMode} setInvoiceNumber={setInvoiceNumber} setInvoiceTitle={setInvoiceTitle} User={User} activePersonsOnly={activePersonsOnly} getRoleName={getRoleName} customerId={customerId} setCustomerId={setCustomerId} renderPersonInfoBox={renderPersonInfoBox} overallDiscountPercent={overallDiscountPercent} setOverallDiscountPercent={setOverallDiscountPercent} formatCurrency={formatCurrency} invoiceOriginalTotal={invoiceOriginalTotal} invoiceCurrency={invoiceCurrency} invoiceTotalDiscount={invoiceTotalDiscount} numToPersianWords={numToPersianWords} submitting={submitting} saveInvoiceData={saveInvoiceData} handleInvoicePreviewTrigger={handleInvoicePreviewTrigger} formatNumber={formatNumber} Plus={Plus} Trash2={Trash2} CheckCircle={CheckCircle} History={History} Save={Save} ShoppingCart={ShoppingCart} RefreshCw={RefreshCw} FileText={FileText} Info={Info} Tag={Tag} invoiceType={invoiceType} setInvoiceType={setInvoiceType} DatePicker={DatePicker} invoiceDescription={invoiceDescription} setInvoiceDescription={setInvoiceDescription} invoiceNote={invoiceNote} setInvoiceNote={setInvoiceNote} calculateProductCurrentStock={calculateProductCurrentStock} formatProductStockDetails={formatProductStockDetails} activeTab={activeTab} calculateSubtotal={calculateSubtotal} />
        );

      case "list_sale":
      case "list_sale_return":
      case "list_purchase":
      case "list_purchase_return":
      case "list_warehouse_docs": {
        return (
          <InvoicesList
             invoices={invoices} invoiceSearchQuery={invoiceSearchQuery} setInvoiceSearchQuery={setInvoiceSearchQuery} persons={persons} activeTab={activeTab} setActiveTab={setActiveTab} purchaseFilter={purchaseFilter} setPurchaseFilter={setPurchaseFilter} formatCurrency={formatCurrency} getPersonDisplayName={getPersonDisplayName} formatDateDisplay={formatDateDisplay}  numToPersianWords={numToPersianWords} setInvoiceWarehouseId={setInvoiceWarehouseId} warehouses={warehouses} setCustomerId={setCustomerId}  getRoleName={getRoleName} setEditingInvoiceId={setEditingInvoiceId} handleDeleteInvoice={handleDeleteInvoice}     storeSettings={storeSettings} invoiceCurrentPage={invoiceCurrentPage} setInvoiceCurrentPage={setInvoiceCurrentPage} invoicePageSize={invoicePageSize} setInvoicePageSize={setInvoicePageSize} toPersianDigits={toPersianDigits} listFilter={listFilter} setListFilter={setListFilter} invoiceGroupMode={invoiceGroupMode} setInvoiceGroupMode={setInvoiceGroupMode} List={List} clearDraft={clearDraft} setInvoiceType={setInvoiceType} setWarehouseOperationType={setWarehouseOperationType} Calendar={Calendar} renderPersonLink={renderPersonLink} products={products} setPricingWizardItems={setPricingWizardItems} setPricingWizardInvoice={setPricingWizardInvoice} setSuccessMsg={setSuccessMsg} setReceiptPersonId={setReceiptPersonId} setViewingInvoice={setViewingInvoice} handleEditInvoiceAction={handleEditInvoiceAction} handleFastWarehouseReceipt={handleFastWarehouseReceipt} handleVoidInvoice={handleVoidInvoice}
          />
        );
      }
      case "list_receive_receipt":
      case "list_pay_receipt": {
        return (
          <ReceiptsList
             transactions={transactions} activeTab={activeTab} persons={persons} getPersonDisplayName={getPersonDisplayName} formatCurrency={formatCurrency} formatDateDisplay={formatDateDisplay}  renderPersonLink={renderPersonLink} storeSettings={storeSettings} List={List} setActiveTab={setActiveTab} invoiceSearchQuery={invoiceSearchQuery} setInvoiceSearchQuery={setInvoiceSearchQuery} toPersianDigits={toPersianDigits} accounts={accounts} cashboxes={cashboxes} formatNumber={formatNumber} numToPersianWords={numToPersianWords} openPayslip={openPayslip} setPrintingTransaction={setPrintingTransaction} setEditingReceipt={setEditingReceipt} setIsEditReceiptModalOpen={setIsEditReceiptModalOpen} confirmAction={confirmAction} deleteTransaction={deleteTransaction} fetchTransactions={fetchTransactions} setPreviewReceiptData={setPreviewReceiptData}
          />
        );
      }
      case "product_categories": {
        return (
          <ProductCategoriesView products={products}
            productCategories={productCategories}
           
            recalculating={recalculating}
            submittingProduct={submittingProduct}
            handleRecalculateStocks={handleRecalculateStocks}
            handleGenerateDemoData={handleGenerateDemoData}
            addProductCategory={addProductCategory}
            updateProductCategory={updateProductCategory}
            deleteProductCategory={deleteProductCategory}
            getProductCategories={getProductCategories}
            setProductCategories={setProductCategories}
            confirmAction={confirmAction}
            setSuccessMsg={setSuccessMsg}
          />
        );
      }
      default:
        return (
          <div className="text-center p-8 bg-white rounded-xl">
            این بخش در حال بازسازی است
          </div>
        );
    }
  };

  return {
    newPersonTaxNumber, setNewPersonTaxNumber,
    newPersonRegistrationNumber, setNewPersonRegistrationNumber,
    newPersonRoles, setNewPersonRoles,
    newPersonCategories, setNewPersonCategories,
    duplicatePersonsWarning, setDuplicatePersonsWarning,

    activeStoreId, setActiveStoreId, availableStores, setAvailableStores, isStoreSelectionOpen, setIsStoreSelectionOpen, productSearchTerm,
    salePaymentModalPayload, setSalePaymentModalPayload,
    isSalePaymentModalOpen, setIsSalePaymentModalOpen,
    setProductSearchTerm,
    isFastStocktaking,
    authLoading,
    requiresInitSetup,
    activeFinancialYear,
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
    personCategories,
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
    selectedProductCategory,
    setSelectedProductCategory,
    productCurrentPage,
    setProductCurrentPage,
    productPageSize,
    setProductPageSize,
    historyProductId,
    setHistoryProductId,
    handleEditProduct,
    handleGroupPriceUpdate,
    calculateProductCurrentStock,
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
    duplicateProductId,
    setDuplicateProductId,
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
    renderTabContent
  };
}