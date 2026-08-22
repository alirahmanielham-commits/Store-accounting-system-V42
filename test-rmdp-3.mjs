import DateObjectPkg from "react-date-object";
import persian from "react-date-object/calendars/persian.js";
import persian_fa from "react-date-object/locales/persian_fa.js";

const DateObject = DateObjectPkg.default || DateObjectPkg;
const date = new DateObject({ calendar: persian, locale: persian_fa });
console.log("typeof date.toDate:", typeof date.toDate);
console.log("date.toDate:", date.toDate);
