import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Send, MessageSquare, AlertCircle } from "lucide-react";
import { addDatabaseLog } from "../../services/coreService";

interface SendPersonMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  person: any;
  showNotification: (msg: string, type: "success" | "error") => void;
}

export default function SendPersonMessageModal({
  isOpen,
  onClose,
  person,
  showNotification,
}: SendPersonMessageModalProps) {
  const [message, setMessage] = useState("");
  const [templates, setTemplates] = useState<any[]>([]);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMessage("");
      fetch('/api/data/sms_templates')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setTemplates(data);
        })
        .catch(err => console.error(err));
    }
  }, [isOpen]);

  if (!isOpen || !person) return null;

  const handleTemplateSelect = (templateText: string) => {
    const name = person.firstName || person.lastName ? `${person.firstName || ''} ${person.lastName || ''}`.trim() : (person.companyName || person.alias || 'نامشخص');
    const msg = templateText
      .replace(/{name}/g, name)
      // replace other vars if needed
    setMessage(msg);
  };

  const handleSend = async () => {
    if (!message.trim()) {
      showNotification("لطفا متن پیام را وارد کنید", "error");
      return;
    }
    if (!person.phone && !person.mobile) {
      showNotification("شماره موبایل برای این شخص ثبت نشده است", "error");
      return;
    }

    setIsSending(true);
    try {
      const recipientNumber = person.phone || person.mobile;
      const recipientName = person.firstName || person.lastName ? `${person.firstName || ''} ${person.lastName || ''}`.trim() : (person.companyName || person.alias || 'نامشخص');
      
      const msgData = {
        id: Math.random().toString(36).substring(2, 15),
        recipientType: 'contact',
        recipientId: person.id,
        recipientNumber,
        recipientName,
        messageBody: message,
        messageLength: message.length,
        status: 'pending',
        priority: 1,
        createdAt: Date.now()
      };

      await fetch('/api/data/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{ key: 'sms_messages', type: 'append', data: msgData }])
      });
      
      await addDatabaseLog("ارسال پیامک", "sms_messages", msgData.id, null, msgData);
      showNotification("پیام در صف ارسال قرار گرفت", "success");
      onClose();
    } catch (err) {
      console.error("Error sending message:", err);
      showNotification("خطا در ارسال پیام", "error");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden"
        >
          <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-600" />
              ارسال پیام به {person.name || person.alias}
            </h3>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {!person.phone && !person.mobile && (
              <div className="p-3 bg-rose-50 text-rose-700 rounded-xl flex items-center gap-2 text-sm font-medium">
                <AlertCircle className="w-5 h-5" />
                هیچ شماره موبایلی برای این شخص ثبت نشده است.
              </div>
            )}

            {templates.length > 0 && (
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700">قالب‌های آماده</label>
                <div className="flex flex-wrap gap-2">
                  {templates.map(t => (
                    <button
                      key={t.id}
                      onClick={() => handleTemplateSelect(t.content)}
                      className="px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                    >
                      {t.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700">متن پیام</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                className="w-full h-32 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none transition-all"
                placeholder="متن پیام خود را بنویسید..."
              />
              <div className="text-xs text-slate-500 text-left">
                {message.length} کاراکتر
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-xl transition-colors"
            >
              انصراف
            </button>
            <button
              onClick={handleSend}
              disabled={isSending || (!person.phone && !person.mobile)}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl transition-colors flex items-center gap-2 shadow-sm"
            >
              <Send className="w-4 h-4" />
              ارسال پیام
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
