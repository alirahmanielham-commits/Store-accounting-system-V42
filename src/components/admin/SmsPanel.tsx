import React, { useState } from "react";
import { motion } from "motion/react";
import { Send, Settings } from "lucide-react";

export default function SmsPanel({ storeSettings, setActiveTab, setSettingsTab }: any) {
  const [smsPanelTab, setSmsPanelTab] = useState("send_history");
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-5xl mx-auto"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">پنل پیامک</h2>
          <p className="text-sm text-gray-500 mt-1">مدیریت و ارسال پیامک‌ها</p>
        </div>
        <button
          onClick={() => {
            setActiveTab("settings");
            setSettingsTab("notification");
          }}
          className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl font-medium text-sm hover:bg-indigo-100 transition-colors"
        >
          تنظیمات پیامک
        </button>
      </div>
      <div className="flex border-b border-gray-200 mb-6 gap-6">
        <button
          onClick={() => setSmsPanelTab("send_history")}
          className={`py-3 px-1 font-bold text-sm border-b-2 transition-all ${smsPanelTab === "send_history" ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
        >
          ارسال پیامک
        </button>
      </div>
      {smsPanelTab === "send_history" && (
        <div className="text-center py-12 text-gray-500">
          پنل پیامک به این فایل منتقل شده است. 
        </div>
      )}
    </motion.div>
  );
}
