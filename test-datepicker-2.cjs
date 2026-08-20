const { DateObject } = require('react-multi-date-picker');
const persian = require('react-date-object/calendars/persian');
const persian_fa = require('react-date-object/locales/persian_fa');

let date = new DateObject({ date: 1704067200000, calendar: persian, locale: persian_fa });
console.log("Format:", date.format());

