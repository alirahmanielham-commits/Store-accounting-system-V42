import React, { useMemo, useState } from 'react';
import { DndContext, DragOverlay, closestCorners, DragEndEvent, DragStartEvent, useSensors, useSensor, PointerSensor, KeyboardSensor } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toPersianDigits, getDaysRemaining } from './utils';
import { Calendar, Building2, User, CreditCard } from 'lucide-react';

import { formatDateDisplay } from '../../../utils/format';

const STATUS_COLUMNS = {
  issued: [
    { id: 'issued', title: 'در انتظار پرداخت (صادره)', color: 'bg-slate-50 border-slate-200' },
    { id: 'cashed', title: 'پاس شده', color: 'bg-emerald-50 border-emerald-200' },
    { id: 'bounced', title: 'برگشت خورده', color: 'bg-rose-50 border-rose-200' }
  ],
  received: [
    { id: 'received', title: 'نزد صندوق', color: 'bg-slate-50 border-slate-200' },
    { id: 'deposited', title: 'در جریان وصول (خوابانده)', color: 'bg-indigo-50 border-indigo-200' },
    { id: 'cashed', title: 'وصول شده', color: 'bg-emerald-50 border-emerald-200' },
    { id: 'assigned', title: 'خرج شده', color: 'bg-purple-50 border-purple-200' },
    { id: 'bounced', title: 'برگشت خورده', color: 'bg-rose-50 border-rose-200' },
    { id: 'bounced_assigned', title: 'برگشت از خرج', color: 'bg-rose-100 border-rose-300' },
    { id: 'returned', title: 'عودت داده شده', color: 'bg-gray-50 border-gray-200' }
  ]
};

function SortableCheckCard({ check, formatCurrency, persons, setViewingCheck, type, storeSettings }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: check.id, data: { check } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const daysRem = getDaysRemaining(check.dueDate);
  const isOverdue = daysRem < 0;
  const person = persons.find((p: any) => p.id === check.personId || p.id === check.payeeId || p.id === check.payerId);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => setViewingCheck({ ...check, _type: type })}
      className={`bg-white p-3 rounded-xl shadow-sm border border-slate-200 cursor-grab active:cursor-grabbing mb-3 hover:border-indigo-300 transition-colors ${isDragging ? 'opacity-50' : ''}`}
    >
      <div className="flex justify-between items-start mb-2">
        <span className="font-mono font-black text-slate-800 text-sm">{toPersianDigits(check.checkNumber)}</span>
        <span className="font-black text-slate-800">{toPersianDigits(formatCurrency(check.amount))} <span className="text-[9px] text-slate-400">{storeSettings?.currency || 'تومان'}</span></span>
      </div>
      <div className="space-y-1 mt-3">
        <div className="flex items-center gap-1.5 text-xs text-slate-600">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span className={`font-bold ${isOverdue && !['cashed', 'returned', 'bounced_assigned', 'assigned'].includes(check.status) ? 'text-rose-600' : ''}`}>{formatDateDisplay(check.dueDate, storeSettings?.calendarType)}</span>
        </div>
        {(check.bankName || check.bankAccountId) && (
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-medium truncate">{check.bankName || 'بانک مبدا'}</span>
          </div>
        )}
        {person && (
          <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-2 pt-2 border-t border-slate-50">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-bold truncate">{person.name}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function ChecksKanbanView({ checks, type, persons, onStatusChange, setViewingCheck, formatCurrency, storeSettings }: any) {
  const columns = STATUS_COLUMNS[type as 'issued' | 'received'] || [];
  const [activeCheck, setActiveCheck] = useState<any>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const getChecksByStatus = (status: string) => checks.filter((c: any) => c.status === status);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveCheck(active.data.current?.check);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCheck(null);
    if (!over) return;

    const checkId = active.id;
    const newStatus = over.id as string;
    
    // Find the check
    const check = checks.find((c: any) => c.id === checkId);
    if (!check) return;

    // Only open modal if status actually changed
    if (check.status !== newStatus) {
      onStatusChange(checkId, newStatus);
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar min-h-[60vh]">
        {columns.map(col => {
          const colChecks = getChecksByStatus(col.id);
          return (
            <div key={col.id} className={`flex-shrink-0 w-80 rounded-2xl border ${col.color} flex flex-col`}>
              <div className="p-4 border-b border-black/5 flex justify-between items-center bg-white/50 rounded-t-2xl">
                <h3 className="font-black text-sm text-slate-800">{col.title}</h3>
                <span className="bg-white text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full shadow-sm">{toPersianDigits(colChecks.length)}</span>
              </div>
              
              <div className="p-3 flex-1 overflow-y-auto">
                <SortableContext 
                  id={col.id}
                  items={colChecks.map((c: any) => c.id)} 
                  strategy={verticalListSortingStrategy}
                >
                  <div className="min-h-[100px]" ref={(node) => {
                    // Dnd-kit sortable context needs a droppable area for the entire column
                    // We use useDroppable directly if we want empty columns to be droppable
                  }}>
                    <DroppableColumn id={col.id} checks={colChecks} formatCurrency={formatCurrency} persons={persons} setViewingCheck={setViewingCheck} type={type} storeSettings={storeSettings} />
                  </div>
                </SortableContext>
              </div>
            </div>
          );
        })}
      </div>

      <DragOverlay>
        {activeCheck ? (
          <SortableCheckCard storeSettings={storeSettings}  check={activeCheck} formatCurrency={formatCurrency} persons={persons} type={type} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

import { useDroppable } from '@dnd-kit/core';

function DroppableColumn({ id, checks, formatCurrency, persons, setViewingCheck, type, storeSettings }: any) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className="min-h-[150px]">
      {checks.map((c: any) => (
        <SortableCheckCard storeSettings={storeSettings} key={c.id} check={c} formatCurrency={formatCurrency} persons={persons} setViewingCheck={setViewingCheck} type={type} />
      ))}
    </div>
  );
}
