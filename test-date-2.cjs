const { DateObject } = require('react-multi-date-picker');
const date = new DateObject();
console.log(date.valueOf());
console.log(date.toDate().getTime());
console.log(new Date(date).getTime());
