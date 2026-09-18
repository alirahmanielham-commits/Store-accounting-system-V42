import React, { useState } from 'react';
import { Box, Check, X, Calculator } from 'lucide-react';
import { Product, StocktakingItem } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  item: StocktakingItem;
  onConfirm: (totalBaseQty: number, boxes: number, looseUnits: number) => void;
}

export default function StocktakingUnitModal({
  isOpen,
  onClose,
  product,
  item,
  onConfirm,
}: Props) {
  const ratio = Number(product.unitRatio || item.unitRatio || 1);
  const secUnit = product.secondaryUnit || item.secondaryUnit || 'بسته/کارتن';
  const mainUnit = product.unit || item.unit || 'عدد';

  const [boxes, setBoxes] = useState<string>(() => {
    if (item.countedBoxes !== undefined && item.countedBoxes !== null) return String(item.countedBoxes);
    if (item.countedStock !== null && ratio > 1) {
      return String(Math.floor(item.countedStock / ratio));
    }
    return '';
  });

  const [looseUnits, setLooseUnits] = useState<string>(() => {
    if (item.countedUnits !== undefined && item.countedUnits !== null) return String(item.countedUnits);
    if (item.countedStock !== null && ratio > 1) {
      return String(item.countedStock % ratio);
    }
    return item.countedStock !== null ? String(item.countedStock) : '';
  });

  if (!isOpen) return null;

  const numBoxes = Math.max(0, parseFloat(boxes) || 0);
  const numUnits = Math.max(0, parseFloat(looseUnits) || 0);
  const calculatedTotal = (numBoxes * ratio) + numUnits;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(calculatedTotal, numBoxes, numUnits);
    onClose();
  };

  const toPersian = (n: number | string) => n?.toString().replace(/\d/g, x => ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'][parseInt(x)]) || '۰';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs" dir="rtl">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-sm w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Box className="w-5 h-5 text-indigo-600" />
            <span className="font-bold text-sm text-slate-800">شمارش واحد اصلی و فرعی</span>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="text-xs text-slate-600 bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-100">
            <span className="font-bold text-slate-800 block mb-0.5">{item.productName}</span>
            <span className="text-indigo-700 font-medium">هر {secUnit} = {toPersian(ratio)} {mainUnit}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                تعداد {secUnit}
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={boxes}
                onChange={(e) => setBoxes(e.target.value)}
                autoFocus
                placeholder="۰"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center font-mono font-bold text-base focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                تعداد {mainUnit} (خرده)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={looseUnits}
                onChange={(e) => setLooseUnits(e.target.value)}
                placeholder="۰"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center font-mono font-bold text-base focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <span className="text-xs text-slate-500 block mb-1">مجموع معادل بر حسب {mainUnit}:</span>
            <span className="text-xl font-black text-indigo-700 font-mono">
              {toPersian(calculatedTotal)} {mainUnit}
            </span>
            <span className="block text-[11px] text-slate-400 mt-1 font-mono">
              ({toPersian(numBoxes)} × {toPersian(ratio)}) + {toPersian(numUnits)} = {toPersian(calculatedTotal)}
            </span>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm"
            >
              ثبت مقدار ({toPersian(calculatedTotal)})
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
