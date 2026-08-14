const DateObjectModule = require("react-date-object");
const DateObject = DateObjectModule.default || DateObjectModule;

// simulate browser in UTC-8 or UTC+3.5
// wait I cannot simulate without environment variables but let's test if we can do DateObject directly
const d2 = new DateObject({ date: "2024-05-01" });
console.log(d2.format("YYYY-MM-DD"));
