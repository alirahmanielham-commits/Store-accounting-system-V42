import React from 'react';
import DatePickerModule from "react-multi-date-picker";
import TimePickerModule from "react-multi-date-picker/plugins/time_picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import { globalDateFormatter } from "../../utils/dateFormatter";
import { convertToGregorian } from "../../utils/format";

const DatePicker = (DatePickerModule as any).default || DatePickerModule;
const TimePicker = (TimePickerModule as any).default || TimePickerModule;

const TodayButton = (props: any) => {
  const { setValue, range, onChange, handleChange, setDate } = props;
  return (
    <div className="flex justify-center p-2 border-t border-gray-100 bg-gray-50/50">
      <button
        type="button"
        onClick={() => {
          console.log("TodayButton clicked, props are:", Object.keys(props));
          let newValue;
          if (range) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const endToday = new Date();
            endToday.setHours(23, 59, 59, 999);
            newValue = [today.toISOString(), endToday.toISOString()];
          } else {
            newValue = new Date().toISOString();
          }
          if (typeof setValue === 'function') setValue(newValue);
          else if (typeof handleChange === 'function') handleChange(newValue);
          else if (typeof setDate === 'function') setDate(newValue);
          else if (typeof onChange === 'function') onChange(newValue);
        }}
        className="w-full py-1.5 px-4 bg-indigo-50 text-indigo-600 rounded-lg font-bold text-sm hover:bg-indigo-100 transition-colors"
      >
        هم‌اکنون (امروز)
      </button>
    </div>
  );
};

export default function CustomDatePicker(props: any) {
  const globalProps = globalDateFormatter.getGlobalDatePickerProps(props.value, props.onChange);
  const showTime = globalDateFormatter.getConfig().showTime;

  let parsedValue = props.value;
  if (typeof props.value === 'string' && props.value) {
    if (props.value.includes('T') || props.value.startsWith('20') || props.value.startsWith('19')) {
      parsedValue = new Date(convertToGregorian(props.value));
    } else {
      // It's likely a Shamsi string, let DatePicker parse it directly using format
      parsedValue = props.value;
    }
  } else if (Array.isArray(props.value)) {
    parsedValue = props.value.map((v: any) => {
      if (typeof v === 'string') {
        if (v.includes('T') || v.startsWith('20') || v.startsWith('19')) {
          return new Date(convertToGregorian(v));
        }
        return v;
      }
      return v;
    });
  }

  let parsedMinDate = props.minDate;
  if (typeof props.minDate === 'string' && props.minDate) {
    if (props.minDate.includes('T') || props.minDate.startsWith('20') || props.minDate.startsWith('19')) {
      parsedMinDate = new Date(convertToGregorian(props.minDate));
    }
  }

  let parsedMaxDate = props.maxDate;
  if (typeof props.maxDate === 'string' && props.maxDate) {
    if (props.maxDate.includes('T') || props.maxDate.startsWith('20') || props.maxDate.startsWith('19')) {
      parsedMaxDate = new Date(convertToGregorian(props.maxDate));
    }
  }

  return (
    <DatePicker
      portal={props.portal !== undefined ? props.portal : true}
      zIndex={props.zIndex !== undefined ? props.zIndex : 100050}
      {...props}
      calendar={props.calendar !== undefined ? props.calendar : globalProps.calendar}
      locale={props.locale !== undefined ? props.locale : globalProps.locale}
      format={props.format || globalProps.format}
      value={parsedValue}
      minDate={parsedMinDate}
      maxDate={parsedMaxDate}
      onChange={(date: any) => {
         let valueToPass = date;
         if (date && typeof date.toDate === 'function') {
           const jsDate = date.toDate();
           if (!isNaN(jsDate.getTime())) {
             valueToPass = jsDate.toISOString();
           }
         } else if (Array.isArray(date)) {
           valueToPass = date.map((d: any) => {
             if (d && typeof d.toDate === 'function') {
               const jsDate = d.toDate();
               return !isNaN(jsDate.getTime()) ? jsDate.toISOString() : d;
             }
             return d;
           });
         }
         // if component has its own onChange, call it
         if (props.onChange) props.onChange(valueToPass);
      }}
      plugins={[
        ...(!props.range && showTime ? [<TimePicker position="bottom" />] : []),
        <TodayButton position="bottom" range={props.range} />,
        ...(props.plugins || [])
      ]}
    />
  );
}
