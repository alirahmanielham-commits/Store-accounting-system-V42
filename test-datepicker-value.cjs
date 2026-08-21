const { DateObject } = require('react-multi-date-picker');
const persian = require('react-date-object/calendars/persian');
const persian_fa = require('react-date-object/locales/persian_fa');

// Can we initialize DateObject with a number and persian calendar?
let d = new DateObject({ date: 1787241617831, calendar: persian, locale: persian_fa });
console.log(d.isValid);

// What if we pass a JS Date?
let d2 = new DateObject({ date: new Date(), calendar: persian, locale: persian_fa });
console.log(d2.isValid);
