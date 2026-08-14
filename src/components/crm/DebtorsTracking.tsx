import React, { useState, useEffect } from 'react';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Trash2, Plus, X, Search, Phone, User, Calendar, Save, ListFilter, UserPlus, Users, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getDebtorsTrackings, saveDebtorsTrackings, getCrmColumns, saveCrmColumns } from '../../services/dataService';
import CustomDatePicker from '../ui/CustomDatePicker';
import DatePickerModule from 'react-multi-date-picker';
const DatePicker = CustomDatePicker;
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';



function SortableItem(props: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: props.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {props.children}

    </div>
  );
}

function DroppableColumn({ id, items, children, className }: any) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={className}>
      <SortableContext items={items.map((i: any) => i.id)} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </div>
  );
}


export default function DebtorsTracking({ persons, showNotification, storeSettings, confirmAction }: any) {
  const [columns, setColumns] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [activeId, setActiveId] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isColumnsModalOpen, setIsColumnsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  
  const [addMode, setAddMode] = useState<'single' | 'group'>('single');
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [selectedGroupRole, setSelectedGroupRole] = useState('all');
  
  const [newNote, setNewNote] = useState('');
  const [newNextDate, setNewNextDate] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');
  
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const dataItems = await getDebtorsTrackings();
      setItems(dataItems || []);
      const cols = await getCrmColumns();
      setColumns(cols || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveColumns = async (newCols: any[]) => {
    setColumns(newCols);
    await saveCrmColumns(newCols);
  };

  const handleAddColumn = () => {
    if (!newColumnTitle.trim()) return;
    const newCol = {
      id: 'col_' + Date.now(),
      title: newColumnTitle.trim(),
      color: 'bg-gray-50',
      borderColor: 'border-gray-200',
      titleColor: 'text-gray-700'
    };
    handleSaveColumns([...columns, newCol]);
    setNewColumnTitle('');
  };

  const handleDeleteColumn = (id: string) => {
    if (items.some(item => item.status === id)) {
      showNotification('ابتدا موارد داخل این ستون را جابجا کنید', 'error');
      return;
    }
    confirmAction('آیا از حذف این ستون مطمئن هستید؟', () => {
      handleSaveColumns(columns.filter(c => c.id !== id));
    });
  };

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragOver = (event: any) => {
    const { active, over } = event;
    if (!over) return;
    const activeId = active.id;
    const overId = over.id;
    if (activeId === overId) return;

    const activeContainer = items.find(i => i.id === activeId)?.status;
    const overContainer = columns.some(c => c.id === overId) ? overId : items.find(i => i.id === overId)?.status;

    if (!activeContainer || !overContainer || activeContainer === overContainer) {
      return;
    }

    setItems((prev) => {
      const activeItems = prev.filter((item) => item.id !== activeId);
      const activeItem = prev.find((item) => item.id === activeId);
      if (!activeItem) return prev;
      
      let newIndex = prev.findIndex((item) => item.id === overId);
      if (columns.some(c => c.id === overId)) {
        newIndex = activeItems.length;
      }
      if (newIndex < 0) newIndex = activeItems.length;
      
      const newItems = [
        ...activeItems.slice(0, newIndex),
        { ...activeItem, status: overContainer },
        ...activeItems.slice(newIndex)
      ];
      return newItems;
    });
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;
    const activeId = active.id;
    const overId = over.id;

    const activeContainer = items.find(i => i.id === activeId)?.status;
    const overContainer = columns.some(c => c.id === overId) ? overId : items.find(i => i.id === overId)?.status;

    let newItems = [...items];
    
    if (activeContainer && overContainer && activeContainer === overContainer) {
      const oldIndex = newItems.findIndex(item => item.id === activeId);
      const newIndex = newItems.findIndex(item => item.id === overId);
      if (oldIndex !== -1 && newIndex !== -1) {
        newItems = arrayMove(newItems, oldIndex, newIndex);
        setItems(newItems);
        await saveDebtorsTrackings(newItems);
      }
    } else if (activeContainer && overContainer && activeContainer !== overContainer) {
      const oldIndex = newItems.findIndex(item => item.id === activeId);
      if (oldIndex !== -1) {
         // Revert the optimistic update since we will ask for confirmation
         const targetStatusName = columns.find(c => c.id === overContainer)?.title || '';
         const personId = newItems[oldIndex].personId;
         const person = persons.find(p => String(p.id) === personId);
         
         if (confirmAction) {
           confirmAction(`آیا از انتقال "${person?.name || person?.companyName}" به وضعیت "${targetStatusName}" مطمئن هستید؟`, async () => {
              newItems[oldIndex].status = overContainer;
              
              // Also add a note about status change
              if (!newItems[oldIndex].notes) newItems[oldIndex].notes = [];
              newItems[oldIndex].notes.push({
                text: `تغییر وضعیت به ${targetStatusName}`,
                date: new Date().toISOString()
              });
              
              setItems(newItems);
              await saveDebtorsTrackings(newItems);
           });
         } else {
             newItems[oldIndex].status = overContainer;
             setItems(newItems);
             await saveDebtorsTrackings(newItems);
         }
      }
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let toAdd: any[] = [];
    const now = Date.now();

    if (addMode === 'single') {
      if (!selectedPersonId) {
        showNotification('لطفا یک شخص را انتخاب کنید', 'error');
        return;
      }
      if (items.some(i => i.personId === selectedPersonId)) {
        showNotification('این شخص قبلاً در لیست پیگیری قرار دارد', 'error');
        return;
      }
      toAdd.push({
        id: `debtor_${now}_${selectedPersonId}`,
        personId: selectedPersonId,
        status: 'initial',
        notes: [],
        createdAt: now
      });
    } else {
      let filteredPersons = persons;
      if (selectedGroupRole !== 'all') {
        filteredPersons = (persons || []).filter((p: any) => p.role === selectedGroupRole);
      }
      
      let addedCount = 0;
      filteredPersons.forEach((p: any) => {
        if (!items.some(i => i.personId === String(p.id))) {
          toAdd.push({
            id: `debtor_${now}_${p.id}_${Math.random().toString(36).substr(2, 5)}`,
            personId: String(p.id),
            status: 'initial',
            notes: [],
            createdAt: now
          });
          addedCount++;
        }
      });
      
      if (addedCount === 0) {
        showNotification('شخص جدیدی برای افزودن یافت نشد', 'error');
        return;
      }
    }

    const newItems = [...items, ...toAdd];
    setItems(newItems);
    await saveDebtorsTrackings(newItems);
    
    setIsAddModalOpen(false);
    setSelectedPersonId('');
    showNotification('با موفقیت به لیست پیگیری اضافه شد', 'success');
  };

  const handleSaveNote = async () => {
    if (!newNote && !newNextDate) return;
    
    const newItems = (items || []).map(item => {
      if (item.id === selectedItem.id) {
        const notes = item.notes || [];
        return {
          ...item,
          nextActionDate: newNextDate || item.nextActionDate,
          notes: [...notes, { date: Date.now(), text: newNote }]
        };
      }
      return item;
    });

    setItems(newItems);
    setSelectedItem(newItems.find(i => i.id === selectedItem.id));
    await saveDebtorsTrackings(newItems);
    
    setNewNote('');
    setNewNextDate('');
    showNotification('یادداشت با موفقیت ثبت شد', 'success');
  };

  const handleRemoveItem = async (id: string) => {
    if (!window.confirm('آیا از حذف این مورد اطمینان دارید؟')) return;
    const newItems = (items || []).filter(i => i.id !== id);
    setItems(newItems);
    await saveDebtorsTrackings(newItems);
    setIsNoteModalOpen(false);
    showNotification('حذف شد', 'success');
  };

  const filteredItems = (items || []).filter(item => {
    const person = persons.find((p: any) => String(p.id) === item.personId);
    const name = person ? (person.name || person.companyName || '') : '';
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-80">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="جستجوی شخص..."
              className="w-full pr-10 pl-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          افزودن به لیست پیگیری
        </button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar min-h-[500px]">
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          {columns.map(column => {
            const columnItems = filteredItems.filter(item => item.status === column.id);
            return (
              <div key={column.id} className={`flex-shrink-0 w-80 rounded-2xl border ${column.borderColor} ${column.color} flex flex-col max-h-[700px]`}>
                <div className={`p-4 border-b ${column.borderColor} flex items-center justify-between`}>
                  <h3 className={`font-black text-sm ${column.titleColor}`}>{column.title}</h3>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-white/50 ${column.titleColor}`}>
                    {columnItems.length}
                  </span>
                </div>
                
                <DroppableColumn id={column.id} items={columnItems} className="p-3 flex-1 overflow-y-auto space-y-3 custom-scrollbar min-h-[150px]">
                    {columnItems.map(item => {
                      const person = persons.find((p: any) => String(p.id) === item.personId);
                      const lastNote = item.notes && item.notes.length > 0 ? item.notes[item.notes.length - 1] : null;
                      
                      return (
                        <SortableItem key={item.id} id={item.id}>
                          <div 
                            onClick={() => { setSelectedItem(item); setIsNoteModalOpen(true); }}
                            className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-indigo-200 transition-all cursor-grab active:cursor-grabbing group"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                                  <User className="w-4 h-4" />
                                </div>
                                <div>
                                  <h4 className="font-bold text-sm text-gray-800">{person?.name || person?.companyName || 'نامشخص'}</h4>
                                  <p className="text-[10px] text-gray-500 font-medium mt-0.5">{person?.role === 'customer' ? 'مشتری' : person?.role === 'supplier' ? 'تامین‌کننده' : 'شخص'}</p>
                                </div>
                              </div>
                            </div>
                            
                            {item.nextActionDate && (
                              <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg mt-2 w-fit">
                                <Calendar className="w-3 h-3" />
                                اقدام بعدی: <span className="font-sans">{storeSettings?.calendarType === 'gregorian' ? new Date(item.nextActionDate).toLocaleDateString('en-US') : new Date(item.nextActionDate).toLocaleDateString('fa-IR')}</span>
                              </div>
                            )}

                            {lastNote && lastNote.text && (
                              <p className="text-xs text-gray-600 mt-3 line-clamp-2 leading-relaxed bg-gray-50 p-2 rounded-lg border border-gray-100">
                                {lastNote.text}
                              </p>
                            )}
                          </div>
                        </SortableItem>
                      );
                    })}
                  </DroppableColumn>
              </div>
            );
          })}
          
          <DragOverlay>
            {activeId ? (
              <div className="bg-white p-4 rounded-xl shadow-xl border border-indigo-200 opacity-90 scale-105 rotate-2 w-80 cursor-grabbing">
                <div className="font-bold text-sm text-gray-800 flex items-center gap-2">
                   <User className="w-4 h-4 text-indigo-500" />
                   در حال جابجایی...
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddModalOpen(false)} className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-black text-gray-900 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-indigo-500" /> افزودن به لیست پیگیری
                </h3>
                <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
              </div>
              
              <div className="p-5">
                <div className="flex gap-2 mb-5 p-1 bg-gray-100 rounded-xl">
                  <button onClick={() => setAddMode('single')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${addMode === 'single' ? 'bg-white shadow text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}>انتخاب تکی</button>
                  <button onClick={() => setAddMode('group')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${addMode === 'group' ? 'bg-white shadow text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}>افزودن گروهی (فیلتر)</button>
                </div>

                <form onSubmit={handleAddSubmit} className="space-y-4">
                  {addMode === 'single' ? (
                    <div>
                      <label className="block text-xs font-black text-gray-700 mb-1.5">انتخاب شخص</label>
                      <select required value={selectedPersonId} onChange={e => setSelectedPersonId(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:ring-2 focus:ring-indigo-500/20 outline-none">
                        <option value="">-- انتخاب کنید --</option>
                        {(persons || []).map((p: any) => (
                           <option key={p.id} value={p.id}>{p.name || p.companyName}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-black text-gray-700 mb-1.5">گروه اشخاص</label>
                      <select required value={selectedGroupRole} onChange={e => setSelectedGroupRole(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:ring-2 focus:ring-indigo-500/20 outline-none">
                        <option value="all">همه اشخاص</option>
                        <option value="customer">فقط مشتریان</option>
                        <option value="supplier">فقط تامین‌کنندگان</option>
                      </select>
                      <p className="text-[10px] text-gray-500 mt-2 flex items-center gap-1"><Users className="w-3 h-3"/> تمامی افراد گروه انتخاب شده که در لیست نیستند اضافه خواهند شد.</p>
                    </div>
                  )}
                  
                  <div className="pt-4 border-t border-gray-100">
                    <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-sm transition-colors">
                      افزودن به لیست پیگیری
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Note Modal */}
      <AnimatePresence>
        {isNoteModalOpen && selectedItem && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsNoteModalOpen(false)} className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <h3 className="font-black text-gray-900 flex items-center gap-2">
                  <ListFilter className="w-5 h-5 text-indigo-500" /> سوابق پیگیری
                </h3>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleRemoveItem(selectedItem.id)} className="text-xs font-bold text-rose-600 bg-rose-50 px-3 py-1.5 rounded-lg hover:bg-rose-100 transition-colors">حذف از لیست</button>
                  <button onClick={() => setIsNoteModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                </div>
              </div>
              
              <div className="p-5 overflow-y-auto flex-1 space-y-5">
                <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-gray-900">
                       {persons.find((p: any) => String(p.id) === selectedItem.personId)?.name || 'نامشخص'}
                    </h4>
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded mt-1 inline-block">
                      {columns.find(c => c.id === selectedItem.status)?.title || selectedItem.status}
                    </span>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-black text-gray-800 mb-3 flex items-center gap-2 border-b pb-2"><Calendar className="w-4 h-4 text-gray-400"/> تاریخچه یادداشت‌ها</h4>
                  <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                    {(!selectedItem.notes || selectedItem.notes.length === 0) ? (
                      <p className="text-xs text-gray-500 text-center py-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">هنوز یادداشتی ثبت نشده است</p>
                    ) : (
                      selectedItem.notes.map((note: any, idx: number) => (
                        <div key={idx} className="bg-gray-50 p-3 rounded-xl border border-gray-100 relative">
                           <span className="absolute left-3 top-3 text-[9px] font-bold text-gray-400 font-sans">
                             {storeSettings?.calendarType === 'gregorian' ? new Date(note.date).toLocaleDateString('en-US') : new Date(note.date).toLocaleDateString('fa-IR')}
                           </span>
                           <p className="text-xs text-gray-700 leading-relaxed pl-16 whitespace-pre-wrap">{note.text}</p>
                        </div>
                      )).reverse()
                    )}
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                  <div>
                    <label className="block text-xs font-black text-gray-700 mb-1.5">ثبت یادداشت جدید</label>
                    <textarea 
                      value={newNote}
                      onChange={e => setNewNote(e.target.value)}
                      rows={2}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none resize-none"
                      placeholder="نتیجه تماس یا توافقات..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-700 mb-1.5">تاریخ اقدام بعدی (اختیاری)</label>
                    <DatePicker
                      value={newNextDate ? new Date(newNextDate) : null}
                      onChange={(date: any) => {
                          if (date) {
                              const d = new Date(date.toDate());
                              const localDate = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
                              setNewNextDate(localDate.toISOString().split('T')[0]);
                          } else {
                              setNewNextDate('');
                          }
                      }}
                      calendar={storeSettings?.calendarType === "gregorian" ? undefined : persian}
                      locale={storeSettings?.calendarType === "gregorian" ? undefined : persian_fa}
                      containerClassName="w-full"
                      inputClass="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none font-sans"
                    />
                  </div>
                  <button 
                    onClick={handleSaveNote}
                    disabled={!newNote && !newNextDate}
                    className="w-full py-2.5 bg-black hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" /> ذخیره یادداشت
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isColumnsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsColumnsModalOpen(false)} className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <h3 className="font-black text-gray-900 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-indigo-500" /> مدیریت وضعیت‌های پیگیری
                </h3>
                <button onClick={() => setIsColumnsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
              </div>
              
              <div className="p-5 space-y-4">
                <div className="flex gap-2">
                   <input 
                      type="text" 
                      value={newColumnTitle}
                      onChange={e => setNewColumnTitle(e.target.value)}
                      placeholder="عنوان وضعیت جدید..."
                      className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm bg-gray-50 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                   />
                   <button 
                      onClick={handleAddColumn}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-colors whitespace-nowrap"
                   >
                      افزودن وضعیت
                   </button>
                </div>
                
                <div className="space-y-2 mt-4 max-h-64 overflow-y-auto">
                   {columns.map(c => (
                     <div key={c.id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-xl">
                        <span className="text-sm font-bold text-gray-800">{c.title}</span>
                        <button onClick={() => handleDeleteColumn(c.id)} className="text-rose-500 hover:text-rose-700 p-1">
                           <Trash2 className="w-4 h-4" />
                        </button>
                     </div>
                   ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}