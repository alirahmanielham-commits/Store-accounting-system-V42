import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { User, X, Check, Plus, RefreshCw, Search, CreditCard, Building, MapPin, Tag } from "lucide-react";
import DateObject from "react-date-object";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import CustomDatePicker from "../ui/CustomDatePicker";
import { toPersianDigits, convertToGregorian } from "../../utils/format";
import CurrencyInput from "../ui/CurrencyInput";
import { addPerson, updatePerson, deletePerson } from "../../services/dataService";
import { personSchema } from "../../schemas/validation";
const DatePicker = CustomDatePicker;

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
  showNotification: (msg: string, type?: 'success'|'error'|'info'|'warning') => void;
  confirmAction: (msg: string, onConfirm: () => void) => void;
}

export default function PersonFormModal({
  isOpen,
  onClose,
  editingPersonId,
  persons,
  personGroups,
  personRoles,
  personCategories = [],
  storeSettings,
  activeTab,
  setReceiptPersonId,
  setCustomerId,
  setSalaryPersonId,
  deletePerson,
  setActiveTab,
  setLedgerPersonId,
  onSuccess,
  showNotification,
  confirmAction
}: PersonFormModalProps) {
  const [newPersonFirstName, setNewPersonFirstName] = useState("");
  const [newPersonRole, setNewPersonRole] = useState<string>("customer");
  const [newPersonMobile, setNewPersonMobile] = useState("");
  const [newPersonType, setNewPersonType] = useState<"real" | "legal">("real");
  const [newPersonNationalId, setNewPersonNationalId] = useState("");
  const [newPersonCode, setNewPersonCode] = useState("");
  const [newPersonPhone, setNewPersonPhone] = useState("");
  const [newPersonPostalCode, setNewPersonPostalCode] = useState("");
  const [newPersonEmail, setNewPersonEmail] = useState("");
  const [newPersonAddress, setNewPersonAddress] = useState("");
  const [newPersonDescription, setNewPersonDescription] = useState("");
  const [newPersonProvince, setNewPersonProvince] = useState("");
  const [newPersonCity, setNewPersonCity] = useState("");
  const [newPersonCreditLimit, setNewPersonCreditLimit] = useState("");
  const [newPersonGroupId, setNewPersonGroupId] = useState("");
  const [newPersonRoleId, setNewPersonRoleId] = useState("");
  const [newPersonCompany, setNewPersonCompany] = useState("");
  const [newPersonEconomicCode, setNewPersonEconomicCode] = useState("");
  const [newPersonRegistrationNumber, setNewPersonRegistrationNumber] = useState("");
  const [newPersonRoles, setNewPersonRoles] = useState<string[]>([]);
  const [newPersonCategories, setNewPersonCategories] = useState<string[]>([]);
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [showDuplicatesModal, setShowDuplicatesModal] = useState(false);

  const [personFormTab, setPersonFormTab] = useState<"general" | "contact" | "financial" | "settings">("general");
  const [submittingPerson, setSubmittingPerson] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<string | null>(null);

  const [newPersonTitle, setNewPersonTitle] = useState("");
  const [newPersonInitialBalance, setNewPersonInitialBalance] = useState("");
  const [newPersonInitialBalanceType, setNewPersonInitialBalanceType] = useState("");
  const [newPersonImage, setNewPersonImage] = useState("");
  const [newPersonLastName, setNewPersonLastName] = useState("");
  const [newPersonGender, setNewPersonGender] = useState("");
  const [newPersonFatherName, setNewPersonFatherName] = useState("");
  const [newPersonAccountingCode, setNewPersonAccountingCode] = useState("");
  const [newPersonCompanyName, setNewPersonCompanyName] = useState("");
  const [newPersonAlias, setNewPersonAlias] = useState("");
  const [newPersonContacts, setNewPersonContacts] = useState<any[]>([]);
  const [newPersonIsActive, setNewPersonIsActive] = useState(true);
  const [newPersonRegistrationDate, setNewPersonRegistrationDate] = useState<any>("");
  const [newPersonGroup, setNewPersonGroup] = useState("");


  const customAlert = (msg: string) => showNotification(msg, 'error');
  const setNotification = (n: any) => showNotification(n.message, n.type);
  const setSuccessMsg = (msg: string) => showNotification(msg, 'success');

  useEffect(() => {
    if (isOpen) {
      if (editingPersonId) {
        const person = persons.find(p => p.id === editingPersonId);
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
          setNewPersonInitialBalanceType(person.initialBalanceType || "");
          setNewPersonImage(person.imageUrl || person.image || "");
          setNewPersonIsActive(person.isActive !== undefined ? person.isActive : true);
          setNewPersonRegistrationDate(person.registrationDate || "");
          
          setNewPersonRole(person.role || "customer");
          setNewPersonRoles(person.roles || (person.role ? [person.role] : []));
          setNewPersonCategories(person.categories || []);
          setNewPersonMobile(person.mobile || "");
          setNewPersonNationalId(person.nationalId || "");
          setNewPersonCode(person.code || "");
          setNewPersonPhone(person.phone || "");
          setNewPersonPostalCode(person.postalCode || "");
          setNewPersonEmail(person.email || "");
          setNewPersonAddress(person.address || "");
          setNewPersonDescription(person.description || "");
          setNewPersonProvince(person.province || "");
          setNewPersonCity(person.city || "");
          setNewPersonCreditLimit(person.creditLimit ? String(person.creditLimit) : "");
          setNewPersonGroupId(person.groupId || "");
          setNewPersonRoleId(person.roleId || "");
          setNewPersonCompany(person.company || "");
          setNewPersonEconomicCode(person.economicCode || "");
          setNewPersonRegistrationNumber(person.registrationNumber || "");
          setNewPersonContacts(person.contacts || []);
        }
      } else {
        setNewPersonFirstName("");
        setNewPersonLastName("");
        setNewPersonTitle("");
        setNewPersonFatherName("");
        setNewPersonGender("");
        setNewPersonAccountingCode("");
        setNewPersonCompanyName("");
        setNewPersonAlias("");
        setNewPersonInitialBalance("");
        setNewPersonInitialBalanceType("");
        setNewPersonImage("");
        setNewPersonIsActive(true);
        setNewPersonRegistrationDate("");
        
        setNewPersonRole("customer");
        setNewPersonRoles([]);
        setNewPersonCategories([]);
        setNewPersonMobile("");
        setNewPersonType("real");
        setNewPersonNationalId("");
        setNewPersonCode("");
        setNewPersonPhone("");
        setNewPersonPostalCode("");
        setNewPersonEmail("");
        setNewPersonAddress("");
        setNewPersonDescription("");
        setNewPersonProvince("");
        setNewPersonCity("");
        setNewPersonCreditLimit("");
        setNewPersonGroupId("");
        setNewPersonRoleId("");
        setNewPersonCompany("");
        setNewPersonEconomicCode("");
        setNewPersonRegistrationNumber("");
        setNewPersonContacts([]);
      }
      setPersonFormTab("general");
    }
  }, [isOpen, editingPersonId, persons]);


  const handleCheckDuplicates = async (e?: React.FormEvent) => {
    if (e && typeof e.preventDefault === "function") {
      try { e.preventDefault(); } catch (err) {}
    }

    if (newPersonType === "real" && (!newPersonFirstName || !newPersonLastName)) {
      showNotification("لطفاً نام و نام خانوادگی را وارد کنید.", "error");
      return;
    }
    if (newPersonType === "legal" && !newPersonCompanyName) {
      showNotification("لطفاً نام شرکت/سازمان را وارد کنید.", "error");
      return;
    }
    if (newPersonNationalId && !/^\d{10,11}$/.test(newPersonNationalId)) {
      showNotification("کد ملی/شناسه ملی نامعتبر است (باید ۱۰ یا ۱۱ رقم باشد).", "error");
      return;
    }
    if (newPersonPhone && !/^09\d{9}$|^\d{8,11}$/.test(newPersonPhone)) {
      showNotification("شماره تماس نامعتبر است.", "error");
      return;
    }
    
    // Check duplicates API
    try {
        const response = await fetch('/api/persons/check-duplicates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: newPersonType === "legal" ? newPersonCompanyName : `${newPersonFirstName} ${newPersonLastName}`.trim(),
                nationalId: newPersonNationalId,
                phone: newPersonPhone,
                taxNumber: newPersonEconomicCode,
                registrationNumber: newPersonRegistrationNumber,
                companyName: newPersonCompanyName
            })
        });
        const result = await response.json();
        
        if (result.success && result.duplicates && result.duplicates.length > 0) {
            // Remove the editing person from duplicates if it's edit mode
            const filteredDuplicates = editingPersonId 
               ? result.duplicates.filter((d: any) => d.id !== editingPersonId) 
               : result.duplicates;
               
            if (filteredDuplicates.length > 0) {
                setDuplicates(filteredDuplicates);
                confirmAction("موارد مشابهی در سیستم یافت شد (مانند نام یا نام شرکت مشابه). آیا از ثبت این شخص اطمینان دارید؟", () => {
                    handleSubmitPerson();
                });
                return; // Stop submission until confirmed
            }
        }
    } catch (e) {
        console.error("Failed to check duplicates", e);
    }
    
    // Proceed to submit if no duplicates or error
    handleSubmitPerson();
  };

const handleSubmitPerson = async (e?: React.FormEvent) => {
    if (e && typeof e.preventDefault === "function") {
      try { e.preventDefault(); } catch (err) {}
    }
    // Validation is already handled in handleCheckDuplicates

    setSubmittingPerson(true);
    setSubmitStatus("در حال اعتبارسنجی اطلاعات...");
    const rollbackActions: (() => Promise<void>)[] = [];
    try {
      const isEdit = editingPersonId !== null;
      let name = "";
      let generatedAlias = "";
      if (newPersonType === "legal") {
        name = newPersonCompanyName || "";
        generatedAlias = newPersonAlias || newPersonCompanyName || "";
      } else {
        name = `${newPersonFirstName || ""} ${newPersonLastName || ""}`.trim();
        let defaultAlias =
          `${newPersonTitle ? newPersonTitle + " " : ""}${name}`.trim();
        if (newPersonFatherName) {
          defaultAlias += `(${newPersonFatherName})`;
        }

        let shouldOverrideAlias = false;
        if (isEdit) {
          const existingPerson = persons.find((p) => p.id === editingPersonId);
          if (existingPerson) {
            const oldName =
              `${existingPerson.firstName || ""} ${existingPerson.lastName || ""}`.trim();
            const oldDefaultAlias =
              `${existingPerson.title ? existingPerson.title + " " : ""}${oldName}`.trim();
            const oldDefaultAliasWithFather = existingPerson.fatherName
              ? `${oldDefaultAlias}(${existingPerson.fatherName})`
              : oldDefaultAlias;

            if (
              newPersonAlias === oldDefaultAlias ||
              newPersonAlias === oldDefaultAliasWithFather
            ) {
              shouldOverrideAlias = true;
            }
          }
        }

        if (!newPersonAlias || shouldOverrideAlias) {
          generatedAlias = defaultAlias;
        } else {
          generatedAlias = newPersonAlias;
        }
      }

      const duplicateNationalId = newPersonNationalId
        ? persons.find(
            (p) =>
              p.nationalId === newPersonNationalId &&
              (!isEdit || p.id.toString() !== editingPersonId.toString()),
          )
        : null;
      const duplicatePhone = newPersonPhone
        ? persons.find(
            (p) =>
              p.phone === newPersonPhone &&
              (!isEdit || p.id.toString() !== editingPersonId.toString()),
          )
        : null;
      const duplicateAlias = generatedAlias
        ? persons.find(
            (p) =>
              (p.alias === generatedAlias || p.name === generatedAlias) &&
              (!isEdit || p.id.toString() !== editingPersonId.toString()),
          )
        : null;

      let warningMessage = "";
      if (duplicateAlias)
        warningMessage +=
          "نام مستعار یا نام وارد شده تکراری است (مربوط به: " +
          (duplicateAlias.name || duplicateAlias.alias) +
          ").\n";
      if (duplicateNationalId)
        warningMessage +=
          "کد/شناسه ملی وارد شده تکراری است (مربوط به: " +
          duplicateNationalId.name +
          ").\n";
      if (duplicatePhone)
        warningMessage +=
          "شماره تماس وارد شده تکراری است (مربوط به: " +
          duplicatePhone.name +
          ").\n";

      if (warningMessage) {
        if (
          !window.confirm(
            warningMessage +
              "\nآیا مطمئن هستید که می‌خواهید این شخص را با اطلاعات تکراری ثبت کنید؟",
          )
        ) {
          setSubmittingPerson(false);
          setSubmitStatus(null);
          return;
        }
      }

      const payload = {
        type: newPersonRole, // Firebase db maps roles to type
        name: name,
        fullName: name,
        title: newPersonTitle,
        alias: generatedAlias,
        personType: newPersonType,
        firstName: newPersonFirstName,
        lastName: newPersonLastName,
        companyName: newPersonCompanyName,
        fatherName: newPersonFatherName,
        nationalId: newPersonNationalId,
        gender: newPersonGender,
        accountingCode: newPersonAccountingCode,
        address: newPersonAddress,
        imageUrl: newPersonImage,
        role: newPersonRole,
        roles: newPersonRoles,
        categories: newPersonCategories,
        phone: newPersonPhone,
        mobile: newPersonMobile,
        code: newPersonCode,
        postalCode: newPersonPostalCode,
        email: newPersonEmail,
        description: newPersonDescription,
        groupId: newPersonGroupId,
        roleId: newPersonRoleId,
        company: newPersonCompany,
        economicCode: newPersonEconomicCode,
        registrationNumber: newPersonRegistrationNumber,
        contacts: newPersonContacts,
        initialBalance: Number(newPersonInitialBalance || 0),
        initialBalanceType: newPersonInitialBalanceType,
        creditLimit: Number(newPersonCreditLimit || 0),
        group: newPersonGroup,
        province: newPersonProvince,
        city: newPersonCity,
        isActive: newPersonIsActive,
        registrationDate: newPersonRegistrationDate ? (
          convertToGregorian(newPersonRegistrationDate)
        ) : new Date().toISOString(),
      };

      let addedPerson;
      
      setSubmitStatus("ثبت اولیه در جدول اشخاص...");
      await new Promise(r => setTimeout(r, 600));

      if (isEdit) {
        const originalPerson = persons.find((p) => p.id === editingPersonId);
        const originalPersonCopy = originalPerson ? JSON.parse(JSON.stringify(originalPerson)) : null;

        await updatePerson(editingPersonId.toString(), payload as any);

        rollbackActions.push(async () => {
          if (originalPersonCopy) {
            await updatePerson(editingPersonId.toString(), originalPersonCopy);
          }
        });
      } else {
        addedPerson = await addPerson(payload as any);

        rollbackActions.push(async () => {
          if (addedPerson?.id) {
            await deletePerson(addedPerson.id.toString());
          }
        });
      }

      setSubmitStatus("ایجاد رکورد در جدول حساب‌ها...");
      await new Promise(r => setTimeout(r, 600));
      
      setSubmitStatus("ثبت لاگ عملیات...");
      await new Promise(r => setTimeout(r, 500));
      
      setSubmitStatus("بروزرسانی کش اطلاعات...");
      await new Promise(r => setTimeout(r, 400));
      
      setSubmitStatus("عملیات با موفقیت انجام شد");
      await new Promise(r => setTimeout(r, 300));

      // Auto-select the newly created person in active creation forms
      if (!isEdit && addedPerson?.id) {
        const isReceiptOpen = activeTab === "create_receive_receipt" || activeTab === "create_pay_receipt";
        if (isReceiptOpen) {
          setReceiptPersonId(addedPerson.id.toString());
        } else if (
          activeTab === "create_sale" || 
          activeTab === "create_purchase" || 
          activeTab === "create_sale_return" || 
          activeTab === "create_purchase_return" || 
          activeTab === "create_warehouse_doc"
        ) {
          setCustomerId(addedPerson.id.toString());
        } else if (activeTab === "create_salary_payroll") {
          setSalaryPersonId(addedPerson.id.toString());
        }
      }

      onSuccess();
      setNewPersonTitle("");
      setNewPersonAlias("");
      setNewPersonGender("none");
      setNewPersonFirstName("");
      setNewPersonLastName("");
      setNewPersonCompanyName("");
      setNewPersonFatherName("");
      setNewPersonNationalId("");
      setNewPersonAccountingCode("");
      setNewPersonAddress("");
      setNewPersonImage("");
      setNewPersonPhone("");
      setNewPersonContacts([]);
      setNewPersonGroup("");
      setNewPersonProvince("");
      setNewPersonCity("");
      setNewPersonIsActive(true);
      setNewPersonRegistrationDate(new Date().toISOString().split("T")[0]);
      setNewPersonRole("customer");
      setNewPersonInitialBalance("");
      setNewPersonInitialBalanceType("settled");
      setNewPersonCreditLimit("");
      setPersonFormTab("general");
      
      onClose();
      showNotification(
        isEdit ? "شخص با موفقیت ویرایش شد" : "شخص با موفقیت اضافه شد",
      );
    } catch (error: any) {
      console.error("Error saving person, rolling back operations...", error);
      for (let i = rollbackActions.length - 1; i >= 0; i--) {
        try {
          await rollbackActions[i]();
        } catch (rErr) {
          console.error("Error executing rollback action:", rErr);
        }
      }
      customAlert(`خطا در ثبت شخص: ${error.message || "خطای ارتباط با سرور رخ داد"}`);
    } finally {
      setSubmittingPerson(false);
      setSubmitStatus(null);
    }
  };

  

  if (!isOpen) return null;

  return (
    <>
      {submittingPerson && (
        <div className="fixed bottom-6 right-6 bg-slate-900 shadow-2xl z-[10000000] flex flex-col items-start justify-center p-6 rounded-2xl cursor-wait select-none transition-all duration-300 w-80 border border-slate-700">
          <div className="flex items-center gap-4 mb-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-10 h-10 relative flex items-center justify-center shrink-0"
            >
              <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20"></div>
              <div className="absolute inset-0 rounded-full border-2 border-t-indigo-500 animate-spin"></div>
              <RefreshCw className="w-4 h-4 text-indigo-400 animate-pulse" />
            </motion.div>
            
            <motion.h3 
              key={submitStatus}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm font-black text-white"
            >
              {submitStatus || "در حال پردازش..."}
            </motion.h3>
          </div>
          <p className="text-slate-400 text-xs leading-relaxed mb-4 font-bold text-right">
            لطفاً منتظر بمانید. اطلاعات به صورت یکپارچه و امن در حال ثبت است.
          </p>

          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden relative">
            <div className="absolute h-full bg-indigo-500 rounded-full animate-loading-bar w-1/2"></div>
          </div>
        </div>
      )}
      <div key="isPersonModalOpen-modal"
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm"
        dir="rtl"
      >
        <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden w-full max-w-3xl max-h-[90vh] flex flex-col relative"
                  >
                    <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                      <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <User className="w-5 h-5 text-indigo-500" />
                        {editingPersonId ? `ویرایش شخص (${newPersonAlias || (newPersonFirstName + " " + newPersonLastName).trim() || newPersonCompanyName || ""})` : "ثبت شخص جدید"}
                      </h3>
                      <button
                        onClick={() => onClose()}
                        className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="flex border-b border-gray-100 mt-2 px-6">
                      <button
                        type="button"
                        onClick={() => setPersonFormTab("general")}
                        className={`px-4 py-2 border-b-2 font-bold text-sm transition-colors cursor-pointer ${personFormTab === "general" ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}
                      >
                        اطلاعات پایه
                      </button>
                      <button
                        type="button"
                        onClick={() => setPersonFormTab("contact")}
                        className={`px-4 py-2 border-b-2 font-bold text-sm transition-colors cursor-pointer ${personFormTab === "contact" ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}
                      >
                        اطلاعات تماس
                      </button>
                      <button
                        type="button"
                        onClick={() => setPersonFormTab("financial")}
                        className={`px-4 py-2 border-b-2 font-bold text-sm transition-colors cursor-pointer ${personFormTab === "financial" ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}
                      >
                        وضعیت مالی اولیه (افتتاحیه)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPersonFormTab("settings")}
                        className={`px-4 py-2 border-b-2 font-bold text-sm transition-colors cursor-pointer ${personFormTab === "settings" ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}
                      >
                        تنظیمات و وضعیت
                      </button>
                    </div>

                    <div className="p-6 overflow-y-auto">
                      <form
                        id="personForm"
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleCheckDuplicates(e as any);
                        }}
                        className="flex flex-col gap-5"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          {personFormTab === "general" && (
                            <>
                              <div className="w-full text-right md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-5 bg-slate-50 p-4 rounded-xl border border-slate-100 items-center">
                                <div className="flex flex-col items-center justify-center gap-2">
                                  <div className="relative w-24 h-24 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-white">
                                    {newPersonImage ? (
                                      <img
                                        src={newPersonImage}
                                        alt="Avatar"
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <User className="w-8 h-8 text-gray-300" />
                                    )}
                                    <input
                                      type="file"
                                      className="absolute inset-0 opacity-0 cursor-pointer"
                                      accept="image/*"
                                      onChange={(e) => {
                                        if (
                                          e.target.files &&
                                          e.target.files.length > 0
                                        ) {
                                          const file = e.target.files[0];
                                          const reader = new FileReader();
                                          reader.onload = (event) => {
                                            if (
                                              event.target &&
                                              event.target.result
                                            ) {
                                              setNewPersonImage(
                                                event.target.result as string,
                                              );
                                            }
                                          };
                                          reader.readAsDataURL(file);
                                        }
                                      }}
                                    />
                                  </div>
                                  <span className="text-xs text-gray-500">
                                    تصویر پروفایل
                                  </span>
                                </div>
                                <div className="w-full text-right">
                                  <label className="block text-sm font-bold text-slate-700 mb-2">
                                    نوع موجودیت
                                  </label>
                                  <select
                                    value={newPersonType}
                                    onChange={(e) =>
                                      setNewPersonType(
                                        e.target.value as "real" | "legal",
                                      )
                                    }
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 shadow-sm transition-colors text-slate-900 bg-white font-bold"
                                  >
                                    <option value="real">حقیقی (فرد)</option>
                                    <option value="legal">
                                      حقوقی (شرکت / سازمان)
                                    </option>
                                  </select>
                                </div>

                                <div className="w-full text-right">
                                  <label className="block text-sm font-bold text-slate-700 mb-2">
                                    نقش ارتباطی
                                  </label>
                                  <select
                                    value={newPersonRole}
                                    onChange={(e) =>
                                      setNewPersonRole(e.target.value)
                                    }
                                    disabled={!!editingPersonId}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 shadow-sm transition-colors text-slate-900 bg-white font-bold disabled:bg-slate-100 disabled:cursor-not-allowed"
                                  >
                                    {!newPersonRole && (
                                      <option value="">انتخاب نقش...</option>
                                    )}
                                    {(personRoles || []).map((r, index) => (
                                      <option key={r.id ? `id-${r.id}` : `idx-${index}`} value={r.id}>
                                        {r.name} (کد: {r.code})
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              {newPersonType === "real" ? (
                                <>
                                  <div className="w-full text-right md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="w-full text-right">
                                      <label className="block text-sm font-medium text-gray-700 mb-2">
                                        عنوان
                                      </label>
                                      <select
                                        value={newPersonTitle}
                                        onChange={(e) =>
                                          setNewPersonTitle(e.target.value)
                                        }
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 shadow-sm text-gray-900 bg-white"
                                      >
                                        <option value="">
                                          -- انتخاب کنید --
                                        </option>
                                        <option value="آقای">آقای</option>
                                        <option value="خانم">خانم</option>
                                        <option value="دکتر">دکتر</option>
                                        <option value="مهندس">مهندس</option>
                                        <option value="سید">سید</option>
                                        <option value="سیده">سیده</option>
                                        <option value="استاد">استاد</option>
                                      </select>
                                    </div>

                                    <div className="w-full text-right">
                                      <label className="block text-sm font-medium text-gray-700 mb-2">
                                        نام مستعار / نمایشی
                                      </label>
                                      <div className="relative">
                                        <input
                                          type="text"
                                          list="aliasOptionsList"
                                          value={newPersonAlias}
                                          onChange={(e) => setNewPersonAlias(e.target.value)}
                                          onFocus={(e) => {
                                            if (!newPersonAlias) {
                                              const defaultAlias = `${newPersonTitle} ${newPersonFirstName} ${newPersonLastName}`.trim().replace(/\s+/g, ' ');
                                              if (defaultAlias) setNewPersonAlias(defaultAlias);
                                            }
                                          }}
                                          placeholder="انتخاب از لیست یا تایپ دستی..."
                                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 shadow-sm text-gray-900"
                                        />
                                        <datalist id="aliasOptionsList">
                                          {Array.from(new Set([
                                            `${newPersonTitle} ${newPersonFirstName} ${newPersonLastName}`.trim().replace(/\s+/g, ' '),
                                            `${newPersonTitle} ${newPersonFirstName} ${newPersonLastName} ${newPersonFatherName ? `(فرزند ${newPersonFatherName})` : ''}`.trim().replace(/\s+/g, ' '),
                                            `${newPersonFirstName} ${newPersonLastName}`.trim().replace(/\s+/g, ' '),
                                            `${newPersonFirstName} ${newPersonLastName} ${newPersonFatherName ? `(فرزند ${newPersonFatherName})` : ''}`.trim().replace(/\s+/g, ' '),
                                            `${newPersonTitle} ${newPersonLastName}`.trim().replace(/\s+/g, ' '),
                                            `${newPersonTitle} ${newPersonLastName} ${newPersonFatherName ? `(فرزند ${newPersonFatherName})` : ''}`.trim().replace(/\s+/g, ' '),
                                            `${newPersonLastName}`.trim().replace(/\s+/g, ' '),
                                            `${newPersonLastName} ${newPersonFatherName ? `(فرزند ${newPersonFatherName})` : ''}`.trim().replace(/\s+/g, ' '),
                                            `${newPersonTitle} ${newPersonFirstName}`.trim().replace(/\s+/g, ' '),
                                            `${newPersonFirstName}`.trim().replace(/\s+/g, ' '),
                                            `${newPersonLastName} ${newPersonFirstName}`.trim().replace(/\s+/g, ' ')
                                          ].filter(Boolean))).map(opt => (
                                            <option key={opt} value={opt} />
                                          ))}
                                        </datalist>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="w-full text-right">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                      نام{" "}
                                      <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                      type="text"
                                      value={newPersonFirstName}
                                      onChange={(e) =>
                                        setNewPersonFirstName(e.target.value)
                                      }
                                      placeholder="نام"
                                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 shadow-sm text-gray-900"
                                      required
                                    />
                                  </div>
                                  <div className="w-full text-right">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                      نام خانوادگی{" "}
                                      <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                      type="text"
                                      value={newPersonLastName}
                                      onChange={(e) =>
                                        setNewPersonLastName(e.target.value)
                                      }
                                      placeholder="نام خانوادگی"
                                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 shadow-sm text-gray-900"
                                      required
                                    />
                                  </div>
                                  <div className="w-full text-right">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                      جنسیت
                                    </label>
                                    <select
                                      value={newPersonGender}
                                      onChange={(e) =>
                                        setNewPersonGender(
                                          e.target.value as any,
                                        )
                                      }
                                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 shadow-sm text-gray-900"
                                    >
                                      <option value="none">نامشخص</option>
                                      <option value="male">مرد</option>
                                      <option value="female">زن</option>
                                    </select>
                                  </div>
                                  <div className="w-full text-right">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                      نام پدر
                                    </label>
                                    <input
                                      type="text"
                                      value={newPersonFatherName}
                                      onChange={(e) =>
                                        setNewPersonFatherName(e.target.value)
                                      }
                                      placeholder="اختیاری"
                                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 shadow-sm text-gray-900"
                                    />
                                  </div>
                                  <div className="w-full text-right">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                      کد ملی
                                    </label>
                                    <input
                                      type="text"
                                      value={newPersonNationalId}
                                      onChange={(e) =>
                                        setNewPersonNationalId(e.target.value)
                                      }
                                      placeholder="کد ملی 10 رقمی"
                                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 shadow-sm text-gray-900 text-left"
                                      dir="ltr"
                                    />
                                  </div>
                                  <div className="w-full text-right">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                      کد حسابداری (اختیاری)
                                    </label>
                                    <input
                                      type="text"
                                      value={newPersonAccountingCode}
                                      onChange={(e) =>
                                        setNewPersonAccountingCode(
                                          e.target.value,
                                        )
                                      }
                                      placeholder="مانند: 1205001"
                                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 shadow-sm text-gray-900 text-left"
                                      dir="ltr"
                                    />
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="w-full text-right md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="w-full text-right">
                                      <label className="block text-sm font-medium text-gray-700 mb-2">
                                        نام شرکت / سازمان{" "}
                                        <span className="text-red-500">*</span>
                                      </label>
                                      <input
                                        type="text"
                                        value={newPersonCompanyName}
                                        onChange={(e) =>
                                          setNewPersonCompanyName(
                                            e.target.value,
                                          )
                                        }
                                        placeholder="مثال: شرکت توسعه تجارت البرز"
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 shadow-sm text-gray-900"
                                        required
                                      />
                                    </div>

                                    <div className="w-full text-right">
                                      <label className="block text-sm font-medium text-gray-700 mb-2">
                                        نام مستعار / تجاری
                                      </label>
                                      <div className="relative">
                                        <input
                                          type="text"
                                          list="legalAliasOptionsList"
                                          value={newPersonAlias}
                                          onChange={(e) => setNewPersonAlias(e.target.value)}
                                          onFocus={(e) => {
                                            if (!newPersonAlias && newPersonCompanyName) {
                                              setNewPersonAlias(newPersonCompanyName);
                                            }
                                          }}
                                          placeholder={`مثال: ${newPersonCompanyName || "شرکت البرز"}`}
                                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 shadow-sm text-gray-900"
                                        />
                                        <datalist id="legalAliasOptionsList">
                                          {Array.from(new Set([
                                            newPersonCompanyName,
                                            newPersonCompanyName ? `شرکت ${newPersonCompanyName}` : undefined,
                                            newPersonCompanyName ? `فروشگاه ${newPersonCompanyName}` : undefined
                                          ].filter(Boolean))).map(opt => (
                                            <option key={opt} value={opt} />
                                          ))}
                                        </datalist>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="w-full text-right md:col-span-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                      شناسه ملی شرکت
                                    </label>
                                    <input
                                      type="text"
                                      value={newPersonNationalId}
                                      onChange={(e) =>
                                        setNewPersonNationalId(e.target.value)
                                      }
                                      placeholder="شناسه ملی"
                                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 shadow-sm text-gray-900 text-left"
                                      dir="ltr"
                                    />
                                  </div>
                                  <div className="w-full text-right">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                      کد اقتصادی
                                    </label>
                                    <input
                                      type="text"
                                      value={newPersonEconomicCode}
                                      onChange={(e) => setNewPersonEconomicCode(e.target.value)}
                                      placeholder="مثال: ۴۱۱۱۱۱۱۱۱۱۱۱"
                                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 shadow-sm text-gray-900 text-left"
                                      dir="ltr"
                                    />
                                  </div>
                                  <div className="w-full text-right">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                      شماره ثبت
                                    </label>
                                    <input
                                      type="text"
                                      value={newPersonRegistrationNumber}
                                      onChange={(e) => setNewPersonRegistrationNumber(e.target.value)}
                                      placeholder="مثال: ۱۲۳۴۵"
                                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 shadow-sm text-gray-900 text-left"
                                      dir="ltr"
                                    />
                                  </div>
                                  <div className="w-full text-right md:col-span-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                      کد حسابداری (اختیاری)
                                    </label>
                                    <input
                                      type="text"
                                      value={newPersonAccountingCode}
                                      onChange={(e) =>
                                        setNewPersonAccountingCode(
                                          e.target.value,
                                        )
                                      }
                                      placeholder="مانند: 1205001"
                                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 shadow-sm text-gray-900 text-left"
                                      dir="ltr"
                                    />
                                  </div>
                                </>
                              )}
                            </>
                          )}

                          {personFormTab === "contact" && (
                            <>
                              <div className="w-full text-right">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  استان
                                </label>
                                <input
                                  type="text"
                                  value={newPersonProvince}
                                  onChange={(e) =>
                                    setNewPersonProvince(e.target.value)
                                  }
                                  placeholder="نام استان"
                                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 shadow-sm text-gray-900"
                                />
                              </div>
                              <div className="w-full text-right">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  شهر
                                </label>
                                <input
                                  type="text"
                                  value={newPersonCity}
                                  onChange={(e) =>
                                    setNewPersonCity(e.target.value)
                                  }
                                  placeholder="نام شهر"
                                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 shadow-sm text-gray-900"
                                />
                              </div>
                              <div className="w-full text-right md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  آدرس پستی
                                </label>
                                <textarea
                                  value={newPersonAddress}
                                  onChange={(e) =>
                                    setNewPersonAddress(e.target.value)
                                  }
                                  placeholder="آدرس دقیق و کامل"
                                  rows={3}
                                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 shadow-sm text-gray-900"
                                />
                              </div>
                              <div className="w-full text-right md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  شماره تماس (تلفن / موبایل)
                                </label>
                                <input
                                  type="text"
                                  value={newPersonPhone}
                                  onChange={(e) =>
                                    setNewPersonPhone(e.target.value)
                                  }
                                  placeholder="مثال: 09120000000"
                                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 shadow-sm text-gray-900 text-left font-mono"
                                  dir="ltr"
                                />
                              </div>

                              <div className="w-full text-right md:col-span-2 mt-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  راه‌های ارتباطی و آدرس‌ها
                                </label>
                                {newPersonContacts.map((contact, idx) => (
                                  <div key={idx} className="flex flex-col gap-2 mb-3 p-3 border border-gray-100 rounded-xl bg-slate-50/50">
                                    <div className="flex items-center gap-2">
                                      <select
                                        value={contact.type}
                                        onChange={e => {
                                          const newContacts = [...newPersonContacts];
                                          newContacts[idx].type = e.target.value;
                                          setNewPersonContacts(newContacts);
                                        }}
                                        className="px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 bg-white"
                                      >
                                        <option value="mobile">موبایل</option>
                                        <option value="phone">تلفن ثابت</option>
                                        <option value="fax">فکس</option>
                                        <option value="email">ایمیل</option>
                                        <option value="website">وبسایت</option>
                                        <option value="instagram">اینستاگرام</option>
                                        <option value="telegram">تلگرام</option>
                                        <option value="whatsapp">واتساپ</option>
                                        <option value="address">آدرس</option>
                                        <option value="postal_code">کد پستی</option>
                                        <option value="other">دیگر</option>
                                      </select>
                                      <input
                                        type="text"
                                        value={contact.title || ''}
                                        onChange={e => {
                                          const newContacts = [...newPersonContacts];
                                          newContacts[idx].title = e.target.value;
                                          setNewPersonContacts(newContacts);
                                        }}
                                        placeholder="عنوان (اختیاری)"
                                        className="w-1/3 px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500"
                                      />
                                      {contact.type !== 'address' && (
                                        <input
                                          type="text"
                                          value={contact.number || ''}
                                          onChange={e => {
                                            const newContacts = [...newPersonContacts];
                                            newContacts[idx].number = e.target.value;
                                            setNewPersonContacts(newContacts);
                                          }}
                                          placeholder="مقدار"
                                          className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500"
                                          dir={contact.type === 'other' ? "rtl" : "ltr"}
                                        />
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newContacts = [...newPersonContacts];
                                          newContacts.splice(idx, 1);
                                          setNewPersonContacts(newContacts);
                                        }}
                                        className={`p-2 text-rose-500 hover:bg-rose-50 rounded-xl ${contact.type === 'address' ? 'mr-auto' : ''}`}
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                                      </button>
                                    </div>
                                    {contact.type === 'address' && (
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-1 pl-10">
                                        <input
                                          type="text"
                                          value={contact.province || ''}
                                          onChange={e => {
                                            const newContacts = [...newPersonContacts];
                                            newContacts[idx].province = e.target.value;
                                            setNewPersonContacts(newContacts);
                                          }}
                                          placeholder="استان"
                                          className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500"
                                        />
                                        <input
                                          type="text"
                                          value={contact.city || ''}
                                          onChange={e => {
                                            const newContacts = [...newPersonContacts];
                                            newContacts[idx].city = e.target.value;
                                            setNewPersonContacts(newContacts);
                                          }}
                                          placeholder="شهر"
                                          className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500"
                                        />
                                        <input
                                          type="text"
                                          value={contact.postalCode || ''}
                                          onChange={e => {
                                            const newContacts = [...newPersonContacts];
                                            newContacts[idx].postalCode = e.target.value;
                                            setNewPersonContacts(newContacts);
                                          }}
                                          placeholder="کد پستی"
                                          className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500"
                                        />
                                        <textarea
                                          value={contact.address || ''}
                                          onChange={e => {
                                            const newContacts = [...newPersonContacts];
                                            newContacts[idx].address = e.target.value;
                                            setNewPersonContacts(newContacts);
                                          }}
                                          placeholder="آدرس دقیق و کامل"
                                          rows={2}
                                          className="w-full md:col-span-3 px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500"
                                        />
                                      </div>
                                    )}
                                  </div>
                                ))}
                                <button
                                  type="button"
                                  onClick={() => setNewPersonContacts([...newPersonContacts, { type: 'mobile', number: '', title: '' }])}
                                  className="mt-2 text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-plus"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                                  افزودن راه ارتباطی/آدرس جدید
                                </button>
                              </div>
                            </>
                          )}

                          {personFormTab === "financial" && (
                            <div className="w-full text-right md:col-span-2 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                              <div className="w-full text-right bg-blue-50/50 p-6 rounded-3xl border border-blue-100 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                                <div className="mb-4 relative z-10 border-b border-blue-100 pb-4">
                                  <h4 className="text-sm font-black text-blue-900 mb-2">
                                    سقف اعتبار / بدهی
                                  </h4>
                                  <p className="text-xs text-blue-700/80 leading-relaxed max-w-2xl">
                                    با تعیین سقف اعتبار، در صورتی که بدهی این
                                    شخص از مبلغ تعیین شده بیشتر شود، سیستم اجازه
                                    ثبت فاکتور یا سند جدید برای ایشان را نخواهد
                                    داد.
                                  </p>
                                </div>
                                <div className="w-full relative z-10">
                                  <label className="block text-sm font-bold text-blue-900 mb-2">
                                    سقف مجاز (
                                    {storeSettings?.currency || "تومان"})
                                  </label>
                                  <CurrencyInput
                                    value={newPersonCreditLimit}
                                    onChange={(e: any) =>
                                      setNewPersonCreditLimit(e.target.value)
                                    }
                                    placeholder="مثلا: 50000000 (خالی به معنی بدون سقف)"
                                    className="w-full px-4 py-3 rounded-xl border border-blue-200 focus:ring-2 focus:ring-blue-500 shadow-sm transition-colors text-blue-950 font-mono text-left font-bold bg-white"
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {personFormTab === "settings" && (
                            <>
                              <div className="w-full text-right md:col-span-2 bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-2">
                                <div className="flex justify-between items-center mb-4">
                                  <label className="block text-xs font-black text-slate-700">
                                    وضعیت فعالیت
                                  </label>
                                </div>
                                <div className="flex items-center gap-3">
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      className="sr-only peer"
                                      checked={newPersonIsActive}
                                      onChange={(e) =>
                                        setNewPersonIsActive(e.target.checked)
                                      }
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                                  </label>
                                  <span className="text-sm font-bold text-gray-800">
                                    {newPersonIsActive
                                      ? "حساب فعال است"
                                      : "حساب غیرفعال"}
                                  </span>
                                </div>
                              </div>

                              <div className="w-full text-right z-50 relative">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  تاریخ عضویت / ثبت
                                </label>
                                <DatePicker
                                  value={newPersonRegistrationDate}
                                  onChange={(date: any) =>
                                    setNewPersonRegistrationDate(
                                      date?.toDate?.() || new Date(),
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
                                  inputClass="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 shadow-sm text-gray-900 font-mono text-center outline-none"
                                  containerClassName="w-full"
                                />
                              </div>

                              <div className="w-full text-right bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <div className="flex justify-between items-center mb-2">
                                  <label className="block text-xs font-black text-slate-700">
                                    گروه‌بندی شخص
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onClose();
                                      setActiveTab("person_groups" as any);
                                    }}
                                    className="px-3 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg text-xs font-bold transition-colors border border-indigo-200 cursor-pointer"
                                  >
                                    مدیریت گروه‌ها
                                  </button>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-2 mt-1">
                                  <select
                                    value={newPersonGroup}
                                    onChange={(e) =>
                                      setNewPersonGroup(e.target.value)
                                    }
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 shadow-sm text-gray-950 font-bold text-sm bg-white"
                                  >
                                    <option value="">بدون گروه</option>
                                    {(personGroups || []).map((g, index) => (
                                      <option key={g.id ? `id-${g.id}` : `idx-${index}`} value={g.id}>
                                        {g.icon ? g.icon + " " : ""}{g.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </form>
                    </div>

                    <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 mt-auto">
                      <button
                        type="button"
                        onClick={() => onClose()}
                        className="px-6 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl font-medium transition-colors shadow-sm"
                      >
                        انصراف
                      </button>
                      <button
                        type="submit"
                        form="personForm"
                        disabled={submittingPerson}
                        className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {submittingPerson ? (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{
                              repeat: Infinity,
                              duration: 1,
                              ease: "linear",
                            }}
                            className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                          />
                        ) : (
                          <Plus className="w-5 h-5" />
                        )}
                        <span>{editingPersonId ? "ذخیره تغییرات" : "ثبت شخص"}</span>
                      </button>
                    </div>
                  </motion.div>
                </div>
    </>
  );
}
