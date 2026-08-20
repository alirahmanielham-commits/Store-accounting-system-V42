const { DateObject } = require('react-multi-date-picker');
const persian = require('react-date-object/calendars/persian');
const persian_fa = require('react-date-object/locales/persian_fa');

let date1 = new DateObject({ date: 1704067200000, calendar: persian, locale: persian_fa });
console.log("From number:", date1.format());

let date2 = new DateObject({ date: "1704067200000", calendar: persian, locale: persian_fa });
console.log("From string:", date2.format());

let date3 = new DateObject({ date: new Date(1704067200000), calendar: persian, locale: persian_fa });
console.log("From JS Date:", date3.format());

