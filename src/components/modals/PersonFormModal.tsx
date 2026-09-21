import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { 
  User, 
  X, 
  Check, 
  Plus, 
  RefreshCw, 
  CreditCard, 
  Building, 
  MapPin, 
  Tag,
  AlertTriangle,
  AlertCircle,
  Phone,
  ShieldAlert,
  CheckCircle2,
  FileText,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Mail,
  Trash2,
  Briefcase,
  Layers,
  Sparkles,
  Upload,
  Calendar,
  Wallet,
  Globe,
  Share2,
  CheckCheck,
  Building2,
  Info
} from "lucide-react";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import CustomDatePicker from "../ui/CustomDatePicker";
import { toPersianDigits, convertToGregorian, numberToWords } from "../../utils/format";
import CurrencyInput from "../ui/CurrencyInput";
import { addPerson, updatePerson, deletePerson as deletePersonService } from "../../services/dataService";

const DatePicker = CustomDatePicker;

export type PersonTabId = "general" | "contact" | "financial" | "settings" | "employee";

interface PersonFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingPersonId: any;
  persons: any[];
  personGroups: any[];
  personRoles: any[];
  personCategories?: any[];
  storeSettings?: any;
  activeTab?: any;
  setReceiptPersonId?: any;
  setCustomerId?: any;
  setSalaryPersonId?: any;
  deletePerson?: any;
  fetchPersons?: any;
  setActiveTab?: (tab: string) => void;
  setLedgerPersonId?: (id: string) => void;
  onSuccess: (addedPerson?: any) => void;
  showNotification: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  confirmAction: (msg: string, onConfirm: () => void) => void;
}

export default function PersonFormModal({
  isOpen,
  onClose,
  editingPersonId,
  persons = [],
  personGroups = [],
  personRoles = [],
  personCategories = [],
  storeSettings,
  activeTab,
  setReceiptPersonId,
  setCustomerId,
  setSalaryPersonId,
  setActiveTab,
  onSuccess,
  showNotification,
}: PersonFormModalProps) {
  // Navigation tab
  const [personFormTab, setPersonFormTab] = useState<PersonTabId>("general");

  // Core Identity State
  const [newPersonType, setNewPersonType] = useState<"real" | "legal">("real");
  const [newPersonRole, setNewPersonRole] = useState<string>("customer");
  const [newPersonRoles, setNewPersonRoles] = useState<string[]>([]);
  const [newPersonTitle, setNewPersonTitle] = useState("");
  const [newPersonFirstName, setNewPersonFirstName] = useState("");
  const [newPersonLastName, setNewPersonLastName] = useState("");
  const [newPersonCompanyName, setNewPersonCompanyName] = useState("");
  const [newPersonAlias, setNewPersonAlias] = useState("");
  const [newPersonFatherName, setNewPersonFatherName] = useState("");
  const [newPersonGender, setNewPersonGender] = useState("");
  const [newPersonNationalId, setNewPersonNationalId] = useState("");
  const [newPersonAccountingCode, setNewPersonAccountingCode] = useState("");
  const [newPersonEconomicCode, setNewPersonEconomicCode] = useState("");
  const [newPersonRegistrationNumber, setNewPersonRegistrationNumber] = useState("");
  const [newPersonImage, setNewPersonImage] = useState("");

  // Contact Information
  const [newPersonPhone, setNewPersonPhone] = useState("");
  const [newPersonMobile, setNewPersonMobile] = useState("");
  const [newPersonEmail, setNewPersonEmail] = useState("");
  const [newPersonProvince, setNewPersonProvince] = useState("");
  const [newPersonCity, setNewPersonCity] = useState("");
  const [newPersonPostalCode, setNewPersonPostalCode] = useState("");
  const [newPersonAddress, setNewPersonAddress] = useState("");
  const [newPersonContacts, setNewPersonContacts] = useState<any[]>([]);

  // Financial & Credit Information
  const [newPersonInitialBalance, setNewPersonInitialBalance] = useState("");
  const [newPersonInitialBalanceType, setNewPersonInitialBalanceType] = useState<"settled" | "debtor" | "creditor">("settled");
  const [newPersonCreditLimit, setNewPersonCreditLimit] = useState("");

  // Settings & Grouping
  const [newPersonGroup, setNewPersonGroup] = useState("");
  const [newPersonGroupId, setNewPersonGroupId] = useState("");
  const [newPersonIsActive, setNewPersonIsActive] = useState(true);
  const [newPersonRegistrationDate, setNewPersonRegistrationDate] = useState<any>("");
  const [newPersonDescription, setNewPersonDescription] = useState("");
  const [newPersonCategories, setNewPersonCategories] = useState<string[]>([]);

  // Employment / Personnel Info
  const [newPersonJobTitle, setNewPersonJobTitle] = useState("");
  const [newPersonInsuranceNumber, setNewPersonInsuranceNumber] = useState("");
  const [newPersonInsuranceType, setNewPersonInsuranceType] = useState("");
  const [newPersonEducationLevel, setNewPersonEducationLevel] = useState("");
  const [newPersonStudyField, setNewPersonStudyField] = useState("");
  const [newPersonExperienceYears, setNewPersonExperienceYears] = useState("");
  const [newPersonMaritalStatus, setNewPersonMaritalStatus] = useState("");
  const [newPersonChildrenCount, setNewPersonChildrenCount] = useState("");
  const [hasEmployeeDetails, setHasEmployeeDetails] = useState(false);

  // Submission & Duplicates State
  const [submittingPerson, setSubmittingPerson] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [showDuplicatesModal, setShowDuplicatesModal] = useState(false);

  // Initialize or reset form when modal opens or editingPersonId changes
  useEffect(() => {
    if (isOpen) {
      if (editingPersonId) {
        const person = persons.find(p => String(p.id) === String(editingPersonId));
        if (person) {
          const type = person.personType || (person.type === "legal" ? "legal" : "real");
          setNewPersonType(type);
          
          setNewPersonFirstName(person.firstName || (type === "real" ? person.name : "") || "");
          setNewPersonLastName(person.lastName || "");
          setNewPersonTitle(person.title || "");
          setNewPersonFatherName(person.fatherName || "");
          setNewPersonGender(person.gender || "");
          setNewPersonAccountingCode(person.accountingCode || "");
          setNewPersonCompanyName(person.companyName || (type === "legal" ? person.name : "") || "");
          setNewPersonAlias(person.alias || "");
          setNewPersonInitialBalance(person.initialBalance ? String(person.initialBalance) : "");
          setNewPersonInitialBalanceType(person.initialBalanceType || "settled");
          setNewPersonImage(person.imageUrl || person.image || "");
          setNewPersonIsActive(person.isActive !== undefined ? person.isActive : true);
          setNewPersonRegistrationDate(person.registrationDate || "");
          
          setNewPersonRole(person.role || "customer");
          setNewPersonRoles(person.roles || (person.role ? [person.role] : []));
          setNewPersonCategories(person.categories || []);
          setNewPersonPhone(person.phone || person.mobile || "");
          setNewPersonMobile(person.mobile || person.phone || "");
          setNewPersonPostalCode(person.postalCode || "");
          setNewPersonEmail(person.email || "");
          setNewPersonAddress(person.address || "");
          setNewPersonDescription(person.description || "");
          setNewPersonProvince(person.province || "");
          setNewPersonCity(person.city || "");
          setNewPersonCreditLimit(person.creditLimit ? String(person.creditLimit) : "");
          setNewPersonGroup(person.group || person.groupId || "");
          setNewPersonGroupId(person.groupId || person.group || "");
          setNewPersonEconomicCode(person.economicCode || "");
          setNewPersonRegistrationNumber(person.registrationNumber || "");
          setNewPersonContacts(person.contacts || []);
          
          setNewPersonJobTitle(person.jobTitle || "");
          setNewPersonInsuranceNumber(person.insuranceNumber || "");
          setNewPersonInsuranceType(person.insuranceType || "");
          setNewPersonEducationLevel(person.educationLevel || "");
          setNewPersonStudyField(person.studyField || "");
          setNewPersonExperienceYears(person.experienceYears ? String(person.experienceYears) : "");
          setNewPersonMaritalStatus(person.maritalStatus || "");
          setNewPersonChildrenCount(person.childrenCount ? String(person.childrenCount) : "");
          
          if (
            person.role === "employee" || 
            person.roles?.includes("employee") || 
            person.jobTitle || 
            person.insuranceNumber
          ) {
            setHasEmployeeDetails(true);
          } else {
            setHasEmployeeDetails(false);
          }
        }
      } else {
        // Reset to initial clean state
        setNewPersonType("real");
        setNewPersonFirstName("");
        setNewPersonLastName("");
        setNewPersonCompanyName("");
        setNewPersonTitle("");
        setNewPersonAlias("");
        setNewPersonFatherName("");
        setNewPersonGender("none");
        setNewPersonNationalId("");
        setNewPersonAccountingCode("");
        setNewPersonEconomicCode("");
        setNewPersonRegistrationNumber("");
        setNewPersonImage("");

        setNewPersonRole("customer");
        setNewPersonRoles(["customer"]);
        setNewPersonPhone("");
        setNewPersonMobile("");
        setNewPersonEmail("");
        setNewPersonProvince("");
        setNewPersonCity("");
        setNewPersonPostalCode("");
        setNewPersonAddress("");
        setNewPersonContacts([]);

        setNewPersonInitialBalance("");
        setNewPersonInitialBalanceType("settled");
        setNewPersonCreditLimit("");

        setNewPersonGroup("");
        setNewPersonGroupId("");
        setNewPersonIsActive(true);
        setNewPersonRegistrationDate(new Date().toISOString().split("T")[0]);
        setNewPersonDescription("");
        setNewPersonCategories([]);

        setNewPersonJobTitle("");
        setNewPersonInsuranceNumber("");
        setNewPersonInsuranceType("");
        setNewPersonEducationLevel("");
        setNewPersonStudyField("");
        setNewPersonExperienceYears("");
        setNewPersonMaritalStatus("");
        setNewPersonChildrenCount("");
        setHasEmployeeDetails(false);
      }
      setPersonFormTab("general");
    }
  }, [isOpen, editingPersonId, persons]);

  // Handle role switch to employee
  useEffect(() => {
    if (newPersonRole === "employee" || newPersonRoles.includes("employee")) {
      setHasEmployeeDetails(true);
    }
  }, [newPersonRole, newPersonRoles]);

  // Text normalization helpers for duplicates detection
  const normalizePersian = (text: any): string => {
    if (!text) return "";
    return String(text)
      .trim()
      .toLowerCase()
      .replace(/[\u064B-\u065F]/g, "")
      .replace(/[ي]/g, "ی")
      .replace(/[ك]/g, "ک")
      .replace(/[آأإ]/g, "ا")
      .replace(/[ة]/g, "ه")
      .replace(/\u200c/g, " ")
      .replace(/\s+/g, " ");
  };

  const normalizeDigits = (val: any): string => {
    if (!val) return "";
    const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
    const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
    let res = String(val);
    persianDigits.forEach((d, i) => {
      res = res.replace(new RegExp(d, "g"), String(i));
    });
    arabicDigits.forEach((d, i) => {
      res = res.replace(new RegExp(d, "g"), String(i));
    });
    return res.replace(/\D/g, "");
  };

  const normalizePhoneNumber = (ph: any): string => {
    if (!ph) return "";
    let clean = normalizeDigits(ph);
    if (clean.startsWith("98")) clean = clean.substring(2);
    if (clean.startsWith("0")) clean = clean.substring(1);
    return clean;
  };

  // Smart Display Name Calculation
  const computedDisplayName = React.useMemo(() => {
    if (newPersonType === "legal") {
      return newPersonAlias || newPersonCompanyName || "شخص حقوقی جدید";
    }
    const full = `${newPersonFirstName} ${newPersonLastName}`.trim();
    if (newPersonAlias) return newPersonAlias;
    if (full) {
      return `${newPersonTitle ? newPersonTitle + " " : ""}${full}`.trim();
    }
    return "شخص حقیقی جدید";
  }, [newPersonType, newPersonFirstName, newPersonLastName, newPersonTitle, newPersonAlias, newPersonCompanyName]);

  // Suggested aliases for real person
  const suggestedAliases = React.useMemo(() => {
    if (newPersonType === "legal") {
      return Array.from(new Set([
        newPersonCompanyName,
        newPersonCompanyName ? `شرکت ${newPersonCompanyName}` : "",
        newPersonCompanyName ? `فروشگاه ${newPersonCompanyName}` : "",
        newPersonCompanyName ? `بازرگانی ${newPersonCompanyName}` : "",
      ].filter(Boolean)));
    }
    const full = `${newPersonFirstName} ${newPersonLastName}`.trim();
    const withFather = newPersonFatherName ? `${full} (فرزند ${newPersonFatherName})` : "";
    const withTitle = newPersonTitle ? `${newPersonTitle} ${full}` : "";
    const withTitleFather = (newPersonTitle && newPersonFatherName) ? `${newPersonTitle} ${full} (فرزند ${newPersonFatherName})` : "";
    return Array.from(new Set([
      withTitle,
      full,
      withTitleFather,
      withFather,
      newPersonLastName,
      newPersonTitle ? `${newPersonTitle} ${newPersonLastName}` : "",
    ].filter(Boolean)));
  }, [newPersonType, newPersonFirstName, newPersonLastName, newPersonTitle, newPersonFatherName, newPersonCompanyName]);

  // Validate current tab before moving forward or submitting
  const validateTab = (tab: PersonTabId): boolean => {
    if (tab === "general") {
      if (newPersonType === "real") {
        if (!newPersonFirstName.trim()) {
          showNotification("لطفاً «نام» شخص را وارد فرمایید", "warning");
          return false;
        }
        if (!newPersonLastName.trim()) {
          showNotification("لطفاً «نام خانوادگی» شخص را وارد فرمایید", "warning");
          return false;
        }
      } else {
        if (!newPersonCompanyName.trim()) {
          showNotification("لطفاً «نام شرکت یا سازمان» را وارد فرمایید", "warning");
          return false;
        }
      }
    }
    return true;
  };

  // Duplicate Check logic
  const handleCheckDuplicates = async (e?: React.FormEvent) => {
    if (e && typeof e.preventDefault === "function") {
      e.preventDefault();
    }

    // Validate general identity fields first
    if (!validateTab("general")) {
      setPersonFormTab("general");
      return;
    }

    const matches: {
      person: any;
      reasons: {
        field: 'nationalId' | 'phone' | 'name' | 'alias';
        title: string;
        description: string;
        severity: 'danger' | 'warning';
      }[];
    }[] = [];

    const normInputNId = normalizeDigits(newPersonNationalId);
    const normInputPhone = normalizePhoneNumber(newPersonPhone);
    const normInputMobile = normalizePhoneNumber(newPersonMobile);
    const normInputContacts = (newPersonContacts || []).map((c: any) => normalizePhoneNumber(c?.number)).filter(Boolean);
    const allInputPhones = Array.from(new Set([normInputPhone, normInputMobile, ...normInputContacts].filter(p => p.length >= 7)));

    const inputFullName = newPersonType === "legal"
      ? (newPersonCompanyName || "").trim()
      : `${newPersonFirstName || ''} ${newPersonLastName || ''}`.trim();
    const normInputName = normalizePersian(inputFullName);
    const normInputFirst = normalizePersian(newPersonFirstName);
    const normInputLast = normalizePersian(newPersonLastName);
    const normInputAlias = normalizePersian(newPersonAlias);

    (persons || []).forEach((p: any) => {
      if (!p) return;
      if (editingPersonId && String(p.id) === String(editingPersonId)) return;

      const pReasons: {
        field: 'nationalId' | 'phone' | 'name' | 'alias';
        title: string;
        description: string;
        severity: 'danger' | 'warning';
      }[] = [];

      // 1. National ID Check
      const normPNId = normalizeDigits(p.nationalId);
      if (normInputNId && normPNId && normInputNId.length >= 8 && normInputNId === normPNId) {
        pReasons.push({
          field: 'nationalId',
          title: 'کد ملی یکسان و تکراری',
          description: `کد ملی با شخص «${p.name || p.fullName || 'نامشخص'}» کاملاً یکسان است.`,
          severity: 'danger'
        });
      }

      // 2. Phone Check
      const pPhones = [
        normalizePhoneNumber(p.phone),
        normalizePhoneNumber(p.mobile),
        ...(p.contacts || []).map((c: any) => normalizePhoneNumber(c?.number))
      ].filter(ph => ph && ph.length >= 7);

      const hasMatchingPhone = allInputPhones.some(inPh => pPhones.includes(inPh));
      if (hasMatchingPhone) {
        pReasons.push({
          field: 'phone',
          title: 'شماره تماس یا همراه تکراری',
          description: `شماره تلفن با اطلاعات ثبت‌شده برای «${p.name || p.fullName || 'این شخص'}» یکسان است.`,
          severity: 'danger'
        });
      }

      // 3. Name Similarity Check
      if (newPersonType === "real") {
        const pFullName = normalizePersian(p.name || `${p.firstName || ''} ${p.lastName || ''}`);
        const pFirst = normalizePersian(p.firstName || '');
        const pLast = normalizePersian(p.lastName || '');
        const pAlias = normalizePersian(p.alias || '');

        if (normInputName && pFullName && normInputName === pFullName) {
          pReasons.push({
            field: 'name',
            title: 'نام و نام خانوادگی یکسان',
            description: `نام و نام خانوادگی وارد شده با «${p.name || `${p.firstName} ${p.lastName}`}» کاملاً یکسان است.`,
            severity: 'danger'
          });
        } else if (
          normInputLast && pLast &&
          normInputLast.length >= 3 &&
          normInputLast === pLast &&
          normInputFirst && pFirst &&
          (normInputFirst === pFirst || normInputFirst.includes(pFirst) || pFirst.includes(normInputFirst))
        ) {
          pReasons.push({
            field: 'name',
            title: 'نام خانوادگی و نام مشابه',
            description: `نام و نام خانوادگی با این شخص بسیار شبیه است.`,
            severity: 'warning'
          });
        } else if (normInputAlias && pAlias && normInputAlias.length >= 3 && normInputAlias === pAlias) {
          pReasons.push({
            field: 'alias',
            title: 'نام مستعار یا شهرت یکسان',
            description: `نام نمایشی وارد شده با شخص «${p.alias || p.name}» یکسان است.`,
            severity: 'warning'
          });
        }
      } else {
        const pCompany = normalizePersian(p.companyName || p.name || '');
        if (normInputName && pCompany) {
          if (normInputName === pCompany) {
            pReasons.push({
              field: 'name',
              title: 'نام شرکت یا سازمان یکسان',
              description: `نام شرکت وارد شده با «${p.companyName || p.name}» دقیقاً یکسان است.`,
              severity: 'danger'
            });
          } else if (
            normInputName.length >= 4 &&
            pCompany.length >= 4 &&
            (pCompany.includes(normInputName) || pCompany.includes(normInputName))
          ) {
            pReasons.push({
              field: 'name',
              title: 'نام شرکت یا سازمان مشابه',
              description: `نام وارد شده با شرکت «${p.companyName || p.name}» تشابه دارد.`,
              severity: 'warning'
            });
          }
        }
      }

      if (pReasons.length > 0) {
        matches.push({
          person: p,
          reasons: pReasons
        });
      }
    });

    // Also check backend API if available
    try {
      const response = await fetch('/api/persons/check-duplicates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: inputFullName,
          nationalId: newPersonNationalId,
          phone: newPersonPhone,
          taxNumber: newPersonEconomicCode,
          registrationNumber: newPersonRegistrationNumber,
          companyName: newPersonCompanyName
        })
      });
      const result = await response.json();
      if (result.success && Array.isArray(result.duplicates)) {
        const filteredServerDups = editingPersonId
          ? result.duplicates.filter((d: any) => String(d.id) !== String(editingPersonId))
          : result.duplicates;

        filteredServerDups.forEach((serverP: any) => {
          const alreadyMatched = matches.some(m => String(m.person.id) === String(serverP.id));
          if (!alreadyMatched) {
            matches.push({
              person: serverP,
              reasons: [{
                field: 'name',
                title: 'مورد مشابه در سرور',
                description: `شخص «${serverP.name || serverP.companyName || 'بدون نام'}» با مشخصات مشابه شناسایی شد.`,
                severity: 'warning'
              }]
            });
          }
        });
      }
    } catch {
      // Background check error ignored
    }

    if (matches.length > 0) {
      setDuplicates(matches);
      setShowDuplicatesModal(true);
      return;
    }

    // No duplicates -> submit immediately
    handleSubmitPerson();
  };

  // Submit person to store / data service
  const handleSubmitPerson = async () => {
    setSubmittingPerson(true);
    setSubmitStatus("در حال اعتبارسنجی و ثبت اطلاعات...");
    const rollbackActions: (() => Promise<void>)[] = [];

    try {
      const isEdit = editingPersonId !== null;
      let name = "";
      let generatedAlias = "";

      if (newPersonType === "legal") {
        name = newPersonCompanyName.trim();
        generatedAlias = newPersonAlias.trim() || newPersonCompanyName.trim();
      } else {
        name = `${newPersonFirstName.trim()} ${newPersonLastName.trim()}`.trim();
        let defaultAlias = `${newPersonTitle ? newPersonTitle + " " : ""}${name}`.trim();
        if (newPersonFatherName) {
          defaultAlias += ` (${newPersonFatherName})`;
        }

        if (newPersonAlias && newPersonAlias.trim()) {
          generatedAlias = newPersonAlias.trim();
        } else {
          generatedAlias = defaultAlias;
        }
      }

      const payload = {
        type: newPersonRole,
        name: name,
        fullName: name,
        title: newPersonTitle,
        alias: generatedAlias,
        personType: newPersonType,
        firstName: newPersonFirstName.trim(),
        lastName: newPersonLastName.trim(),
        companyName: newPersonCompanyName.trim(),
        fatherName: newPersonFatherName.trim(),
        nationalId: newPersonNationalId.trim(),
        gender: newPersonGender,
        accountingCode: newPersonAccountingCode.trim(),
        address: newPersonAddress.trim(),
        imageUrl: newPersonImage,
        role: newPersonRole,
        roles: Array.from(new Set([newPersonRole, ...(newPersonRoles || [])])),
        categories: newPersonCategories,
        phone: newPersonPhone.trim(),
        mobile: newPersonMobile.trim() || newPersonPhone.trim(),
        postalCode: newPersonPostalCode.trim(),
        email: newPersonEmail.trim(),
        description: newPersonDescription.trim(),
        groupId: newPersonGroupId || newPersonGroup,
        group: newPersonGroup || newPersonGroupId,
        economicCode: newPersonEconomicCode.trim(),
        registrationNumber: newPersonRegistrationNumber.trim(),
        contacts: newPersonContacts,
        initialBalance: Number(newPersonInitialBalance || 0),
        initialBalanceType: newPersonInitialBalanceType,
        creditLimit: Number(newPersonCreditLimit || 0),
        province: newPersonProvince.trim(),
        city: newPersonCity.trim(),
        isActive: newPersonIsActive,
        registrationDate: newPersonRegistrationDate ? (
          convertToGregorian(newPersonRegistrationDate)
        ) : new Date().toISOString(),
        
        jobTitle: newPersonJobTitle.trim(),
        insuranceNumber: newPersonInsuranceNumber.trim(),
        insuranceType: newPersonInsuranceType.trim(),
        educationLevel: newPersonEducationLevel.trim(),
        studyField: newPersonStudyField.trim(),
        experienceYears: newPersonExperienceYears ? Number(newPersonExperienceYears) : undefined,
        maritalStatus: newPersonMaritalStatus,
        childrenCount: newPersonChildrenCount ? Number(newPersonChildrenCount) : undefined,
      };

      let addedPerson: any;
      setSubmitStatus("در حال ذخیره‌سازی شخص در پایگاه داده...");

      if (isEdit) {
        const originalPerson = persons.find((p) => String(p.id) === String(editingPersonId));
        const originalCopy = originalPerson ? JSON.parse(JSON.stringify(originalPerson)) : null;

        await updatePerson(editingPersonId.toString(), payload as any);

        rollbackActions.push(async () => {
          if (originalCopy) {
            await updatePerson(editingPersonId.toString(), originalCopy);
          }
        });
      } else {
        addedPerson = await addPerson(payload as any);

        rollbackActions.push(async () => {
          if (addedPerson?.id) {
            await deletePersonService(addedPerson.id.toString());
          }
        });
      }

      setSubmitStatus("عملیات با موفقیت ذخیره شد...");
      await new Promise(resolve => setTimeout(resolve, 400));

      // Auto-select in active workflows
      if (!isEdit && addedPerson?.id) {
        const isReceiptOpen = activeTab === "create_receive_receipt" || activeTab === "create_pay_receipt";
        if (isReceiptOpen && setReceiptPersonId) {
          setReceiptPersonId(addedPerson.id.toString());
        } else if (
          (activeTab === "create_sale" || 
          activeTab === "create_purchase" || 
          activeTab === "create_sale_return" || 
          activeTab === "create_purchase_return" || 
          activeTab === "create_warehouse_doc") && setCustomerId
        ) {
          setCustomerId(addedPerson.id.toString());
        } else if (activeTab === "create_salary_payroll" && setSalaryPersonId) {
          setSalaryPersonId(addedPerson.id.toString());
        }
      }

      onSuccess(addedPerson);
      onClose();
      showNotification(
        isEdit ? "مشخصات شخص با موفقیت به‌روزرسانی شد" : "شخص جدید با موفقیت ثبت گردید",
        "success"
      );
    } catch (error: any) {
      console.error("Error saving person:", error);
      for (let i = rollbackActions.length - 1; i >= 0; i--) {
        try { await rollbackActions[i](); } catch {}
      }
      showNotification(`خطا در ثبت شخص: ${error.message || "خطای ناشناخته رخ داد"}`, "error");
    } finally {
      setSubmittingPerson(false);
      setSubmitStatus(null);
    }
  };

  // Step tabs list configuration
  const tabsList: {
    id: PersonTabId;
    title: string;
    subtitle: string;
    icon: React.ElementType;
    badgeCount?: number;
    isFilled: boolean;
  }[] = [
    {
      id: "general",
      title: "هویت و مشخصات",
      subtitle: "اطلاعات شناسنامه‌ای و نوع شخص",
      icon: User,
      isFilled: newPersonType === "real" 
        ? Boolean(newPersonFirstName.trim() && newPersonLastName.trim())
        : Boolean(newPersonCompanyName.trim())
    },
    {
      id: "contact",
      title: "ارتباط و نشانی",
      subtitle: "شماره‌های تماس، ایمیل و آدرس",
      icon: Phone,
      isFilled: Boolean(newPersonPhone.trim() || newPersonMobile.trim() || newPersonAddress.trim() || newPersonContacts.length > 0)
    },
    {
      id: "financial",
      title: "مالی و اعتباری",
      subtitle: "مانده اولیه و سقف اعتبار",
      icon: CreditCard,
      isFilled: Boolean(newPersonInitialBalance || newPersonCreditLimit)
    },
    {
      id: "settings",
      title: "گروه و تنظیمات",
      subtitle: "گروه‌بندی، وضعیت و دسته‌ها",
      icon: SlidersHorizontal,
      isFilled: Boolean(newPersonGroup || newPersonDescription)
    }
  ];

  // Add employee tab if enabled
  if (hasEmployeeDetails || newPersonRole === "employee" || newPersonRoles.includes("employee")) {
    tabsList.push({
      id: "employee",
      title: "اطلاعات پرسنلی",
      subtitle: "سمت، بیمه و سوابق شغلی",
      icon: Briefcase,
      isFilled: Boolean(newPersonJobTitle || newPersonInsuranceNumber || newPersonEducationLevel)
    });
  }

  // Handle Tab navigation
  const currentTabIndex = tabsList.findIndex(t => t.id === personFormTab);
  const handleNextTab = () => {
    if (!validateTab(personFormTab)) return;
    if (currentTabIndex < tabsList.length - 1) {
      setPersonFormTab(tabsList[currentTabIndex + 1].id);
    } else {
      handleCheckDuplicates();
    }
  };

  const handlePrevTab = () => {
    if (currentTabIndex > 0) {
      setPersonFormTab(tabsList[currentTabIndex - 1].id);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Processing Overlay Bar */}
      <AnimatePresence>
        {submittingPerson && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-md shadow-2xl z-[10000000] flex items-center justify-center py-3.5 px-6 rounded-full select-none border border-slate-200 min-w-[320px]"
            dir="rtl"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-8 h-8 relative flex items-center justify-center shrink-0">
                <div className="absolute inset-0 rounded-full border-2 border-indigo-100"></div>
                <div className="absolute inset-0 rounded-full border-2 border-t-indigo-600 animate-spin"></div>
                <RefreshCw className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
              </div>
              <span className="text-xs sm:text-sm font-bold text-slate-800">
                {submitStatus || "در حال ذخیره‌سازی..."}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Modal Backdrop & Container */}
      <div 
        className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto"
        dir="rtl"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="bg-white rounded-none sm:rounded-3xl shadow-2xl border-0 sm:border border-slate-100 overflow-hidden w-full max-w-4xl h-[100dvh] sm:h-auto sm:max-h-[92vh] flex flex-col relative my-auto"
        >
          {/* Header */}
          <div className="px-5 sm:px-7 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 via-white to-indigo-50/30 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 shrink-0">
                {newPersonType === "legal" ? (
                  <Building2 className="w-5 h-5" />
                ) : (
                  <User className="w-5 h-5" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black text-slate-900">
                    {editingPersonId ? "ویرایش اطلاعات شخص" : "ثبت شخص جدید"}
                  </h3>
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                    newPersonType === "legal" 
                      ? "bg-amber-50 text-amber-700 border border-amber-200" 
                      : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                  }`}>
                    {newPersonType === "legal" ? "حقوقی / شرکتی" : "حقیقی / فردی"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {editingPersonId 
                    ? `در حال ویرایش پرونده: ${computedDisplayName}` 
                    : "تکمیل مشخصات فردی، ارتباطی و اعتباری جهت ایجاد پرونده"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-2 rounded-2xl transition-all cursor-pointer"
              title="بستن پنجره"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Live Preview Bar */}
          <div className="bg-slate-50/80 px-5 sm:px-7 py-2.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative w-8 h-8 rounded-full border border-slate-200 overflow-hidden bg-white shrink-0 flex items-center justify-center">
                {newPersonImage ? (
                  <img src={newPersonImage} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-4 h-4 text-slate-400" />
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-slate-900 text-sm">
                  {computedDisplayName}
                </span>
                {newPersonPhone && (
                  <span className="flex items-center gap-1 font-mono font-bold text-slate-600 bg-white px-2 py-0.5 rounded-lg border border-slate-200 text-[11px]" dir="ltr">
                    <Phone className="w-3 h-3 text-indigo-500" />
                    {newPersonPhone}
                  </span>
                )}
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-indigo-100/70 text-indigo-800">
                  {(personRoles || []).find(r => r.id === newPersonRole)?.name || (
                    newPersonRole === "customer" ? "مشتری" :
                    newPersonRole === "supplier" ? "تامین‌کننده" :
                    newPersonRole === "employee" ? "پرسنل" : "مشتری"
                  )}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                newPersonIsActive 
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                  : "bg-rose-50 text-rose-700 border border-rose-200"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${newPersonIsActive ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`}></span>
                {newPersonIsActive ? "حساب فعال" : "غیرفعال"}
              </span>

              {newPersonInitialBalance && Number(newPersonInitialBalance) > 0 && (
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border ${
                  newPersonInitialBalanceType === "debtor" 
                    ? "bg-rose-50 text-rose-700 border-rose-200"
                    : newPersonInitialBalanceType === "creditor"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-slate-100 text-slate-600 border-slate-200"
                }`}>
                  مانده اولیه: {toPersianDigits(Number(newPersonInitialBalance).toLocaleString())} {storeSettings?.currency || "تومان"}
                  {newPersonInitialBalanceType === "debtor" ? " (بدهکار)" : newPersonInitialBalanceType === "creditor" ? " (بستانکار)" : ""}
                </span>
              )}
            </div>
          </div>

          {/* Fluid Modern Tabs Header */}
          <div className="bg-white border-b border-slate-200/80 px-4 sm:px-7 py-2 overflow-x-auto whitespace-nowrap gap-2 flex items-center shrink-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {tabsList.map((tab, idx) => {
              const isActive = personFormTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    if (personFormTab === "general" && !validateTab("general")) return;
                    setPersonFormTab(tab.id);
                  }}
                  className={`group relative flex items-center gap-2.5 px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all duration-200 cursor-pointer shrink-0 ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                  }`}
                >
                  <span className={`flex items-center justify-center w-6 h-6 rounded-xl text-xs transition-colors ${
                    isActive 
                      ? "bg-white/20 text-white" 
                      : tab.isFilled 
                      ? "bg-emerald-100 text-emerald-700 font-black"
                      : "bg-slate-200/80 text-slate-600 font-bold"
                  }`}>
                    {tab.isFilled && !isActive ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      toPersianDigits(idx + 1)
                    )}
                  </span>

                  <Icon className={`w-4 h-4 transition-transform ${isActive ? "scale-110" : "group-hover:scale-105 opacity-70"}`} />
                  
                  <span>{tab.title}</span>

                  {tab.isFilled && !isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Modal Tab Content Area */}
          <div className="p-4 sm:p-7 overflow-y-auto flex-1 bg-slate-50/40">
            <form
              id="personFormModalForm"
              onSubmit={(e) => {
                e.preventDefault();
                handleCheckDuplicates(e);
              }}
              className="flex flex-col gap-6 max-w-3xl mx-auto"
            >
              {/* TAB 1: IDENTITY & BASIC INFORMATION */}
              {personFormTab === "general" && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  {/* Entity Type Selector & Role Card */}
                  <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Entity Type: Real vs Legal */}
                      <div>
                        <label className="block text-xs font-black text-slate-700 mb-2">
                          نوع شخصیت حقوقی / حقیقی <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                          <button
                            type="button"
                            onClick={() => setNewPersonType("real")}
                            className={`py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                              newPersonType === "real"
                                ? "bg-white text-indigo-600 shadow-sm border border-slate-200/50"
                                : "text-slate-500 hover:text-slate-800"
                            }`}
                          >
                            <User className="w-4 h-4" />
                            <span>شخص حقیقی (فرد)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setNewPersonType("legal")}
                            className={`py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                              newPersonType === "legal"
                                ? "bg-white text-indigo-600 shadow-sm border border-slate-200/50"
                                : "text-slate-500 hover:text-slate-800"
                            }`}
                          >
                            <Building2 className="w-4 h-4" />
                            <span>شخص حقوقی (شرکت)</span>
                          </button>
                        </div>
                      </div>

                      {/* Primary Role Selector */}
                      <div>
                        <label className="block text-xs font-black text-slate-700 mb-2">
                          نقش اصلی ارتباطی <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={newPersonRole}
                          onChange={(e) => {
                            const val = e.target.value;
                            setNewPersonRole(val);
                            if (val === "employee") {
                              setHasEmployeeDetails(true);
                            }
                          }}
                          disabled={!!editingPersonId}
                          className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-slate-800 bg-white transition-colors disabled:bg-slate-100 disabled:cursor-not-allowed"
                        >
                          {(personRoles || []).map((r, index) => (
                            <option key={r.id ? `id-${r.id}` : `idx-${index}`} value={r.id}>
                              {r.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Avatar / Profile Image Upload */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="relative w-14 h-14 rounded-2xl border-2 border-dashed border-slate-300 hover:border-indigo-400 flex items-center justify-center overflow-hidden bg-slate-50 shrink-0 transition-colors group">
                          {newPersonImage ? (
                            <img src={newPersonImage} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-6 h-6 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                          )}
                          <input
                            type="file"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            accept="image/*"
                            title="انتخاب عکس"
                            onChange={(e) => {
                              if (e.target.files && e.target.files.length > 0) {
                                const file = e.target.files[0];
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  if (event.target && event.target.result) {
                                    setNewPersonImage(event.target.result as string);
                                  }
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">
                            {newPersonType === "legal" ? "لوگو یا تصویر شرکت" : "تصویر پرسنلی / پروفایل"}
                          </span>
                          <span className="text-[11px] text-slate-400 font-medium">
                            برای انتخاب فایل تصویر کلیک نمایید (JPG، PNG)
                          </span>
                        </div>
                      </div>

                      {newPersonImage && (
                        <button
                          type="button"
                          onClick={() => setNewPersonImage("")}
                          className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>حذف عکس</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* REAL PERSON FIELDS */}
                  {newPersonType === "real" ? (
                    <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                      <h4 className="text-xs font-black text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
                        <User className="w-4 h-4 text-indigo-500" />
                        <span>مشخصات شناسنامه‌ای و فردی</span>
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            پیشوند / عنوان
                          </label>
                          <select
                            value={newPersonTitle}
                            onChange={(e) => setNewPersonTitle(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm font-medium text-slate-800 bg-white"
                          >
                            <option value="">-- بدون عنوان --</option>
                            <option value="آقای">آقای</option>
                            <option value="خانم">خانم</option>
                            <option value="دکتر">دکتر</option>
                            <option value="مهندس">مهندس</option>
                            <option value="سید">سید</option>
                            <option value="سیده">سیده</option>
                            <option value="استاد">استاد</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            نام <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={newPersonFirstName}
                            onChange={(e) => setNewPersonFirstName(e.target.value)}
                            placeholder="مثال: علی"
                            className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm font-bold text-slate-900"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            نام خانوادگی <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={newPersonLastName}
                            onChange={(e) => setNewPersonLastName(e.target.value)}
                            placeholder="مثال: محمدی"
                            className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm font-bold text-slate-900"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-xs font-bold text-slate-700">
                              نام مستعار / عنوان نمایشی در فاکتورها
                            </label>
                            <span className="text-[10px] text-indigo-600 font-bold">پیشنهاد هوشمند</span>
                          </div>
                          <div className="relative">
                            <input
                              type="text"
                              list="realPersonAliasList"
                              value={newPersonAlias}
                              onChange={(e) => setNewPersonAlias(e.target.value)}
                              placeholder="انتخاب از لیست یا تایپ دستی..."
                              className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm font-medium text-slate-900"
                            />
                            <datalist id="realPersonAliasList">
                              {suggestedAliases.map((opt) => (
                                <option key={opt} value={opt} />
                              ))}
                            </datalist>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            کد ملی ۱۰ رقمی
                          </label>
                          <input
                            type="text"
                            value={newPersonNationalId}
                            onChange={(e) => setNewPersonNationalId(e.target.value)}
                            placeholder="۰۰۱۱۵۴۷۸۹۵"
                            maxLength={10}
                            className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm font-mono font-bold text-slate-900 text-left"
                            dir="ltr"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            نام پدر
                          </label>
                          <input
                            type="text"
                            value={newPersonFatherName}
                            onChange={(e) => setNewPersonFatherName(e.target.value)}
                            placeholder="اختیاری"
                            className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm font-medium text-slate-900"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            جنسیت
                          </label>
                          <select
                            value={newPersonGender}
                            onChange={(e) => setNewPersonGender(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm font-medium text-slate-800 bg-white"
                          >
                            <option value="none">نامشخص</option>
                            <option value="male">مرد</option>
                            <option value="female">زن</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            کد حسابداری (اختیاری)
                          </label>
                          <input
                            type="text"
                            value={newPersonAccountingCode}
                            onChange={(e) => setNewPersonAccountingCode(e.target.value)}
                            placeholder="مثال: ۱۱۰۴"
                            className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm font-mono font-bold text-slate-900 text-left"
                            dir="ltr"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* LEGAL PERSON (COMPANY) FIELDS */
                    <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                      <h4 className="text-xs font-black text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
                        <Building className="w-4 h-4 text-indigo-500" />
                        <span>مشخصات شرکتی و سازمانی</span>
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            نام شرکت / سازمان / فروشگاه <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={newPersonCompanyName}
                            onChange={(e) => setNewPersonCompanyName(e.target.value)}
                            placeholder="مثال: شرکت تجارت الکترونیک پارس"
                            className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm font-bold text-slate-900"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            نام تجاری / تابلویی (Alias)
                          </label>
                          <input
                            type="text"
                            value={newPersonAlias}
                            onChange={(e) => setNewPersonAlias(e.target.value)}
                            placeholder={`مثال: ${newPersonCompanyName || "فروشگاه پارس"}`}
                            className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm font-medium text-slate-900"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            شناسه ملی ۱۱ رقمی شرکت
                          </label>
                          <input
                            type="text"
                            value={newPersonNationalId}
                            onChange={(e) => setNewPersonNationalId(e.target.value)}
                            placeholder="۱۰۱۰۱۲۳۴۵۶۷"
                            maxLength={11}
                            className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm font-mono font-bold text-slate-900 text-left"
                            dir="ltr"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            کد اقتصادی (۱۲ رقمی)
                          </label>
                          <input
                            type="text"
                            value={newPersonEconomicCode}
                            onChange={(e) => setNewPersonEconomicCode(e.target.value)}
                            placeholder="۴۱۱۱۱۲۳۴۵۶۷۸"
                            maxLength={14}
                            className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm font-mono font-bold text-slate-900 text-left"
                            dir="ltr"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            شماره ثبت
                          </label>
                          <input
                            type="text"
                            value={newPersonRegistrationNumber}
                            onChange={(e) => setNewPersonRegistrationNumber(e.target.value)}
                            placeholder="مثال: ۱۲۳۴۵"
                            className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm font-mono font-bold text-slate-900 text-left"
                            dir="ltr"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          کد حسابداری (اختیاری)
                        </label>
                        <input
                          type="text"
                          value={newPersonAccountingCode}
                          onChange={(e) => setNewPersonAccountingCode(e.target.value)}
                          placeholder="مثال: ۱۱۰۴۰۰۱"
                          className="w-full sm:w-1/2 px-4 py-2.5 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm font-mono font-bold text-slate-900 text-left"
                          dir="ltr"
                        />
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* TAB 2: CONTACT & ADDRESSES */}
              {personFormTab === "contact" && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  {/* Primary Phones & Email Card */}
                  <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                    <h4 className="text-xs font-black text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
                      <Phone className="w-4 h-4 text-indigo-500" />
                      <span>شماره‌های تماس اصلی و ارتباطات</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          شماره موبایل / همراه اصلی
                        </label>
                        <div className="relative">
                          <input
                            type="tel"
                            inputMode="tel"
                            value={newPersonPhone}
                            onChange={(e) => {
                              setNewPersonPhone(e.target.value);
                              if (!newPersonMobile) setNewPersonMobile(e.target.value);
                            }}
                            placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                            className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 text-sm font-mono font-bold text-slate-900 text-left pl-10"
                            dir="ltr"
                          />
                          <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1 block">جهت ارسال پیامک فاکتور و دسترسی سریع</span>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          تلفن ثابت
                        </label>
                        <div className="relative">
                          <input
                            type="tel"
                            inputMode="tel"
                            value={newPersonMobile}
                            onChange={(e) => setNewPersonMobile(e.target.value)}
                            placeholder="۰۲۱۸۸۸۸۸۸۸۸"
                            className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 text-sm font-mono font-bold text-slate-900 text-left pl-10"
                            dir="ltr"
                          />
                          <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          پست الکترونیکی (ایمیل)
                        </label>
                        <div className="relative">
                          <input
                            type="email"
                            value={newPersonEmail}
                            onChange={(e) => setNewPersonEmail(e.target.value)}
                            placeholder="info@example.com"
                            className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm font-mono text-slate-900 text-left pl-10"
                            dir="ltr"
                          />
                          <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          کد پستی ۱۰ رقمی
                        </label>
                        <input
                          type="text"
                          value={newPersonPostalCode}
                          onChange={(e) => setNewPersonPostalCode(e.target.value)}
                          placeholder="۱۹۸۷۶۵۴۳۲۱"
                          maxLength={10}
                          className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm font-mono font-bold text-slate-900 text-left"
                          dir="ltr"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Postal Address Card */}
                  <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                    <h4 className="text-xs font-black text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-indigo-500" />
                      <span>نشانی و آدرس جغرافیایی</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          استان
                        </label>
                        <input
                          type="text"
                          value={newPersonProvince}
                          onChange={(e) => setNewPersonProvince(e.target.value)}
                          placeholder="مثال: تهران"
                          className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm font-medium text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          شهر
                        </label>
                        <input
                          type="text"
                          value={newPersonCity}
                          onChange={(e) => setNewPersonCity(e.target.value)}
                          placeholder="مثال: تهران"
                          className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm font-medium text-slate-900"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        آدرس دقیق پستی
                      </label>
                      <textarea
                        value={newPersonAddress}
                        onChange={(e) => setNewPersonAddress(e.target.value)}
                        placeholder="خیابان، کوچه، پلاک، واحد..."
                        rows={2}
                        className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm font-medium text-slate-900 resize-none"
                      />
                    </div>
                  </div>

                  {/* Multi-Contacts & Social Media Section */}
                  <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h4 className="text-xs font-black text-slate-800 flex items-center gap-2">
                        <Share2 className="w-4 h-4 text-indigo-500" />
                        <span>سایر راه‌های ارتباطی و آدرس‌ها</span>
                      </h4>
                      <button
                        type="button"
                        onClick={() => {
                          setNewPersonContacts([
                            ...newPersonContacts,
                            { type: "mobile", number: "", title: "" }
                          ]);
                        }}
                        className="text-xs font-black text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100/80 px-3 py-1.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>افزودن تماس جدید</span>
                      </button>
                    </div>

                    {newPersonContacts.length === 0 ? (
                      <p className="text-xs text-slate-400 py-3 text-center">
                        هیچ راه ارتباطی جانبی دیگری ثبت نشده است. در صورت نیاز دکمه «افزودن تماس جدید» را بزنید.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {newPersonContacts.map((contact, idx) => (
                          <div key={idx} className="p-3 bg-slate-50/70 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                            <select
                              value={contact.type}
                              onChange={(e) => {
                                const next = [...newPersonContacts];
                                next[idx].type = e.target.value;
                                setNewPersonContacts(next);
                              }}
                              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800"
                            >
                              <option value="mobile">تلفن همراه دوم</option>
                              <option value="phone">تلفن ثابت</option>
                              <option value="whatsapp">واتساپ</option>
                              <option value="telegram">تلگرام</option>
                              <option value="instagram">اینستاگرام</option>
                              <option value="bale">پیام‌رسان بله</option>
                              <option value="eitaa">پیام‌رسان ایتا</option>
                              <option value="website">وب‌سایت</option>
                              <option value="fax">فکس</option>
                              <option value="other">سایر</option>
                            </select>

                            <input
                              type="text"
                              value={contact.title || ""}
                              onChange={(e) => {
                                const next = [...newPersonContacts];
                                next[idx].title = e.target.value;
                                setNewPersonContacts(next);
                              }}
                              placeholder="عنوان (اختیاری)"
                              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 sm:w-32"
                            />

                            <input
                              type="text"
                              value={contact.number || ""}
                              onChange={(e) => {
                                const next = [...newPersonContacts];
                                next[idx].number = e.target.value;
                                setNewPersonContacts(next);
                              }}
                              placeholder="شماره یا آیدی / لینک"
                              className="flex-1 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-mono font-bold text-slate-800 text-left"
                              dir="ltr"
                            />

                            <button
                              type="button"
                              onClick={() => {
                                const next = [...newPersonContacts];
                                next.splice(idx, 1);
                                setNewPersonContacts(next);
                              }}
                              className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer self-end sm:self-auto"
                              title="حذف این مورد"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* TAB 3: FINANCIAL & CREDIT */}
              {personFormTab === "financial" && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  {/* Initial Balance Card */}
                  <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                    <h4 className="text-xs font-black text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-indigo-500" />
                      <span>مانده حساب اول دوره (ابتدای همکاری)</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => setNewPersonInitialBalanceType("settled")}
                        className={`p-3.5 rounded-2xl border text-right transition-all cursor-pointer ${
                          newPersonInitialBalanceType === "settled"
                            ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                            : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                      >
                        <span className="block text-xs font-black mb-1">بی‌حساب / تسویه</span>
                        <span className={`text-[11px] block leading-relaxed ${newPersonInitialBalanceType === "settled" ? "text-slate-300" : "text-slate-400"}`}>
                          مانده حساب صفر است و بدهی قبلی وجود ندارد
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setNewPersonInitialBalanceType("debtor")}
                        className={`p-3.5 rounded-2xl border text-right transition-all cursor-pointer ${
                          newPersonInitialBalanceType === "debtor"
                            ? "bg-rose-500 text-white border-rose-500 shadow-sm"
                            : "bg-rose-50/50 hover:bg-rose-50 text-rose-900 border-rose-200"
                        }`}
                      >
                        <span className="block text-xs font-black mb-1">بدهکار (به ما بدهکار است)</span>
                        <span className={`text-[11px] block leading-relaxed ${newPersonInitialBalanceType === "debtor" ? "text-rose-100" : "text-rose-700/80"}`}>
                          شخص از دوره‌های قبل به ما بدهکار است
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setNewPersonInitialBalanceType("creditor")}
                        className={`p-3.5 rounded-2xl border text-right transition-all cursor-pointer ${
                          newPersonInitialBalanceType === "creditor"
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                            : "bg-emerald-50/50 hover:bg-emerald-50 text-emerald-900 border-emerald-200"
                        }`}
                      >
                        <span className="block text-xs font-black mb-1">بستانکار (از ما طلبکار است)</span>
                        <span className={`text-[11px] block leading-relaxed ${newPersonInitialBalanceType === "creditor" ? "text-emerald-100" : "text-emerald-700/80"}`}>
                          ما به این شخص از قبل بدهی داریم
                        </span>
                      </button>
                    </div>

                    {newPersonInitialBalanceType !== "settled" && (
                      <div className="pt-2 animate-in fade-in">
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          مبلغ مانده اول دوره ({storeSettings?.currency || "تومان"})
                        </label>
                        <CurrencyInput
                          value={newPersonInitialBalance}
                          onChange={(e: any) => setNewPersonInitialBalance(e.target.value)}
                          placeholder="مثلا: ۵۰,۰۰۰,۰۰۰"
                          className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 text-sm font-mono font-bold text-slate-900 text-left bg-white"
                        />
                        {newPersonInitialBalance && Number(newPersonInitialBalance) > 0 && (
                          <div className="mt-1 text-xs text-indigo-700 font-bold bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100">
                            {numberToWords(newPersonInitialBalance)} {storeSettings?.currency || "تومان"}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Credit Limit Card */}
                  <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                    <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                      <div>
                        <h4 className="text-xs font-black text-slate-800 flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-indigo-500" />
                          <span>سقف اعتبار / حداکثر بدهی مجاز</span>
                        </h4>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                          در صورت فعال‌سازی، اگر مانده بدهی این شخص از مبلغ تعیین شده فراتر رود، سیستم در صدور فاکتور جدید هشدار یا ممانعت ایجاد می‌نماید.
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        سقف مجاز بدهی ({storeSettings?.currency || "تومان"}) - خالی به معنی بدون محدودیت
                      </label>
                      <CurrencyInput
                        value={newPersonCreditLimit}
                        onChange={(e: any) => setNewPersonCreditLimit(e.target.value)}
                        placeholder="مثلا: ۱۰۰,۰۰۰,۰۰۰ (خالی = بدون محدودیت)"
                        className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 text-sm font-mono font-bold text-slate-900 text-left bg-white"
                      />
                      {newPersonCreditLimit && Number(newPersonCreditLimit) > 0 && (
                        <div className="mt-1 text-xs text-indigo-700 font-bold bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100">
                          {numberToWords(newPersonCreditLimit)} {storeSettings?.currency || "تومان"}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 4: GROUPS & SETTINGS */}
              {personFormTab === "settings" && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  {/* Account Status Switch & Grouping */}
                  <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                    <h4 className="text-xs font-black text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4 text-indigo-500" />
                      <span>دسته‌بندی و وضعیت حساب</span>
                    </h4>

                    {/* Active Toggle Switch */}
                    <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
                      <div>
                        <span className="text-xs font-black text-slate-800 block">
                          وضعیت فعالیت پرونده
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">
                          در صورت غیرفعال بودن، نام این شخص در لیست‌های انتخاب سریع فاکتور نمایش داده نخواهد شد
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={newPersonIsActive}
                          onChange={(e) => setNewPersonIsActive(e.target.checked)}
                        />
                        <div className="w-12 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:right-[3px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                      </label>
                    </div>

                    {/* Group Selection */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-xs font-bold text-slate-700">
                            گروه‌بندی شخص
                          </label>
                          {setActiveTab && (
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                setActiveTab("person_groups");
                              }}
                              className="text-[11px] text-indigo-600 font-bold hover:underline cursor-pointer"
                            >
                              مدیریت گروه‌ها
                            </button>
                          )}
                        </div>
                        <select
                          value={newPersonGroup}
                          onChange={(e) => {
                            setNewPersonGroup(e.target.value);
                            setNewPersonGroupId(e.target.value);
                          }}
                          className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm font-bold text-slate-900 bg-white"
                        >
                          <option value="">-- بدون گروه اختصاصی --</option>
                          {(personGroups || []).map((g, index) => (
                            <option key={g.id ? `id-${g.id}` : `idx-${index}`} value={g.id}>
                              {g.icon ? g.icon + " " : ""}{g.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Registration Date */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          تاریخ عضویت / افتتاح پرونده
                        </label>
                        <DatePicker
                          value={newPersonRegistrationDate}
                          onChange={(date: any) =>
                            setNewPersonRegistrationDate(
                              date?.toDate?.() || new Date()
                            )
                          }
                          calendar={
                            storeSettings?.calendarType === "gregorian"
                              ? undefined
                              : persian
                          }
                          locale={
                            storeSettings?.calendarType === "gregorian"
                              ? undefined
                              : persian_fa
                          }
                          calendarPosition="bottom-right"
                          inputClass="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm font-mono text-center font-bold text-slate-800 outline-none bg-white"
                          containerClassName="w-full"
                        />
                      </div>
                    </div>

                    {/* Additional Roles Multi-selection */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2">
                        نقش‌های مکمل شخص (چندگانه)
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {(personRoles || []).map((r) => {
                          const isSelected = newPersonRoles.includes(r.id);
                          return (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  if (r.id !== newPersonRole) {
                                    setNewPersonRoles(newPersonRoles.filter(id => id !== r.id));
                                  }
                                } else {
                                  setNewPersonRoles([...newPersonRoles, r.id]);
                                  if (r.id === "employee") {
                                    setHasEmployeeDetails(true);
                                  }
                                }
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${
                                isSelected
                                  ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3" />}
                              <span>{r.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Description / Notes */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        یادداشت‌ها و توضیحات تکمیلی
                      </label>
                      <textarea
                        value={newPersonDescription}
                        onChange={(e) => setNewPersonDescription(e.target.value)}
                        placeholder="نکات مهم، سوابق اعتباری یا توضیحات دلخواه درباره این شخص..."
                        rows={3}
                        className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm font-medium text-slate-900 resize-none"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 5: EMPLOYEE / JOB DETAILS (CONDITIONAL) */}
              {personFormTab === "employee" && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                    <h4 className="text-xs font-black text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-indigo-500" />
                      <span>مشخصات شغلی و استخدامی پرسنل</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          عنوان سمت / شغل
                        </label>
                        <input
                          type="text"
                          value={newPersonJobTitle}
                          onChange={(e) => setNewPersonJobTitle(e.target.value)}
                          placeholder="مثال: کارشناس حسابداری، انباردار"
                          className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm font-bold text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          سابقه کار (سال)
                        </label>
                        <input
                          type="number"
                          value={newPersonExperienceYears}
                          onChange={(e) => setNewPersonExperienceYears(e.target.value)}
                          placeholder="مثال: ۳"
                          className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm font-mono text-center font-bold text-slate-900"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          شماره بیمه تامین اجتماعی
                        </label>
                        <input
                          type="text"
                          value={newPersonInsuranceNumber}
                          onChange={(e) => setNewPersonInsuranceNumber(e.target.value)}
                          placeholder="۱۰ رقمی"
                          className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm font-mono font-bold text-slate-900 text-left"
                          dir="ltr"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          نوع بیمه
                        </label>
                        <input
                          type="text"
                          value={newPersonInsuranceType}
                          onChange={(e) => setNewPersonInsuranceType(e.target.value)}
                          placeholder="تامین اجتماعی، خدمات درمانی..."
                          className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm font-medium text-slate-900"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          مقطع تحصیلی
                        </label>
                        <input
                          type="text"
                          value={newPersonEducationLevel}
                          onChange={(e) => setNewPersonEducationLevel(e.target.value)}
                          placeholder="دیپلم، کارشناسی، کارشناسی ارشد..."
                          className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm font-medium text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          رشته تحصیلی
                        </label>
                        <input
                          type="text"
                          value={newPersonStudyField}
                          onChange={(e) => setNewPersonStudyField(e.target.value)}
                          placeholder="حسابداری، مدیریت بازرگانی..."
                          className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm font-medium text-slate-900"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          وضعیت تاهل
                        </label>
                        <select
                          value={newPersonMaritalStatus}
                          onChange={(e) => setNewPersonMaritalStatus(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm font-medium text-slate-800 bg-white"
                        >
                          <option value="">انتخاب کنید</option>
                          <option value="single">مجرد</option>
                          <option value="married">متاهل</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          تعداد فرزندان
                        </label>
                        <input
                          type="number"
                          value={newPersonChildrenCount}
                          onChange={(e) => setNewPersonChildrenCount(e.target.value)}
                          placeholder="۰"
                          className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm font-mono text-center font-bold text-slate-900"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </form>
          </div>

          {/* Modal Footer Action Bar */}
          <div className="px-5 sm:px-7 py-3.5 border-t border-slate-200 bg-white flex items-center justify-between gap-3 shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-lg sm:shadow-none">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-xs sm:text-sm transition-colors cursor-pointer"
            >
              انصراف
            </button>

            <div className="flex items-center gap-2.5">
              {currentTabIndex > 0 && (
                <button
                  type="button"
                  onClick={handlePrevTab}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-xs sm:text-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                  <span>مرحله قبل</span>
                </button>
              )}

              {currentTabIndex < tabsList.length - 1 && (
                <button
                  type="button"
                  onClick={handleNextTab}
                  className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-2xl font-bold text-xs sm:text-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span>مرحله بعد</span>
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}

              <button
                type="submit"
                form="personFormModalForm"
                disabled={submittingPerson}
                className="px-6 sm:px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-2xl font-black text-xs sm:text-sm transition-all shadow-md shadow-indigo-600/25 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                {submittingPerson ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>{editingPersonId ? "ذخیره تغییرات شخص" : "ثبت نهایی شخص"}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Duplicate Review & Confirmation Modal */}
      {showDuplicatesModal && typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          <div className="fixed inset-0 z-[1000000] flex items-center justify-center p-3 sm:p-4 overflow-y-auto" dir="rtl">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs"
              onClick={() => setShowDuplicatesModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto border border-amber-200 z-10"
            >
              {/* Duplicate Header */}
              <div className="px-6 py-4 bg-gradient-to-r from-amber-600 to-amber-500 text-white flex items-center justify-between shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/20">
                    <AlertTriangle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-black text-base text-white">
                      تشخیص شخص مشابه یا تکراری در سیستم
                    </h3>
                    <p className="text-xs text-amber-100 font-medium">
                      اطلاعات وارد شده با {toPersianDigits(duplicates.length)} پرونده موجود شباهت دارد
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDuplicatesModal(false)}
                  className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Duplicates Content */}
              <div className="p-5 overflow-y-auto flex-1 space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs leading-relaxed flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-black text-amber-950 mb-1">
                      هشدار جهت جلوگیری از ثبت داده‌های تکراری:
                    </p>
                    <p className="text-slate-700">
                      مشخصات وارد شده (نام، شماره تماس یا کد ملی) با اشخاص زیر تشابه بالایی دارد. لطفاً بررسی نمایید که آیا این شخص قبلاً در سیستم ثبت شده است یا خیر. در صورت اطمینان از جدید بودن، می‌توانید با تایید دکمه زیر نسبت به ایجاد شخص جدید اقدام فرمایید.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {duplicates.map((dupItem: any, idx: number) => {
                    const p = dupItem.person || dupItem;
                    const reasons = dupItem.reasons || [];
                    const pName = p.name || `${p.firstName || ''} ${p.lastName || ''}`.trim() || p.companyName || 'شخص بدون نام';
                    const roleLabel = (personRoles || []).find((r: any) => r.id === p.role)?.name || (
                      p.role === 'customer' ? 'مشتری' :
                      p.role === 'supplier' ? 'تامین‌کننده' :
                      p.role === 'employee' ? 'کارمند' : 'مشتری'
                    );

                    return (
                      <div
                        key={p.id || idx}
                        className="bg-slate-50 border border-slate-200 rounded-2xl p-4 transition-all hover:border-amber-300"
                      >
                        <div className="flex items-start justify-between gap-3 mb-2.5">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-black text-sm">
                              {p.personType === 'legal' ? <Building2 className="w-4 h-4" /> : <User className="w-4 h-4" />}
                            </div>
                            <span className="font-black text-slate-900 text-sm sm:text-base">
                              {pName}
                            </span>
                            {p.alias && p.alias !== pName && (
                              <span className="text-xs text-slate-500 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                                شهرت: {p.alias}
                              </span>
                            )}
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-indigo-100/70 text-indigo-800">
                              {roleLabel}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 my-2.5">
                          {reasons.map((r: any, rIdx: number) => {
                            const isDanger = r.severity === 'danger';
                            return (
                              <div
                                key={rIdx}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border ${
                                  isDanger
                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                    : 'bg-amber-50 text-amber-800 border-amber-200'
                                }`}
                              >
                                {r.field === 'nationalId' ? (
                                  <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                                ) : r.field === 'phone' ? (
                                  <Phone className="w-3.5 h-3.5 shrink-0" />
                                ) : (
                                  <User className="w-3.5 h-3.5 shrink-0" />
                                )}
                                <span>{r.title}</span>
                              </div>
                            );
                          })}
                        </div>

                        <div className="space-y-1 mb-2 text-xs text-slate-600">
                          {reasons.map((r: any, rIdx: number) => (
                            <p key={rIdx} className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              {r.description}
                            </p>
                          ))}
                        </div>

                        <div className="pt-2 border-t border-slate-200/70 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
                          {p.phone && (
                            <span className="flex items-center gap-1 font-mono">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              تلفن: <span className="font-bold text-slate-700">{toPersianDigits(p.phone)}</span>
                            </span>
                          )}
                          {p.nationalId && (
                            <span className="flex items-center gap-1 font-mono">
                              <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                              کد ملی: <span className="font-bold text-slate-700">{toPersianDigits(p.nationalId)}</span>
                            </span>
                          )}
                          {p.address && (
                            <span className="flex items-center gap-1 truncate max-w-xs">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              آدرس: {p.address}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Duplicate Modal Actions */}
              <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setShowDuplicatesModal(false)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <X className="w-4 h-4 text-slate-500" />
                  <span>انصراف و اصلاح اطلاعات</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowDuplicatesModal(false);
                    handleSubmitPerson();
                  }}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm transition-colors shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تایید و ثبت شخص جدید با وجود تشابه</span>
                </button>
              </div>
            </motion.div>
          </div>
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
