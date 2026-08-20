const { DateObject } = require('react-multi-date-picker');
const persian = require('react-date-object/calendars/persian');
const persian_fa = require('react-date-object/locales/persian_fa');

function getTimestampStr(dateVal) {
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

const date = new DateObject({ calendar: persian, locale: persian_fa });
console.log(getTimestampStr(date));
console.log(getTimestampStr(date.toDate()));
