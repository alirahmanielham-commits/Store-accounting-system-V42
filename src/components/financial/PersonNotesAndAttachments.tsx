import React, { useState, useRef } from 'react';
import { Save, Plus, FileText, Download, Trash2, Paperclip, File, Image as ImageIcon } from 'lucide-react';
import { Person } from '../../types';
import { updatePerson } from '../../services/dataService';

export default function PersonNotesAndAttachments({
  person,
  onDataChange,
  showNotification
}: {
  person: Person;
  onDataChange: () => void;
  showNotification: (msg: string, type?: 'success' | 'error') => void;
}) {
  const [notes, setNotes] = useState(person.additionalNotes || '');
  const [attachments, setAttachments] = useState<{name: string, url: string, size?: number, type?: string}[]>(person.attachments || []);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setNotes(person.additionalNotes || '');
    setAttachments(person.attachments || []);
  }, [person]);

  const handleSaveNotes = async () => {
    setIsSaving(true);
    try {
      await updatePerson(person.id.toString(), {
        ...person,
        additionalNotes: notes,
        attachments: attachments
      });
      showNotification('تغییرات با موفقیت ذخیره شد', 'success');
      onDataChange();
    } catch (e: any) {
      showNotification(e.message || 'خطا در ذخیره تغییرات', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target && event.target.result) {
          const newAttachments = [
            ...attachments,
            {
              name: file.name,
              url: event.target.result as string,
              size: file.size,
              type: file.type
            }
          ];
          setAttachments(newAttachments);
          // Optional: immediately save when file is added
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const removeAttachment = (index: number) => {
    const newAttachments = [...attachments];
    newAttachments.splice(index, 1);
    setAttachments(newAttachments);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'نامشخص';
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x md:divide-x-reverse print:hidden">
      
      {/* Notes Section */}
      <div className="flex-1 p-6 flex flex-col min-h-[400px]">
        <h3 className="font-extrabold text-gray-800 flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-indigo-500" />
          یادداشت‌های اختصاصی شخص
        </h3>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="هرگونه یادداشت، توافقات، شرایط پرداخت، یا سوابق پیگیری را اینجا بنویسید..."
          className="w-full flex-1 p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 text-gray-700 resize-none leading-relaxed"
        ></textarea>
        
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleSaveNotes}
            disabled={isSaving}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors flex items-center gap-2 disabled:opacity-70"
          >
            {isSaving ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin block"></span>
            ) : (
              <Save className="w-4 h-4" />
            )}
            ذخیره تغییرات
          </button>
        </div>
      </div>

      {/* Attachments Section */}
      <div className="w-full md:w-80 lg:w-96 p-6 bg-gray-50/30 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-extrabold text-gray-800 flex items-center gap-2">
            <Paperclip className="w-5 h-5 text-emerald-500" />
            فایل‌های ضمیمه
          </h3>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center hover:bg-emerald-200 transition-colors"
            title="افزودن فایل جدید"
          >
            <Plus className="w-4 h-4" />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {attachments.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm flex flex-col items-center">
              <File className="w-10 h-10 text-gray-200 mb-2" />
              هیچ فایلی ضمیمه نشده است
            </div>
          ) : (
            attachments.map((file, i) => (
              <div key={i} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3 group">
                <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                  {file.type?.startsWith('image/') ? (
                    <ImageIcon className="w-5 h-5 text-sky-500" />
                  ) : (
                    <File className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-gray-700 text-sm truncate" title={file.name} dir="ltr" style={{textAlign: 'right'}}>{file.name}</div>
                  <div className="text-[10px] text-gray-400 font-sans mt-0.5" dir="ltr" style={{textAlign: 'right'}}>{formatFileSize(file.size)}</div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a
                    href={file.url}
                    download={file.name}
                    className="w-7 h-7 rounded-lg bg-gray-50 text-gray-500 flex items-center justify-center hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                    title="دانلود"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={() => removeAttachment(i)}
                    className="w-7 h-7 rounded-lg bg-gray-50 text-gray-500 flex items-center justify-center hover:bg-rose-50 hover:text-rose-600 transition-colors"
                    title="حذف"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
