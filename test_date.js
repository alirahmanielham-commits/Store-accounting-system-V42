import DateObjectModule from 'react-date-object';
import persian from 'react-date-object/calendars/persian.js';
import persian_fa from 'react-date-object/locales/persian_fa.js';
const DateObject = DateObjectModule.default || DateObjectModule;

const d = new DateObject({ calendar: persian, locale: persian_fa });
d.year = 1403;
d.month = 1;
console.log('month.length:', d.month.length);
