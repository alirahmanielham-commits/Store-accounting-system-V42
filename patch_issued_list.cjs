const fs = require('fs');

let listCode = fs.readFileSync('src/components/financial/checks/IssuedChecksList.tsx', 'utf8');

const target = `<span className="font-mono font-black text-slate-800 text-sm tracking-widest">{toPersianDigits(c.checkNumber)}</span>`;
const replacement = `<button onClick={() => setViewingCheck && setViewingCheck({ ...c, _type: 'issued' })} className="font-mono font-black text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer text-sm tracking-widest text-right">{toPersianDigits(c.checkNumber)}</button>`;

if (listCode.includes(target)) {
    listCode = listCode.replace(target, replacement);
    fs.writeFileSync('src/components/financial/checks/IssuedChecksList.tsx', listCode, 'utf8');
    console.log("Patched IssuedChecksList.tsx");
} else {
    console.log("Could not find target in IssuedChecksList.tsx");
}
