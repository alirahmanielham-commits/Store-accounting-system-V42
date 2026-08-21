// Not a React environment, but we can verify DateObject behavior with JS Date
const { DateObject } = require('react-multi-date-picker');
const persian = require('react-date-object/calendars/persian');
const persian_fa = require('react-date-object/locales/persian_fa');

let jsDate = new Date();
let d = new DateObject({ date: jsDate, calendar: persian, locale: persian_fa });
console.log("Valid?", d.isValid, d.format());
