import React from "react";
import StandardInvoiceTemplate from "./invoice-templates/StandardInvoiceTemplate";
import MinimalInvoiceTemplate from "./invoice-templates/MinimalInvoiceTemplate";
import OfficialInvoiceTemplate from "./invoice-templates/OfficialInvoiceTemplate";
import ThermalInvoiceTemplate from "./invoice-templates/ThermalInvoiceTemplate";
import CompactInvoiceTemplate from "./invoice-templates/CompactInvoiceTemplate";
import { InvoicePrintTemplateProps } from "./invoice-templates/InvoicePrintTypes";

export default function InvoicePrintTemplate(props: InvoicePrintTemplateProps) {
  const format = props.storeSettings?.invoicePrintFormat || 'standard';

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
}
