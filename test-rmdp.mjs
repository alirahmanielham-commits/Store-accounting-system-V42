import DateObjectPkg from "react-date-object";
import persian from "react-date-object/calendars/persian.js";
import persian_fa from "react-date-object/locales/persian_fa.js";

const DateObject = DateObjectPkg.default || DateObjectPkg;
const date = new DateObject({ calendar: persian, locale: persian_fa });
date.set({ year: 1403, month: 2, day: 15 });
console.log("DateObject toString:", date.toString());
console.log("toDate():", date.toDate());
console.log("toISOString():", date.toDate().toISOString());
