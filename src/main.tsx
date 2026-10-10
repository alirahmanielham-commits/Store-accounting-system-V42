import {StrictMode, useState, useEffect} from 'react';
import * as Sentry from "@sentry/react";
import {createRoot} from 'react-dom/client';
import App from './App.tsx'
import 'vazirmatn/Vazirmatn-font-face.css';
import 'vazirmatn/misc/Farsi-Digits/Vazirmatn-FD-font-face.css';
import './index.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { BrowserRouter } from 'react-router-dom';
import InitialSetupWizard from './components/InitialSetupWizard';
window.addEventListener("error", (e) => { fetch("/api/data/system_logs/append", { method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({ action: "FRONTEND_ERROR", entityType: "error", entityId: "1", oldData: e.message, newData: e.error?.stack }) }); });

if ((import.meta as any).env.VITE_SENTRY_DSN && String((import.meta as any).env.VITE_SENTRY_DSN).startsWith('http')) {
  try {
    Sentry.init({
      dsn: (import.meta as any).env.VITE_SENTRY_DSN,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration(),
      ],
      tracesSampleRate: 1.0,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
    });
  } catch (e) {
    console.error("Failed to initialize Sentry:", e);
  }
}


const originalConsoleError = console.error;
console.error = (...args) => {
  if (args[0] && typeof args[0] === 'string' && args[0].includes('Encountered two children with the same key')) {
    fetch("/api/data/system_logs/append", { method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({ action: "FRONTEND_ERROR", entityType: "error", entityId: "1", oldData: "REACT_KEY_ERROR", newData: JSON.stringify(args) }) });
  }
  originalConsoleError(...args);
};
;

// Add global form validation message localization
document.addEventListener('invalid', (e) => {
  const target = e.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
  if (target && target.validity) {
    if (target.validity.valueMissing) {
      target.setCustomValidity('لطفا این قسمت را پر کنید.');
    } else if (target.validity.typeMismatch) {
      target.setCustomValidity('لطفا یک مقدار معتبر وارد کنید.');
    } else if (target.validity.rangeUnderflow) {
      const min = target.getAttribute('min');
      target.setCustomValidity(min ? `مقدار باید بزرگتر یا مساوی ${min} باشد.` : 'مقدار وارد شده کمتر از حد مجاز است.');
    } else if (target.validity.stepMismatch) {
      target.setCustomValidity('لطفا یک مقدار معتبر وارد کنید.');
    } else {
      target.setCustomValidity('مقدار وارد شده نامعتبر است.');
    }
  }
}, true);

document.addEventListener('input', (e) => {
  const target = e.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
  if (target && target.setCustomValidity) {
    target.setCustomValidity('');
  }
}, true);

document.addEventListener('change', (e) => {
  const target = e.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
  if (target && target.setCustomValidity) {
    target.setCustomValidity('');
  }
}, true);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

import { backfillInstallmentCodes } from "./migrations/backfillInstallmentCodes";

const Root = () => {
  const [setupComplete, setSetupComplete] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetch('/api/setup/status')
      .then(res => res.json())
      .then(data => {
        if (!isMounted) return;
        if (data && data.dbConfigured && data.pgConnected && data.adminConfigured && data.companyConfigured) {
          localStorage.setItem('initial_setup_complete', 'true');
          setSetupComplete(true);
        } else {
          localStorage.removeItem('initial_setup_complete');
          setSetupComplete(false);
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setSetupComplete(false);
      });

    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (setupComplete) {
       backfillInstallmentCodes().catch(console.error);
    }
  }, [setupComplete]);

  if (setupComplete === null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-800" dir="rtl">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center mb-3 shadow-xs">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-xs font-bold text-slate-700">در حال بررسی وضعیت اتصال به پایگاه داده PostgreSQL...</p>
      </div>
    );
  }

  return (
    <>
      {!setupComplete ? (
        <InitialSetupWizard onComplete={() => {
          localStorage.setItem('initial_setup_complete', 'true');
          setSetupComplete(true);
        }} />
      ) : (
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <AuthProvider>
              <App />
            </AuthProvider>
          </BrowserRouter>
        </QueryClientProvider>
      )}
    </>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);


