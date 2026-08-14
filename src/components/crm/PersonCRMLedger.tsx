import React, { useState, useEffect } from 'react';
import { getDebtorsTrackings, getCrmColumns } from '../../services/dataService';
import { Clock, Calendar } from 'lucide-react';

export default function PersonCRMLedger({ person, storeSettings }: any) {
  const [trackings, setTrackings] = useState<any>(null);
  const [columns, setColumns] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, [person]);

  const loadData = async () => {
    if (!person) return;
    try {
      const allTrackings = await getDebtorsTrackings();
      const personTracking = (allTrackings || []).find((t: any) => String(t.personId) === String(person.id));
      setTrackings(personTracking || null);
      
      const cols = await getCrmColumns();
      setColumns(cols || []);
    } catch (e) {
      console.error(e);
    }
  };

  if (!trackings) {
    return (
      <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-xl border border-gray-200">
        هیچ سابقه پیگیری (CRM) برای این شخص ثبت نشده است.
      </div>
    );
  }

  const currentStatus = columns.find(c => c.id === trackings.status)?.title || trackings.status;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 flex items-center justify-between">
        <div>
          <span className="text-indigo-600 font-bold text-sm">وضعیت فعلی در بورد: </span>
          <span className="text-lg font-black text-indigo-900">{currentStatus}</span>
        </div>
        {trackings.nextActionDate && (
          <div className="flex items-center gap-2 text-indigo-700 font-semibold bg-white px-4 py-2 rounded-lg shadow-sm border border-indigo-100">
            <Calendar className="w-4 h-4" />
            تاریخ پیگیری بعدی: 
            <span dir="ltr">
              {storeSettings?.calendarType === 'gregorian' 
                ? new Date(trackings.nextActionDate).toLocaleDateString('en-US') 
                : new Date(trackings.nextActionDate).toLocaleDateString('fa-IR')}
            </span>
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 font-bold text-gray-800 flex items-center gap-2">
          <Clock className="w-5 h-5 text-gray-500" />
          تاریخچه پیگیری‌ها و یادداشت‌ها
        </div>
        <div className="divide-y divide-gray-100">
          {(!trackings.notes || trackings.notes.length === 0) ? (
            <div className="p-6 text-center text-gray-400 text-sm">
              یادداشتی ثبت نشده است
            </div>
          ) : (
            trackings.notes.map((note: any, idx: number) => (
              <div key={idx} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="text-xs font-bold text-gray-500 mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                  {storeSettings?.calendarType === 'gregorian' 
                    ? new Date(note.date).toLocaleString('en-US') 
                    : new Date(note.date).toLocaleString('fa-IR')}
                </div>
                <div className="text-gray-800 text-sm leading-relaxed pr-4">
                  {note.text}
                </div>
              </div>
            )).reverse()
          )}
        </div>
      </div>
    </div>
  );
}
