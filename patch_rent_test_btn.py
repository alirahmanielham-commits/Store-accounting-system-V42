import re

with open('src/components/payroll/RentContractsManager.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

if "testGenerateRentCommitments" not in code:
    code = code.replace(
        "import { getRentContracts, addRentContract, updateRentContract, deleteRentContract, autoGenerateRentCommitments } from '../../services/hrService';",
        "import { getRentContracts, addRentContract, updateRentContract, deleteRentContract, autoGenerateRentCommitments, testGenerateRentCommitments } from '../../services/hrService';"
    )

old_btn = """          <button
            onClick={async () => {
              try {
                await autoGenerateRentCommitments();
                showNotification('بررسی و صدور اتوماتیک اسناد تعهد با موفقیت انجام شد', 'success');
                fetchData();
              } catch (e) {
                console.error(e);
                showNotification('خطا در اجرای تست', 'error');
              }
            }}
            className="px-4 py-2 bg-amber-100 text-amber-700 rounded-xl font-bold flex items-center gap-2 hover:bg-amber-200 transition-colors border border-amber-200"
            title="تست ایجاد دستی اسناد سررسید شده"
          >"""

new_btn = """          <button
            onClick={async () => {
              try {
                await testGenerateRentCommitments();
                showNotification('برای هر قرارداد فعال، یک سند تستی صادر شد', 'success');
                fetchData();
              } catch (e) {
                console.error(e);
                showNotification('خطا در اجرای تست', 'error');
              }
            }}
            className="px-4 py-2 bg-amber-100 text-amber-700 rounded-xl font-bold flex items-center gap-2 hover:bg-amber-200 transition-colors border border-amber-200"
            title="صدور اجباری سند برای همه قراردادهای فعال (بدون در نظر گرفتن تاریخ)"
          >"""

code = code.replace(old_btn, new_btn)

with open('src/components/payroll/RentContractsManager.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
