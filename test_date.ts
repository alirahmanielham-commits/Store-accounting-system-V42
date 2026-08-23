import DateObjectModule from "react-date-object";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";

const DateObject = (DateObjectModule as any).default || DateObjectModule;

const d = new DateObject({ calendar: persian, locale: persian_fa });
d.year = 1403;
d.month = 1;
d.day = 1;
console.log("Days in month:", d.month.length);
console.log("First weekday:", d.weekDay.index, d.weekDay.name);
