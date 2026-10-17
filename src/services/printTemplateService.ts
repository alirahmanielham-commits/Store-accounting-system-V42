import { 
  PrintTemplateProfile, 
  defaultPrintProfiles, 
  DocumentPrintCategory,
  defaultInvoiceColumnSettings 
} from '../types/printStudio';
import { InvoicePrintSettings } from '../components/print/invoice-templates/InvoicePrintTypes';
import { ReceiptPrintSettings, defaultReceiptPrintSettings, defaultReceiptPrintFields, ReceiptPaperSize, ReceiptDesignTheme } from '../components/print/ReceiptPrintTypes';

const STORAGE_PROFILES_KEY = 'print_studio_profiles_v1';
const INVOICE_PRINT_SETTINGS_STORAGE_KEY = 'company_user_invoice_print_settings';
const RECEIPT_PRINT_SETTINGS_STORAGE_KEY = 'receipt_print_settings_v2';

export class PrintTemplateService {
  /**
   * Retrieves all saved template profiles or initializes defaults.
   */
  static getProfiles(): PrintTemplateProfile[] {
    try {
      const data = localStorage.getItem(STORAGE_PROFILES_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Ensure any newly added factory default profiles are merged in if missing
          const existingIds = new Set(parsed.map((p: any) => p.id));
          const missingDefaults = defaultPrintProfiles.filter((dp) => !existingIds.has(dp.id));
          if (missingDefaults.length > 0) {
            const merged = [...parsed, ...missingDefaults];
            this.saveProfiles(merged);
            return merged;
          }
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error reading print profiles from storage:', e);
    }
    // Initialize with defaults if none exists
    this.saveProfiles(defaultPrintProfiles);
    return defaultPrintProfiles;
  }

  /**
   * Saves the entire list of profiles to localStorage and syncs defaults.
   */
  static saveProfiles(profiles: PrintTemplateProfile[]): void {
    try {
      localStorage.setItem(STORAGE_PROFILES_KEY, JSON.stringify(profiles));
      this.syncActiveDefaults(profiles);
    } catch (e) {
      console.error('Error saving print profiles:', e);
    }
  }

  /**
   * Gets profiles filtered by category.
   */
  static getProfilesByCategory(category: DocumentPrintCategory): PrintTemplateProfile[] {
    const all = this.getProfiles();
    return all.filter((p) => p.category === category);
  }

  /**
   * Gets the default profile for a specific category.
   */
  static getDefaultProfile(category: DocumentPrintCategory): PrintTemplateProfile {
    const list = this.getProfilesByCategory(category);
    const def = list.find((p) => p.isDefault);
    if (def) return def;
    if (list.length > 0) return list[0];
    
    // Fallback to factory default
    const fallback = defaultPrintProfiles.find((p) => p.category === category);
    return fallback || defaultPrintProfiles[0];
  }

  /**
   * Saves or updates a specific profile.
   */
  static saveProfile(profile: PrintTemplateProfile): void {
    const all = this.getProfiles();
    const index = all.findIndex((p) => p.id === profile.id);
    
    let updated: PrintTemplateProfile[];
    if (index >= 0) {
      // If marking as default, unmark other defaults in same category
      if (profile.isDefault) {
        all.forEach((p) => {
          if (p.category === profile.category) p.isDefault = false;
        });
      }
      updated = [...all];
      updated[index] = { ...profile, updatedAt: new Date().toISOString() };
    } else {
      if (profile.isDefault) {
        all.forEach((p) => {
          if (p.category === profile.category) p.isDefault = false;
        });
      }
      updated = [...all, { ...profile, updatedAt: new Date().toISOString() }];
    }
    
    this.saveProfiles(updated);
  }

  /**
   * Sets a profile as default for its category.
   */
  static setDefaultProfile(profileId: string): void {
    const all = this.getProfiles();
    const target = all.find((p) => p.id === profileId);
    if (!target) return;

    all.forEach((p) => {
      if (p.category === target.category) {
        p.isDefault = p.id === profileId;
      }
    });

    this.saveProfiles(all);
  }

  /**
   * Deletes a profile (cannot delete if it's the only one in category).
   */
  static deleteProfile(profileId: string): boolean {
    const all = this.getProfiles();
    const target = all.find((p) => p.id === profileId);
    if (!target) return false;

    const sameCat = all.filter((p) => p.category === target.category);
    if (sameCat.length <= 1) {
      return false; // Cannot delete the last profile of a category
    }

    const filtered = all.filter((p) => p.id !== profileId);
    // If deleted was default, make another one default
    if (target.isDefault) {
      const nextDef = filtered.find((p) => p.category === target.category);
      if (nextDef) nextDef.isDefault = true;
    }

    this.saveProfiles(filtered);
    return true;
  }

  /**
   * Duplicates a profile as a new custom template.
   */
  static duplicateProfile(profileId: string, customName?: string): PrintTemplateProfile {
    const all = this.getProfiles();
    const target = all.find((p) => p.id === profileId) || defaultPrintProfiles[0];
    
    const newProfile: PrintTemplateProfile = {
      ...JSON.parse(JSON.stringify(target)),
      id: `profile_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: customName || `${target.name} (کپی)`,
      isDefault: false,
      updatedAt: new Date().toISOString(),
    };

    all.push(newProfile);
    this.saveProfiles(all);
    return newProfile;
  }

  /**
   * Resets all profiles to factory defaults.
   */
  static resetToDefaults(): void {
    this.saveProfiles(defaultPrintProfiles);
  }

  /**
   * Synchronizes active defaults with existing software localStorage keys
   * so InvoicePrintTemplate, PreviewModals, and ReceiptPrintModal immediately pick them up!
   */
  private static syncActiveDefaults(profiles: PrintTemplateProfile[]): void {
    try {
      // 1. Sync Invoice Default
      const invoiceDef = profiles.find((p) => p.category === 'invoice' && p.isDefault) ||
        profiles.find((p) => p.category === 'invoice');

      if (invoiceDef) {
        const invoiceSettings: InvoicePrintSettings = {
          showStoreLogo: invoiceDef.showStoreLogo,
          showSignatures: invoiceDef.showSignatures,
          showTransactions: invoiceDef.showTransactions,
          showBalance: invoiceDef.showCustomerBalance,
          showNotes: invoiceDef.showFooter,
          showFooter: invoiceDef.showFooter,
          showQrCode: invoiceDef.showQrCode,
          designType: invoiceDef.designTheme,
          paperSize: (invoiceDef.paperSize === 'pos80' || invoiceDef.paperSize === 'pos58') ? 'pos80' : (invoiceDef.paperSize === 'a5' ? 'a5' : 'a4'),
          columns: invoiceDef.columns,
          boldBorders: invoiceDef.boldBorders,
          paginationMode: invoiceDef.paginationMode,
          itemsPerPage: invoiceDef.itemsPerPage,
          fontSize: invoiceDef.fontSize,
        };
        localStorage.setItem(INVOICE_PRINT_SETTINGS_STORAGE_KEY, JSON.stringify(invoiceSettings));
      }

      // 2. Sync Receipt Default
      const receiptDef = profiles.find((p) => p.category === 'receipt' && p.isDefault) ||
        profiles.find((p) => p.category === 'receipt');

      if (receiptDef) {
        const receiptSettings = this.toReceiptPrintSettings(receiptDef);
        localStorage.setItem(RECEIPT_PRINT_SETTINGS_STORAGE_KEY, JSON.stringify(receiptSettings));
      }
    } catch (e) {
      console.warn('Error syncing active print defaults:', e);
    }
  }

  /**
   * Converts profile into ReceiptPrintSettings.
   */
  static toReceiptPrintSettings(profile: PrintTemplateProfile): ReceiptPrintSettings {
    let paperSize: ReceiptPaperSize = 'a5_landscape';
    if (profile.paperSize === 'a4_2copy') paperSize = 'a4_2copy';
    else if (profile.paperSize === 'pos80' || profile.paperSize === 'pos58') paperSize = 'pos80';
    else if (profile.paperSize === 'a4') paperSize = 'a4_portrait';
    else if (profile.orientation === 'landscape') paperSize = 'a5_landscape';
    else paperSize = 'a5_portrait';

    let designTheme: ReceiptDesignTheme = 'modern';
    if (profile.designTheme === 'official') designTheme = 'official';
    else if (profile.designTheme === 'minimal') designTheme = 'minimal';
    else if (profile.designTheme === 'thermal') designTheme = 'thermal';
    else if (profile.designTheme === 'compact') designTheme = 'compact';
    else if (profile.designTheme === 'standard') designTheme = 'classic';

    return {
      paperSize,
      designTheme,
      scale: profile.scale || 100,
      fields: {
        ...defaultReceiptPrintFields,
        showStoreName: profile.showStoreName,
        showStoreLogo: profile.showStoreLogo,
        showStorePhone: profile.showStorePhone,
        showStoreAddress: profile.showStoreAddress,
        showEconomicCode: profile.showEconomicCode,
        showNationalId: profile.showNationalId,
        showPersonName: profile.showCustomerInfo,
        showPersonPhone: profile.showCustomerPhone,
        showPersonAddress: profile.showCustomerAddress,
        showPersonBalance: profile.showCustomerBalance,
        showAmountNumber: true,
        showAmountWords: profile.showAmountInWords,
        showPaymentMethod: profile.showSettlementDetails,
        showDetailedSettlementTable: profile.showSettlementDetails,
        showBalanceBeforeAndAfter: profile.showCustomerBalance,
        showSignatures: profile.showSignatures,
        signatureCount: profile.signaturesCount,
        signature1Title: profile.signature1Title || defaultReceiptPrintFields.signature1Title,
        signature2Title: profile.signature2Title || defaultReceiptPrintFields.signature2Title,
        signature3Title: profile.signature3Title || defaultReceiptPrintFields.signature3Title,
        showFooterNote: profile.showFooter,
        customFooterText: profile.footerNote || defaultReceiptPrintFields.customFooterText,
        showSoftwareWatermark: profile.showWatermark,
        ...(profile.receiptFields || {})
      }
    };
  }

  /**
   * Converts profile into InvoicePrintSettings.
   */
  static toInvoicePrintSettings(profile: PrintTemplateProfile): InvoicePrintSettings {
    return {
      showStoreLogo: profile.showStoreLogo,
      showSignatures: profile.showSignatures,
      showTransactions: profile.showTransactions,
      showBalance: profile.showCustomerBalance,
      showNotes: profile.showFooter,
      showFooter: profile.showFooter,
      showQrCode: profile.showQrCode,
      designType: profile.designTheme,
      paperSize: (profile.paperSize === 'pos80' || profile.paperSize === 'pos58') ? 'pos80' : (profile.paperSize === 'a5' ? 'a5' : 'a4'),
      columns: profile.columns,
      boldBorders: profile.boldBorders,
      paginationMode: profile.paginationMode,
      itemsPerPage: profile.itemsPerPage,
      fontSize: profile.fontSize,
    };
  }

  /**
   * Export profiles to JSON string for downloading.
   */
  static exportProfilesJson(): string {
    const profiles = this.getProfiles();
    return JSON.stringify({
      version: '1.0',
      exportedAt: new Date().toISOString(),
      profiles,
    }, null, 2);
  }

  /**
   * Import profiles from JSON string.
   */
  static importProfilesJson(jsonStr: string): { success: boolean; count: number; error?: string } {
    try {
      const data = JSON.parse(jsonStr);
      const incoming = Array.isArray(data) ? data : data?.profiles;
      if (!Array.isArray(incoming) || incoming.length === 0) {
        return { success: false, count: 0, error: 'ساختار فایل معتبر نیست' };
      }

      const existing = this.getProfiles();
      const existingMap = new Map(existing.map((p) => [p.id, p]));

      let added = 0;
      incoming.forEach((p: any) => {
        if (p.id && p.name && p.category) {
          existingMap.set(p.id, {
            ...p,
            updatedAt: new Date().toISOString(),
          });
          added++;
        }
      });

      const merged = Array.from(existingMap.values());
      this.saveProfiles(merged);
      return { success: true, count: added };
    } catch (e: any) {
      return { success: false, count: 0, error: e.message || 'خطا در خواندن فایل' };
    }
  }
}
