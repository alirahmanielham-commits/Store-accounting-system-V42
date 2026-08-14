import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, Users, X, FileText, CheckCircle, MessageSquare, Phone,
  Clock, Settings, Send, ChevronDown, Trash, Smartphone, Info,
  Smile, Link as LinkIcon, AlertCircle, Calendar, Hash, Tags,
  Layers, Filter, ChevronUp, User, Globe
} from 'lucide-react';

// Mock Data






export default function SendMessageView({ showNotification, persons = [], personGroups = [] }: any) {
  
  const [templates, setTemplates] = useState<any[]>([]);
  
  useEffect(() => {
    fetch('/api/data/sms_templates')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setTemplates(data);
      })
      .catch(err => console.error(err));
  }, []);
  
  const formattedPersons = React.useMemo(() => {
    return (persons || []).map((p: any, index: number) => {
      const colors = ['bg-blue-500', 'bg-rose-500', 'bg-emerald-500', 'bg-purple-500', 'bg-orange-500', 'bg-teal-500'];
      const color = colors[index % colors.length];
      const name = p.firstName || p.lastName ? `${p.firstName || ''} ${p.lastName || ''}`.trim() : (p.companyName || p.title || 'نامشخص');
      
      let groupName = 'بدون گروه';
      if (p.group) {
         const grp = personGroups.find((g: any) => g.id === p.group);
         if (grp) groupName = grp.name;
      }
      return {
        id: p.id,
        name,
        phone: p.phone || p.mobile || 'بدون شماره',
        group: groupName,
        avatarColor: color
      }
    });
  }, [persons, personGroups]);

  const formattedGroups = React.useMemo(() => {
    return (personGroups || []).map((g: any) => {
       const count = (persons || []).filter((p: any) => p.group === g.id).length;
       return { id: g.id, name: g.name, count };
    });
  }, [persons, personGroups]);

  // State
  const [sendMode, setSendMode] = useState<'single' | 'bulk' | 'group' | 'scheduled'>('single');
  const [searchQuery, setSearchQuery] = useState('');
  useEffect(() => {
    setSearchResults(formattedPersons);
  }, [formattedPersons]);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedRecipients, setSelectedRecipients] = useState<any[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [manualNumbers, setManualNumbers] = useState('');
  
  const [messageText, setMessageText] = useState('');
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  
  const [showSettings, setShowSettings] = useState(false);
  const [channel, setChannel] = useState('smart');
  const [priority, setPriority] = useState('normal');
  const [senderId, setSenderId] = useState('default');
  const [saveAsDraft, setSaveAsDraft] = useState(false);
  const [deliveryReport, setDeliveryReport] = useState(true);
  
  const [scheduledDate, setScheduledDate] = useState('');
  
  const [isSending, setIsSending] = useState(false);

  // Computed
  const hasVariables = messageText.includes('{');
  const charCount = messageText.length;
  const smsParts = Math.ceil(charCount / 70) || 1; // Assuming Persian text (70 chars per part)
  const isOverLimit = charCount > 700;
  
  const estimatedCost = (selectedRecipients.length + selectedGroups.length * 100 + (manualNumbers.split(',').length)) * smsParts * 230; // Mock cost 230 Toman
  
  // Handlers
  const toggleRecipient = (contact: any) => {
    if (selectedRecipients.find(r => r.id === contact.id)) {
      setSelectedRecipients(prev => prev.filter(r => r.id !== contact.id));
    } else {
      setSelectedRecipients(prev => [...prev, contact]);
    }
  };

  const removeRecipient = (id: string) => {
    setSelectedRecipients(prev => prev.filter(r => r.id !== id));
  };

  const applyTemplate = (template: any) => {
    setMessageText(template.body);
    setIsTemplateModalOpen(false);
    if (showNotification) showNotification('پيش‌نویس اعمال شد', 'success');
  };

  const insertVariable = (variable: string) => {
    setMessageText(prev => prev + `{${variable}}`);
  };

    const handleSend = async () => {
    if (!messageText.trim()) {
      if (showNotification) showNotification('متن پیام نمی‌تواند خالی باشد', 'error');
      return;
    }
    if (selectedRecipients.length === 0 && selectedGroups.length === 0 && !manualNumbers) {
      if (showNotification) showNotification('حداقل یک گیرنده باید انتخاب شود', 'error');
      return;
    }

    setIsSending(true);

    try {
      const messagesToSave: any[] = [];
      const timestamp = new Date().toISOString();

      if (sendMode === 'single' || sendMode === 'bulk' || sendMode === 'scheduled') {
         if (manualNumbers) {
            const numbers = manualNumbers.split(/[\\n,]/).map(n => n.trim()).filter(n => n);
            numbers.forEach(num => {
               messagesToSave.push({
                  id: Math.random().toString(36).substring(2, 15),
                  recipientType: 'manual',
                  recipientNumber: num,
                  recipientName: 'شماره دستی',
                  messageBody: messageText,
                  messageLength: messageText.length,
                  status: sendMode === 'scheduled' ? 'scheduled' : 'pending',
                  priority: 1,
                  scheduledAt: sendMode === 'scheduled' ? timestamp : null,
                  createdAt: timestamp
               });
            });
         }
         
         selectedRecipients.forEach(rec => {
            messagesToSave.push({
                  id: Math.random().toString(36).substring(2, 15),
                  recipientType: 'contact',
                  recipientId: rec.id,
                  recipientNumber: rec.phone,
                  recipientName: rec.name,
                  messageBody: messageText,
                  messageLength: messageText.length,
                  status: sendMode === 'scheduled' ? 'scheduled' : 'pending',
                  priority: 1,
                  createdAt: timestamp
               });
         });
      } else if (sendMode === 'group') {
         const groupPersons = (persons || []).filter((p: any) => selectedGroups.includes(p.group));
         
         groupPersons.forEach((rec: any) => {
            messagesToSave.push({
                  id: Math.random().toString(36).substring(2, 15),
                  recipientType: 'contact',
                  recipientId: rec.id,
                  recipientNumber: rec.phone || rec.mobile,
                  recipientName: rec.firstName || rec.lastName ? `${rec.firstName || ''} ${rec.lastName || ''}`.trim() : (rec.companyName || rec.title || 'نامشخص'),
                  messageBody: messageText,
                  messageLength: messageText.length,
                  status: 'pending',
                  priority: 1,
                  createdAt: timestamp
               });
         });
      }
      
      const operations = messagesToSave.map(msg => ({
         key: 'sms_messages',
         type: 'append',
         data: msg
      }));
      
      await fetch('/api/data/batch', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ operations })
      });

      if (showNotification) {
        showNotification(sendMode === 'scheduled' ? 'پیام با موفقیت زمان‌بندی شد' : 'پیام‌ها با موفقیت در صف ارسال قرار گرفتند', 'success');
      }

      setMessageText('');
      setSelectedRecipients([]);
      setSelectedGroups([]);
      setManualNumbers('');
      
    } catch (err) {
      console.error(err);
      if (showNotification) showNotification('خطا در ذخیره پیام‌ها', 'error');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full h-[calc(100vh-6rem)] lg:px-6">
      
      {/* Left Sidebar - Recipient Selection (35%) */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-full lg:w-[35%] bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col overflow-hidden h-full"
      >
        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-500" />
            انتخاب گیرندگان
          </h2>
          
          {/* Send Modes */}
          <div className="flex bg-slate-200/50 p-1 rounded-xl mb-4 text-sm">
            <button 
              onClick={() => setSendMode('single')}
              className={`flex-1 py-2 text-center rounded-lg font-medium transition-all ${sendMode === 'single' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              تکی
            </button>
            <button 
              onClick={() => setSendMode('bulk')}
              className={`flex-1 py-2 text-center rounded-lg font-medium transition-all ${sendMode === 'bulk' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              چندتایی
            </button>
            <button 
              onClick={() => setSendMode('group')}
              className={`flex-1 py-2 text-center rounded-lg font-medium transition-all ${sendMode === 'group' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              گروهی
            </button>
          </div>

          {/* Search */}
          {(sendMode === 'single' || sendMode === 'bulk') && (
            <div className="relative">
              <Search className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text"
                placeholder="جستجوی نام، شماره، کد..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-3 pr-10 pl-4 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm transition-all"
              />
            </div>
          )}
        </div>

        {/* Selected Chips */}
        <AnimatePresence>
          {selectedRecipients.length > 0 && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-5 py-3 border-b border-slate-100 bg-indigo-50/50 flex flex-col gap-2"
            >
              <div className="flex items-center justify-between text-xs text-indigo-800 font-medium">
                <span>{selectedRecipients.length} گیرنده انتخاب شده</span>
                <button onClick={() => setSelectedRecipients([])} className="hover:text-red-500 transition-colors">حذف همه</button>
              </div>
              <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto custom-scrollbar">
                {selectedRecipients.map(r => (
                  <span key={r.id} className="inline-flex items-center gap-1 bg-white border border-indigo-100 text-indigo-700 px-2 py-1 rounded-lg text-xs shadow-sm">
                    {r.name}
                    <button onClick={() => removeRecipient(r.id)} className="hover:bg-indigo-100 rounded-full p-0.5">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main List Area */}
        <div className="flex-1 overflow-y-auto p-3 custom-scrollbar bg-slate-50">
          {(sendMode === 'single' || sendMode === 'bulk') && (
            <div className="space-y-2">
              {searchResults.map((contact) => (
                <div 
                  key={contact.id} 
                  onClick={() => {
                    if (sendMode === 'single') {
                      setSelectedRecipients([contact]);
                    } else {
                      toggleRecipient(contact);
                    }
                  }}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${
                    selectedRecipients.find(r => r.id === contact.id) 
                      ? 'bg-indigo-50 border-indigo-200 shadow-sm' 
                      : 'bg-white border-transparent hover:border-slate-200 shadow-sm'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full ${contact.avatarColor} flex items-center justify-center text-white font-bold shrink-0 shadow-inner`}>
                    {contact.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-800 text-sm truncate">{contact.name}</h4>
                    <p className="text-xs text-slate-500 mt-0.5 dir-ltr text-left">{contact.phone}</p>
                  </div>
                  <div className="shrink-0">
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded-md">{contact.group}</span>
                  </div>
                  {sendMode === 'bulk' && (
                    <div className="shrink-0 ml-1">
                      <div className={`w-5 h-5 rounded border flex items-center justify-center ${selectedRecipients.find(r => r.id === contact.id) ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'}`}>
                        {selectedRecipients.find(r => r.id === contact.id) && <CheckCircle className="w-3 h-3" />}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {sendMode === 'group' && (
            <div className="space-y-3">
              {formattedGroups.map(group => (
                <label key={group.id} className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 cursor-pointer shadow-sm transition-all">
                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                      checked={selectedGroups.includes(group.id)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedGroups(p => [...p, group.id]);
                        else setSelectedGroups(p => p.filter(id => id !== group.id));
                      }}
                    />
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{group.name}</h4>
                      <p className="text-xs text-slate-500 mt-1">{group.count} عضو</p>
                    </div>
                  </div>
                  <Users className="w-5 h-5 text-slate-300" />
                </label>
              ))}
            </div>
          )}

          {/* Manual Input Section */}
          <div className="mt-6 border-t border-slate-200 pt-6">
            <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <Phone className="w-4 h-4 text-slate-400" />
              ورود دستی شماره‌ها
            </h3>
            <textarea 
              value={manualNumbers}
              onChange={(e) => setManualNumbers(e.target.value)}
              placeholder="شماره‌ها را با کاما یا خط جدید جدا کنید..."
              className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm min-h-[100px] outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all dir-ltr text-left custom-scrollbar"
            />
            {manualNumbers && (
              <div className="mt-2 flex gap-2">
                <span className="text-xs bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg border border-emerald-100">
                  {manualNumbers.split(/[\n,]/).filter(n => n.trim().length > 0).length} شماره شناسایی شد
                </span>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Right Section - Composer (65%) */}
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-full lg:w-[65%] flex flex-col relative h-full"
      >
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
          
          {/* Editor Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsTemplateModalOpen(true)}
                className="bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-700 px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 shadow-sm"
              >
                <FileText className="w-4 h-4 text-indigo-500" />
                انتخاب از پیش‌نویس‌ها
              </button>
              
              {sendMode === 'scheduled' && (
                <div className="flex items-center gap-2 bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-lg text-sm font-bold">
                  <Clock className="w-4 h-4" />
                  حالت زمان‌بندی فعال است
                </div>
              )}
            </div>
            <button 
              onClick={() => setMessageText('')}
              className="text-slate-400 hover:text-red-500 p-2 transition-colors tooltip-trigger relative"
              title="پاک کردن متن"
            >
              <Trash className="w-4 h-4" />
            </button>
          </div>

          {/* Editor Area */}
          <div className="flex-1 flex flex-col md:flex-row min-h-0">
            {/* Textarea */}
            <div className="flex-1 p-5 flex flex-col bg-white">
              {hasVariables && (
                <div className="mb-4 bg-blue-50 border border-blue-100 text-blue-700 p-3 rounded-xl text-sm flex items-start gap-3">
                  <Info className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block mb-1">متغیر شناسایی شد</span>
                    این پیام شامل متغیر است. در ارسال گروهی، متغیرها با اطلاعات هر مخاطب جایگزین خواهند شد.
                  </div>
                </div>
              )}
              
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="پیام خود را اینجا بنویسید..."
                className="flex-1 w-full resize-none outline-none text-slate-800 leading-loose custom-scrollbar"
                style={{ minHeight: '200px' }}
              />
              
              {/* Toolbar & Counters */}
              <div className="mt-4 flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 pt-4 gap-4">
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                  <button onClick={() => insertVariable('name')} className="px-3 py-1.5 hover:bg-white rounded-md text-xs font-bold text-slate-600 transition-colors">{"{نام}"}</button>
                  <button onClick={() => insertVariable('code')} className="px-3 py-1.5 hover:bg-white rounded-md text-xs font-bold text-slate-600 transition-colors">{"{کد}"}</button>
                  <button className="p-1.5 hover:bg-white rounded-md text-slate-500 transition-colors"><Smile className="w-4 h-4" /></button>
                  <button className="p-1.5 hover:bg-white rounded-md text-slate-500 transition-colors"><LinkIcon className="w-4 h-4" /></button>
                </div>
                
                <div className="flex items-center gap-4 text-xs font-medium">
                  <span className={`px-2 py-1 rounded-md ${smsParts > 1 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                    {smsParts} پیامک
                  </span>
                  <span className={`${isOverLimit ? 'text-red-500' : charCount > 500 ? 'text-amber-500' : 'text-slate-500'} dir-ltr inline-block`}>
                    {charCount} / 700
                  </span>
                </div>
              </div>
            </div>

            {/* Mobile Preview (Hidden on small screens) */}
            <div className="hidden md:flex w-72 bg-slate-50 border-r border-slate-100 p-5 flex-col items-center justify-center shrink-0">
              <div className="w-[260px] h-[520px] bg-white rounded-[2.5rem] border-[8px] border-slate-800 shadow-xl overflow-hidden relative flex flex-col">
                <div className="w-32 h-6 bg-slate-800 absolute top-0 left-1/2 -translate-x-1/2 rounded-b-xl z-20"></div>
                
                {/* Mockup Header */}
                <div className="bg-slate-100 pt-8 pb-3 px-4 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-slate-300 flex items-center justify-center">
                      <User className="w-4 h-4 text-slate-500" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">Sender_ID</div>
                      <div className="text-[9px] text-slate-500">شماره فرستنده</div>
                    </div>
                  </div>
                  <Info className="w-4 h-4 text-slate-400" />
                </div>
                
                {/* Mockup Body */}
                <div className="flex-1 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-slate-50 p-4 overflow-y-auto custom-scrollbar flex flex-col justify-end">
                  {messageText && (
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="bg-indigo-500 text-white p-3 rounded-2xl rounded-br-sm text-sm whitespace-pre-wrap leading-relaxed shadow-sm max-w-[90%] self-end"
                      style={{ wordBreak: 'break-word' }}
                    >
                      {/* Simulating variable replacement in preview */}
                      {messageText.replace(/\{name\}/g, 'علی رضایی').replace(/\{code\}/g, '12345')}
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Accordion */}
        <div className="mt-4 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            <span className="font-bold text-slate-700 flex items-center gap-2">
              <Settings className="w-4 h-4 text-slate-400" />
              تنظیمات پیشرفته ارسال
            </span>
            {showSettings ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
          </button>
          
          <AnimatePresence>
            {showSettings && (
              <motion.div 
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-5 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500">کانال ارسال</label>
                    <select 
                      value={channel}
                      onChange={(e) => setChannel(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm outline-none focus:border-indigo-500"
                    >
                      <option value="smart">هوشمند (بهترین مسیر)</option>
                      <option value="sms">پیامک (SMS)</option>
                      <option value="whatsapp">واتساپ</option>
                    </select>
                  </div>
                  
                  {sendMode === 'scheduled' && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500">زمان ارسال</label>
                      <input 
                        type="datetime-local" 
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm outline-none focus:border-indigo-500"
                      />
                    </div>
                  )}

                  <div className="space-y-3 pt-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <div className="relative">
                        <input type="checkbox" checked={saveAsDraft} onChange={(e) => setSaveAsDraft(e.target.checked)} className="sr-only" />
                        <div className={`block w-10 h-6 rounded-full transition-colors ${saveAsDraft ? 'bg-indigo-500' : 'bg-slate-300'}`}></div>
                        <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${saveAsDraft ? 'translate-x-4' : 'translate-x-0'}`}></div>
                      </div>
                      <span className="text-sm font-medium text-slate-700">ذخیره در پیش‌نویس‌ها</span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <div className="relative">
                        <input type="checkbox" checked={deliveryReport} onChange={(e) => setDeliveryReport(e.target.checked)} className="sr-only" />
                        <div className={`block w-10 h-6 rounded-full transition-colors ${deliveryReport ? 'bg-indigo-500' : 'bg-slate-300'}`}></div>
                        <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${deliveryReport ? 'translate-x-4' : 'translate-x-0'}`}></div>
                      </div>
                      <span className="text-sm font-medium text-slate-700">دریافت گزارش تحویل</span>
                    </label>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Action Bar (Sticky Footer) */}
        <div className="mt-4 bg-white/80 backdrop-blur-md border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg sticky bottom-4 z-30">
          <div className="flex items-center gap-3 text-slate-600">
            <div className="bg-slate-100 p-2 rounded-xl">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-medium">تخمین مصرف:</div>
              <div className="text-sm font-bold text-slate-800">
                {estimatedCost > 0 ? `≈ ${estimatedCost.toLocaleString()} تومان` : '---'}
              </div>
            </div>
          </div>
          
          <div className="flex w-full sm:w-auto items-center gap-3">
            <button className="flex-1 sm:flex-none px-6 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors text-sm">
              ذخیره پیش‌نویس
            </button>
            <button 
              onClick={handleSend}
              disabled={isSending || (!messageText.trim())}
              className="flex-1 sm:flex-none relative overflow-hidden group bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-md shadow-indigo-200"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
              {isSending ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : (
                <>
                  <span className="relative z-10">{sendMode === 'scheduled' ? 'زمان‌بندی ارسال' : 'ارسال پیام'}</span>
                  <Send className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Template Modal */}
      <AnimatePresence>
        {isTemplateModalOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]"
              onClick={() => setIsTemplateModalOpen(false)}
            />
            <motion.div 
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
              className="fixed inset-y-0 right-0 w-full max-w-md bg-slate-50 shadow-2xl z-[101] flex flex-col border-l border-slate-200"
            >
              <div className="p-6 border-b border-slate-200 bg-white flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">قالب‌های آماده</h2>
                  <p className="text-sm text-slate-500 mt-1">انتخاب از پیش‌نویس‌ها و پیام‌های ذخیره شده</p>
                </div>
                <button 
                  onClick={() => setIsTemplateModalOpen(false)}
                  className="w-10 h-10 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-4 border-b border-slate-200 bg-white">
                <div className="relative">
                  <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text"
                    placeholder="جستجو در قالب‌ها..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pr-10 pl-4 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  />
                </div>
                <div className="flex gap-2 mt-3 overflow-x-auto custom-scrollbar pb-1">
                  {['همه', 'تبریک', 'هشدار', 'کد تأیید'].map((cat, i) => (
                    <button key={i} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${i === 0 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {templates.map(template => (
                  <div key={template.id} className="bg-white border border-slate-200 rounded-2xl p-4 hover:border-indigo-300 hover:shadow-md transition-all group">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-bold text-slate-800">{template.name}</h3>
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded-md">{template.category}</span>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed mb-4 line-clamp-3">
                      {template.body}
                    </p>
                    <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                      <div className="text-xs text-slate-400 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        {template.usageCount || 0} بار استفاده شده
                      </div>
                      <button 
                        onClick={() => applyTemplate(template)}
                        className="bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
                      >
                        استفاده
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
