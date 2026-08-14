import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Clock, CheckCircle2, XCircle, Search, RefreshCw, Send, 
  BarChart3, List, Filter, ChevronDown, Download, AlertCircle, 
  Calendar as CalendarIcon, Smartphone, Mail, MessageSquare, Bell,
  MoreVertical, FileText, ChevronRight, MapPin, Server, Copy, Eye,
  Trash2, X, ChevronLeft
} from "lucide-react";
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend 
} from "recharts";

// --- Types ---
type ChannelType = 'sms' | 'email' | 'whatsapp' | 'telegram' | 'push';
type LogStatus = 'delivered' | 'failed' | 'pending' | 'queued' | 'scheduled';

interface MessageLog {
  id: string;
  recipient: { name: string; contact: string };
  sender: string;
  content: string;
  status: LogStatus;
  channelType: ChannelType;
  channelName: string;
  createdAt: string;
  deliveryTimeMs?: number;
  error?: string;
  campaign?: string;
  rawResponse?: string;
}

// --- Mock Data ---
const generateMockLogs = (count: number): MessageLog[] => {
  const statuses: LogStatus[] = ['delivered', 'delivered', 'delivered', 'failed', 'pending', 'queued', 'scheduled'];
  const channels: {type: ChannelType, name: string}[] = [
    {type: 'sms', name: 'Kavehnegar SMS'},
    {type: 'email', name: 'SendGrid Email'},
    {type: 'whatsapp', name: 'WhatsApp Business'},
    {type: 'telegram', name: 'Telegram Bot'}
  ];
  const logs: MessageLog[] = [];
  for (let i = 0; i < count; i++) {
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const channel = channels[Math.floor(Math.random() * channels.length)];
    const createdAt = new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000));
    
    logs.push({
      id: `MSG-${10000 + i}`,
      recipient: { 
        name: `User ${i}`, 
        contact: channel.type === 'email' ? `user${i}@example.com` : `+98912${Math.floor(1000000 + Math.random() * 9000000)}` 
      },
      sender: channel.type === 'email' ? 'support@company.com' : '10004346',
      content: `Hello ${i}, this is a test message to ensure delivery works. ` + (Math.random() > 0.5 ? 'Please ignore.' : 'Action required.'),
      status,
      channelType: channel.type,
      channelName: channel.name,
      createdAt: createdAt.toISOString(),
      deliveryTimeMs: status === 'delivered' ? Math.floor(200 + Math.random() * 2000) : undefined,
      error: status === 'failed' ? 'ERR_TIMEOUT: Provider did not respond in time.' : undefined,
      campaign: Math.random() > 0.7 ? 'Summer Sale Promo' : undefined,
      rawResponse: `{\n  "status": "${status}",\n  "code": 200,\n  "messageId": "ext-${Math.random().toString(36).substring(7)}"\n}`
    });
  }
  return logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

const mockLogs = generateMockLogs(150);

// --- Colors ---
const STATUS_COLORS = {
  delivered: '#10b981', // emerald-500
  failed: '#f43f5e', // rose-500
  pending: '#f59e0b', // amber-500
  queued: '#3b82f6', // blue-500
  scheduled: '#8b5cf6', // violet-500
};

// --- Helpers ---
const formatRelativeTime = (dateString: string) => {
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const daysDifference = Math.round((new Date(dateString).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysDifference === 0) {
      const hoursDiff = Math.round((new Date(dateString).getTime() - new Date().getTime()) / (1000 * 60 * 60));
      if (hoursDiff === 0) {
          const minsDiff = Math.round((new Date(dateString).getTime() - new Date().getTime()) / (1000 * 60));
          return rtf.format(minsDiff, 'minute');
      }
      return rtf.format(hoursDiff, 'hour');
  }
  return rtf.format(daysDifference, 'day');
};

const getChannelIcon = (type: ChannelType) => {
  switch (type) {
    case 'sms': return <MessageSquare className="w-4 h-4 text-slate-500" />;
    case 'email': return <Mail className="w-4 h-4 text-slate-500" />;
    case 'whatsapp': return <Smartphone className="w-4 h-4 text-emerald-500" />;
    case 'telegram': return <Send className="w-4 h-4 text-blue-500" />;
    case 'push': return <Bell className="w-4 h-4 text-indigo-500" />;
    default: return <Server className="w-4 h-4 text-slate-500" />;
  }
};

export default function MessagingLogsView({ showNotification }: { showNotification?: (msg: string, type: string) => void }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'all' | 'delivered' | 'failed' | 'pending' | 'scheduled'>('overview');
  const [searchTerm, setSearchTerm] = useState("");
  const [logs, setLogs] = useState<MessageLog[]>([]);
  
  React.useEffect(() => {
     fetchLogs();
  }, []);
  
  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/data/sms_messages');
      const data = await res.json();
      if (Array.isArray(data)) {
         setLogs(data.map(d => {
            let status = d.status;
            if (status === 'sent') status = 'delivered';
            if (status === 'success') status = 'delivered';
            if (status === 'error') status = 'failed';
            return {
              id: d.id,
              recipient: { 
                 name: d.recipientName || 'نامشخص', 
                 contact: d.recipientNumber || 'نامشخص'
              },
              sender: 'سیستم',
              content: d.messageBody || '',
              status: status as any,
              channelType: 'sms' as any,
              channelName: d.recipientType === 'manual' ? 'ارسال دستی' : 'مخاطبین',
              createdAt: d.createdAt || new Date().toISOString(),
              error: d.status === 'failed' ? 'خطا در ارسال پیام' : undefined
            };
         }).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      }
    } catch (err) {
      console.error(err);
      setLogs(mockLogs as any[]);
    }
  };
  const [selectedLog, setSelectedLog] = useState<MessageLog | null>(null);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  // Derived state
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Tab filter
      if (activeTab !== 'overview' && activeTab !== 'all' && log.status !== activeTab) return false;
      // Search filter
      if (searchTerm) {
        const lowerSearch = searchTerm.toLowerCase();
        return (
          log.recipient.contact.toLowerCase().includes(lowerSearch) ||
          log.recipient.name.toLowerCase().includes(lowerSearch) ||
          log.content.toLowerCase().includes(lowerSearch) ||
          log.id.toLowerCase().includes(lowerSearch)
        );
      }
      return true;
    });
  }, [activeTab, searchTerm]);

  // Analytics calculations (based on all mockLogs for overview, ignoring tab filter but respecting global date filters if implemented)
  const stats = useMemo(() => {
    const total = logs.length;
    const delivered = logs.filter(l => (l.status as any) === 'success' || l.status === 'delivered').length;
    const failed = logs.filter(l => l.status === 'failed').length;
    const pending = logs.filter(l => l.status === 'pending' || l.status === 'queued').length;
    return {
      total,
      deliveredRate: Math.round((delivered / total) * 100),
      failed,
      pending
    };
  }, []);

  const chartData = [
    { name: 'Mon', delivered: 400, failed: 24, pending: 20 },
    { name: 'Tue', delivered: 300, failed: 13, pending: 40 },
    { name: 'Wed', delivered: 550, failed: 45, pending: 10 },
    { name: 'Thu', delivered: 480, failed: 12, pending: 5 },
    { name: 'Fri', delivered: 600, failed: 30, pending: 15 },
    { name: 'Sat', delivered: 200, failed: 5, pending: 50 },
    { name: 'Sun', delivered: 350, failed: 10, pending: 25 },
  ];

  const pieData = [
    { name: 'Delivered', value: stats.deliveredRate, color: STATUS_COLORS.delivered },
    { name: 'Failed', value: Math.round((stats.failed/stats.total)*100), color: STATUS_COLORS.failed },
    { name: 'Pending', value: Math.round((stats.pending/stats.total)*100), color: STATUS_COLORS.pending },
  ];

  // Actions
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    if (showNotification) showNotification("Copied to clipboard", "success");
  };

  const handleRetry = (e: React.MouseEvent, logId: string) => {
    e.stopPropagation();
    if (showNotification) showNotification(`Retrying message ${logId}...`, "info");
  };

  const toggleRowSelection = (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
    e.stopPropagation();
    const newSet = new Set(selectedRows);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedRows(newSet);
  };

  const toggleAllSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedRows(new Set(filteredLogs.map(l => l.id)));
    } else {
      setSelectedRows(new Set());
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 min-h-full bg-slate-50/50">
      
      {/* 1. Executive Summary Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Sent Today</p>
              <h3 className="text-3xl font-bold text-slate-800 mt-1">{stats.total.toLocaleString()}</h3>
            </div>
            <div className="p-2 bg-indigo-50 rounded-lg">
              <Send className="w-5 h-5 text-indigo-600" />
            </div>
          </div>
          <p className="text-xs font-medium text-emerald-600 mt-4 flex items-center gap-1">
            <BarChart3 className="w-3 h-3" />
            +12.5% vs yesterday
          </p>
        </div>
        
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Successful Deliveries</p>
              <h3 className="text-3xl font-bold text-emerald-600 mt-1">{stats.deliveredRate}%</h3>
            </div>
            <div className="p-2 bg-emerald-50 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-4">
            <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${stats.deliveredRate}%` }}></div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Failed / Bounced</p>
              <h3 className="text-3xl font-bold text-rose-600 mt-1">{stats.failed}</h3>
            </div>
            <div className="p-2 bg-rose-50 rounded-lg">
              <XCircle className="w-5 h-5 text-rose-600" />
            </div>
          </div>
          <button className="text-xs font-medium text-rose-600 mt-4 hover:underline flex items-center gap-1">
            <RefreshCw className="w-3 h-3" />
            Retry all failed
          </button>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Pending / Queued</p>
              <h3 className="text-3xl font-bold text-amber-600 mt-1">{stats.pending}</h3>
            </div>
            <div className="p-2 bg-amber-50 rounded-lg">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <p className="text-xs font-medium text-slate-500 mt-4 flex items-center gap-1">
            ~1.2s avg processing time
          </p>
        </div>
      </div>

      {/* 2. Tabbed Navigation */}
      <div className="mb-6 flex overflow-x-auto custom-scrollbar border-b border-slate-200">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3, count: null },
          { id: 'all', label: 'All Logs', icon: List, count: stats.total },
          { id: 'delivered', label: 'Delivered', icon: CheckCircle2, count: logs.filter(l=>l.status==='delivered').length },
          { id: 'failed', label: 'Failed', icon: XCircle, count: stats.failed },
          { id: 'pending', label: 'Pending', icon: Clock, count: stats.pending },
          { id: 'scheduled', label: 'Scheduled', icon: CalendarIcon, count: logs.filter(l=>l.status==='scheduled').length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
              activeTab === tab.id 
                ? 'border-indigo-600 text-indigo-700' 
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-indigo-600' : 'text-slate-400'}`} />
            {tab.label}
            {tab.count !== null && (
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeTab === tab.id ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'overview' ? (
            /* --- Overview Tab (Analytics) --- */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Line Chart */}
              <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-slate-800">Delivery Volume</h3>
                  <select className="text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 outline-none">
                    <option>Last 7 Days</option>
                    <option>Last 30 Days</option>
                    <option>This Year</option>
                  </select>
                </div>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                      <RechartsTooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                      <Line type="monotone" dataKey="delivered" stroke={STATUS_COLORS.delivered} strokeWidth={3} dot={{ r: 4, fill: STATUS_COLORS.delivered }} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="failed" stroke={STATUS_COLORS.failed} strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="pending" stroke={STATUS_COLORS.pending} strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 5" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Donut Chart */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                <h3 className="font-bold text-slate-800 mb-6">Status Distribution</h3>
                <div className="flex-1 flex flex-col items-center justify-center relative min-h-[200px]">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        formatter={(value: number) => [`${value}%`, '']}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center Text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-3xl font-bold text-slate-800">{stats.deliveredRate}%</span>
                    <span className="text-xs text-slate-500">Success Rate</span>
                  </div>
                </div>
                
                {/* Custom Legend */}
                <div className="mt-6 space-y-3">
                  {pieData.map(item => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                        <span className="text-slate-600">{item.name}</span>
                      </div>
                      <span className="font-semibold text-slate-800">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Errors Bar Chart */}
              <div className="lg:col-span-3 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-6">Top Failing Reasons</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={[
                        { name: 'Invalid Number', value: 120 },
                        { name: 'API Timeout', value: 85 },
                        { name: 'Insufficient Credit', value: 40 },
                        { name: 'Blocked by Carrier', value: 30 },
                      ]}
                      margin={{ top: 0, right: 20, bottom: 0, left: 100 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                      <XAxis type="number" axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 12 }} width={120} />
                      <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '8px', border: 'none' }}/>
                      <Bar dataKey="value" fill={STATUS_COLORS.failed} radius={[0, 4, 4, 0]} barSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          ) : (
            /* --- Data Table Tabs --- */
            <div className="space-y-4">
              
              {/* Toolbar */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="relative flex-1 max-w-2xl">
                    <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search by recipient name, phone, email, message ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                      className={`px-4 py-2.5 rounded-xl border font-medium text-sm flex items-center gap-2 transition-colors ${
                        isFilterExpanded ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Filter className="w-4 h-4" />
                      Advanced Filters
                      <ChevronDown className={`w-4 h-4 transition-transform ${isFilterExpanded ? 'rotate-180' : ''}`} />
                    </button>
                    <button className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium text-sm hover:bg-slate-50 flex items-center gap-2">
                      <Download className="w-4 h-4" />
                      Export CSV
                    </button>
                  </div>
                </div>

                {/* Collapsible Filters */}
                <AnimatePresence>
                  {isFilterExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border-t border-slate-100 pt-4 mt-2"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Date Range</label>
                          <div className="relative">
                            <CalendarIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <select className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm appearance-none outline-none focus:ring-2 focus:ring-indigo-500">
                              <option>Last 7 Days</option>
                              <option>Today</option>
                              <option>Yesterday</option>
                              <option>Last 30 Days</option>
                              <option>Custom Range...</option>
                            </select>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Channel</label>
                          <select className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500">
                            <option value="">All Channels</option>
                            <option value="sms">SMS</option>
                            <option value="email">Email</option>
                            <option value="whatsapp">WhatsApp</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Campaign</label>
                          <select className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500">
                            <option value="">All Campaigns</option>
                            <option value="promo">Summer Sale Promo</option>
                            <option value="auth">System Alerts</option>
                          </select>
                        </div>
                        <div className="flex items-end gap-2">
                          <button className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-lg transition-colors">
                            Apply
                          </button>
                          <button className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-sm rounded-lg transition-colors">
                            Reset
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Data Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col relative">
                
                {/* Bulk Actions Bar */}
                <AnimatePresence>
                  {selectedRows.size > 0 && (
                    <motion.div
                      initial={{ y: -50, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -50, opacity: 0 }}
                      className="absolute top-0 left-0 right-0 bg-indigo-600 text-white px-6 py-3 z-10 flex items-center justify-between shadow-md"
                    >
                      <div className="text-sm font-medium">
                        {selectedRows.size} row(s) selected
                      </div>
                      <div className="flex items-center gap-3">
                        <button className="text-sm font-medium bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5">
                          <RefreshCw className="w-4 h-4" /> Retry Selected
                        </button>
                        <button className="text-sm font-medium bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5">
                          <Trash2 className="w-4 h-4" /> Delete
                        </button>
                        <button 
                          onClick={() => setSelectedRows(new Set())}
                          className="p-1.5 hover:bg-white/20 rounded-lg transition-colors ml-2"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="overflow-x-auto min-h-[400px]">
                  {filteredLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-slate-500">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                        <Search className="w-8 h-8 text-slate-300" />
                      </div>
                      <p className="text-lg font-medium text-slate-700">No results found</p>
                      <p className="text-sm mt-1">Try adjusting your filters or search term.</p>
                      <button 
                        onClick={() => {setSearchTerm(""); setIsFilterExpanded(false);}}
                        className="mt-4 text-indigo-600 font-medium hover:underline"
                      >
                        Clear all filters
                      </button>
                    </div>
                  ) : (
                    <table className="w-full text-sm text-left whitespace-nowrap">
                      <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold sticky top-0 z-0">
                        <tr>
                          <th className="px-6 py-4 w-10">
                            <input 
                              type="checkbox" 
                              checked={selectedRows.size === filteredLogs.length && filteredLogs.length > 0}
                              onChange={toggleAllSelection}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-600" 
                            />
                          </th>
                          <th className="px-6 py-4 cursor-pointer hover:text-slate-800">Message ID</th>
                          <th className="px-6 py-4 cursor-pointer hover:text-slate-800">Time</th>
                          <th className="px-6 py-4">Channel</th>
                          <th className="px-6 py-4">Recipient</th>
                          <th className="px-6 py-4">Content Preview</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredLogs.map((log) => (
                          <tr 
                            key={log.id} 
                            onClick={() => setSelectedLog(log)}
                            className="hover:bg-slate-50 transition-colors cursor-pointer group"
                          >
                            <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                              <input 
                                type="checkbox" 
                                checked={selectedRows.has(log.id)}
                                onChange={(e) => toggleRowSelection(e, log.id)}
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-600" 
                              />
                            </td>
                            <td className="px-6 py-4 font-mono text-xs text-slate-500 group-hover:text-indigo-600 transition-colors">
                              {log.id}
                            </td>
                            <td className="px-6 py-4" title={new Date(log.createdAt).toLocaleString()}>
                              <span className="text-slate-700">{formatRelativeTime(log.createdAt)}</span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-slate-100 rounded-md">
                                  {getChannelIcon(log.channelType)}
                                </div>
                                <span className="text-slate-700 font-medium">{log.channelName}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="font-semibold text-slate-800">{log.recipient.name}</span>
                                <span className="text-xs text-slate-500 font-mono">{log.recipient.contact}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 max-w-[250px] truncate">
                              <span className="text-slate-600" title={log.content}>
                                {log.content}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border ${
                                log.status === 'delivered' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                log.status === 'failed' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                                log.status === 'pending' || log.status === 'queued' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                'bg-violet-50 text-violet-700 border-violet-100'
                              }`}>
                                {log.status === 'delivered' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
                                {log.status === 'failed' && <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>}
                                {(log.status === 'pending' || log.status === 'queued') && (
                                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div>
                                )}
                                {log.status === 'scheduled' && <div className="w-1.5 h-1.5 rounded-full bg-violet-500"></div>}
                                {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                              </span>
                              {log.deliveryTimeMs && (
                                <span className="text-[10px] text-slate-400 block mt-1 ml-1">{log.deliveryTimeMs/1000}s</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                {log.status === 'failed' && (
                                  <button 
                                    onClick={(e) => handleRetry(e, log.id)}
                                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                    title="Retry"
                                  >
                                    <RefreshCw className="w-4 h-4" />
                                  </button>
                                )}
                                <button className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors">
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
                
                {/* Pagination */}
                {filteredLogs.length > 0 && (
                  <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-sm">
                    <span className="text-slate-500">
                      Showing <span className="font-medium text-slate-700">1</span> to <span className="font-medium text-slate-700">{filteredLogs.length}</span> of <span className="font-medium text-slate-700">{filteredLogs.length}</span> results
                    </span>
                    <div className="flex items-center gap-2">
                      <button className="px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-slate-400 cursor-not-allowed">
                        Previous
                      </button>
                      <button className="px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* 6. Detail View Drawer */}
      <AnimatePresence>
        {selectedLog && (
          <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedLog(null)}
              className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm"
            />
            
            {/* Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="w-full max-w-lg bg-white h-full shadow-2xl relative z-10 flex flex-col border-l border-slate-200 overflow-hidden"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-20">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setSelectedLog(null)}
                    className="p-2 -ml-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">Message Details</h2>
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mt-0.5">
                      {selectedLog.id}
                      <button onClick={() => handleCopy(selectedLog.id)} className="hover:text-indigo-600">
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                  selectedLog.status === 'delivered' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                  selectedLog.status === 'failed' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                  'bg-amber-50 text-amber-700 border-amber-100'
                }`}>
                  {selectedLog.status.toUpperCase()}
                </span>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6 space-y-6">
                
                {/* Visual Route Map */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Delivery Timeline</h4>
                  <div className="flex items-center justify-between relative">
                    <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-slate-100 -translate-y-1/2 z-0"></div>
                    
                    <div className="relative z-10 flex flex-col items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center border-2 border-white shadow-sm">
                        <Server className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-600">Generated</span>
                    </div>
                    
                    <div className="relative z-10 flex flex-col items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center border-2 border-white shadow-sm">
                        <RefreshCw className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-600">Queued</span>
                    </div>

                    <div className="relative z-10 flex flex-col items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 border-white shadow-sm ${
                        selectedLog.status === 'delivered' || selectedLog.status === 'failed' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                      }`}>
                        <Send className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-600">Sent API</span>
                    </div>

                    <div className="relative z-10 flex flex-col items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 border-white shadow-sm ${
                        selectedLog.status === 'delivered' ? 'bg-emerald-100 text-emerald-600' :
                        selectedLog.status === 'failed' ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-400'
                      }`}>
                        {selectedLog.status === 'failed' ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                      </div>
                      <span className="text-[10px] font-bold text-slate-600">
                        {selectedLog.status === 'failed' ? 'Failed' : selectedLog.status === 'delivered' ? 'Delivered' : 'Awaiting DLR'}
                      </span>
                    </div>
                  </div>
                  {selectedLog.error && (
                    <div className="mt-4 p-3 bg-rose-50 border border-rose-100 rounded-lg text-sm text-rose-700 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block mb-0.5">Delivery Failed</span>
                        <span className="text-xs">{selectedLog.error}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Message Content Bubble */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 ml-1">Message Content</h4>
                  <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl rounded-tl-sm text-indigo-900 text-sm leading-relaxed relative shadow-sm">
                    {selectedLog.content}
                    <div className="absolute right-3 bottom-2 text-[10px] text-indigo-400/80 font-mono">
                      {new Date(selectedLog.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                  </div>
                </div>

                {/* Metadata Grid */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="grid grid-cols-2 divide-x divide-y divide-slate-100">
                    <div className="p-3">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Recipient</span>
                      <span className="text-sm font-semibold text-slate-700 block">{selectedLog.recipient.name}</span>
                      <span className="text-xs text-slate-500 font-mono">{selectedLog.recipient.contact}</span>
                    </div>
                    <div className="p-3">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Sender ID</span>
                      <span className="text-sm font-semibold text-slate-700 block">{selectedLog.sender}</span>
                      <span className="text-xs text-slate-500 font-mono">System Account</span>
                    </div>
                    <div className="p-3">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Channel</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {getChannelIcon(selectedLog.channelType)}
                        <span className="text-sm font-semibold text-slate-700">{selectedLog.channelName}</span>
                      </div>
                    </div>
                    <div className="p-3">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Timestamp</span>
                      <span className="text-sm font-semibold text-slate-700 block">{new Date(selectedLog.createdAt).toLocaleDateString()}</span>
                      <span className="text-xs text-slate-500 font-mono">{new Date(selectedLog.createdAt).toLocaleTimeString()}</span>
                    </div>
                    {selectedLog.campaign && (
                      <div className="p-3 col-span-2">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Campaign Source</span>
                        <span className="text-sm font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded inline-block">{selectedLog.campaign}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Developer API Logs */}
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-800 shadow-sm">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-700">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5" /> Raw API Response
                    </span>
                    <button onClick={() => handleCopy(selectedLog.rawResponse || '')} className="text-slate-400 hover:text-white transition-colors">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <pre className="p-4 text-xs font-mono text-emerald-400 overflow-x-auto">
                    {selectedLog.rawResponse}
                  </pre>
                </div>

              </div>

              {/* Actions Footer */}
              <div className="p-4 border-t border-slate-200 bg-white flex gap-3">
                {selectedLog.status === 'failed' && (
                  <button className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4" /> Retry Delivery
                  </button>
                )}
                <button className={`flex-1 font-medium py-2.5 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 border ${
                  selectedLog.status === 'failed' ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50' : 'bg-indigo-600 border-transparent hover:bg-indigo-700 text-white'
                }`}>
                  <FileText className="w-4 h-4" /> View Full Receipt
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
