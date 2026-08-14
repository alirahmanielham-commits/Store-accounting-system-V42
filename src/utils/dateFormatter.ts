import DateObjectModule from "react-date-object";
const DateObject = (DateObjectModule as any).default || DateObjectModule;
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import gregorian from "react-date-object/calendars/gregorian";
import gregorian_en from "react-date-object/locales/gregorian_en";
import { toPersianDigits, convertToGregorian } from "./format";

export interface DateDisplayConfig {
  dateFormat: 'YYYY/MM/DD' | 'YYYY-MM-DD' | 'DD/MM/YYYY' | 'DD-MM-YYYY' | 'monthName' | 'dayMonthName';
  dateSeparator: '/' | '-' | '.';
  dateYearFormat: 'YY' | 'YYYY';
  showTime: boolean;
  timeFormat: '24' | '12';
  calendarType: 'jalali' | 'gregorian';
}

export const defaultDateConfig: DateDisplayConfig = {
  dateFormat: 'YYYY/MM/DD',
  dateSeparator: '/',
  dateYearFormat: 'YYYY',
  showTime: true,
  timeFormat: '24',
  calendarType: 'jalali'
};

export class DateFormatterService {
  private config: DateDisplayConfig;

  constructor(config?: Partial<DateDisplayConfig>) {
    this.config = { ...defaultDateConfig, ...config };
  }

  updateConfig(config: Partial<DateDisplayConfig>) {
    const cleanedConfig = Object.fromEntries(
      Object.entries(config).filter(([_, v]) => v !== undefined)
    );
    this.config = { ...this.config, ...cleanedConfig };
  }

  getConfig() {
    return this.config;
  }

  private getCalendarInfo() {
    if (this.config.calendarType === 'gregorian') {
      return { calendar: gregorian, locale: gregorian_en };
    }
    return { calendar: persian, locale: persian_fa };
  }

  private buildFormatString(): string {
    const { dateFormat, dateSeparator, dateYearFormat, showTime, timeFormat } = this.config;
    let format = '';

    const Y = dateYearFormat === 'YY' ? 'YY' : 'YYYY';
    const M = 'MM';
    const D = 'DD';

    if (dateFormat === 'monthName') {
      format = `${D} MMMM ${Y}`;
    } else if (dateFormat === 'dayMonthName') {
      format = `dddd ${D} MMMM ${Y}`;
    } else {
      let sep = dateSeparator;
      if (dateFormat === 'YYYY/MM/DD' || dateFormat === 'YYYY-MM-DD') {
        format = `${Y}${sep}${M}${sep}${D}`;
      } else {
        format = `${D}${sep}${M}${sep}${Y}`;
      }
    }

    if (showTime) {
      if (timeFormat === '12') {
        format += ' hh:mm a';
      } else {
        format += ' HH:mm';
      }
    }

    return format;
  }

  formatDate(date: string | Date | number | null | undefined, overrideShowTime?: boolean): string {
    if (!date) return '-';
    
    try {
      let jsDate = date;
      if (typeof date === 'string' && date.includes('/')) {
         const parsed = new Date(convertToGregorian(date));
         if (!isNaN(parsed.getTime())) jsDate = parsed;
      }
      
      const { calendar, locale } = this.getCalendarInfo();
      const dateObj = new DateObject({ date: new Date(jsDate as any), calendar, locale });
      
      const originalShowTime = this.config.showTime;
      if (overrideShowTime !== undefined) {
        this.config.showTime = overrideShowTime;
      }
      
      const formatStr = this.buildFormatString();
      let result = dateObj.format(formatStr);
      
      if (overrideShowTime !== undefined) {
        this.config.showTime = originalShowTime;
      }

      if (this.config.calendarType === 'jalali') {
        result = toPersianDigits(result);
      }
      return result;
    } catch (e) {
      console.error("Error formatting date:", e);
      return String(date);
    }
  }
  
  formatDateTime(date: string | Date | number | null | undefined): string {
    return this.formatDate(date, true);
  }

  formatDateOnly(date: string | Date | number | null | undefined): string {
    return this.formatDate(date, false);
  }

  getGlobalDatePickerProps(currentValue?: any, onChange?: (val: any) => void) {
    const { calendar, locale } = this.getCalendarInfo();
    const formatStr = this.buildFormatString();
    
    return {
      calendar,
      locale,
      format: formatStr,
      value: currentValue,
      onChange,
    };
  }
}

// Global instance
export const globalDateFormatter = new DateFormatterService();

