import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Zap,
  Wrench,
  Hammer,
  Paintbrush,
  Flame,
  Axe,
  Grid,
  DoorOpen,
  Layers,
  Droplets,
  Wind,
  Key,
  Phone,
  PhoneCall,
  MessageSquare,
  Star,
  UserCheck,
  Clock,
  Plus,
  Search,
  Filter,
  Sparkles,
  Sliders,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  FileText,
  Wallet,
  DollarSign,
  MapPin,
  Activity,
  Check,
  X,
  LayoutGrid,
  List as ListIcon,
  Tag,
  Briefcase,
  Users,
  Building,
  RefreshCw,
  MoreVertical,
  CheckSquare,
  Square,
} from "lucide-react";
import { Person, PersonSpecialty } from "../../types";
import {
  getSpecialties,
  saveSpecialties,
  addSpecialty,
  deleteSpecialty,
  updatePersonSpecialistData,
  DEFAULT_SPECIALTIES,
} from "../../services/specialistService";
import { updatePerson } from "../../services/personService";
import SendPersonMessageModal from "../modals/SendPersonMessageModal";

interface SpecialistsDirectoryProps {
  persons?: Person[];
  transactions?: any[];
  invoices?: any[];
  storeSettings?: any;
  showNotification?: (message: string, type: "success" | "error" | "warning" | "info") => void;
  fetchPersons?: () => void;
  setProfilePersonId?: (id: string | number) => void;
  setLedgerPersonId?: (id: string | number) => void;
  setActiveTab?: (tab: string) => void;
  setIsPersonModalOpen?: (open: boolean) => void;
  calculatePersonBalance?: (personId: string | number) => any;
  formatNumber?: (num: number) => string;
  setReceiptPersonId?: (id: string | number) => void;
  setIsReceiptModalOpen?: (open: boolean) => void;
}

// Icon mapping helper
const getSpecialtyIcon = (iconName?: string) => {
  switch (iconName) {
    case "Zap": return <Zap className="w-4 h-4" />;
    case "Wrench": return <Wrench className="w-4 h-4" />;
    case "Hammer": return <Hammer className="w-4 h-4" />;
    case "Paintbrush": return <Paintbrush className="w-4 h-4" />;
    case "Flame": return <Flame className="w-4 h-4" />;
    case "Axe": return <Axe className="w-4 h-4" />;
    case "Grid": return <Grid className="w-4 h-4" />;
    case "DoorOpen": return <DoorOpen className="w-4 h-4" />;
    case "Layers": return <Layers className="w-4 h-4" />;
    case "Droplets": return <Droplets className="w-4 h-4" />;
    case "Wind": return <Wind className="w-4 h-4" />;
    case "Key": return <Key className="w-4 h-4" />;
    default: return <Briefcase className="w-4 h-4" />;
  }
};

export default function SpecialistsDirectory({
  persons = [],
  transactions = [],
  invoices = [],
  storeSettings,
  showNotification,
  fetchPersons,
  setProfilePersonId,
  setLedgerPersonId,
  setActiveTab,
  setIsPersonModalOpen,
  calculatePersonBalance,
  formatNumber,
  setReceiptPersonId,
  setIsReceiptModalOpen,
}: SpecialistsDirectoryProps) {
  const [specialtiesCatalog, setSpecialtiesCatalog] = useState<PersonSpecialty[]>(DEFAULT_SPECIALTIES);
  const [selectedSpecialtyFilter, setSelectedSpecialtyFilter] = useState<string>("all");
  const [availabilityFilter, setAvailabilityFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [sortBy, setSortBy] = useState<"rating" | "name" | "specialties" | "newest">("rating");

  // Modals state
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [editingSpecialist, setEditingSpecialist] = useState<Person | null>(null);
  const [messagingPerson, setMessagingPerson] = useState<Person | null>(null);

  // Load specialties catalog
  useEffect(() => {
    let mounted = true;
    getSpecialties().then((list) => {
      if (mounted && list && list.length > 0) {
        setSpecialtiesCatalog(list);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Filter persons who have at least one specialty assigned, or display all if no specialists yet
  const allSpecialists = useMemo(() => {
    return persons.filter((p) => {
      const hasSpecialties = Array.isArray(p.specialties) && p.specialties.length > 0;
      // also include if their jobTitle or roles matches any craft
      const hasCraftRole = p.roles?.some((r) =>
        r.includes("استادکار") || r.includes("تأسیسات") || r.includes("برق") || r.includes("فنی") || r.includes("مجری")
      );
      return hasSpecialties || hasCraftRole;
    });
  }, [persons]);

  // If there are no assigned specialists yet in a fresh database, give easy access to all persons so user can assign
  const effectiveSpecialistsList = useMemo(() => {
    if (allSpecialists.length > 0) return allSpecialists;
    return persons; // fallback so the view isn't completely empty before assignment
  }, [allSpecialists, persons]);

  // Filtered & Sorted specialists
  const filteredSpecialists = useMemo(() => {
    return effectiveSpecialistsList.filter((person) => {
      // 1. Specialty Filter
      if (selectedSpecialtyFilter !== "all") {
        const specs = person.specialties || [];
        if (!specs.includes(selectedSpecialtyFilter)) return false;
      }

      // 2. Availability Filter
      if (availabilityFilter !== "all") {
        const status = person.availabilityStatus || "available";
        if (status !== availabilityFilter) return false;
      }

      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const fullName = `${person.firstName || ""} ${person.lastName || ""} ${person.name || ""}`.toLowerCase();
        const phone = `${person.phone || ""} ${person.mobile || ""}`;
        const notes = (person.skillNotes || "").toLowerCase();
        const city = (person.city || "").toLowerCase();
        const code = (person.personCode || "").toLowerCase();

        const matchText = fullName.includes(q) || phone.includes(q) || notes.includes(q) || city.includes(q) || code.includes(q);
        if (!matchText) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === "rating") {
        return (b.specialistRating || 0) - (a.specialistRating || 0);
      }
      if (sortBy === "specialties") {
        return (b.specialties?.length || 0) - (a.specialties?.length || 0);
      }
      if (sortBy === "name") {
        return (a.name || "").localeCompare(b.name || "", "fa");
      }
      return 0;
    });
  }, [effectiveSpecialistsList, selectedSpecialtyFilter, availabilityFilter, searchQuery, sortBy]);

  // Statistics
  const stats = useMemo(() => {
    const total = effectiveSpecialistsList.length;
    const available = effectiveSpecialistsList.filter((p) => (p.availabilityStatus || "available") === "available").length;
    const busy = effectiveSpecialistsList.filter((p) => p.availabilityStatus === "busy").length;
    const ratings = effectiveSpecialistsList.map((p) => p.specialistRating || 5);
    const avgRating = ratings.length > 0 ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : "5.0";
    return { total, available, busy, avgRating };
  }, [effectiveSpecialistsList]);

  // Calculate count for each specialty
  const specialtyCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const spec of specialtiesCatalog) {
      counts[spec.id] = effectiveSpecialistsList.filter((p) => (p.specialties || []).includes(spec.id)).length;
    }
    return counts;
  }, [specialtiesCatalog, effectiveSpecialistsList]);

  // Handle Quick Rating Change directly from card
  const handleRatePerson = async (person: Person, newRating: number) => {
    try {
      const updated = updatePersonSpecialistData(person, { specialistRating: newRating });
      await updatePerson(String(person.id), updated);
      fetchPersons?.();
      showNotification?.(`امتیاز ${person.name} با موفقیت به ${newRating} ستاره تغییر یافت`, "success");
    } catch (e) {
      showNotification?.("خطا در ثبت امتیاز متخصص", "error");
    }
  };

  // Handle Quick Availability Change
  const handleToggleAvailability = async (person: Person, status: 'available' | 'busy' | 'unavailable') => {
    try {
      const updated = updatePersonSpecialistData(person, { availabilityStatus: status });
      await updatePerson(String(person.id), updated);
      fetchPersons?.();
      const statusText = status === "available" ? "آماده به کار" : status === "busy" ? "مشغول سر پروژه" : "خارج از دسترس";
      showNotification?.(`وضعیت ${person.name} به «${statusText}» تغییر یافت`, "info");
    } catch (e) {
      showNotification?.("خطا در تغییر وضعیت در دسترس بودن", "error");
    }
  };

  return (
    <div className="space-y-6 text-right select-none dir-rtl font-sans" dir="rtl">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 shadow-md border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-indigo-500/30 border border-amber-400/40 text-amber-300 flex items-center justify-center shadow-inner shrink-0">
            <Hammer className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-black text-white">ویترین و مدیریت متخصصین و استادکاران</h1>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-400/30 px-2.5 py-0.5 rounded-full font-bold">
                مهارت‌ها و خدمات فنی
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium mt-1 leading-relaxed">
              دسترسی سریع، تماس فوری، ثبت کاردکس و مدیریت نیروهای دارای مهارت‌های چندگانه (برق‌کار، تأسیساتی، بنّا، نقاش و...)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setShowConfigModal(true)}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-xs active:scale-95"
          >
            <Sliders className="w-4 h-4 text-amber-400" />
            <span>مدیریت عناوین تخصص‌ها</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (setIsPersonModalOpen) {
                setIsPersonModalOpen(true);
              }
            }}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black text-xs transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/25 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>تعریف شخص متخصص جدید</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-3xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-bold block">کل استادکاران و متخصصین</span>
            <div className="text-xl font-black text-slate-900 mt-1 font-mono">{stats.total} نفر</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-3xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-bold block">آماده به کار (در دسترس)</span>
            <div className="text-xl font-black text-emerald-700 mt-1 font-mono">{stats.available} نیرو</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-3xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-bold block">مشغول به کار در پروژه‌ها</span>
            <div className="text-xl font-black text-amber-700 mt-1 font-mono">{stats.busy} نفر</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-3xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-bold block">میانگین رضایت و امتیاز</span>
            <div className="text-xl font-black text-amber-500 mt-1 font-mono flex items-center gap-1">
              <span>{stats.avgRating}</span>
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Star className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Horizontal Visual Specialty Category Chips Bar */}
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-200/80 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-slate-800 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>دسته‌بندی مهارت‌ها و پیشه‌ها:</span>
          </span>
          <span className="text-[11px] text-slate-500 font-medium">برای فیلتر روی هر پیشه کلیک فرمایید</span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          <button
            type="button"
            onClick={() => setSelectedSpecialtyFilter("all")}
            className={`px-3.5 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer shrink-0 flex items-center gap-2 border ${
              selectedSpecialtyFilter === "all"
                ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>همه تخصص‌ها</span>
            <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${selectedSpecialtyFilter === "all" ? "bg-slate-700 text-white" : "bg-slate-200 text-slate-700"}`}>
              {effectiveSpecialistsList.length}
            </span>
          </button>

          {specialtiesCatalog.map((spec) => {
            const isSelected = selectedSpecialtyFilter === spec.id;
            const count = specialtyCounts[spec.id] || 0;

            return (
              <button
                key={spec.id}
                type="button"
                onClick={() => setSelectedSpecialtyFilter(spec.id)}
                className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-2 border ${
                  isSelected
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                }`}
              >
                <span style={{ color: isSelected ? "#fff" : spec.color || "#6366f1" }}>
                  {getSpecialtyIcon(spec.icon)}
                </span>
                <span>{spec.name}</span>
                {count > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${isSelected ? "bg-indigo-700 text-white" : "bg-slate-200 text-slate-700"}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Search and Filter Toolbar */}
      <div className="bg-white rounded-2xl p-4 shadow-3xs border border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجوی نام استادکار، تخصص، تلفن، شهر یا تجهیزات..."
            className="w-full pr-9 pl-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:bg-white focus:border-indigo-500 outline-none"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Availability Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs">
            <span className="text-slate-500 font-bold">وضعیت:</span>
            <select
              value={availabilityFilter}
              onChange={(e) => setAvailabilityFilter(e.target.value)}
              className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
            >
              <option value="all">همه وضعیت‌ها</option>
              <option value="available">🟢 آماده به کار (در دسترس)</option>
              <option value="busy">🟡 مشغول سر پروژه</option>
              <option value="unavailable">⚪ خارج از دسترس</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs">
            <span className="text-slate-500 font-bold">مرتب‌سازی:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
            >
              <option value="rating">بالاترین امتیاز رضایت</option>
              <option value="specialties">بیشترین تخصص‌ها</option>
              <option value="name">نام (الفبا)</option>
            </select>
          </div>

          {/* View Mode */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === "grid" ? "bg-white text-indigo-600 shadow-2xs" : "text-slate-500 hover:text-slate-700"
              }`}
              title="نمای ویترین کارت‌ها"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === "table" ? "bg-white text-indigo-600 shadow-2xs" : "text-slate-500 hover:text-slate-700"
              }`}
              title="نمای لیست فشرده"
            >
              <ListIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 5. Specialists Presentation (Grid or Table) */}
      {filteredSpecialists.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs">
          <Hammer className="w-12 h-12 text-slate-300 mx-auto mb-3 animate-pulse" />
          <h3 className="text-base font-black text-slate-800">هیچ متخصصی با این فیلترها یافت نشد</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
            می‌توانید با کلیک بر روی دکمه «تخصیص تخصص» به هر شخص، تخصص‌های او (برق‌کار، تأسیسات، بنا، نقاش و...) را معین نمایید.
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSpecialists.map((person) => {
            const rawBal = calculatePersonBalance ? calculatePersonBalance(person.id) : 0;
            const balance = typeof rawBal === 'number' ? rawBal : rawBal?.amount || 0;
            const status = person.availabilityStatus || "available";
            const rating = person.specialistRating || 5;
            const personSpecs = (person.specialties || []).map((id) =>
              specialtiesCatalog.find((s) => s.id === id) || { id, name: id, color: "#6366f1", icon: "Briefcase" }
            );

            return (
              <div
                key={person.id}
                className="bg-white rounded-3xl p-5 border border-slate-200/90 hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Card Header: Avatar, Name, Availability Pill */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-start gap-3">
                      {/* Avatar with Status Dot */}
                      <div className="relative shrink-0">
                        {person.imageUrl ? (
                          <img
                            src={person.imageUrl}
                            alt={person.name}
                            className="w-13 h-13 rounded-2xl object-cover border border-slate-200 shadow-xs"
                          />
                        ) : (
                          <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-indigo-50 to-slate-100 border border-slate-200 text-indigo-700 font-black text-base flex items-center justify-center shadow-xs">
                            {person.firstName ? person.firstName.charAt(0) : person.name?.charAt(0) || "U"}
                          </div>
                        )}
                        {/* Status Dot */}
                        <span
                          className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center ${
                            status === "available"
                              ? "bg-emerald-500"
                              : status === "busy"
                              ? "bg-amber-500"
                              : "bg-slate-400"
                          }`}
                          title={status === "available" ? "آماده به کار" : status === "busy" ? "مشغول سر پروژه" : "خارج از دسترس"}
                        />
                      </div>

                      <div>
                        <h3
                          onClick={() => setProfilePersonId && setProfilePersonId(person.id)}
                          className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors cursor-pointer"
                        >
                          {person.name || `${person.firstName || ""} ${person.lastName || ""}`}
                        </h3>

                        <div className="flex items-center gap-2 text-xs text-slate-400 font-medium mt-0.5">
                          {person.personCode && <span className="font-mono">کد: {person.personCode}</span>}
                          {person.city && (
                            <span className="flex items-center gap-0.5 text-slate-500">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              <span>{person.city}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quick Edit Specialty Button */}
                    <button
                      type="button"
                      onClick={() => setEditingSpecialist(person)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                      title="ویرایش مهارت‌ها و وضعیت"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Star Rating & Status Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3 bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => handleRatePerson(person, star)}
                          className="cursor-pointer hover:scale-110 transition-transform"
                          title={`ثبت امتیاز ${star} ستاره`}
                        >
                          <Star
                            className={`w-3.5 h-3.5 ${
                              star <= rating ? "fill-amber-400 text-amber-400" : "text-slate-300"
                            }`}
                          />
                        </button>
                      ))}
                      <span className="text-[11px] font-mono font-bold text-slate-600 mr-1">{rating}.0</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const nextStatus = status === "available" ? "busy" : status === "busy" ? "unavailable" : "available";
                        handleToggleAvailability(person, nextStatus);
                      }}
                      className={`text-[10.5px] font-bold px-2.5 py-0.5 rounded-lg border cursor-pointer transition-all ${
                        status === "available"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : status === "busy"
                          ? "bg-amber-50 text-amber-800 border-amber-200"
                          : "bg-slate-100 text-slate-600 border-slate-200"
                      }`}
                    >
                      {status === "available" ? "آماده به کار" : status === "busy" ? "سر پروژه" : "خارج از دسترس"}
                    </button>
                  </div>

                  {/* Multi-Specialties Badges */}
                  <div className="flex flex-wrap gap-1.5 mb-3 min-h-[32px]">
                    {personSpecs.length > 0 ? (
                      personSpecs.map((spec) => (
                        <span
                          key={spec.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold border shadow-3xs"
                          style={{
                            backgroundColor: `${spec.color || "#6366f1"}15`,
                            color: spec.color || "#4f46e5",
                            borderColor: `${spec.color || "#6366f1"}30`,
                          }}
                        >
                          {getSpecialtyIcon(spec.icon)}
                          <span>{spec.name}</span>
                        </span>
                      ))
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEditingSpecialist(person)}
                        className="text-[11px] text-indigo-600 hover:underline flex items-center gap-1 font-bold"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>تعیین تخصص‌های این شخص...</span>
                      </button>
                    )}
                  </div>

                  {/* Skill Notes / Equipment */}
                  {person.skillNotes && (
                    <div className="text-xs text-slate-600 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 mb-3 leading-relaxed">
                      <span className="text-[10px] font-bold text-slate-400 block mb-0.5">یادداشت و تجهیزات:</span>
                      <p className="line-clamp-2">{person.skillNotes}</p>
                    </div>
                  )}

                  {/* Financial Balance Summary */}
                  <div className="flex items-center justify-between text-xs py-2 border-t border-slate-100 text-slate-500">
                    <span>وضعیت مانده حساب:</span>
                    <span
                      className={`font-mono font-black ${
                        balance > 0
                          ? "text-emerald-700"
                          : balance < 0
                          ? "text-rose-700"
                          : "text-slate-600"
                      }`}
                    >
                      {formatNumber ? formatNumber(Math.abs(balance)) : Math.abs(balance)} {storeSettings?.currency || "تومان"}
                      <span className="text-[10px] font-sans font-bold mr-1">
                        {balance > 0 ? "(بستانکار)" : balance < 0 ? "(بدهکار)" : "(تسویه)"}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Card Action Buttons: Call, Message, Ledger, Settle */}
                <div className="grid grid-cols-4 gap-1.5 pt-3 border-t border-slate-100 mt-2">
                  {/* Direct Call */}
                  <a
                    href={`tel:${person.mobile || person.phone}`}
                    className="flex flex-col items-center justify-center p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors text-center"
                    title="تماس فوری"
                  >
                    <PhoneCall className="w-4 h-4 mb-0.5" />
                    <span className="text-[10px] font-bold">تماس</span>
                  </a>

                  {/* SMS / Message */}
                  <button
                    type="button"
                    onClick={() => setMessagingPerson(person)}
                    className="flex flex-col items-center justify-center p-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors cursor-pointer text-center"
                    title="ارسال پیامک"
                  >
                    <MessageSquare className="w-4 h-4 mb-0.5" />
                    <span className="text-[10px] font-bold">پیامک</span>
                  </button>

                  {/* Wage Payment / Receipt */}
                  <button
                    type="button"
                    onClick={() => {
                      if (setReceiptPersonId && setIsReceiptModalOpen) {
                        setReceiptPersonId(person.id);
                        setIsReceiptModalOpen(true);
                      }
                    }}
                    className="flex flex-col items-center justify-center p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 transition-colors cursor-pointer text-center"
                    title="ثبت سند دستمزد / پرداخت"
                  >
                    <Wallet className="w-4 h-4 mb-0.5" />
                    <span className="text-[10px] font-bold">پرداخت</span>
                  </button>

                  {/* Ledger History */}
                  <button
                    type="button"
                    onClick={() => {
                      if (setLedgerPersonId && setActiveTab) {
                        setLedgerPersonId(person.id);
                        setActiveTab("person_ledger");
                      }
                    }}
                    className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer text-center"
                    title="مشاهده کاردکس مالی"
                  >
                    <FileText className="w-4 h-4 mb-0.5" />
                    <span className="text-[10px] font-bold">کاردکس</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 font-black border-b border-slate-200">
                <tr>
                  <th className="p-4">استادکار / شخص</th>
                  <th className="p-4">تخصص‌ها و مهارت‌ها</th>
                  <th className="p-4">وضعیت فعالیت</th>
                  <th className="p-4">امتیاز مهارت</th>
                  <th className="p-4">شماره تماس</th>
                  <th className="p-4">مانده حساب</th>
                  <th className="p-4 text-center">عملیات سریع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSpecialists.map((person) => {
                  const rawBal = calculatePersonBalance ? calculatePersonBalance(person.id) : 0;
                  const balance = typeof rawBal === 'number' ? rawBal : rawBal?.amount || 0;
                  const status = person.availabilityStatus || "available";
                  const rating = person.specialistRating || 5;
                  const personSpecs = (person.specialties || []).map((id) =>
                    specialtiesCatalog.find((s) => s.id === id) || { id, name: id, color: "#6366f1", icon: "Briefcase" }
                  );

                  return (
                    <tr key={person.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center font-black text-indigo-700 shrink-0">
                            {person.name?.charAt(0) || "U"}
                          </div>
                          <div>
                            <span
                              onClick={() => setProfilePersonId && setProfilePersonId(person.id)}
                              className="font-black text-slate-900 hover:text-indigo-600 cursor-pointer block"
                            >
                              {person.name}
                            </span>
                            <span className="text-[10.5px] text-slate-400 font-mono">
                              {person.city || "ثبت‌شده"}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {personSpecs.map((s) => (
                            <span
                              key={s.id}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border"
                              style={{
                                backgroundColor: `${s.color || "#6366f1"}15`,
                                color: s.color || "#4f46e5",
                                borderColor: `${s.color || "#6366f1"}30`,
                              }}
                            >
                              {getSpecialtyIcon(s.icon)}
                              <span>{s.name}</span>
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="p-4">
                        <span
                          className={`text-[10.5px] font-bold px-2 py-0.5 rounded-md border ${
                            status === "available"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : status === "busy"
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                        >
                          {status === "available" ? "آماده به کار" : status === "busy" ? "سر پروژه" : "خارج از دسترس"}
                        </span>
                      </td>

                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span className="font-mono font-bold text-slate-800">{rating}.0</span>
                        </div>
                      </td>

                      <td className="p-4 font-mono font-bold text-slate-700">
                        {person.mobile || person.phone || "-"}
                      </td>

                      <td className="p-4 font-mono font-bold">
                        <span className={balance > 0 ? "text-emerald-700" : balance < 0 ? "text-rose-700" : "text-slate-600"}>
                          {formatNumber ? formatNumber(Math.abs(balance)) : balance}
                        </span>
                      </td>

                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <a
                            href={`tel:${person.mobile || person.phone}`}
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors"
                            title="تماس فوری"
                          >
                            <Phone className="w-4 h-4" />
                          </a>

                          <button
                            type="button"
                            onClick={() => setEditingSpecialist(person)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                            title="ویرایش مهارت‌ها"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: SPECIALTIES CONFIGURATION MODAL */}
      {showConfigModal && (
        <SpecialtiesConfigModal
          catalog={specialtiesCatalog}
          onClose={() => setShowConfigModal(false)}
          onAdd={async (newSpec) => {
            const added = await addSpecialty(newSpec);
            setSpecialtiesCatalog((prev) => [added, ...prev]);
            showNotification?.(`تخصص «${added.name}» با موفقیت اضافه شد`, "success");
          }}
          onDelete={async (id) => {
            const updated = await deleteSpecialty(id);
            setSpecialtiesCatalog(updated);
            showNotification?.("تخصص با موفقیت حذف گردید", "info");
          }}
        />
      )}

      {/* MODAL 2: EDIT SPECIALIST SKILLS & STATUS */}
      {editingSpecialist && (
        <EditSpecialistModal
          person={editingSpecialist}
          catalog={specialtiesCatalog}
          onClose={() => setEditingSpecialist(null)}
          onSave={async (updatedData) => {
            try {
              const updatedPerson = updatePersonSpecialistData(editingSpecialist, updatedData);
              await updatePerson(String(editingSpecialist.id), updatedPerson);
              fetchPersons?.();
              setEditingSpecialist(null);
              showNotification?.(`اطلاعات مهارتی «${editingSpecialist.name}» با موفقیت ذخیره شد`, "success");
            } catch (e) {
              showNotification?.("خطا در به‌روزرسانی اطلاعات متخصص", "error");
            }
          }}
        />
      )}

      {/* MODAL 3: SEND SMS */}
      {messagingPerson && (
        <SendPersonMessageModal
          isOpen={true}
          onClose={() => setMessagingPerson(null)}
          person={messagingPerson}
          storeSettings={storeSettings}
          showNotification={showNotification}
        />
      )}
    </div>
  );
}

// --- SUB-COMPONENT 1: SPECIALTIES CONFIG MODAL ---
function SpecialtiesConfigModal({
  catalog,
  onClose,
  onAdd,
  onDelete,
}: {
  catalog: PersonSpecialty[];
  onClose: () => void;
  onAdd: (spec: Omit<PersonSpecialty, "id">) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("ساختمانی و فنی");
  const [icon, setIcon] = useState("Wrench");
  const [color, setColor] = useState("#6366f1");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableIcons = ["Wrench", "Zap", "Hammer", "Paintbrush", "Flame", "Axe", "Grid", "DoorOpen", "Layers", "Droplets", "Wind", "Key"];
  const colorPalette = ["#6366f1", "#f59e0b", "#0284c7", "#ec4899", "#f97316", "#84cc16", "#14b8a6", "#8b5cf6", "#06b6d4", "#3b82f6", "#64748b", "#b45309"];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      await onAdd({
        name: name.trim(),
        category,
        icon,
        color,
        description: description.trim(),
      });
      setName("");
      setDescription("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl text-right overflow-hidden dir-rtl">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">مدیریت عناوین تخصص‌ها و پیشه‌ها</h3>
              <p className="text-xs text-slate-500 font-medium">افزودن تخصص جدید، انتخاب آیکون و رنگ شاخص</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Form to Add New */}
          <form onSubmit={handleCreate} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-4">
            <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-indigo-600" />
              <span>افزودن تخصص جدید:</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">نام تخصص / حرفه *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: لوله‌کش، کناف‌کار، نصاب آسانسور"
                  className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">دسته‌بندی کلی:</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="مثال: ساختمانی، برق، دکوراسیون"
                  className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-200 rounded-xl outline-none"
                />
              </div>
            </div>

            {/* Icon Picker */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">انتخاب آیکون:</label>
              <div className="flex items-center gap-2 flex-wrap">
                {availableIcons.map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setIcon(ic)}
                    className={`p-2 rounded-xl border transition-all cursor-pointer ${
                      icon === ic ? "bg-indigo-600 text-white border-indigo-600 shadow-xs" : "bg-white text-slate-700 border-slate-200"
                    }`}
                  >
                    {getSpecialtyIcon(ic)}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Picker */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">رنگ تم:</label>
              <div className="flex items-center gap-2 flex-wrap">
                {colorPalette.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-6 h-6 rounded-full border-2 transition-all cursor-pointer ${
                      color === c ? "border-slate-900 scale-110 shadow-xs" : "border-transparent"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">توضیحات مختصر:</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="شرح خدمات این مهارت..."
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all cursor-pointer"
              >
                ثبت تخصص جدید
              </button>
            </div>
          </form>

          {/* List of existing */}
          <div>
            <h4 className="text-xs font-black text-slate-800 mb-3">فهرست تخصص‌های تعریف‌شده:</h4>
            <div className="space-y-2">
              {catalog.map((spec) => (
                <div
                  key={spec.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-white border border-slate-200 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center font-bold"
                      style={{ backgroundColor: `${spec.color || "#6366f1"}20`, color: spec.color || "#6366f1" }}
                    >
                      {getSpecialtyIcon(spec.icon)}
                    </div>
                    <div>
                      <span className="font-black text-slate-900 block">{spec.name}</span>
                      <span className="text-[10px] text-slate-400">{spec.category || "فنی"}</span>
                    </div>
                  </div>

                  {!spec.isDefault && (
                    <button
                      type="button"
                      onClick={() => onDelete(spec.id)}
                      className="text-slate-400 hover:text-rose-600 p-1.5 cursor-pointer"
                      title="حذف تخصص سفارشی"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 flex items-center justify-end bg-slate-50">
          <button type="button" onClick={onClose} className="px-5 py-2 rounded-xl bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer">
            بستن
          </button>
        </div>
      </div>
    </div>
  );
}

// --- SUB-COMPONENT 2: EDIT SPECIALIST MODAL ---
function EditSpecialistModal({
  person,
  catalog,
  onClose,
  onSave,
}: {
  person: Person;
  catalog: PersonSpecialty[];
  onClose: () => void;
  onSave: (data: {
    specialties: string[];
    availabilityStatus: "available" | "busy" | "unavailable";
    specialistRating: number;
    skillNotes: string;
    dailyWage: number;
  }) => Promise<void>;
}) {
  const [selectedSpecs, setSelectedSpecs] = useState<string[]>(person.specialties || []);
  const [availability, setAvailability] = useState<"available" | "busy" | "unavailable">(person.availabilityStatus || "available");
  const [rating, setRating] = useState<number>(person.specialistRating || 5);
  const [notes, setNotes] = useState<string>(person.skillNotes || "");
  const [wage, setWage] = useState<number>(person.dailyWage || 0);
  const [isSaving, setIsSaving] = useState(false);

  const toggleSpec = (id: string) => {
    setSelectedSpecs((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave({
        specialties: selectedSpecs,
        availabilityStatus: availability,
        specialistRating: rating,
        skillNotes: notes.trim(),
        dailyWage: wage,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl text-right overflow-hidden dir-rtl">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Hammer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">تعیین تخصص‌ها و وضعیت مهارتی</h3>
              <p className="text-xs text-slate-500 font-medium">{person.name} ({person.phone || person.mobile || "بدون شماره"})</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Multi-specialty selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-slate-700">
                انتخاب تخصص‌ها (امکان انتخاب همزمان چند تخصص):
              </label>
              <span className="text-[11px] text-indigo-600 font-bold">{selectedSpecs.length} تخصص انتخاب‌شده</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1.5 border border-slate-200 rounded-2xl bg-slate-50/50">
              {catalog.map((spec) => {
                const checked = selectedSpecs.includes(spec.id);
                return (
                  <button
                    key={spec.id}
                    type="button"
                    onClick={() => toggleSpec(spec.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                      checked
                        ? "bg-indigo-50/90 border-indigo-300 text-indigo-950 font-black shadow-2xs"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span style={{ color: spec.color || "#6366f1" }}>{getSpecialtyIcon(spec.icon)}</span>
                      <span>{spec.name}</span>
                    </div>
                    {checked ? (
                      <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-300 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Availability */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">وضعیت در دسترس بودن:</label>
              <select
                value={availability}
                onChange={(e) => setAvailability(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
              >
                <option value="available">🟢 آماده به کار (در دسترس جهت اعزام)</option>
                <option value="busy">🟡 سر پروژه (مشغول به کار)</option>
                <option value="unavailable">⚪ خارج از دسترس / مرخصی</option>
              </select>
            </div>

            {/* Rating */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">امتیاز رضایت و مهارت (۱ تا ۵):</label>
              <div className="flex items-center gap-1.5 h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setRating(s)}
                    className="cursor-pointer p-0.5"
                  >
                    <Star
                      className={`w-4 h-4 ${
                        s <= rating ? "fill-amber-400 text-amber-400" : "text-slate-300"
                      }`}
                    />
                  </button>
                ))}
                <span className="text-xs font-mono font-bold text-slate-700 mr-2">{rating} ستاره</span>
              </div>
            </div>
          </div>

          {/* Wage / Daily rate */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">دستمزد روزانه تقریبی (تومان - اختیاری):</label>
            <input
              type="number"
              value={wage || ""}
              onChange={(e) => setWage(Number(e.target.value))}
              placeholder="مثال: 1200000"
              className="w-full px-3.5 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl outline-none"
            />
          </div>

          {/* Skill Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">یادداشت‌های مهارتی، تجربیات و تجهیزات موجود:</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: دارای دستگاه لوله‌کشی ۵ لایه و هیلتی، ۱۰ سال سابقه کار در برج‌های مسکونی، وقت‌شناس..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:bg-white"
            />
          </div>

          <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer">
              انصراف
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs cursor-pointer shadow-md"
            >
              ذخیره تخصص‌ها و وضعیت
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
