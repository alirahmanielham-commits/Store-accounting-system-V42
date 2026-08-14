const d = new Date("2024-05-01T00:00:00.000Z");
console.log(d.toString());

// If we replace it:
let jsDate = "2024-05-01T00:00:00.000Z";
let finalDateStr = jsDate;
if (typeof jsDate === 'string' && jsDate.includes('T')) {
  // strip time and use local noon
  finalDateStr = jsDate.split('T')[0] + 'T12:00:00';
}
console.log(new Date(finalDateStr).toString());
