import React, { useState, useEffect } from 'react';
import BeautifulLoading from '../BeautifulLoading';
import { motion } from 'motion/react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { getProducts, getWarehouses, getWarehouseStocks } from '../../services/dataService';
import { Product, Warehouse, WarehouseStock } from '../../types';

interface AnalyticalDashboardProps {
  showNotification?: (type: 'success' | 'error', message: string) => void;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8B5CF6', '#F43F5E', '#10B981', '#F59E0B'];

const AnalyticalDashboard: React.FC<AnalyticalDashboardProps> = ({ showNotification }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseStocks, setWarehouseStocks] = useState<WarehouseStock[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);


  const [reportData, setReportData] = useState<any>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/reports/analytical');
      const json = await res.json();
      if (json.success) {
        setReportData(json.data);
      } else {
        if (showNotification) showNotification('error', 'خطا در دریافت اطلاعات سرور');
      }
    } catch (err) {
      console.error(err);
      if (showNotification) showNotification('error', 'خطا در دریافت اطلاعات');
    } finally {
      setIsLoading(false);
    }
  };


  const inventoryByWarehouse = reportData?.inventoryByWarehouse || [];
  const topProductsBySales = reportData?.topProductsBySales || [];
  const formatCurrency = (val: number | string) => {
    return Number(val).toLocaleString('fa-IR');
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-100" dir="rtl">
          <p className="font-bold text-gray-800 mb-2">{data.name}</p>
          <p className="text-sm text-gray-600">تعداد موجودی: <span className="font-bold">{formatCurrency(data.totalItems)}</span> {data.baseUnit || 'عدد'}</p>
          <p className="text-sm text-gray-600">ارزش ریالی: <span className="font-bold">{formatCurrency(data.totalValue)}</span></p>
        </div>
      );
    }
    return null;
  };
  if (isLoading) {
    return (
      <BeautifulLoading />
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-xl font-black text-gray-800 mb-1">داشبورد تحلیلی انبار</h2>
          <p className="text-sm text-gray-500">مشاهده وضعیت موجودی کالاها به تفکیک انبارها</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"
        >
          <h3 className="text-lg font-bold text-gray-800 mb-6">موجودی کالا بر اساس تعداد</h3>
          {inventoryByWarehouse?.length > 0 ? (
            <div className="h-80 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={inventoryByWarehouse}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="totalItems"
                    nameKey="name"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {inventoryByWarehouse.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-400 font-bold">داده‌ای برای نمایش وجود ندارد</div>
          )}
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"
        >
          <h3 className="text-lg font-bold text-gray-800 mb-6">موجودی کالا بر اساس ارزش ریالی</h3>
          {inventoryByWarehouse?.length > 0 ? (
            <div className="h-80 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={inventoryByWarehouse}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="totalValue"
                    nameKey="name"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {inventoryByWarehouse.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-400 font-bold">داده‌ای برای نمایش وجود ندارد</div>
          )}
        </motion.div>
      </div>
      
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"
      >
          <h3 className="text-lg font-bold text-gray-800 mb-4">خلاصه وضعیت موجودی</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead>
                <tr className="bg-gray-50 text-gray-500">
                  <th className="p-3 font-bold rounded-r-lg">نام انبار</th>
                  <th className="p-3 font-bold text-center">تعداد کل کالاها</th>
                  <th className="p-3 font-bold text-center relative rounded-l-lg hover:bg-gray-100">ارزش کل موجودی</th>
                </tr>
              </thead>
              <tbody>
                {inventoryByWarehouse.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                        <span className="font-bold text-gray-800">{item.name}</span>
                      </div>
                    </td>
                    <td className="p-3 text-center font-bold text-gray-700">{formatCurrency(item.totalItems)}</td>
                    <td className="p-3 text-center font-bold text-gray-700">{formatCurrency(item.totalValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
      </motion.div>
    </div>
  );
};

export default AnalyticalDashboard;
