import re

with open('src/components/payroll/PayslipsManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("try {\n      const docs = await getAccountingDocuments();", "setLoading(true);\n    try {\n      const docs = await getAccountingDocuments();")
content = content.replace("showNotification('فیش به حالت پیش‌نویس بازگشت و سند حذف شد', 'success');\n      fetchPayslips();\n    } catch(e) {", "showNotification('فیش به حالت پیش‌نویس بازگشت و سند حذف شد', 'success');\n      await fetchPayslips();\n    } catch(e) {")
content = content.replace("showNotification('خطا در برگشت فیش', 'error');\n    }\n  };\n  const filteredSlips", "showNotification('خطا در برگشت فیش', 'error');\n    } finally {\n      setLoading(false);\n    }\n  };\n  const filteredSlips")

with open('src/components/payroll/PayslipsManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
