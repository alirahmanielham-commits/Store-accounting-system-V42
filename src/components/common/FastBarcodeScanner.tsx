import React from 'react';
import { useHardwareScanner } from '../../hooks/useHardwareScanner';
import { ScanLine } from 'lucide-react';

export const FastBarcodeScanner = ({ onScan }: { onScan: (code: string) => void }) => {
  useHardwareScanner({ onScan });

  return (
    <div className="relative flex-1 md:max-w-[280px] min-w-[200px]">
      <ScanLine className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
      <input
        type="text"
        placeholder="ورود بارکد / کد کالا (Enter)"
        className="w-full pr-10 pl-3 p-[11px] bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono text-left outline-none text-sm shadow-sm transition-colors"
        dir="ltr"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            if (e.defaultPrevented) {
              // The global hook (useHardwareScanner) already captured this!
              e.currentTarget.value = "";
              return;
            }
            e.preventDefault();
            const val = e.currentTarget.value.trim();
            if (val) {
              onScan(val);
              e.currentTarget.value = "";
            }
          }
        }}
      />
    </div>
  );
};

export default FastBarcodeScanner;
