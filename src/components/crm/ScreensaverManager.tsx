import React, { useEffect, useState } from 'react';
import { useIdleTimer } from '../../hooks/useIdleTimer';
import DebtorsShowcase from './DebtorsShowcase';
import { Person } from '../../types';

interface ScreensaverManagerProps {
  persons: Person[];
  accountingDocuments: any[];
  storeSettings: any;
  formatNumber: (num: number) => string;
}

const ScreensaverManager: React.FC<ScreensaverManagerProps> = (props) => {
  // Read idle timeout from settings, default to 60 seconds
  const [idleTimeout, setIdleTimeout] = useState<number>(60);
  
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('debtors_showcase_settings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        if (parsed.idleTimeout) {
          setIdleTimeout(parsed.idleTimeout);
        }
      }
    } catch (e) {}
    
    // Listen for custom event to update timeout
    const handleUpdate = (e: any) => {
      if (e.detail && e.detail.idleTimeout) {
        setIdleTimeout(e.detail.idleTimeout);
      }
    };
    window.addEventListener('debtors_settings_updated', handleUpdate);
    return () => window.removeEventListener('debtors_settings_updated', handleUpdate);
  }, []);

  const { isIdle, resetTimer } = useIdleTimer(idleTimeout, () => {
    // only trigger if idleTimeout > 0
    if (idleTimeout === 0) {
      resetTimer();
    }
  });

  if (!isIdle || idleTimeout === 0) return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-slate-900" onClick={resetTimer}>
      <DebtorsShowcase {...props} isScreensaverMode={true} onCloseScreensaver={resetTimer} />
    </div>
  );
};

export default ScreensaverManager;
