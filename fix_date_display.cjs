const fs = require('fs');
const file = 'src/components/financial/IssueCheckStandalone.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('formatDateDisplay')) {
  content = content.replace(
    'import { convertToGregorian } from "../../utils/format";',
    'import { convertToGregorian, formatDateDisplay } from "../../utils/format";'
  );
}

content = content.replace(
  "{dueDate ? dueDate.replace(/-/g, ' / ') : '---- / -- / --'}",
  "{dueDate ? formatDateDisplay(dueDate) : '---- / -- / --'}"
);
content = content.replace(
  "{issueDate ? issueDate.replace(/-/g, ' / ') : '---- / -- / --'}",
  "{issueDate ? formatDateDisplay(issueDate) : '---- / -- / --'}"
);

fs.writeFileSync(file, content);
