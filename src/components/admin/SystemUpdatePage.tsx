import React, { useState, useEffect } from "react";
import {
  DownloadCloud,
  CheckCircle,
  X,
  RefreshCw,
  FileText,
  Shield,
  AlertCircle,
  ChevronLeft,
  Github
} from "lucide-react";
import { motion } from "framer-motion";

interface SystemUpdatePageProps {
  storeSettings: any;
  setActiveTab: (tab: string) => void;
}

export function SystemUpdatePage({ storeSettings, setActiveTab }: SystemUpdatePageProps) {
  const [latestCommits, setLatestCommits] = useState<any[]>([]);
  const [checkingUpdateVersion, setCheckingUpdateVersion] = useState(false);
  const [updatingStr, setUpdatingStr] = useState(false);
  const [updateProgress, setUpdateProgress] = useState(0);
  const [updateLog, setUpdateLog] = useState("");
  const [updateStepName, setUpdateStepName] = useState("");
  const [updateStepsStatus, setUpdateStepsStatus] = useState({
    connecting: "idle",
    checking: "idle",
    downloading: "idle",
    verifying: "idle",
  });
  const [repoUrl, setRepoUrl] = useState(storeSettings?.githubRepo || "");

  const checkForUpdates = async (overrideUrl?: string) => {
    setCheckingUpdateVersion(true);
    try {
      const urlToUse = overrideUrl || repoUrl;
      if (!urlToUse) {
        setCheckingUpdateVersion(false);
        return;
      }
      
      // Parse repo string: owner/repo
      let owner = "";
      let repo = "";
      try {
        if (urlToUse.includes("github.com")) {
            const parts = new URL(urlToUse).pathname.split("/").filter(Boolean);
            if (parts.length >= 2) {
                owner = parts[0];
                repo = parts[1];
            }
        } else if (urlToUse.includes("/")) {
            const parts = urlToUse.split("/");
            owner = parts[0];
            repo = parts[1];
        }
      } catch(e) {}
      
      if (owner && repo) {
          const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=5`);
          if (res.ok) {
              const data = await res.json();
              setLatestCommits(data);
          } else {
              setLatestCommits([]);
          }
      } else {
          setLatestCommits([]);
      }
    } catch (error) {
      console.error("Error checking updates:", error);
    } finally {
      setCheckingUpdateVersion(false);
    }
  };

  useEffect(() => {
    if (repoUrl) {
        checkForUpdates();
    }
  }, []);

  const handleSystemUpdate = async () => {
    setUpdatingStr(true);
    setUpdateProgress(0);
    setUpdateLog("");
    setUpdateStepsStatus({
      connecting: "running",
      checking: "idle",
      downloading: "idle",
      verifying: "idle",
    });
    setUpdateStepName("در حال برقراری ارتباط ایمن با سرور اصلی برای دریافت بروزرسانی...");

    let currentPercent = 0;
    const intervalTime = 60; 
    const totalSimulatedTime = 6000; 
    const increment = 100 / (totalSimulatedTime / intervalTime);

    let fetchPromise = fetch("/api/system/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repoUrl }),
    }).then(async (res) => {
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, data };
    }).catch(() => ({ ok: false, data: {} }));

    const updateInterval = setInterval(() => {
      currentPercent += increment;
      if (currentPercent >= 95) {
        currentPercent = 95;
        clearInterval(updateInterval);
      }
      const progress = Math.round(currentPercent);
      setUpdateProgress(progress);

      if (progress < 25) {
        setUpdateStepName("در حال برقراری ارتباط ایمن با مخزن گیت‌هاب...");
        setUpdateStepsStatus((prev) => ({ ...prev, connecting: "running" }));
      } else if (progress >= 25 && progress < 50) {
        setUpdateStepName("بررسی بسته‌ها و تفاوت ساختارهای فایلی سیستم...");
        setUpdateStepsStatus((prev) => ({
          ...prev,
          connecting: "success",
          checking: "running",
        }));
      } else if (progress >= 50 && progress < 78) {
        setUpdateStepName("دریافت فایل‌های تغییر یافته و پچ‌های دیتابیس...");
        setUpdateStepsStatus((prev) => ({
          ...prev,
          checking: "success",
          downloading: "running",
        }));
      } else if (progress >= 78) {
        setUpdateStepName("در حال کامپایل و ری‌استارت ایمن سرویس‌ها...");
        setUpdateStepsStatus((prev) => ({
          ...prev,
          downloading: "success",
          verifying: "running",
        }));
      }
    }, intervalTime);

    const result = await fetchPromise;
    clearInterval(updateInterval);
    setUpdateProgress(100);

    if (result.ok) {
      setUpdateStepsStatus({
        connecting: "success",
        checking: "success",
        downloading: "success",
        verifying: "success",
      });
      setUpdateStepName("بروزرسانی با موفقیت انجام شد! در حال بارگذاری مجدد...");
      setUpdateLog(
        result.data?.message ||
          "سیستم با موفقیت به آخرین نسخه بروزرسانی شد.\nکلیه تغییرات پایگاه داده اعمال گردید.\n\nدر حال ری‌استارت سیستم...",
      );
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } else {
      setUpdateStepsStatus((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((k) => {
          if ((updated as any)[k] === "running") (updated as any)[k] = "error";
        });
        return updated;
      });
      setUpdateStepName("خطا در ارتباط با سرور یا دریافت بروزرسانی!");
      setUpdateLog(
        result.data?.error ||
          result.data?.message ||
          "بروزرسانی با خطا مواجه شد. لطفاً اتصال اینترنت خود را بررسی کرده و مجدداً تلاش کنید.",
      );
      setUpdatingStr(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6" dir="rtl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
            <div className="p-2.5 bg-indigo-100 rounded-xl text-indigo-600">
              <DownloadCloud className="w-6 h-6" />
            </div>
            بروزرسانی و ارتقای سیستم
          </h2>
          <p className="text-sm text-slate-500 font-bold mt-2 pr-2">
            دریافت آخرین تغییرات و بهبودهای هسته حسابداری از گیت‌هاب
          </p>
        </div>
        <button
          onClick={() => setActiveTab("settings")}
          className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors font-bold text-sm flex items-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          بازگشت به تنظیمات
        </button>
      </div>

      <div className="bg-white rounded-3xl p-8 border border-slate-200/60 shadow-xl shadow-slate-200/20 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -mr-10 -mt-10 opacity-70"></div>
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-emerald-50 rounded-full blur-3xl -ml-10 -mb-10 opacity-60"></div>
        
        <div className="relative z-10 flex flex-col items-center">
            <div className="w-full max-w-xl mb-8 flex gap-2">
                <input 
                    type="text" 
                    placeholder="آدرس مخزن (مثال: username/repository یا لینک کامل)"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-mono text-sm text-left focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    dir="ltr"
                />
                <button
                    onClick={() => checkForUpdates()}
                    disabled={checkingUpdateVersion || !repoUrl}
                    className="px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold transition-all disabled:opacity-70 flex items-center gap-2"
                >
                    {checkingUpdateVersion ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Github className="w-4 h-4" />}
                    بررسی
                </button>
            </div>

            {updatingStr || updateProgress > 0 ? (
            <div className="w-full max-w-2xl mx-auto mb-8 bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex justify-between items-end mb-4">
                <span className="text-sm font-bold text-slate-700">
                    {updateStepName}
                </span>
                <span className="text-lg font-black text-indigo-600 font-sans">
                    {updateProgress}%
                </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-3 mb-8 overflow-hidden shadow-inner">
                <motion.div
                    className="bg-indigo-600 h-3 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${updateProgress}%` }}
                    transition={{ duration: 0.3 }}
                />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className={`p-3.5 rounded-xl border flex items-center justify-between transition-all duration-300 ${updateStepsStatus.connecting === "success" ? "bg-emerald-50/40 border-emerald-100 text-emerald-800" : updateStepsStatus.connecting === "running" ? "bg-indigo-50/40 border-indigo-100 text-indigo-800 shadow-sm" : updateStepsStatus.connecting === "error" ? "bg-rose-50 border-rose-100 text-rose-800" : "bg-slate-50/50 border-slate-100 text-slate-400"}`}>
                    <span className="text-xs font-bold">۱. ارتباط با گیت‌هاب</span>
                    {updateStepsStatus.connecting === "success" ? <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" /> : updateStepsStatus.connecting === "running" ? <RefreshCw className="w-4 h-4 text-indigo-500 shrink-0 animate-spin" /> : updateStepsStatus.connecting === "error" ? <X className="w-4 h-4 text-rose-500 shrink-0" /> : <div className="w-2 h-2 rounded-full bg-gray-300 shrink-0" />}
                </div>
                <div className={`p-3.5 rounded-xl border flex items-center justify-between transition-all duration-300 ${updateStepsStatus.checking === "success" ? "bg-emerald-50/40 border-emerald-100 text-emerald-800" : updateStepsStatus.checking === "running" ? "bg-indigo-50/40 border-indigo-100 text-indigo-800 shadow-sm" : updateStepsStatus.checking === "error" ? "bg-rose-50 border-rose-100 text-rose-800" : "bg-slate-50/50 border-slate-100 text-slate-400"}`}>
                    <span className="text-xs font-bold">۲. مقایسه نسخه‌ها</span>
                    {updateStepsStatus.checking === "success" ? <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" /> : updateStepsStatus.checking === "running" ? <RefreshCw className="w-4 h-4 text-indigo-500 shrink-0 animate-spin" /> : updateStepsStatus.checking === "error" ? <X className="w-4 h-4 text-rose-500 shrink-0" /> : <div className="w-2 h-2 rounded-full bg-gray-300 shrink-0" />}
                </div>
                <div className={`p-3.5 rounded-xl border flex items-center justify-between transition-all duration-300 ${updateStepsStatus.downloading === "success" ? "bg-emerald-50/40 border-emerald-100 text-emerald-800" : updateStepsStatus.downloading === "running" ? "bg-indigo-50/40 border-indigo-100 text-indigo-800 shadow-sm" : updateStepsStatus.downloading === "error" ? "bg-rose-50 border-rose-100 text-rose-800" : "bg-slate-50/50 border-slate-100 text-slate-400"}`}>
                    <span className="text-xs font-bold">۳. دریافت سورس کد</span>
                    {updateStepsStatus.downloading === "success" ? <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" /> : updateStepsStatus.downloading === "running" ? <RefreshCw className="w-4 h-4 text-indigo-500 shrink-0 animate-spin" /> : updateStepsStatus.downloading === "error" ? <X className="w-4 h-4 text-rose-500 shrink-0" /> : <div className="w-2 h-2 rounded-full bg-gray-300 shrink-0" />}
                </div>
                <div className={`p-3.5 rounded-xl border flex items-center justify-between transition-all duration-300 ${updateStepsStatus.verifying === "success" ? "bg-emerald-50/40 border-emerald-100 text-emerald-800" : updateStepsStatus.verifying === "running" ? "bg-indigo-50/40 border-indigo-100 text-indigo-800 shadow-sm" : updateStepsStatus.verifying === "error" ? "bg-rose-50 border-rose-100 text-rose-800" : "bg-slate-50/50 border-slate-100 text-slate-400"}`}>
                    <span className="text-xs font-bold">۴. ری‌استارت سیستم</span>
                    {updateStepsStatus.verifying === "success" ? <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" /> : updateStepsStatus.verifying === "running" ? <RefreshCw className="w-4 h-4 text-indigo-500 shrink-0 animate-spin" /> : updateStepsStatus.verifying === "error" ? <X className="w-4 h-4 text-rose-500 shrink-0" /> : <div className="w-2 h-2 rounded-full bg-gray-300 shrink-0" />}
                </div>
                </div>
            </div>
            ) : (

            <div className="w-full max-w-2xl text-center space-y-4 mb-8 p-12 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                <Github className="w-10 h-10 text-slate-300 mx-auto" />
                <div>
                <p className="text-xs text-slate-500 font-extrabold leading-relaxed mb-4">
                    با وارد کردن آدرس مخزن گیت‌هاب پروژه، می‌توانید آخرین تغییرات را مشاهده کرده و در صورت نیاز سیستم خود را به روز رسانی کنید.
                </p>
                <div className="flex items-center gap-2 max-w-md mx-auto">
                    <input 
                        type="text" 
                        value={repoUrl}
                        onChange={(e) => setRepoUrl(e.target.value)}
                        placeholder="آدرس مخزن (مثال: username/repository)"
                        className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-left font-sans outline-none focus:ring-2 focus:ring-indigo-500"
                        dir="ltr"
                    />
                    <button 
                        onClick={() => checkForUpdates()}
                        disabled={checkingUpdateVersion || !repoUrl}
                        className="px-4 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-bold hover:bg-slate-900 transition-colors disabled:opacity-70">
                        بررسی مخزن
                    </button>
                </div>
                </div>
            </div>

            )}

            {!updatingStr && latestCommits && latestCommits.length > 0 && (
            <div className="w-full max-w-2xl mb-8" dir="rtl">
                <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-500" />
                لیست تغییرات در گیت‌هاب (کومیت‌های اخیر)
                </h3>
                <div className="space-y-3">
                {latestCommits.map((commitData: any, idx: number) => (
                    <div key={idx} className="bg-white border text-right border-gray-100 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                    <p className="text-sm font-bold text-gray-800 mb-2 truncate">
                        {commitData.commit?.message?.split("\n")[0] || "بروزرسانی سیستم"}
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-gray-500 font-medium">
                        <span className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500">
                            <Shield className="w-3 h-3" />
                        </div>
                        {commitData.commit?.author?.name || "تیم توسعه"}
                        </span>
                        <span className="font-sans font-bold text-indigo-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                        {new Date(commitData.commit?.author?.date).toLocaleDateString("fa-IR")}
                        </span>
                    </div>
                    </div>
                ))}
                </div>
                
                <div className="mt-4 p-4 bg-amber-50 border border-amber-100 rounded-xl text-amber-800 text-xs font-bold flex items-start gap-3 w-full">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="leading-relaxed text-right">
                    در صورت اطمینان از اعمال این تغییرات، روی دکمه دریافت و به روز رسانی کلیک کنید. با این کار سیستم مجددا راه‌اندازی خواهد شد.
                </p>
                </div>
            </div>
            )}

            {updateLog && (
            <div className="w-full max-w-2xl mb-8 p-5 bg-indigo-50/45 text-indigo-900 border border-indigo-100/50 rounded-xl text-xs font-black leading-relaxed whitespace-pre-wrap flex items-start gap-3 shadow-sm">
                <div className="p-1.5 bg-indigo-100/70 rounded-lg shrink-0 text-indigo-600">
                <FileText className="w-4 h-4" />
                </div>
                <div className="font-bold text-right leading-relaxed flex-1" dir="rtl">
                {updateLog}
                </div>
            </div>
            )}

            {(latestCommits.length > 0 || checkingUpdateVersion || updatingStr) ? (
            <button
                id="auto-update-btn"
                onClick={handleSystemUpdate}
                disabled={updatingStr || checkingUpdateVersion}
                className="px-10 py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl font-bold transition-all shadow-md disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3 min-w-[240px]"
            >
                {updatingStr || checkingUpdateVersion ? (
                <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>در حال بررسی وضعیت سیستم...</span>
                </>
                ) : (
                <>
                    <DownloadCloud className="w-5 h-5" />
                    <span>دریافت و بروزرسانی به آخرین نسخه</span>
                </>
                )}
            </button>
            ) : null}
        </div>
      </div>
    </div>
  );
}
