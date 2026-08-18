import { DateObject } from "react-multi-date-picker";
const d = new DateObject();
console.log(typeof d.toUnix === 'function');
console.log(d.toDate().getTime());
console.log(new Date(d as any).getTime());
