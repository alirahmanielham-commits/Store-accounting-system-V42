const fs = require('fs');
const file = 'src/components/financial/IssueCheckStandalone.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'import { getStoreSettings } from "../../services/settingsService";',
  'import { getStoreSettings } from "../../services/settingsService";\nimport { addTransaction } from "../../services/invoiceService";\nimport { convertToGregorian } from "../../utils/format";'
);

content = content.replace(
`  const handleSave = async (status: "issued" | "draft") => {
    setSubmitError("");
    setSuccess(false);

    if (!validateForm()) {
      setSubmitError("لطفاً خطاهای فرم را برطرف کنید.");
      return;
    }

    setLoading(true);
    try {
      await updateIssuedCheck(checkLeafId, {
        payeeId,
        payeeName, 
        amount: Number(amount),
        checkbookId,
        checkNumber,
        sayadId,
        issueDate: issueDate || new Date().toISOString(),
        dueDate,
        reason,
        description,
        status: status
      });`,
`  const handleSave = async (status: "issued" | "draft") => {
    setSubmitError("");
    setSuccess(false);

    if (!validateForm()) {
      setSubmitError("لطفاً خطاهای فرم را برطرف کنید.");
      return;
    }

    setLoading(true);
    try {
      const finalIssueDate = convertToGregorian(issueDate || new Date().toISOString());
      const finalDueDate = convertToGregorian(dueDate);

      await updateIssuedCheck(checkLeafId, {
        payeeId,
        payeeName, 
        amount: Number(amount),
        checkbookId,
        checkNumber,
        sayadId,
        issueDate: finalIssueDate,
        dueDate: finalDueDate,
        reason,
        description,
        status: status
      });

      if (status === "issued") {
        const person = persons.find(p => String(p.id) === String(payeeId)) || { name: payeeName };
        const savedTx = await addTransaction({
          type: "pay",
          method: "check",
          personId: payeeId,
          amount: Number(amount),
          date: finalIssueDate,
          description: description || \`پرداخت چک به شماره \${checkNumber} در وجه \${person.name || 'نامشخص'}\`,
          checkNumber: checkNumber,
          checkDueDate: finalDueDate,
          checkbookId: checkbookId,
          sourceType: "check_issued",
          sourceId: checkLeafId
        });
        
        if (savedTx && savedTx.receiptNumber) {
           await updateIssuedCheck(checkLeafId, { receiptNumber: savedTx.receiptNumber });
        }
      }`
);

fs.writeFileSync(file, content);
