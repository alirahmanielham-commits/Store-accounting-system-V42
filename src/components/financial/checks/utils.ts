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
