import DateObject from "react-date-object";
import persian from "react-date-object/calendars/persian";

export const toPersianDigits = (str: string | number | undefined | null) => {
  if (str === null || str === undefined) return '';
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return str.toString().replace(/\d/g, x => persianDigits[parseInt(x, 10)]);
};

export const getDaysRemaining = (dueDate: string) => {
  if (!dueDate) return 0;
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let diff = 0;
    if (dueDate.includes('T')) {
      const due = new Date(dueDate);
      due.setHours(0, 0, 0, 0);
      diff = due.getTime() - today.getTime();
    } else {
      const todayObj = new DateObject({ calendar: persian }).set({ hour: 0, minute: 0, second: 0, millisecond: 0 });
      const dueObj = new DateObject({ date: dueDate, format: "YYYY/MM/DD", calendar: persian }).set({ hour: 0, minute: 0, second: 0, millisecond: 0 });
      diff = dueObj.toDate().getTime() - todayObj.toDate().getTime();
    }
    return Math.floor(diff / (1000 * 3600 * 24));
  } catch(e) { return 0; }
};

export const safeParseDate = (dateStr: string) => {
  if (!dateStr) return '';
  if (dateStr.includes('T')) return new Date(dateStr);
  try {
    if (dateStr.includes('/')) return new DateObject({ date: dateStr, format: "YYYY/MM/DD", calendar: persian }).toDate();
  } catch(e) {}
  return '';
};

export const normalizeDateForSort = (dateStr: any): number => {
  if (!dateStr) return 0;
  if (typeof dateStr === 'number') return dateStr;
  const raw = String(dateStr).trim();
  if (!raw) return 0;

  // Convert Persian & Arabic numbers to English
  const eng = raw
    .replace(/[۰-۹]/g, d => '0123456789'['۰۱۲۳۴۵۶۷۸۹'.indexOf(d)])
    .replace(/[٠-٩]/g, d => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)]);

  if (eng.includes('T')) {
    const t = new Date(eng).getTime();
    if (!isNaN(t)) return t;
  }

  // Parse YYYY/MM/DD or YYYY-MM-DD
  const parts = eng.split(/[/.-]/).map(p => p.trim()).filter(Boolean);
  if (parts.length >= 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);

    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      if (y >= 1300 && y < 1500) {
        try {
          const obj = new DateObject({
            date: `${y}/${m}/${d}`,
            format: "YYYY/MM/DD",
            calendar: persian
          });
          const time = obj.toDate().getTime();
          if (!isNaN(time)) return time;
        } catch (e) {
          // fallback
        }
        return y * 10000 + m * 100 + d;
      } else if (y >= 1900 && y < 2200) {
        const time = new Date(y, m - 1, d).getTime();
        if (!isNaN(time)) return time;
        return y * 10000 + m * 100 + d;
      }
      return y * 10000 + m * 100 + d;
    }
  }

  const dt = new Date(eng).getTime();
  return isNaN(dt) ? 0 : dt;
};

export const compareChecksByDueDate = (a: any, b: any, sortDir: "asc" | "desc" = "asc") => {
  const timeA = normalizeDateForSort(a?.dueDate);
  const timeB = normalizeDateForSort(b?.dueDate);

  // If one has no due date, put it at the end
  if (!timeA && timeB) return 1;
  if (timeA && !timeB) return -1;

  if (timeA !== timeB) {
    return sortDir === "asc" ? timeA - timeB : timeB - timeA;
  }

  // Secondary sort by createdAt descending
  return (Number(b?.createdAt) || 0) - (Number(a?.createdAt) || 0);
};
