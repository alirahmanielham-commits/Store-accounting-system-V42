import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { printViaIframe, PrintOptions } from "../../utils/printHelper";

export interface PrintWrapperHandle {
  print: (customOptions?: Partial<PrintOptions>) => Promise<boolean>;
  getElement: () => HTMLElement | null;
}

export interface PrintWrapperProps {
  children: React.ReactNode;
  id?: string;
  className?: string;
  paperSize?: "a4" | "a5" | "pos80" | string;
  documentTitle?: string;
  margin?: string;
  isVoided?: boolean;
  isDraft?: boolean;
  watermarkText?: string;
  showWatermark?: boolean;
  extraCss?: string;
  onBeforePrint?: () => void;
  onAfterPrint?: () => void;
}

/**
 * PrintWrapper Component
 * Encapsulates printable documents (invoices, receipts, ledgers, reports)
 * and provides an integrated, isolated iframe print mechanism that ensures
 * 100% fidelity between what is seen in the preview and what gets sent to the printer.
 */
export const PrintWrapper = forwardRef<PrintWrapperHandle, PrintWrapperProps>(
  (
    {
      children,
      id = "printable-document-root",
      className = "",
      paperSize = "a4",
      documentTitle = "سند مالی و تجاری",
      margin,
      isVoided = false,
      isDraft = false,
      watermarkText,
      showWatermark = true,
      extraCss,
      onBeforePrint,
      onAfterPrint,
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);

    const handlePrint = async (customOptions?: Partial<PrintOptions>): Promise<boolean> => {
      if (!containerRef.current) return false;

      return printViaIframe(containerRef.current, {
        paperSize,
        margin,
        documentTitle,
        extraCss,
        onBeforePrint,
        onAfterPrint,
        ...customOptions,
      });
    };

    useImperativeHandle(ref, () => ({
      print: handlePrint,
      getElement: () => containerRef.current,
    }));

    // Size constraints for preview display
    const sizeClasses =
      paperSize === "a5"
        ? "max-w-[148mm] min-h-[210mm]"
        : paperSize === "pos80"
        ? "max-w-[80mm] min-h-[100mm]"
        : "max-w-[210mm] min-h-[297mm]";

    const displayWatermark =
      showWatermark &&
      (isVoided || isDraft || Boolean(watermarkText));

    const watermarkLabel =
      watermarkText || (isVoided ? "ابطال شد" : isDraft ? "پیش‌نویس" : "");

    const isVoidedStyle = isVoided || watermarkLabel === "ابطال شد";

    return (
      <div
        ref={containerRef}
        id={id}
        data-print-container="true"
        data-paper-size={paperSize}
        className={`print-wrapper-target bg-white rounded-xl shadow-xs border border-slate-200/80 mx-auto relative overflow-hidden box-border ${sizeClasses} ${className}`}
        dir="rtl"
      >
        {/* Isolated Watermark Overlay (Only rendered once inside this wrapper) */}
        {displayWatermark && watermarkLabel && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-30 overflow-hidden print:flex">
            <div
              className={`transform -rotate-45 border-8 text-center px-10 py-5 rounded-3xl tracking-widest font-black text-6xl sm:text-7xl shadow-xs select-none ${
                isVoidedStyle
                  ? "border-red-600/30 text-red-600/30"
                  : "border-dashed border-amber-600/30 text-amber-600/30"
              }`}
            >
              {watermarkLabel}
            </div>
          </div>
        )}

        {/* Inner Content */}
        <div className="w-full h-full relative z-10">{children}</div>
      </div>
    );
  }
);

PrintWrapper.displayName = "PrintWrapper";

export default PrintWrapper;
