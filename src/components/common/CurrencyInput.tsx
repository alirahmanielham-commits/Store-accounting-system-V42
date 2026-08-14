import React, { useState, useEffect } from "react";
import { addCommas, numberToWords } from "../../utils/format";

const persianToEnglish = (str: string) => {
  const persianNumbers = [/۰/g, /۱/g, /۲/g, /۳/g, /۴/g, /۵/g, /۶/g, /۷/g, /۸/g, /۹/g];
  const arabicNumbers  = [/٠/g, /١/g, /٢/g, /٣/g, /٤/g, /٥/g, /٦/g, /٧/g, /٨/g, /٩/g];
  if(typeof str === 'string') {
    for(let i=0; i<10; i++) {
      str = str.replace(persianNumbers[i], i.toString()).replace(arabicNumbers[i], i.toString());
    }
  }
  return str;
};

export const CurrencyInput = ({
  value,
  onChange,
  placeholder,
  className,
  hideWords,
  currencyLabel,
  ...props
}: any) => {
  const [localVal, setLocalVal] = useState(value ? addCommas(value) : "");
  useEffect(() => {
    if (value !== undefined) {
      setLocalVal(addCommas(value));
    }
  }, [value]);
  const handleChange = (e: any) => {
    let raw = persianToEnglish(e.target.value).replace(/,/g, "");
    
    // Check storeSettings if provided
    if (props.storeSettings) {
      if (!props.storeSettings.use_decimals) {
         raw = raw.replace(/\./g, '');
      } else {
         const places = props.storeSettings.decimal_places || 2;
         const parts = raw.split('.');
         if (parts.length > 1 && parts[1].length > places) {
             return;
         }
      }
    }

    if (raw && isNaN(Number(raw)) && raw !== '-' && raw !== '.' && raw !== '-.') return;
    setLocalVal(addCommas(raw));
    if (onChange) onChange({ target: { value: raw } });
  };
  return (
    <div className="w-full relative">
      <input
        type="text"
        dir="ltr"
        value={localVal}
        onChange={handleChange}
        placeholder={placeholder}
        className={`${className} text-left`}
        {...props}
      />
      {!hideWords && localVal && localVal !== "0" && (
        <p className="text-[10px] text-gray-500 font-medium mt-1 px-1 absolute -bottom-5 right-0 z-10 w-max">
          {numberToWords(localVal)} {currencyLabel || "تومان"}
        </p>
      )}
    </div>
  );
};

export default CurrencyInput;
