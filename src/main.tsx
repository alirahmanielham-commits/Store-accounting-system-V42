import {StrictMode, useState, useEffect} from 'react';
import * as Sentry from "@sentry/react";
import {createRoot} from 'react-dom/client';
import App from './App.tsx'
import 'vazirmatn/Vazirmatn-font-face.css';
import '@fontsource/jetbrains-mono';
import './index.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
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
  const [setupComplete, setSetupComplete] = useState(false);
  useEffect(() => {
    if (setupComplete) {
       backfillInstallmentCodes().catch(console.error);
    }
  }, [setupComplete]);

  return (
    <>
      {!setupComplete ? (
        <InitialSetupWizard onComplete={() => setSetupComplete(true)} />
      ) : (
        
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <AuthProvider>
              <App />
            </AuthProvider>
          </BrowserRouter>
          {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} position="bottom" />}
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


