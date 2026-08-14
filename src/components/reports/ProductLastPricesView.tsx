import React, { useState, useMemo } from 'react';
import { Search, Package, TrendingUp, TrendingDown, ArrowLeftRight, Clock } from 'lucide-react';

export default function ProductLastPricesView({
  products = [],
  invoices = [],
  formatCurrency,
  toPersianDigits,
  formatDateDisplay
}: any) {
  const [searchTerm, setSearchTerm] = useState('');

  const productPrices = useMemo(() => {
    // We need to find the latest purchase and latest sale for each product
    const latestPurchases: Record<string, { price: number, date: string, invoiceNumber: string }> = {};
    const latestSales: Record<string, { price: number, date: string, invoiceNumber: string }> = {};

    // Sort invoices by date ascending so the last one processed is the newest
    const sortedInvoices = [...(invoices || [])]
      .filter(i => i.status !== 'voided' && i.status !== 'draft' && !i.isDeleted && !i.isDraft)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    sortedInvoices.forEach(inv => {
      if (inv.items && Array.isArray(inv.items)) {
        inv.items.forEach(item => {
          const pid = item.productId?.toString();
          if (!pid) return;

          if (inv.type === 'purchase') {
            latestPurchases[pid] = { price: Number(item.price) || 0, date: inv.date, invoiceNumber: inv.invoiceNumber };
          } else if (inv.type === 'sale') {
            latestSales[pid] = { price: Number(item.price) || 0, date: inv.date, invoiceNumber: inv.invoiceNumber };
          }
        });
      }
    });

    return (products || []).filter((p: any) => p.type !== 'service' && p.isActive !== false).map((p: any) => {
      const pId = p.id?.toString();
      return {
        ...p,
        lastPurchase: latestPurchases[pId] || null,
        lastSale: latestSales[pId] || null,
      };
    }).filter((p: any) => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || (p.code && p.code.toLowerCase().includes(searchTerm.toLowerCase())));
  }, [products, invoices, searchTerm]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Package className="w-6 h-6 text-indigo-600" />
            آخرین قیمت‌های خرید و فروش کالاها
          </h2>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            این گزارش قیمت کالاها را بر اساس آخرین فاکتورهای قطعی ثبت شده در سیستم استخراج می‌کند
          </p>
        </div>
        <div className="w-full md:w-72 relative">
          <input
            type="text"
            placeholder="جستجوی نام یا کد کالا..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="py-4 px-6 font-bold text-slate-700 text-sm">کد و نام کالا</th>
                <th className="py-4 px-6 font-bold text-slate-700 text-sm">قیمت پایه سیستم</th>
                <th className="py-4 px-6 font-bold text-emerald-700 text-sm bg-emerald-50/50">آخرین قیمت خرید ثبت شده</th>
                <th className="py-4 px-6 font-bold text-indigo-700 text-sm bg-indigo-50/50">آخرین قیمت فروش ثبت شده</th>
              </tr>
            </thead>
            <tbody>
              {productPrices.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-500">
                    کالایی یافت نشد
                  </td>
                </tr>
              ) : (
                productPrices.map((product: any, idx: number) => (
                  <tr key={product.id} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs">
                          {product.code || toPersianDigits(idx + 1)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 text-sm">{product.name}</div>
                          {product.barcode && <div className="text-xs text-slate-400 mt-0.5">{toPersianDigits(product.barcode)}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 align-middle">
                      <div className="text-xs text-slate-500">خرید: {toPersianDigits(formatCurrency(product.purchasePrice))}</div>
                      <div className="text-xs text-slate-500 mt-1">فروش: {toPersianDigits(formatCurrency(product.price))}</div>
                    </td>
                    <td className="py-4 px-6 align-middle bg-emerald-50/20">
                      {product.lastPurchase ? (
                        <div>
                          <div className="font-bold text-emerald-700 flex items-center gap-1.5">
                            <TrendingDown className="w-4 h-4" />
                            {toPersianDigits(formatCurrency(product.lastPurchase.price))}
                          </div>
                          <div className="text-[11px] text-emerald-600/70 mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            فاکتور {toPersianDigits(product.lastPurchase.invoiceNumber)} - {toPersianDigits(formatDateDisplay(product.lastPurchase.date))}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">فاقد خرید ثبت شده</span>
                      )}
                    </td>
                    <td className="py-4 px-6 align-middle bg-indigo-50/20">
                      {product.lastSale ? (
                        <div>
                          <div className="font-bold text-indigo-700 flex items-center gap-1.5">
                            <TrendingUp className="w-4 h-4" />
                            {toPersianDigits(formatCurrency(product.lastSale.price))}
                          </div>
                          <div className="text-[11px] text-indigo-600/70 mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            فاکتور {toPersianDigits(product.lastSale.invoiceNumber)} - {toPersianDigits(formatDateDisplay(product.lastSale.date))}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">فاقد فروش ثبت شده</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
