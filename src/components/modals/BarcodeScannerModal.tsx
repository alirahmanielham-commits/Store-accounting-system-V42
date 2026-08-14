import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X } from 'lucide-react';
import { motion } from 'motion/react';

export default function BarcodeScannerModal({ onClose, onScan }: { onClose: () => void, onScan: (code: string) => void }) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const html5QrCode = new Html5Qrcode("reader");

    html5QrCode.start(
      { facingMode: "environment" },
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
      },
      (decodedText) => {
        // Stop scanning and invoke callback
        html5QrCode.stop().then(() => {
          onScan(decodedText);
        }).catch((err) => {
          console.error("Failed to stop scanner", err);
          onScan(decodedText);
        });
      },
      (errorMessage) => {
        // ignore running errors
      }
    ).catch(err => {
      setError("امکان دسترسی به دوربین وجود ندارد. لطفاً دسترسی‌های لازم را تایید کنید.");
    });

    return () => {
      if (html5QrCode.isScanning) {
        html5QrCode.stop().catch(() => {});
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-sm" dir="rtl">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden w-full max-w-md flex flex-col"
      >
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="text-lg font-bold text-gray-800">
            اسکن بارکد
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          {error ? (
            <div className="text-rose-500 font-bold text-center bg-rose-50 p-4 rounded-xl">
              {error}
            </div>
          ) : (
            <div className="relative rounded-xl overflow-hidden bg-black aspect-square flex items-center justify-center">
              <div id="reader" className="w-full h-full"></div>
            </div>
          )}
          <p className="text-center text-sm font-bold text-gray-500 mt-4">
            لطفاً بارکد کالا را مقابل دوربین قرار دهید
          </p>
        </div>
      </motion.div>
    </div>
  );
}
