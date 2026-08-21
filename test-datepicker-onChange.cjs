const { DateObject } = require('react-multi-date-picker');
const persian = require('react-date-object/calendars/persian');
const persian_fa = require('react-date-object/locales/persian_fa');

let dateObj = new DateObject({ calendar: persian, locale: persian_fa });
console.log("Original:", dateObj.format());
console.log("toDate():", dateObj.toDate());
console.log("Is toDate() valid?", !isNaN(dateObj.toDate()));

