import React, { useState, useEffect, useRef } from 'react';
import DriveBackup from './DriveBackup';
import MigrationWizard from './MigrationWizard';
import { 
  Database, Download, Upload, AlertCircle, RefreshCw, 
  Layers, Search, Trash2, Eye, X, Check, ChevronDown, 
  ChevronUp, AlertTriangle, FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  deletePerson,
  deleteProduct,
  deleteAccount,
  deleteCashbox,
  deleteWarehouse,
  deleteProductCategory,
  deleteTransaction,
  deleteInvoice,
  deleteCheckbook,
  deleteIssuedCheck,
  deleteReceivedCheck,
  deletePersonGroup,
  deletePersonRole,
  deleteUser
} from '../../services/dataService';

interface DatabaseDashboardProps {
  showNotification: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export default function DatabaseDashboard({ showNotification }: DatabaseDashboardProps) {
  const [stats, setStats] = useState<{ totalSize: number; collections: any[] }>({ totalSize: 0, collections: [] });
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Database Explorer States
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRecordId, setExpandedRecordId] = useState<any>(null);
  const [recordToDelete, setRecordToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showMigrationWizard, setShowMigrationWizard] = useState(false);
  const explorerRef = useRef<HTMLDivElement>(null);

  // Backup & Restore states
  const [restoreConfirmData, setRestoreConfirmData] = useState<{
    fileName: string;
    fileSize?: number;
    tableCount?: number;
    tablesList?: string[];
    recordsCount?: number;
    isSql?: boolean;
    backupContent: any;
  } | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/db/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);


  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchStats().finally(() => setIsRefreshing(false));
  };

  const handleFixPriceHistoryDates = async () => {
    try {
      const res = await fetch('/api/data/product_price_history');
      if (!res.ok) return;
      const history = await res.json();
      
      const invRes = await fetch('/api/data/invoices');
      const invoices = invRes.ok ? await invRes.json() : [];

      let updatedCount = 0;
      const updatedHistory = history.map((h: any) => {
        // Find if this price was from an invoice
        const possibleInvoice = invoices.find((inv: any) => 
          inv.items && inv.items.some((item: any) => 
            String(item.productId) === String(h.productId) && 
            (
              (h.type === 'sale' && Number(item.salePrice) === Number(h.price)) ||
              (h.type === 'purchase' && Number(item.purchasePrice) === Number(h.price))
            )
          )
        );

        if (possibleInvoice && possibleInvoice.date) {
          // If we found a matching invoice, update the date
          // Only update if it's currently using new Date() style or invalid
          if (new Date(h.date).toISOString().startsWith(new Date().toISOString().split('T')[0]) || !h.date) {
            updatedCount++;
            return { ...h, date: new Date(possibleInvoice.date).toISOString() };
          }
        }
        return h;
      });

      if (updatedCount > 0) {
        await fetch('/api/data/product_price_history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedHistory)
        });
        showNotification(`${updatedCount} رکورد تاریخچه قیمت با موفقیت اصلاح شد.`, 'success');
        fetchStats();
      } else {
        showNotification('موردی برای اصلاح یافت نشد.', 'info');
      }
    } catch (e) {
      console.error(e);
      showNotification('خطا در اصلاح تاریخچه‌ها', 'error');
    }
  };
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getCollectionNameInPersian = (key: string) => {
    const names: Record<string, string> = {
      'persons': 'اشخاص و شرکت‌ها (طرف حساب‌ها)',
      'products': 'کالاها و خدمات',
      'accounts': 'حساب‌های بانکی',
      'cashboxes': 'صندوق‌ها',
      'invoices': 'فاکتورها و اسناد انبار',
      'transactions': 'تراکنش‌های مالی',
      'company_profile': 'تنظیمات پایه سیستم',
      'users': 'کاربران سیستم',
      'person_groups': 'گروه‌بندی اشخاص',
      'person_roles': 'نقش‌های اشخاص',
      'warehouses': 'انبارها',
      'product_categories': 'گروه‌بندی کالاها',
      'checkbooks': 'دسته چک‌ها',
      'issued_checks': 'چک‌های صادره',
      'received_checks': 'چک‌های وارده',
      'warehouse_stocks': 'موجودی انبارها'
    };
    return names[key] || key;
  };

  const handleBackup = async () => {
    try {
      window.open('/api/db/backup', '_blank');
      showNotification('درخواست دانلود فایل پشتیبان ارسال شد', 'success');
    } catch (e) {
      showNotification('خطا در درخواست دانلود نسخه پشتیبان', 'error');
    }
  };

  const handleRestoreFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        if (file.name.endsWith('.sql')) {
            let recordCount = (content.match(/INSERT INTO/g) || []).length;
            setRestoreConfirmData({
              fileName: file.name,
              backupContent: content,
              recordsCount: recordCount,
              isSql: true
            });
        } else {
            const data = JSON.parse(content);
            let count = 0;
            for (const key in data) {
              if (Array.isArray(data[key])) {
                count += data[key].length;
              }
            }
            setRestoreConfirmData({
              fileName: file.name,
              backupContent: data,
              recordsCount: count,
              isSql: false
            });
        }
      } catch (err) {
        showNotification('فایل انتخاب شده معتبر نیست', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleConfirmRestore = async () => {
    if (!restoreConfirmData) return;
    setIsRestoring(true);
    try {
      const isSql = restoreConfirmData.isSql;
      const res = await fetch('/api/db/restore', {
        method: 'POST',
        headers: { 'Content-Type': isSql ? 'application/sql' : 'application/json' },
        body: isSql ? restoreConfirmData.backupContent : JSON.stringify(restoreConfirmData.backupContent)
      });
      if (res.ok) {
        showNotification('بازیابی پایگاه داده با موفقیت انجام شد. سیستم در حال راه‌اندازی مجدد است...', 'success');
        setTimeout(() => window.location.reload(), 2000);
      } else {
        const errorData = await res.json().catch(()=>({error: 'خطای نامشخص'}));
        showNotification(errorData.error || 'خطا در بازیابی نسخه پشتیبان', 'error');
      }
    } catch (err) {
      showNotification('خطا در برقراری ارتباط با سرور', 'error');
    } finally {
      setIsRestoring(false);
      setRestoreConfirmData(null);
    }
  };

  // Load records for the explorer
  const loadTableRecords = async (tableKey: string) => {
    setLoadingRecords(true);
    setExpandedRecordId(null);
    try {
      const res = await fetch(`/api/data/${tableKey}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(Array.isArray(data) ? data : (data ? [data] : []));
      } else {
        setRecords([]);
      }
    } catch (e) {
      console.error(e);
      showNotification('خطا در بارگذاری رکوردهای جدول', 'error');
    } finally {
      setLoadingRecords(false);
    }
  };

  const handleSelectTable = (tableKey: string) => {
    setSelectedTable(tableKey);
    setSearchTerm('');
    loadTableRecords(tableKey);
    
    // Smooth scroll to editor
    setTimeout(() => {
      explorerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  // Safe delete handler with system integrations
  const handleDeleteConfirm = async () => {
    if (!selectedTable || !recordToDelete) return;
    setIsDeleting(true);
    
    try {
      const recordId = recordToDelete.id;
      
      const customDeletes: Record<string, (id: any) => Promise<any>> = {
        'persons': deletePerson,
        'products': deleteProduct,
        'accounts': deleteAccount,
        'cashboxes': deleteCashbox,
        'warehouses': deleteWarehouse,
        'product_categories': deleteProductCategory,
        'transactions': deleteTransaction,
        'invoices': deleteInvoice,
        'checkbooks': deleteCheckbook,
        'issued_checks': deleteIssuedCheck,
        'received_checks': deleteReceivedCheck,
        'person_groups': deletePersonGroup,
        'person_roles': deletePersonRole,
        'users': deleteUser
      };
      
      const deleteFn = customDeletes[selectedTable];
      if (deleteFn && recordId !== undefined) {
        // Use standard delete engine to handle cascade updates, accounting formulas, and inventory stocks recalculations safely!
        await deleteFn(recordId);
      } else {
        // Generic fallback delete for other tables or settings
        const res = await fetch(`/api/data/${selectedTable}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            const filtered = data.filter((item: any) => item.id !== recordId);
            await fetch(`/api/data/${selectedTable}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(filtered)
            });
          } else {
            // For single object settings, overwrite with empty null
            await fetch(`/api/data/${selectedTable}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(null)
            });
          }
        }
      }
      
      showNotification('رکورد با موفقیت از پایگاه داده حذف گردید', 'success');
      setRecordToDelete(null);
      // reload table records
      await loadTableRecords(selectedTable);
      // refresh global database statistics
      await fetchStats();
    } catch (err: any) {
      showNotification(`خطا در حذف رکورد: ${err?.message || 'خطای فنی در حذف'}`, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Helper to extract nice labels for custom tables
  const getColumnsForTable = (key: string) => {
    switch (key) {
      case 'persons':
        return [
          { field: 'id', label: 'شناسه' },
          { field: 'personCode', label: 'کد شخص' },
          { field: 'name', label: 'نام طرف حساب' },
          { field: 'role', label: 'نقش' },
          { field: 'phoneNumber', label: 'تلفن همراه' }
        ];
      case 'products':
        return [
          { field: 'id', label: 'شناسه' },
          { field: 'code', label: 'کد کالا' },
          { field: 'name', label: 'نام کالا' },
          { field: 'price', label: 'قیمت فروش' },
          { field: 'stock', label: 'موجودی اولیه' }
        ];
      case 'accounts':
        return [
          { field: 'id', label: 'شناسه' },
          { field: 'name', label: 'عنوان حساب' },
          { field: 'bankName', label: 'بانک صادرکننده' },
          { field: 'accountNumber', label: 'شماره حساب' },
          { field: 'balance', label: 'موجودی کل' }
        ];
      case 'cashboxes':
        return [
          { field: 'id', label: 'شناسه' },
          { field: 'name', label: 'عنوان صندوق' },
          { field: 'balance', label: 'موجودی' }
        ];
      case 'invoices':
        return [
          { field: 'id', label: 'شناسه' },
          { field: 'invoiceNumber', label: 'شماره فاکتور' },
          { field: 'type', label: 'نوع سند' },
          { field: 'jalaliDate', label: 'تاریخ ثبت' },
          { field: 'totalAmount', label: 'مبلغ کل' }
        ];
      case 'transactions':
        return [
          { field: 'id', label: 'شناسه' },
          { field: 'type', label: 'نوع تراکنش' },
          { field: 'amount', label: 'مبلغ' },
          { field: 'jalaliDate', label: 'تاریخ اثر' },
          { field: 'description', label: 'شرح تراکنش' }
        ];
      case 'warehouses':
        return [
          { field: 'id', label: 'شناسه' },
          { field: 'name', label: 'نام انبار' },
          { field: 'code', label: 'کد انبار' },
          { field: 'location', label: 'موقعیت مکانی' }
        ];
      case 'product_categories':
        return [
          { field: 'id', label: 'شناسه' },
          { field: 'code', label: 'کد گروه' },
          { field: 'name', label: 'نام گروه کالا' }
        ];
      case 'person_groups':
        return [
          { field: 'id', label: 'شناسه' },
          { field: 'name', label: 'گروه طرف حساب' }
        ];
      case 'person_roles':
        return [
          { field: 'id', label: 'شناسه' },
          { field: 'code', label: 'کد نقش' },
          { field: 'name', label: 'عنوان نقش' }
        ];
      case 'checkbooks':
        return [
          { field: 'id', label: 'شناسه' },
          { field: 'bankName', label: 'بانک صادرکننده' },
          { field: 'startNumber', label: 'برگه شروع' },
          { field: 'totalLeaves', label: 'تعداد برگ چک' }
        ];
      case 'issued_checks':
      case 'received_checks':
        return [
          { field: 'id', label: 'شناسه' },
          { field: 'checkNumber', label: 'شماره چک' },
          { field: 'bankName', label: 'نام بانک' },
          { field: 'amount', label: 'مبلغ چک' },
          { field: 'dueDate', label: 'تاریخ سررسید' },
          { field: 'status', label: 'وضعیت' }
        ];
      case 'users':
        return [
          { field: 'id', label: 'شناسه' },
          { field: 'username', label: 'نام کاربری' },
          { field: 'name', label: 'نام نمایشی' },
          { field: 'role', label: 'سطح دسترسی' }
        ];
      default:
        return [
          { field: 'id', label: 'شناسه' }
        ];
    }
  };

  const getFieldLabel = (field: string) => {
    const fieldLabels: Record<string, string> = {
      'id': 'شناسه رکورد',
      'name': 'نام / عنوان',
      'title': 'عنوان فرعی',
      'amount': 'مبلغ تراکنش',
      'balance': 'مانده حساب / صندوق',
      'code': 'کد شناسایی',
      'personCode': 'کد یکتا شخص',
      'invoiceNumber': 'شماره سند فاکتور',
      'jalaliDate': 'تاریخ شمسی',
      'date': 'تاریخ میلادی سیستم',
      'type': 'نوع ساختاری',
      'status': 'وضعیت کلی',
      'phoneNumber': 'شماره همراه',
      'phone': 'تلفن ثابت',
      'address': 'نشانی پستی',
      'role': 'نقش کاربری / فردی',
      'description': 'شرح عملیات',
      'desc': 'توضیحات تکمیلی',
      'accountId': 'شناسه حساب بانکی',
      'cashboxId': 'شناسه صندوق مرتبط',
      'totalAmount': 'جمع جزئی',
      'paidAmount': 'کل پرداختی',
      'unitPrice': 'بهای واحد',
      'buyPrice': 'بهای خرید فرضی',
      'price': 'بهای فروش مصوب',
      'stock': 'موجودی شروع دوره',
      'categoryId': 'شناسه گروه کالا',
      'bankName': 'نام موسسه بانکی',
      'accountNumber': 'شماره سپرده / حساب',
      'shaba': 'شماره شبا مالی',
      'alias': 'نام مستعار کاربری',
      'createdAt': 'زمان ثبت اولیه',
      'updatedAt': 'آخرین زمان ویرایش'
    };
    return fieldLabels[field] || field;
  };

  const formatValue = (field: string, val: any) => {
    if (val === null || val === undefined) return '-';
    if (typeof val === 'boolean') return val ? 'بله' : 'خیر';
    if (Array.isArray(val)) return `[لیست دارای ${val.length} ردیف]`;
    if (typeof val === 'object') return JSON.stringify(val);
    
    // Format timestamp
    if (['createdAt', 'updatedAt', 'lastUpdated'].includes(field) && typeof val === 'number') {
      try {
        return new Date(val).toLocaleString('fa-IR');
      } catch (e) {
        return String(val);
      }
    }

    // Format financial currencies
    if (['amount', 'balance', 'totalAmount', 'unitPrice', 'buyPrice', 'price', 'paidAmount', 'discountAmount', 'taxAmount'].includes(field)) {
      return (
        <span className="font-mono font-bold text-emerald-800" dir="ltr">
          {new Intl.NumberFormat('fa-IR').format(Number(val))} <span className="text-[10px] text-emerald-600 font-normal">تومان</span>
        </span>
      );
    }

    if (field === 'role') {
      const roles: Record<string, string> = {
        'customer': 'مشتری',
        'supplier': 'تامین‌کننده',
        'employee': 'کارمند',
        'admin': 'مدیر عالی سیستم',
        'accountant': 'حساب‌دار ارشد',
        'cashier': 'صندوق‌دار شعبه',
        'viewer': 'ناظر و گزارش‌گیر'
      };
      return roles[val] || val;
    }

    if (field === 'type') {
      const types: Record<string, string> = {
        'sale': 'فروش',
        'purchase': 'خرید',
        'proforma': 'پیش فاکتور',
        'warehouse_receipt': 'رسید انبار (ورودی)',
        'warehouse_remittance': 'حواله انبار (خروجی)',
        'receive': 'رسید دریافت وجه',
        'pay': 'رسید پرداخت وجه',
        'salary': 'فیش حقوقی',
        'service': 'خدمات',
        'goods': 'کالای فیزیکی'
      };
      return types[val] || val;
    }

    return String(val);
  };

  // Get generic or descriptive text to represent record in deletion confirmation
  const getRecordDisplayName = (rec: any) => {
    if (!rec) return '';
    return rec.name || rec.title || rec.invoiceNumber || rec.checkNumber || rec.id || 'آیتم منتخب';
  };

  // Apply search term filtering to records
  const getFilteredRecords = () => {
    if (!searchTerm) return records;
    const term = searchTerm.toLowerCase();
    return records.filter(rec => {
      return Object.entries(rec).some(([key, val]) => {
        if (val === null || val === undefined) return false;
        if (typeof val === 'object') return false;
        return String(val).toLowerCase().includes(term);
      });
    });
  };

  const filtered = getFilteredRecords();

  return (
    <div className="space-y-8 max-w-5xl mx-auto" dir="rtl">
      {/* Upper Core Panel */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden"
      >
        <div className="bg-gradient-to-r from-rose-50 to-slate-50/30 px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
            <Database className="w-5 h-5 text-rose-600" />
            مدیریت پایگاه داده و ذخیره‌سازی محلی
          </h2>
          <button 
            onClick={handleRefresh}
            className="p-2 bg-white rounded-lg border border-gray-200 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all shadow-sm"
            title="بروزرسانی آمار جداول"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
        
        <div className="p-6 md:p-8 space-y-8">
          
          {/* Core Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl p-6 shadow-md text-white">
              <h3 className="font-medium text-indigo-100 flex items-center gap-2 mb-4">
                <Layers className="w-5 h-5 opacity-80" />
                حجم کل دیتابیس (database.sqlite)
              </h3>
              <div className="text-4xl font-extrabold font-mono tracking-tight text-left" dir="ltr">
                {formatSize(stats.totalSize)}
              </div>
            </div>
            
            <div className="bg-slate-50 border border-gray-200 rounded-2xl p-6 shadow-inner flex flex-col justify-center items-center text-center gap-4">
              <div className="flex gap-4 w-full">
                <button
                  onClick={handleFixPriceHistoryDates}
                  className="flex-1 flex flex-col items-center justify-center gap-2 py-4 bg-white border-2 border-indigo-100 hover:border-indigo-300 rounded-xl transition-all shadow-sm group"
                >
                  <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <AlertTriangle className="w-5 h-5 text-indigo-600" />
                  </div>
                  <span className="font-bold text-gray-700 text-sm">اصلاح تاریخ‌های نادرست قیمت</span>
                </button>
              </div>
              <div className="flex gap-4 w-full">
                <button
                  onClick={handleBackup}
                  className="flex-1 flex flex-col items-center justify-center gap-2 py-4 bg-white border-2 border-emerald-100 hover:border-emerald-300 rounded-xl transition-all shadow-sm group"
                >
                  <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Download className="w-5 h-5 text-emerald-600" />
                  </div>
                  <span className="font-bold text-gray-700 text-sm">دانلود نسخه پشتیبان</span>
                </button>
                
                <div className="flex-1 relative">
                  <input 
                    type="file" 
                    accept=".json,.sql"
                    onChange={handleRestoreFileSelect}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <button
                    type="button"
                    className="w-full h-full flex flex-col items-center justify-center gap-2 py-4 bg-white border-2 border-amber-100 hover:border-amber-300 rounded-xl transition-all shadow-sm group"
                  >
                    <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Upload className="w-5 h-5 text-amber-600" />
                    </div>
                    <span className="font-bold text-gray-700 text-sm">بازیابی از فایل</span>
                  </button>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-5 rounded-2xl border-2 border-indigo-100 shadow-sm relative overflow-hidden">
              <div className="flex justify-between items-center relative z-10">
                <div>
                  <h3 className="font-bold text-indigo-900 text-base mb-1">مهاجرت به PostgreSQL</h3>
                  <p className="text-xs text-indigo-700/80 font-medium">Wizard انتقال یکپارچه و امن داده‌ها</p>
                </div>
                <button onClick={() => setShowMigrationWizard(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-xl text-sm transition-all shadow-md">
                  شروع فرآیند
                </button>
              </div>
            </div>

            <DriveBackup showNotification={showNotification} />
          </div>
  
          {showMigrationWizard && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
              <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <MigrationWizard onClose={() => setShowMigrationWizard(false)} />
              </div>
            </div>
          )}

          {/* Backup Restore Confirmation Modal */}
          {restoreConfirmData && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200" dir="rtl">
                <div className="bg-gradient-to-r from-amber-50 to-rose-50 px-6 py-5 border-b border-gray-100 flex items-center gap-3">
                  <div className="bg-amber-100 p-2 rounded-full">
                    <AlertTriangle className="w-6 h-6 text-amber-600 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-gray-800">تأیید نهایی بازیابی پایگاه داده</h3>
                    <p className="text-[10px] text-amber-700/80 font-bold">هشدار: این عملیات غیرقابل بازگشت است</p>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4 text-sm text-amber-900 space-y-2">
                    <p className="font-bold">مشخصات فایل نسخه پشتیبان انتخاب‌شده:</p>
                    <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                      <span className="text-gray-500">نام فایل:</span>
                      <span className="text-gray-800 font-mono text-left" dir="ltr">{restoreConfirmData.fileName}</span>
                      
                      <span className="text-gray-500">حجم فایل:</span>
                      <span className="text-gray-800 font-mono text-left" dir="ltr">{formatSize(restoreConfirmData.fileSize)}</span>
                      
                      <span className="text-gray-500">جداول پشتیبان‌گیری شده:</span>
                      <span className="text-gray-800 font-mono text-left" dir="ltr">{restoreConfirmData.tableCount} جدول</span>
                    </div>
                  </div>

                  <p className="text-sm font-semibold text-gray-600 leading-relaxed">
                    با تأیید این فرآیند، تمام اطلاعات فعلی موجود در پایگاه داده سیستم به صورت کامل حذف شده و اطلاعات نسخه پشتیبان بالا جایگزین آنها خواهند شد. 
                  </p>

                  <div className="bg-red-50 border border-red-100 text-red-700 rounded-xl p-4 text-xs font-bold leading-relaxed">
                    جهت اعمال تغییرات و لود صحیح اطلاعات تازه واردشده، سیستم پس از تکمیل فرآیند به صورت خودکار بازخوانی (Reload) خواهد شد.
                  </div>
                </div>

                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    disabled={isRestoring}
                    onClick={() => setRestoreConfirmData(null)}
                    className="px-4 py-2 bg-white border border-gray-200 text-gray-600 hover:bg-gray-100 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                  >
                    انصراف
                  </button>
                  <button
                    type="button"
                    disabled={isRestoring}
                    onClick={handleConfirmRestore}
                    className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-extrabold transition-all flex items-center gap-2 shadow-md shadow-amber-100 disabled:opacity-50"
                  >
                    {isRestoring ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        در حال بازیابی اطلاعات...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        تأیید و بازنشانی دیتابیس
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Collections Breakdown Tables */}
          <div>
            <h3 className="text-gray-800 font-extrabold text-base mb-2 border-b border-gray-100 pb-2 flex items-center gap-2">
              <span>تفکیک جداول پایگاه داده</span>
              <span className="text-[10px] text-gray-400 font-normal">(برای مشاهده و حذف رکوردهای هر جدول، روی ردیف آن کلیک کنید)</span>
            </h3>
            <div className="overflow-x-auto bg-white border border-gray-100 rounded-xl">
              <table className="w-full text-right">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="py-4 px-6 font-semibold text-gray-600 w-16 text-center">ردیف</th>
                    <th className="py-4 px-6 font-semibold text-gray-600">نام جدول (Collection)</th>
                    <th className="py-4 px-6 font-semibold text-gray-600 text-center">تعداد رکوردها</th>
                    <th className="py-4 px-6 font-semibold text-gray-600 text-left">حجم داده‌ها</th>
                    <th className="py-4 px-6 font-semibold text-gray-650 text-center w-28">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-sm">
                  {stats.collections.map((col, idx) => (
                    <tr 
                      key={idx} 
                      onClick={() => handleSelectTable(col.name)}
                      className={`cursor-pointer transition-colors ${selectedTable === col.name ? 'bg-rose-50/40 hover:bg-rose-50/60' : 'hover:bg-gray-50'}`}
                    >
                      <td className="py-4 px-6 text-gray-400 font-mono text-center">{idx + 1}</td>
                      <td className="py-4 px-6">
                        <div className="font-bold text-gray-800 flex items-center gap-1.5">
                          <span>{getCollectionNameInPersian(col.name)}</span>
                          {selectedTable === col.name && (
                            <span className="px-1.5 py-0.5 bg-rose-100 text-rose-800 text-[10px] rounded font-bold">فعال</span>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-400 font-mono mt-0.5">{col.name}</div>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <div className="inline-flex items-center justify-center min-w-[3rem] px-2 py-1 bg-slate-100 text-slate-700 rounded-lg font-bold font-mono text-xs">
                          {col.recordCount}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-left font-mono text-gray-600 font-medium">
                        {formatSize(col.size)}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectTable(col.name);
                          }}
                          className="px-3 py-1 bg-white border border-gray-200 text-gray-600 hover:border-rose-500 hover:text-rose-500 rounded-lg text-xs font-bold flex items-center gap-1 mx-auto shadow-sm"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          مرور داده
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Helper Note */}
          <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 flex gap-3 text-sm text-indigo-800">
            <AlertCircle className="w-5 h-5 shrink-0 text-indigo-500 mt-0.5" />
            <div className="leading-relaxed">
              <p className="font-bold mb-1">اطلاعات ذخیره‌سازی</p>
              <p>این سامانه اکنون تمامی اطلاعات را به صورت محلی در یک فایل پایگاه داده امن <code>database.sqlite</code> در سرور/سیستم ذخیره می‌کند. برای اطمینان بیشتر، می‌توانید به صورت مستمر نسخه پشتیبان (فایل‌های JSON) تهیه کنید.</p>
            </div>
          </div>
  
        </div>
      </motion.div>

      {/* Explorer Section */}
      <div ref={explorerRef}>
        <AnimatePresence mode="wait">
          {selectedTable && (
            <motion.div
              key="selected-table-details"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden"
            >
              <div className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-rose-500 animate-pulse" />
                  <div>
                    <h2 className="font-black text-base text-gray-100">
                      مرورگر و مدیریت رکوردهای جدول {getCollectionNameInPersian(selectedTable)}
                    </h2>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">{selectedTable} ({records.length} رکورد بارگذاری شده)</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedTable(null)}
                  className="p-1 px-2 border border-slate-700 rounded-lg hover:bg-slate-800 text-slate-300 transition-all font-bold text-xs flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  بستن مرورگر
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Real-time search tools */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="relative flex-1 max-w-md">
                    <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-gray-400" />
                    </span>
                    <input
                      type="text"
                      className="w-full pr-10 pl-4 py-2 border border-gray-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-sm font-semibold transition-all shadow-sm"
                      placeholder="جستجو در تمام فیلدها و صفت‌های رکوردها..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                      <button 
                        onClick={() => setSearchTerm('')}
                        className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 hover:text-rose-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="text-xs text-gray-500 font-bold">
                    {searchTerm ? `یافت شده: ${filtered.length} از مجمع ${records.length} رکورد` : `کل رکوردهای جدول: ${records.length} رکورد`}
                  </div>
                </div>

                {/* Loading State or Table View */}
                {loadingRecords ? (
                  <div className="py-20 flex flex-col justify-center items-center gap-3">
                    <RefreshCw className="w-8 h-8 text-rose-500 animate-spin" />
                    <span className="text-sm font-extrabold text-gray-500">در حال دریافت داده‌ها از دیتابیس...</span>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="py-16 text-center border-2 border-dashed border-gray-150 rounded-xl">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm font-black text-gray-500">رکوردی پیدا نشد</p>
                    <p className="text-xs text-gray-400 mt-1">هیچ رکوردی ثبت نشده یا با عبارت جستجوی شما مطابقت ندارد</p>
                  </div>
                ) : (
                  <div className="overflow-hidden border border-gray-100 rounded-xl bg-white shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-sm">
                        <thead className="bg-gray-50 border-b border-gray-100">
                          <tr>
                            <th className="py-3.5 px-4 font-semibold text-gray-600 w-12 text-center">جزئیات</th>
                            {getColumnsForTable(selectedTable).map((col, idx) => (
                              <th key={idx} className="py-3.5 px-4 font-semibold text-gray-600">
                                {col.label}
                              </th>
                            ))}
                            <th className="py-3.5 px-4 font-semibold text-rose-600 text-center w-24">عملیات مدیریت</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {filtered.map((item, index) => {
                            const isExpanded = expandedRecordId === item.id;
                            const tableColumns = getColumnsForTable(selectedTable);
                            
                            return (
                              <React.Fragment key={item.id ? `rec-${item.id}-${index}` : `idx-${index}`}>
                                {/* Row element */}
                                <tr className={`hover:bg-slate-50/50 transition-colors ${isExpanded ? 'bg-slate-50' : ''}`}>
                                  <td className="py-3.5 px-4 text-center">
                                    <button
                                      onClick={() => setExpandedRecordId(isExpanded ? null : item.id)}
                                      className="p-1 text-slate-500 hover:text-indigo-600 focus:outline-none hover:bg-slate-100 rounded"
                                      title={isExpanded ? "بستن جزئیات" : 'نمایش جزئیات کامل رکورد'}
                                    >
                                      {isExpanded ? (
                                        <ChevronUp className="w-4 h-4" />
                                      ) : (
                                        <ChevronDown className="w-4 h-4" />
                                      )}
                                    </button>
                                  </td>
                                  
                                  {tableColumns.map((col, cIdx) => (
                                    <td key={cIdx} className="py-3.5 px-4 text-gray-800">
                                      {col.field === 'id' ? (
                                        <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded truncate max-w-[100px] inline-block" title={item[col.field]}>
                                          {item[col.field]?.substring(0, 8) || '-'}...
                                        </span>
                                      ) : (
                                        <div className="font-bold truncate max-w-[200px]" title={String(item[col.field] || '')}>
                                          {formatValue(col.field, item[col.field])}
                                        </div>
                                      )}
                                    </td>
                                  ))}

                                  <td className="py-3.5 px-4 text-center">
                                    <button
                                      onClick={() => setRecordToDelete(item)}
                                      className="p-2 border border-rose-100 hover:border-rose-500 text-rose-500 hover:bg-rose-50 rounded-lg shadow-sm transition-all inline-flex items-center justify-center"
                                      title="حذف دائمی از دیتابیس"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </td>
                                </tr>

                                {/* Collapsible raw details row */}
                                {isExpanded && (
                                  <tr>
                                    <td colSpan={tableColumns.length + 2} className="p-0">
                                      <div className="p-5 bg-gradient-to-r from-slate-50 to-indigo-50/10 border-b border-gray-100">
                                        <h4 className="font-black text-rose-800 text-xs mb-3 flex items-center gap-1">
                                          <Eye className="w-3.5 h-3.5" />
                                          شناسنامه کامل رکورد اطلاعاتی در قالب (Key-Value)
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                          {Object.entries(item).map(([key, val]) => (
                                            <div key={key} className="bg-white border border-gray-150 rounded-xl p-3 flex flex-col justify-between gap-1 shadow-sm">
                                              <span className="text-[10px] text-gray-400 font-mono tracking-wider">{key}</span>
                                              <span className="text-xs font-semibold text-gray-650 mb-1">{getFieldLabel(key)}</span>
                                              
                                              {/* Formatted View of Val */}
                                              {typeof val === 'object' && val !== null ? (
                                                <div className="p-1 px-2 bg-slate-50 rounded text-[10px] font-mono text-gray-500 break-all max-h-[100px] overflow-y-auto" dir="ltr">
                                                  {JSON.stringify(val, null, 2)}
                                                </div>
                                              ) : (
                                                <div className="text-sm font-black text-gray-800 break-words mt-0.5">
                                                  {formatValue(key, val)}
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Delete Confirmation Warning Dialog Modal */}
      <AnimatePresence>
        {recordToDelete && (
          <div key="delete-record-modal" className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-gray-100"
              dir="rtl"
            >
              <div className="bg-rose-50 p-6 pb-4 border-b border-rose-100/50 flex items-start gap-4">
                <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6 text-rose-600 animate-bounce" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-black text-rose-950 text-base">هشدار امنیتی حذف مستقیم رکورد</h3>
                  <p className="text-xs text-rose-800 leading-relaxed font-bold">
                    شما در حال حذف مستقیم شناسه زیر از دیتابیس هستید:
                  </p>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="p-3.5 bg-slate-50 border border-slate-150 rounded-xl space-y-2 font-semibold text-sm">
                  <div className="flex justify-between items-center text-xs text-gray-400">
                    <span>شناسه (ID)</span>
                    <span className="font-mono">{recordToDelete.id}</span>
                  </div>
                  <div className="flex justify-between items-center text-gray-700">
                    <span>عنوان رکورد:</span>
                    <span className="font-extrabold text-slate-900">{getRecordDisplayName(recordToDelete)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>جدول هدف:</span>
                    <span className="font-bold bg-slate-200 text-slate-800 px-2 py-0.5 rounded text-[10px] font-mono">{selectedTable}</span>
                  </div>
                </div>

                <div className="bg-rose-50/50 border border-rose-100 px-4 py-3 rounded-lg text-xs leading-relaxed text-rose-900">
                  <span className="font-extrabold block mb-1">توجه کنید:</span>
                  در صورتی که این رکورد دارای روابط با سایر بخش‌ها باشد (مثلا شخص دارای فاکتور و تراکنش باشد)، حذف آن ممکن است محاسبات ترتیبی مالی را دچار ناهماهنگی کند. حذف برای موارد تصحیح خطاست.
                </div>
              </div>

              <div className="bg-slate-50 px-6 py-4 flex gap-3 border-t border-slate-100">
                <button
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white font-extrabold rounded-xl transition-colors shadow flex items-center justify-center gap-1.5"
                >
                  {isDeleting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      در حال حذف...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      بله، قطعاً حذف شود
                    </>
                  )}
                </button>
                <button
                  onClick={() => setRecordToDelete(null)}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 font-extrabold rounded-xl transition-all shadow-sm"
                >
                  انصراف
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
