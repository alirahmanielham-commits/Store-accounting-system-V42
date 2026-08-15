const e = { target: { value: "123" } };
let val = e.target ? e.target.value : e;
console.log(val, typeof val);
