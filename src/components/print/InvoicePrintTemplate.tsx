import React from "react";
import StandardInvoiceTemplate from "./invoice-templates/StandardInvoiceTemplate";
import MinimalInvoiceTemplate from "./invoice-templates/MinimalInvoiceTemplate";
import OfficialInvoiceTemplate from "./invoice-templates/OfficialInvoiceTemplate";
import ThermalInvoiceTemplate from "./invoice-templates/ThermalInvoiceTemplate";
import CompactInvoiceTemplate from "./invoice-templates/CompactInvoiceTemplate";
import { InvoicePrintTemplateProps } from "./invoice-templates/InvoicePrintTypes";

export default function InvoicePrintTemplate(props: InvoicePrintTemplateProps) {
  const format = props.storeSettings?.invoicePrintFormat || 'standard';
  const isVoided = props.data?.status === 'voided' || props.data?.isVoided === true;
  const isDraft = props.data?.status === 'draft' || props.data?.isDraft === true;

  const renderTemplate = () => {
    switch (format) {
      case 'official':
        return <OfficialInvoiceTemplate {...props} />;
      case 'minimal':
        return <MinimalInvoiceTemplate {...props} />;
      case 'compact':
        return <CompactInvoiceTemplate {...props} />;
      case 'thermal':
        return <ThermalInvoiceTemplate {...props} />;
      case 'standard':
      default:
        return <StandardInvoiceTemplate {...props} />;
    }
  };

  return (
    <div className="relative w-full">
      {/* Watermark for Voided */}
      {isVoided && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-30 overflow-hidden print:flex">
          <div className="transform -rotate-45 border-8 border-red-600/35 text-red-600/35 font-black text-6xl sm:text-7xl md:text-8xl px-12 py-6 rounded-3xl tracking-widest text-center shadow-xs">
            ابطال شد
          </div>
        </div>
      )}

      {/* Watermark for Draft */}
      {isDraft && !isVoided && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-30 overflow-hidden print:flex">
          <div className="transform -rotate-45 border-8 border-dashed border-amber-600/35 text-amber-600/35 font-black text-6xl sm:text-7xl md:text-8xl px-12 py-6 rounded-3xl tracking-widest text-center shadow-xs">
            پیش‌نویس
          </div>
        </div>
      )}

      {renderTemplate()}
    </div>
  );
}
