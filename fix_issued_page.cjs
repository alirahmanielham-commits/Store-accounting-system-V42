const fs = require('fs');

let pageCode = fs.readFileSync('src/components/financial/IssuedChecksPage.tsx', 'utf8');

const target = `    if (issuedSearchQuery) {`;
const replacement = `    // Hide blank checks
    result = result.filter(c => c.amount && Number(c.amount) > 0);

    if (issuedSearchQuery) {`;

if (pageCode.includes(target) && !pageCode.includes('Hide blank checks')) {
    pageCode = pageCode.replace(target, replacement);
    fs.writeFileSync('src/components/financial/IssuedChecksPage.tsx', pageCode, 'utf8');
    console.log("Patched IssuedChecksPage.tsx");
} else {
    console.log("Could not patch IssuedChecksPage.tsx");
}
