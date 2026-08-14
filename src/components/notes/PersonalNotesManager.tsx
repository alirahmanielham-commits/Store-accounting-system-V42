import { convertToGregorian } from "../../utils/format";
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Pin, Palette, Archive, Trash2, Search, X, Plus, CheckSquare, 
  Image as ImageIcon, MoreVertical, Bell, User, FileText, History, Calendar, Check
} from "lucide-react";
import CustomDatePicker from "../ui/CustomDatePicker";
import DatePickerModule from "react-multi-date-picker";
const DatePicker = CustomDatePicker;
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import TimePicker from "react-multi-date-picker/plugins/time_picker";

import { getPersonalNotes, appendPersonalNote, updatePersonalNote, deletePersonalNote, savePersonalNotes, getPersons, getInvoices } from "../../services/dataService";
import { PersonalNote, NoteHistory, Person } from "../../types";

const NOTE_COLORS = [
  { id: 'default', bg: 'bg-white', border: 'border-slate-200', name: 'پیش‌فرض (سفید)' },
  { id: 'slate', bg: 'bg-slate-50', border: 'border-slate-200', name: 'خاکستری' },
  { id: 'red', bg: 'bg-red-50', border: 'border-red-200', name: 'قرمز' },
  { id: 'orange', bg: 'bg-orange-50', border: 'border-orange-200', name: 'نارنجی' },
  { id: 'amber', bg: 'bg-amber-50', border: 'border-amber-200', name: 'زرد' },
  { id: 'yellow', bg: 'bg-yellow-50', border: 'border-yellow-200', name: 'زرد روشن' },
  { id: 'lime', bg: 'bg-lime-50', border: 'border-lime-200', name: 'لیمویی' },
  { id: 'green', bg: 'bg-emerald-50', border: 'border-emerald-200', name: 'سبز' },
  { id: 'teal', bg: 'bg-teal-50', border: 'border-teal-200', name: 'فیروزه‌ای' },
  { id: 'cyan', bg: 'bg-cyan-50', border: 'border-cyan-200', name: 'آبی آسمانی' },
  { id: 'blue', bg: 'bg-blue-50', border: 'border-blue-200', name: 'آبی' },
  { id: 'indigo', bg: 'bg-indigo-50', border: 'border-indigo-200', name: 'نیلی' },
  { id: 'violet', bg: 'bg-violet-50', border: 'border-violet-200', name: 'بنفش روشن' },
  { id: 'purple', bg: 'bg-purple-50', border: 'border-purple-200', name: 'بنفش' },
  { id: 'pink', bg: 'bg-pink-50', border: 'border-pink-200', name: 'صورتی' },
  { id: 'rose', bg: 'bg-rose-50', border: 'border-rose-200', name: 'رز' },
];

export function PersonalNotesManager({ storeSettings }: any) {
  const [notes, setNotes] = useState<PersonalNote[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newColor, setNewColor] = useState("default");
  
  const [editingNote, setEditingNote] = useState<PersonalNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);

  // For active palette popups
  const [activePalette, setActivePalette] = useState<string | null>(null); // 'new', 'edit', or noteId

  // Persons and Invoices for Autocomplete
  const [systemPersons, setSystemPersons] = useState<Person[]>([]);
  const [systemInvoices, setSystemInvoices] = useState<any[]>([]);

  const [personSearch, setPersonSearch] = useState("");
  const [showPersonDropdown, setShowPersonDropdown] = useState(false);
  
  const [docSearch, setDocSearch] = useState("");
  const [showDocDropdown, setShowDocDropdown] = useState(false);

  const creatorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const paletteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotes();
    loadSystemData();
  }, []);

  const loadSystemData = async () => {
    try {
      const p = await getPersons();
      setSystemPersons(p || []);
      const i = await getInvoices();
      setSystemInvoices((i as any) || []);
    } catch(e) {
      console.error(e);
    }
  };

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const data = await getPersonalNotes();
      const sorted = (data || []).sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setNotes(sorted);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Creator save logic
      if (creatorRef.current && !creatorRef.current.contains(e.target as Node)) {
        if (isExpanded && !editingNote && !activePalette) {
          handleSaveNewNote();
        }
      }
      
      // Close active palette if clicked outside
      if (activePalette) {
          // Find if the click is inside a palette toggle button or popup
          const target = e.target as HTMLElement;
          if (!target.closest('.palette-container')) {
              setActivePalette(null);
          }
      }

      // Close dropdowns
      const target = e.target as HTMLElement;
      if (!target.closest('.person-search-container')) {
          setShowPersonDropdown(false);
      }
      if (!target.closest('.doc-search-container')) {
          setShowDocDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isExpanded, newTitle, newContent, newColor, editingNote, activePalette]);

  const addHistoryRecord = (note: PersonalNote, action: string, details?: string) => {
    const historyItem: NoteHistory = {
      date: new Date().toISOString(),
      action,
      details
    };
    return [...(note.history || []), historyItem];
  };

  const handleSaveNewNote = async () => {
    if (!newTitle.trim() && !newContent.trim()) {
      setIsExpanded(false);
      setNewColor("default");
      return;
    }

    const note: PersonalNote = {
      id: Math.random().toString(36).substr(2, 9),
      title: newTitle,
      content: newContent,
      color: newColor,
      isPinned: false,
      isArchived: false,
      tags: [],
      images: [],
      linkedPersons: [],
      linkedDocs: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      history: [{ date: new Date().toISOString(), action: 'ایجاد یادداشت' }]
    };

    setNotes([note, ...notes]);
    setIsExpanded(false);
    setNewTitle("");
    setNewContent("");
    setNewColor("default");

    try {
      await appendPersonalNote(note);
    } catch (e) {
      console.error(e);
      await savePersonalNotes([note, ...notes]);
    }
  };

  const handleUpdateNote = async (id: string, updates: Partial<PersonalNote>, actionDesc?: string) => {
    const noteToUpdate = notes.find(n => n.id === id);
    if (!noteToUpdate) return;
    
    let history = noteToUpdate.history || [];
    if (actionDesc) {
      history = [...history, { date: new Date().toISOString(), action: actionDesc }];
    } else if (Object.keys(updates).length > 0 && !updates.isPinned && !updates.isArchived) {
      history = [...history, { date: new Date().toISOString(), action: 'ویرایش یادداشت' }];
    }

    const updatedNote = { ...noteToUpdate, ...updates, history, updatedAt: new Date().toISOString() };
    const updatedNotes = notes.map(n => n.id === id ? updatedNote : n);
    setNotes(updatedNotes);
    if (editingNote && editingNote.id === id) {
       setEditingNote(updatedNote);
    }
    
    try {
      await updatePersonalNote(id, updatedNote);
    } catch (e) {
       await savePersonalNotes(updatedNotes);
    }
  };

  const handleDeleteNote = async (id: string) => {
    const updatedNotes = notes.filter(n => n.id !== id);
    setNotes(updatedNotes);
    if (editingNote && editingNote.id === id) {
        setEditingNote(null);
    }
    try {
      await deletePersonalNote(id);
    } catch(e) {
      await savePersonalNotes(updatedNotes);
    }
  };

  const handleCloseEditModal = () => {
    setEditingNote(null);
    setActivePalette(null);
    setPersonSearch("");
    setDocSearch("");
  };

  useEffect(() => {
    if (editingNote) {
      const timeoutId = setTimeout(() => {
        const currentInState = notes.find(n => n.id === editingNote.id);
        if (currentInState && (currentInState.title !== editingNote.title || currentInState.content !== editingNote.content || currentInState.color !== editingNote.color || currentInState.reminderDate !== editingNote.reminderDate)) {
           handleUpdateNote(editingNote.id, {
             title: editingNote.title,
             content: editingNote.content,
             color: editingNote.color,
             reminderDate: editingNote.reminderDate
           });
        }
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [editingNote?.title, editingNote?.content, editingNote?.color, editingNote?.reminderDate]);

  const getColorClass = (colorId?: string) => {
    const color = NOTE_COLORS.find(c => c.id === (colorId || 'default')) || NOTE_COLORS[0];
    return `${color.bg} ${color.border}`;
  };

  const filteredNotes = notes.filter(n => {
    const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) || n.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesArchive = showArchived ? n.isArchived : !n.isArchived;
    return matchesSearch && matchesArchive;
  });

  const pinnedNotes = filteredNotes.filter(n => n.isPinned);
  const otherNotes = filteredNotes.filter(n => !n.isPinned);
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean) => {
     const file = e.target.files?.[0];
     if (file) {
         const reader = new FileReader();
         reader.onload = (event) => {
             const result = event.target?.result as string;
             if (isEdit && editingNote) {
                 const newImages = [...(editingNote.images || []), result];
                 setEditingNote({...editingNote, images: newImages});
                 handleUpdateNote(editingNote.id, { images: newImages }, 'افزودن تصویر');
             }
         };
         reader.readAsDataURL(file);
     }
  };

  const filteredPersons = systemPersons.filter(p => p.name.includes(personSearch) || p.phone.includes(personSearch)).slice(0, 5);
  const filteredInvoices = systemInvoices.filter(inv => inv.invoiceNumber.includes(docSearch)).slice(0, 5);

  const NoteCard = ({ note }: { note: PersonalNote }) => (
    <div 
      className={`relative group rounded-xl border p-4 mb-4 break-inside-avoid cursor-pointer transition-all hover:shadow-md ${getColorClass(note.color)}`}
      onClick={() => setEditingNote(note)}
    >
      <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1 z-10" onClick={e => e.stopPropagation()}>
         <button 
           onClick={() => handleUpdateNote(note.id, { isPinned: !note.isPinned }, note.isPinned ? 'برداشتن سنجاق' : 'سنجاق کردن')}
           className={`p-1.5 rounded-full hover:bg-black/5 transition-colors ${note.isPinned ? 'text-indigo-600 opacity-100' : 'text-slate-500'}`}
           title={note.isPinned ? "برداشتن سنجاق" : "سنجاق کردن"}
         >
           <Pin className="w-4 h-4" fill={note.isPinned ? "currentColor" : "none"} />
         </button>
      </div>

      {note.images && note.images.length > 0 && (
          <div className="mb-3 rounded-lg overflow-hidden flex gap-1 h-24">
              {note.images.slice(0, 2).map((img, idx) => (
                  <img key={idx} src={img} className="object-cover w-full h-full" alt="note" />
              ))}
              {note.images.length > 2 && (
                  <div className="w-12 flex-shrink-0 bg-black/10 flex items-center justify-center text-xs font-bold">
                      +{note.images.length - 2}
                  </div>
              )}
          </div>
      )}

      {note.title && (
        <h3 className="font-bold text-slate-800 mb-2 whitespace-pre-wrap pl-6 text-sm">{note.title}</h3>
      )}
      {note.content && (
        <p className="text-slate-600 text-sm whitespace-pre-wrap leading-relaxed pb-6 line-clamp-10">{note.content}</p>
      )}
      
      {(note.linkedPersons?.length || note.linkedDocs?.length || note.reminderDate) ? (
          <div className="flex flex-wrap gap-2 mb-6 mt-2">
              {note.reminderDate && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px] font-bold">
                      <Bell className="w-3 h-3" /> {new Date(note.reminderDate).toLocaleDateString("fa-IR")}
                  </span>
              )}
              {note.linkedPersons?.map((p, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px] font-bold">
                      <User className="w-3 h-3" /> {p}
                  </span>
              ))}
              {note.linkedDocs?.map((d, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                      <FileText className="w-3 h-3" /> {d}
                  </span>
              ))}
          </div>
      ) : null}

      <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
         <div className="flex items-center gap-1">
            <div className="relative palette-container">
                <button 
                    onClick={() => setActivePalette(activePalette === note.id ? null : note.id)}
                    className={`p-1.5 rounded-full hover:bg-black/5 transition-colors ${activePalette === note.id ? 'text-indigo-600 bg-indigo-50' : 'text-slate-500'}`}
                >
                    <Palette className="w-4 h-4" />
                </button>
                {activePalette === note.id && (
                    <div className="absolute bottom-full right-0 mb-1 flex flex-wrap gap-1 bg-white border border-slate-200 p-2 rounded-xl shadow-xl w-48 z-20">
                        {NOTE_COLORS.map(c => (
                            <div 
                                key={c.id} 
                                onClick={() => {
                                    handleUpdateNote(note.id, { color: c.id }, 'تغییر رنگ');
                                    setActivePalette(null);
                                }}
                                className={`w-6 h-6 rounded-full cursor-pointer border hover:scale-110 transition-transform ${c.bg} ${c.border} ${note.color === c.id ? 'ring-2 ring-indigo-500 ring-offset-1' : ''}`}
                                title={c.name}
                            />
                        ))}
                    </div>
                )}
            </div>
            <button 
                onClick={() => handleUpdateNote(note.id, { isArchived: !note.isArchived }, note.isArchived ? 'خروج از بایگانی' : 'بایگانی یادداشت')}
                className="p-1.5 rounded-full hover:bg-black/5 text-slate-500 transition-colors"
                title={note.isArchived ? "خروج از بایگانی" : "بایگانی"}
            >
                <Archive className="w-4 h-4" />
            </button>
            <button 
                onClick={() => handleDeleteNote(note.id)}
                className="p-1.5 rounded-full hover:bg-red-100 text-slate-500 hover:text-red-600 transition-colors"
                title="حذف یادداشت"
            >
                <Trash2 className="w-4 h-4" />
            </button>
         </div>
         <span className="text-[10px] text-slate-400 font-sans">
             {new Date(note.updatedAt).toLocaleDateString("fa-IR")}
         </span>
      </div>
    </div>
  );

  return (
    <div className="h-[calc(100vh-80px)] overflow-y-auto bg-white" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex items-center justify-between">
         <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
                 <CheckSquare className="w-5 h-5" />
             </div>
             <div>
                 <h1 className="font-black text-lg text-slate-800">یادداشت‌های شخصی</h1>
                 <p className="text-xs text-slate-500 font-bold">فضای کاری و ثبت ایده‌ها</p>
             </div>
         </div>
         <div className="flex items-center gap-4">
             <button
                onClick={() => setShowArchived(!showArchived)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${showArchived ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
             >
                 <Archive className="w-4 h-4" />
                 {showArchived ? "مشاهده یادداشت‌های فعال" : "بایگانی"}
             </button>
             <div className="relative w-full max-w-md">
                 <Search className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                 <input 
                     type="text" 
                     placeholder="جستجو در یادداشت‌ها..."
                     value={searchQuery}
                     onChange={e => setSearchQuery(e.target.value)}
                     className="w-full bg-slate-100 border-none rounded-xl py-2.5 pr-10 pl-4 text-sm focus:ring-2 focus:ring-amber-500 font-medium"
                 />
             </div>
         </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto">
          {/* Note Creator */}
          {!showArchived && (
              <div className="max-w-2xl mx-auto mb-10 relative z-20">
                  <div 
                      ref={creatorRef}
                      className={`rounded-2xl transition-all overflow-hidden ${getColorClass(newColor)} ${isExpanded ? 'border shadow-xl' : 'border border-slate-200 hover:shadow-lg'}`}
                  >
                      {isExpanded && (
                          <input
                              type="text"
                              placeholder="عنوان یادداشت..."
                              value={newTitle}
                              onChange={e => setNewTitle(e.target.value)}
                              className="w-full px-5 pt-4 pb-2 text-base font-bold text-slate-800 outline-none bg-transparent"
                          />
                      )}
                      <textarea
                          placeholder={isExpanded ? "یادداشت خود را بنویسید..." : "یک یادداشت جدید ثبت کنید..."}
                          value={newContent}
                          onChange={e => setNewContent(e.target.value)}
                          onFocus={() => setIsExpanded(true)}
                          className={`w-full px-5 py-3 text-sm text-slate-700 outline-none resize-none overflow-hidden min-h-[50px] transition-all bg-transparent ${isExpanded ? 'min-h-[120px]' : ''}`}
                      />
                      
                      {isExpanded && (
                          <div className="flex items-center justify-between px-3 py-2 border-t border-black/5 bg-transparent">
                              <div className="flex items-center gap-1">
                                 <div className="relative palette-container">
                                    <button 
                                        onClick={() => setActivePalette(activePalette === 'new' ? null : 'new')}
                                        className={`p-2 rounded-full hover:bg-black/5 transition-colors ${activePalette === 'new' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-500'}`}
                                    >
                                        <Palette className="w-4 h-4" />
                                    </button>
                                    {activePalette === 'new' && (
                                        <div className="absolute top-full right-0 mt-1 flex flex-wrap gap-1 bg-white border border-slate-200 p-2 rounded-xl shadow-xl w-48 z-20">
                                            {NOTE_COLORS.map(c => (
                                                <div 
                                                    key={c.id} 
                                                    onClick={() => {
                                                        setNewColor(c.id);
                                                        setActivePalette(null);
                                                    }}
                                                    className={`w-6 h-6 rounded-full cursor-pointer border hover:scale-110 transition-transform ${c.bg} ${c.border} ${newColor === c.id ? 'ring-2 ring-indigo-500 ring-offset-1' : ''}`}
                                                    title={c.name}
                                                />
                                            ))}
                                        </div>
                                    )}
                                 </div>
                              </div>
                              <button 
                                  onClick={handleSaveNewNote}
                                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-colors"
                              >
                                  بستن و ذخیره
                              </button>
                          </div>
                      )}
                  </div>
              </div>
          )}

          {/* Notes Grid */}
          {pinnedNotes.length > 0 && (
              <div className="mb-8">
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-4 px-2 flex items-center gap-2">
                      <Pin className="w-3 h-3" /> سنجاق شده‌ها
                  </h3>
                  <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4">
                      {pinnedNotes.map(note => <NoteCard key={note.id} note={note} />)}
                  </div>
              </div>
          )}

          {otherNotes.length > 0 && (
              <div>
                  {pinnedNotes.length > 0 && !showArchived && (
                      <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-4 px-2">
                          سایر یادداشت‌ها
                      </h3>
                  )}
                  <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4">
                      {otherNotes.map(note => <NoteCard key={note.id} note={note} />)}
                  </div>
              </div>
          )}

          {!loading && notes.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 opacity-40">
                  <CheckSquare className="w-24 h-24 text-slate-300 mb-6" />
                  <h3 className="text-xl font-black text-slate-500">یادداشتی ثبت نشده است</h3>
              </div>
          )}
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
          {editingNote && (
              <>
                  <motion.div 
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }} 
                      exit={{ opacity: 0 }} 
                      className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                      onClick={handleCloseEditModal}
                  />
                  <motion.div 
                      initial={{ opacity: 0, scale: 0.95, y: 20 }} 
                      animate={{ opacity: 1, scale: 1, y: 0 }} 
                      exit={{ opacity: 0, scale: 0.95, y: 20 }}
                      className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl rounded-2xl shadow-2xl z-50 flex max-h-[85vh] min-h-[500px] ${getColorClass(editingNote.color)}`}
                  >
                      <div className="flex-1 flex flex-col min-w-[500px]">
                          <input
                              type="text"
                              value={editingNote.title}
                              onChange={e => setEditingNote({...editingNote, title: e.target.value})}
                              placeholder="عنوان"
                              className="w-full bg-transparent px-6 py-5 text-xl font-bold text-slate-800 outline-none border-b border-black/5"
                          />
                          <div className="flex-1 overflow-y-auto custom-scrollbar">
                              <textarea
                                  value={editingNote.content}
                                  onChange={e => setEditingNote({...editingNote, content: e.target.value})}
                                  placeholder="یادداشت خود را بنویسید..."
                                  className="w-full bg-transparent px-6 py-4 text-sm text-slate-700 outline-none resize-none min-h-[300px]"
                              />
                              
                              {/* Images Section */}
                              {editingNote.images && editingNote.images.length > 0 && (
                                  <div className="px-6 pb-4">
                                      <h4 className="text-xs font-bold text-slate-500 mb-2">تصاویر پیوست</h4>
                                      <div className="flex gap-2 flex-wrap">
                                          {editingNote.images.map((img, i) => (
                                              <div key={i} className="relative group rounded-lg overflow-hidden border border-black/10 w-24 h-24">
                                                  <img src={img} className="object-cover w-full h-full" alt="attachment" />
                                                  <button 
                                                      onClick={() => {
                                                          const newImgs = editingNote.images!.filter((_, idx) => idx !== i);
                                                          setEditingNote({...editingNote, images: newImgs});
                                                          handleUpdateNote(editingNote.id, { images: newImgs }, 'حذف تصویر پیوست');
                                                      }}
                                                      className="absolute top-1 right-1 bg-white/80 p-1 rounded-full text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                                  >
                                                      <Trash2 className="w-3 h-3" />
                                                  </button>
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                              )}
                          </div>
                          
                          <div className="flex items-center justify-between px-4 py-3 bg-black/5 rounded-br-2xl">
                              <div className="flex items-center gap-2">
                                 <div className="relative palette-container">
                                    <button 
                                        onClick={() => setActivePalette(activePalette === 'edit' ? null : 'edit')}
                                        className={`p-2 rounded-full hover:bg-black/10 transition-colors ${activePalette === 'edit' ? 'bg-black/10 text-slate-800' : 'text-slate-600'}`}
                                    >
                                        <Palette className="w-5 h-5" />
                                    </button>
                                    {activePalette === 'edit' && (
                                        <div className="absolute bottom-full right-0 mb-2 flex flex-wrap gap-1 bg-white border border-slate-200 p-2 rounded-xl shadow-xl w-48 z-50">
                                            {NOTE_COLORS.map(c => (
                                                <div 
                                                    key={c.id} 
                                                    onClick={() => {
                                                        setEditingNote({...editingNote, color: c.id});
                                                        setActivePalette(null);
                                                    }}
                                                    className={`w-7 h-7 rounded-full cursor-pointer border hover:scale-110 transition-transform ${c.bg} ${c.border} ${editingNote.color === c.id ? 'ring-2 ring-indigo-500 ring-offset-1' : ''}`}
                                                    title={c.name}
                                                />
                                            ))}
                                        </div>
                                    )}
                                 </div>
                                 
                                 <button 
                                    onClick={() => editFileInputRef.current?.click()}
                                    className="p-2 rounded-full hover:bg-black/10 text-slate-600 transition-colors" title="افزودن تصویر"
                                 >
                                     <ImageIcon className="w-5 h-5" />
                                 </button>
                                 <input 
                                     type="file" 
                                     ref={editFileInputRef} 
                                     className="hidden" 
                                     accept="image/*"
                                     onChange={e => handleImageUpload(e, true)}
                                 />

                                 <button 
                                    onClick={() => handleUpdateNote(editingNote.id, { isArchived: !editingNote.isArchived }, editingNote.isArchived ? 'خروج از بایگانی' : 'بایگانی یادداشت')}
                                    className={`p-2 rounded-full hover:bg-black/10 transition-colors ${editingNote.isArchived ? 'text-indigo-600' : 'text-slate-600'}`} title="بایگانی"
                                 >
                                     <Archive className="w-5 h-5" />
                                 </button>
                                 
                                 <button 
                                    onClick={() => {
                                        handleDeleteNote(editingNote.id);
                                    }}
                                    className="p-2 rounded-full hover:bg-red-200/50 text-slate-600 hover:text-red-600 transition-colors" title="حذف"
                                 >
                                     <Trash2 className="w-5 h-5" />
                                 </button>
                              </div>
                              <button 
                                  onClick={handleCloseEditModal}
                                  className="px-6 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-bold transition-all shadow-md"
                              >
                                  بستن
                              </button>
                          </div>
                      </div>
                      
                      {/* Sidebar panel for settings */}
                      <div className="w-72 border-r border-black/10 bg-black/5 rounded-l-2xl p-4 overflow-y-auto flex flex-col gap-5 custom-scrollbar">
                          <div>
                              <h4 className="text-xs font-bold text-slate-600 mb-2 flex items-center gap-1"><Bell className="w-3 h-3" /> یادآوری (تاریخ شمسی)</h4>
                              <DatePicker
                                  calendar={persian}
                                  locale={persian_fa}
                                  format="YYYY/MM/DD HH:mm"
                                  plugins={[<TimePicker position="bottom" />]}
                                  value={editingNote.reminderDate ? new Date(editingNote.reminderDate) : null}
                                  onChange={(date: any) => {
                                      if (date) {
                                          setEditingNote({...editingNote, reminderDate: convertToGregorian(date)});
                                      } else {
                                          setEditingNote({...editingNote, reminderDate: undefined});
                                      }
                                  }}
                                  containerClassName="w-full"
                                  inputClass="w-full text-xs p-2 rounded-lg border border-black/10 bg-white/50 outline-none font-sans cursor-pointer focus:ring-2 focus:ring-indigo-500 text-center"
                                  placeholder="انتخاب تاریخ و ساعت"
                              />
                          </div>
                          
                          <div className="person-search-container relative">
                              <h4 className="text-xs font-bold text-slate-600 mb-2 flex items-center gap-1"><User className="w-3 h-3" /> ارتباط با اشخاص</h4>
                              <div className="relative mb-2">
                                  <input 
                                      type="text" 
                                      placeholder="جستجوی شخص..." 
                                      value={personSearch}
                                      onChange={e => {
                                          setPersonSearch(e.target.value);
                                          setShowPersonDropdown(true);
                                      }}
                                      onFocus={() => setShowPersonDropdown(true)}
                                      className="w-full text-xs p-2 rounded-lg border border-black/10 bg-white/50 outline-none focus:ring-2 focus:ring-indigo-500"
                                  />
                                  {showPersonDropdown && filteredPersons.length > 0 && (
                                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-40 overflow-y-auto">
                                          {filteredPersons.map(p => (
                                              <div 
                                                  key={p.id}
                                                  onClick={() => {
                                                      if (!editingNote.linkedPersons?.includes(p.name)) {
                                                          const newPersons = [...(editingNote.linkedPersons || []), p.name];
                                                          setEditingNote({...editingNote, linkedPersons: newPersons});
                                                          handleUpdateNote(editingNote.id, { linkedPersons: newPersons }, `ارتباط با شخص: ${p.name}`);
                                                      }
                                                      setPersonSearch("");
                                                      setShowPersonDropdown(false);
                                                  }}
                                                  className="p-2 text-xs hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0"
                                              >
                                                  <div className="font-bold text-slate-700">{p.name}</div>
                                                  <div className="text-[10px] text-slate-500">{p.phone}</div>
                                              </div>
                                          ))}
                                      </div>
                                  )}
                              </div>
                              <div className="flex flex-wrap gap-1">
                                  {editingNote.linkedPersons?.map((p, i) => (
                                      <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-100/50 border border-blue-200 text-blue-800 text-[10px]">
                                          {p}
                                          <X className="w-3 h-3 cursor-pointer hover:text-red-500" onClick={() => {
                                              const newPersons = editingNote.linkedPersons!.filter((_, idx) => idx !== i);
                                              setEditingNote({...editingNote, linkedPersons: newPersons});
                                              handleUpdateNote(editingNote.id, { linkedPersons: newPersons }, `حذف ارتباط شخص: ${p}`);
                                          }}/>
                                      </span>
                                  ))}
                              </div>
                          </div>
                          
                          <div className="doc-search-container relative">
                              <h4 className="text-xs font-bold text-slate-600 mb-2 flex items-center gap-1"><FileText className="w-3 h-3" /> ارتباط با اسناد (فاکتورها)</h4>
                              <div className="relative mb-2">
                                  <input 
                                      type="text" 
                                      placeholder="شماره فاکتور..." 
                                      value={docSearch}
                                      onChange={e => {
                                          setDocSearch(e.target.value);
                                          setShowDocDropdown(true);
                                      }}
                                      onFocus={() => setShowDocDropdown(true)}
                                      className="w-full text-xs p-2 rounded-lg border border-black/10 bg-white/50 outline-none focus:ring-2 focus:ring-indigo-500 font-sans text-left"
                                  />
                                  {showDocDropdown && filteredInvoices.length > 0 && (
                                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-40 overflow-y-auto">
                                          {filteredInvoices.map(inv => (
                                              <div 
                                                  key={inv.id}
                                                  onClick={() => {
                                                      if (!editingNote.linkedDocs?.includes(inv.invoiceNumber)) {
                                                          const newDocs = [...(editingNote.linkedDocs || []), inv.invoiceNumber];
                                                          setEditingNote({...editingNote, linkedDocs: newDocs});
                                                          handleUpdateNote(editingNote.id, { linkedDocs: newDocs }, `ارتباط با فاکتور: ${inv.invoiceNumber}`);
                                                      }
                                                      setDocSearch("");
                                                      setShowDocDropdown(false);
                                                  }}
                                                  className="p-2 text-xs hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0"
                                              >
                                                  <div className="font-bold text-slate-700 font-sans">{inv.invoiceNumber}</div>
                                                  <div className="text-[10px] text-slate-500">{inv.type === 'sales' ? 'فروش' : 'خرید'} - {inv.personName}</div>
                                              </div>
                                          ))}
                                      </div>
                                  )}
                              </div>
                              <div className="flex flex-wrap gap-1">
                                  {editingNote.linkedDocs?.map((d, i) => (
                                      <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-100/50 border border-emerald-200 text-emerald-800 text-[10px]">
                                          {d}
                                          <X className="w-3 h-3 cursor-pointer hover:text-red-500" onClick={() => {
                                              const newDocs = editingNote.linkedDocs!.filter((_, idx) => idx !== i);
                                              setEditingNote({...editingNote, linkedDocs: newDocs});
                                              handleUpdateNote(editingNote.id, { linkedDocs: newDocs }, `حذف ارتباط سند: ${d}`);
                                          }}/>
                                      </span>
                                  ))}
                              </div>
                          </div>
                          
                          <div className="mt-auto border-t border-black/10 pt-4">
                              <h4 className="text-xs font-bold text-slate-600 mb-2 flex items-center gap-1"><History className="w-3 h-3" /> تاریخچه تغییرات</h4>
                              <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                                  {[...(editingNote.history || [])].reverse().map((h, i) => (
                                      <div key={i} className="text-[10px] bg-white/40 p-1.5 rounded border border-white/20">
                                          <div className="font-bold text-slate-700">{h.action}</div>
                                          <div className="text-slate-500 font-sans mt-0.5" dir="ltr" style={{textAlign: "right"}}>{new Date(h.date).toLocaleString("fa-IR")}</div>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      </div>
                  </motion.div>
              </>
          )}
      </AnimatePresence>
    </div>
  );
}
