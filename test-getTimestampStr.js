const { DateObject } = require('react-multi-date-picker');

const getTimestampStr = (dateVal) => {
    if (!dateVal) return null;
    try {
      if (typeof dateVal.valueOf === 'function') {
        const val = dateVal.valueOf();
        if (typeof val === 'number' && !isNaN(val)) return val.toString();
      }
      if (typeof dateVal.toUnix === 'function') return (dateVal.toUnix() * 1000).toString();
      if (typeof dateVal.toDate === 'function') return dateVal.toDate().getTime().toString();
      if (dateVal instanceof Date) return dateVal.getTime().toString();
      const parsed = new Date(dateVal).getTime();
      if (!isNaN(parsed)) return parsed.toString();
      return null;
    } catch(e) {
      return null;
    }
}

const dateObj = new DateObject();
console.log("DateObject:", getTimestampStr(dateObj));
console.log("Number (from valueOf):", getTimestampStr(dateObj.valueOf()));
console.log("Empty string:", getTimestampStr(''));

