export interface InvoicePrintTemplateProps {
  data: any;
  storeSettings: any;
  persons: any[];
  transactions?: any[];
  invoices?: any[];
  personOpeningBalances?: any[];
  issuedChecks?: any[];
  receivedChecks?: any[];
  printSettings?: any;
  paperSize?: "a4" | "a5";
}
