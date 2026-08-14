const DateObjectModule = require("react-date-object");
const DateObject = DateObjectModule.default || DateObjectModule;

console.log(new Date("2024-05-01").toISOString());
const d = new DateObject({ date: new Date("2024-05-01") });
console.log(d.format("YYYY-MM-DD"));

const d2 = new DateObject({ date: "2024-05-01" });
console.log(d2.format("YYYY-MM-DD"));
