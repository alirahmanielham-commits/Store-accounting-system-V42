import React, { useState, useEffect } from 'react';
import { addCommas, removeCommas, toPersianDigits } from '../../utils/format';

export default function CurrencyInput({ value, onChange, placeholder, className, disabled, onBlur }: any) {
  const [localVal, setLocalVal] = useState(value ? addCommas(value) : "");
  
  useEffect(() => {
    if (value !== undefined && value !== null) {
      setLocalVal(addCommas(value));
    }
  }, [value]);
  
  return (
    <input
      type="text"
      value={localVal}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
      onBlur={onBlur}
      onChange={(e) => {
        const clean = removeCommas(e.target.value).replace(/[^0-9-]/g, "");
        setLocalVal(addCommas(clean));
        onChange({ target: { value: clean } });
      }}
    />
  );
}
