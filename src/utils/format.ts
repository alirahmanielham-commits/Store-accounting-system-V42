import Num2persian from 'num2persian';
import DateObjectModule from "react-date-object";
const DateObject = (DateObjectModule as any).default || DateObjectModule;
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import gregorian from "react-date-object/calendars/gregorian";
import gregorian_en from "react-date-object/locales/gregorian_en";
import { globalDateFormatter } from "./dateFormatter";


export function addCommas(num: number | string): string {
    if (!num && num !== 0 && num !== '0') return '';
    const parts = num.toString().split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
}

export function removeCommas(str: string): string {
    if (!str) return '';
    return str.toString().replace(/,/g, '');
}

export function parseNumberField(val: string): string {
    const raw = removeCommas(val);
    if (!raw) return '';
    if (isNaN(Number(raw))) return raw;
    return raw;
}

export const numberToWords = (num: string | number): string => {
    if (!num && num !== 0 && num !== '0') return '';
    const raw = num.toString().replace(/,/g, '');
    if (isNaN(Number(raw))) return '';
    
    return Num2persian(raw);
}

export const getBaseValueInToman = (cur: string) => {
  if (!cur) return 1;
  if (cur.includes('تومان')) return 1;
  if (cur.includes('ریال')) return 0.1;
  if (cur.includes('دلار') || cur.includes('USD')) return 70000;
  if (cur.includes('یورو') || cur.includes('EUR')) return 75000;
  if (cur.includes('درهم') || cur.includes('AED')) return 19000;
  return 1;
};

export const getDefaultExchangeRate = (invoiceCur: string, storeCur: string) => {
  if (invoiceCur === storeCur) return 1;
  const invToman = getBaseValueInToman(invoiceCur);
  const storeToman = getBaseValueInToman(storeCur);
  return invToman / storeToman;
};

export const showInvoiceCurrency = (c: string) => {
  if (!c) return 'تومان';
  if (c === 'IRT' || c === 'toman') return 'تومان';
  if (c === 'IRR' || c === 'rial') return 'ریال';
  if (c === 'USD' || c === 'dollar') return 'دلار';
  return c;
};

export function numToPersianWords(num: number): string {
  if (num === 0) return 'صفر';
  const yekan = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه'];
  const dahgan = ['', 'ده', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود'];
  const dahYek = ['ده', 'یازده', 'دوازده', 'سیزده', 'چهارده', 'پانزده', 'شانزده', 'هفده', 'هجده', 'نوزده'];
  const sadgan = ['', 'صد', 'دویست', 'سیصد', 'چهارصد', 'پانصد', 'ششصد', 'هفتصد', 'هشتصد', 'نهصد'];
  const steps = ['', 'هزار', 'میلیون', 'میلیارد', 'تریلیون'];

  const convertThreeDigit = (n: number): string => {
    if (n === 0) return '';
    let result = '';
    const s = Math.floor(n / 100);
    const d = Math.floor((n % 100) / 10);
    const y = n % 10;

    if (s > 0) result += sadgan[s];
    if (d > 0) {
      if (result) result += ' و ';
      if (d === 1) {
        result += dahYek[y];
        return result;
      } else {
        result += dahgan[d];
      }
    }
    if (y > 0) {
      if (result) result += ' و ';
      result += yekan[y];
    }
    return result;
  };

  let word = '';
  let stepCount = 0;
  let temp = Math.floor(num);

  while (temp > 0) {
    const section = temp % 1000;
    if (section > 0) {
      const sectionWord = convertThreeDigit(section);
      const stepWord = steps[stepCount] ? ' ' + steps[stepCount] : '';
      word = sectionWord + stepWord + (word ? ' و ' + word : '');
    }
    temp = Math.floor(temp / 1000);
    stepCount++;
  }
  return word.trim();
}

export function toPersianDigits(str: string | number | undefined | null): string {
  if (str === undefined || str === null) return '';
  const id = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return str.toString().replace(/[0-9]/g, function (w) {
    return id[+w];
  });
}

export function formatDateDisplay(dateInput: string | Date | number | undefined | null, calendarType?: string): string {
  if (!dateInput || dateInput === "-") return "-";
  try {
    if (calendarType === 'gregorian' || calendarType === 'jalali') {
      const originalCalendar = globalDateFormatter.getConfig().calendarType;
      const originalShowTime = globalDateFormatter.getConfig().showTime;
      
      globalDateFormatter.updateConfig({ calendarType: calendarType, showTime: false });
      const result = globalDateFormatter.formatDateOnly(dateInput);
      
      globalDateFormatter.updateConfig({ calendarType: originalCalendar, showTime: originalShowTime });
      return result;
    } else if (calendarType === 'gregorian_time' || calendarType === 'jalali_time') {
      const originalCalendar = globalDateFormatter.getConfig().calendarType;
      const originalShowTime = globalDateFormatter.getConfig().showTime;
      
      globalDateFormatter.updateConfig({ calendarType: calendarType.replace('_time', '') as any, showTime: true });
      const result = globalDateFormatter.formatDateTime(dateInput);
      
      globalDateFormatter.updateConfig({ calendarType: originalCalendar, showTime: originalShowTime });
      return result;
    }
    
    return globalDateFormatter.formatDate(dateInput);
  } catch (e) {
    return String(dateInput);
  }
}

export function convertToGregorian(dateInput: string | Date | number | any): string {
  if (!dateInput) return new Date().toISOString();
  if (dateInput instanceof Date) {
    return isNaN(dateInput.getTime()) ? new Date().toISOString() : dateInput.toISOString();
  }
  if (typeof dateInput === 'number') {
    const d = new Date(dateInput);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }
  if (typeof dateInput?.toDate === 'function') {
    const d = dateInput.toDate();
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }
  if (typeof dateInput === 'string') {
    let str = dateInput.trim();
    if (!str) return new Date().toISOString();
    
    // Normalize Persian and Arabic digits to Latin digits
    str = str.replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d).toString())
             .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d).toString());

    // Check if already an ISO date string
    if (str.includes('T') && !str.includes('/')) {
      const hasZ = str.endsWith('Z');
      const d = new Date(hasZ ? str : str + 'Z');
      if (!isNaN(d.getTime())) return d.toISOString();
      const d2 = new Date(str);
      if (!isNaN(d2.getTime())) return d2.toISOString();
    }

    const normalizedSlash = str.replace(/-/g, '/');
    if (normalizedSlash.includes('/')) {
      try {
        const parts = normalizedSlash.split(/[\s/:]+/);
        const firstNum = parseInt(parts[0], 10);
        
        if (firstNum < 1700 && firstNum > 1200) {
          // Jalali / Persian date
          let format = "YYYY/MM/DD";
          if (normalizedSlash.includes(':')) {
            if (normalizedSlash.toLowerCase().includes('am') || normalizedSlash.toLowerCase().includes('pm')) {
              format = "YYYY/MM/DD hh:mm a";
            } else {
              const colons = (normalizedSlash.match(/:/g) || []).length;
              format = colons >= 2 ? "YYYY/MM/DD HH:mm:ss" : "YYYY/MM/DD HH:mm";
            }
          }
          const d = new DateObject({ date: normalizedSlash, format, calendar: persian, locale: persian_fa });
          const jsDate = d.toDate();
          if (!isNaN(jsDate.getTime())) {
            return jsDate.toISOString();
          }
        } else {
          // Gregorian date (e.g. 2024/08/29 or 2024-08-29)
          const d = new Date(str.replace(/\//g, '-'));
          if (!isNaN(d.getTime())) return d.toISOString();
        }
      } catch (e) {
        console.error("Error in convertToGregorian parsing slash date:", e);
      }
    }
    const num = Number(str);
    if (!isNaN(num) && num > 1000000) {
      const d = new Date(num);
      if (!isNaN(d.getTime())) return d.toISOString();
    }
    const d2 = new Date(str);
    if (!isNaN(d2.getTime())) return d2.toISOString();
  }
  return new Date().toISOString();
}

export const customPersonFilter = (option: any, inputValue: string) => {
  if (!inputValue) return true;
  const terms = inputValue.toLowerCase().split(" ").filter(Boolean);
  const searchable = (
    option.data?.searchStr ||
    option.label ||
    ""
  ).toLowerCase();
  return terms.every((term) => searchable.includes(term));
};

export function formatAmount(num: number | string, storeSettings?: any): string {
    if (!num && num !== 0 && num !== '0') return '';
    let val = Number(num);
    if (isNaN(val)) return num.toString();
    
    if (storeSettings && storeSettings.use_decimals === false) {
        val = Math.round(val);
    } else if (storeSettings && storeSettings.use_decimals === true) {
        const places = storeSettings.decimal_places || 2;
        val = Number(val.toFixed(places));
    } else {
        // default: round to 2 places maximum if not specified
        val = Number(val.toFixed(4));
    }
    return addCommas(val.toString());
}

export function formatNumber(num: number | string | undefined | null): string {
  if (num === undefined || num === null) return "0";
  return addCommas(num);
}
