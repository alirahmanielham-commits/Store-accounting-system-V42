import React, { useState, useEffect } from "react";
import { FileText, Plus, Pin, ArrowLeft } from "lucide-react";
import { getPersonalNotes, appendPersonalNote } from "../../services/dataService";
import { PersonalNote } from "../../types";

export function DashboardPersonalNotesWidget({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  const [notes, setNotes] = useState<PersonalNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    fetchNotes();
  }, []);

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

  const handleSave = async () => {
    if (!newTitle.trim() && !newContent.trim()) {
      setIsAdding(false);
      return;
    }

    const note: PersonalNote = {
      id: Math.random().toString(36).substr(2, 9),
      title: newTitle,
      content: newContent,
      color: "default",
      isPinned: false,
      isArchived: false,
      tags: [],
      images: [],
      linkedPersons: [],
      linkedDocs: [],
      history: [{ date: new Date().toISOString(), action: 'ایجاد یادداشت از داشبورد' }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setNotes([note, ...notes]);
    setIsAdding(false);
    setNewTitle("");
    setNewContent("");

    try {
      await appendPersonalNote(note);
    } catch (e) {
      console.error(e);
    }
  };

  const NOTE_COLORS: Record<string, string> = {
    default: 'bg-slate-50 border-slate-200',
    red: 'bg-red-50 border-red-200',
    orange: 'bg-orange-50 border-orange-200',
    amber: 'bg-amber-50 border-amber-200',
    green: 'bg-emerald-50 border-emerald-200',
    teal: 'bg-teal-50 border-teal-200',
    blue: 'bg-blue-50 border-blue-200',
    indigo: 'bg-indigo-50 border-indigo-200',
    purple: 'bg-purple-50 border-purple-200',
    pink: 'bg-pink-50 border-pink-200',
  };

  const displayNotes = notes.filter(n => !n.isArchived).slice(0, 3); // show up to 3 recent notes

  return (
    <div className="bg-white rounded-2xl p-6 h-full flex flex-col border border-slate-100 shadow-sm relative">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
        <h3 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-500" /> یادداشت‌های شخصی
        </h3>
        <button 
          onClick={() => setActiveTab("personal_notes")}
          className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-bold transition-colors"
        >
          مدیریت <ArrowLeft className="w-3 h-3" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar">
        {isAdding && (
          <div className="border border-indigo-200 bg-indigo-50/30 rounded-xl p-3 mb-3">
             <input
                type="text"
                placeholder="عنوان (اختیاری)"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                className="w-full bg-transparent font-bold text-sm text-slate-800 outline-none mb-2 placeholder:text-slate-400"
             />
             <textarea
                placeholder="یادداشت..."
                value={newContent}
                onChange={e => setNewContent(e.target.value)}
                className="w-full bg-transparent text-xs text-slate-700 outline-none resize-none min-h-[60px] placeholder:text-slate-400"
             />
             <div className="flex justify-end gap-2 mt-2">
                 <button onClick={() => setIsAdding(false)} className="px-3 py-1 text-xs text-slate-500 hover:bg-slate-200 rounded-lg transition-colors">انصراف</button>
                 <button onClick={handleSave} className="px-3 py-1 text-xs bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg transition-colors">ذخیره</button>
             </div>
          </div>
        )}

        {!loading && displayNotes.length === 0 && !isAdding && (
          <div className="text-center py-6">
             <FileText className="w-10 h-10 text-slate-200 mx-auto mb-2" />
             <p className="text-xs text-slate-500 font-bold mb-3">هیچ یادداشتی ندارید</p>
          </div>
        )}

        {displayNotes.map(note => {
          const colorClass = NOTE_COLORS[note.color || 'default'] || NOTE_COLORS['default'];
          return (
            <div key={note.id} onClick={() => setActiveTab("personal_notes")} className={`p-3 rounded-xl border cursor-pointer hover:shadow-md transition-shadow group relative overflow-hidden ${colorClass}`}>
              {note.isPinned && <Pin className="w-3 h-3 text-indigo-500 absolute top-2 left-2" />}
              {note.title && <h4 className="font-bold text-sm text-slate-800 mb-1 pl-4 truncate">{note.title}</h4>}
              {note.content && <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{note.content}</p>}
            </div>
          );
        })}
      </div>
      
      {!isAdding && (
        <button 
          onClick={() => setIsAdding(true)}
          className="mt-4 w-full flex items-center justify-center gap-2 py-2 border border-dashed border-indigo-200 text-indigo-600 hover:bg-indigo-50 rounded-xl text-xs font-bold transition-colors"
        >
          <Plus className="w-4 h-4" /> یادداشت جدید
        </button>
      )}
    </div>
  );
}
