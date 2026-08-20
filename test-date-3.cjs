const { DateObject } = require('react-multi-date-picker');
const persian = require('react-date-object/calendars/persian');
const persian_fa = require('react-date-object/locales/persian_fa');
const date = new DateObject({ calendar: persian, locale: persian_fa });
console.log("valueOf:", date.valueOf());
console.log("type of valueOf:", typeof date.valueOf());
console.log("toUnix:", typeof date.toUnix);
console.log("toDate:", typeof date.toDate);
