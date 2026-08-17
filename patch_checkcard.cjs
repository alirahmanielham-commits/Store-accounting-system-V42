const fs = require('fs');
let code = fs.readFileSync('src/components/financial/checks/CheckCardPage.tsx', 'utf8');

// Replace "ریال" with dynamic currency.
code = code.replace(/>ریال</g, ">{storeSettings?.currency || 'تومان'}<");
code = code.replace(/} ریال/g, "} {storeSettings?.currency || 'تومان'}");
code = code.replace(/'ریال'/g, "storeSettings?.currency || 'تومان'");
code = code.replace(/مبلغ \(ریال\)/g, "مبلغ ({storeSettings?.currency || 'تومان'})");
code = code.replace(/\}ریال</g, "} {storeSettings?.currency || 'تومان'}<");

// Replace window.confirm with a custom modal logic.
// We need to add state for the confirmation modal:
const stateToAdd = `
  const [confirmModalData, setConfirmModalData] = useState<{isOpen: boolean, title: string, message: string, onConfirm: () => void} | null>(null);
`;
code = code.replace('const [isEditModalOpen, setIsEditModalOpen] = useState(false);', 'const [isEditModalOpen, setIsEditModalOpen] = useState(false);\n' + stateToAdd);

// In handleStatusChange:
// Original: if (!confirm(`آیا از تغییر وضعیت این چک به "${stateLabels[newState]}" اطمینان دارید؟`)) return;
const handleStatusChangeReplacement = `
    setConfirmModalData({
      isOpen: true,
      title: 'تغییر وضعیت چک',
      message: \`آیا از تغییر وضعیت این چک به "\${stateLabels[newState]}" اطمینان دارید؟\`,
      onConfirm: async () => {
        setConfirmModalData(null);
        setSaving(true);
        try {
          const docRef = doc(db, 'checks', check.id);
          const historyEntry = {
            id: generateId(),
            date: new Date().toISOString(),
            action: 'status_change',
            previousStatus: check.status,
            newStatus: newState,
            user: currentUser,
            description: \`تغییر وضعیت به \${stateLabels[newState]}\`
          };
          const updatedCheck = {
            ...check,
            status: newState,
            history: [...(check.history || []), historyEntry],
            updatedAt: new Date().toISOString()
          };
          await updateDoc(docRef, updatedCheck);
          setCheck(updatedCheck);
          showNotification('وضعیت چک با موفقیت بروزرسانی شد', 'success');
        } catch (error) {
          console.error(error);
          showNotification('خطا در بروزرسانی وضعیت چک', 'error');
        } finally {
          setSaving(false);
        }
      }
    });
`;

code = code.replace(/if \(!confirm\([^)]+\)\) return;\s*setSaving\(true\);\s*try {[\s\S]*?finally {\s*setSaving\(false\);\s*}\s*}/m, handleStatusChangeReplacement + '}');

// In handleRevert:
const handleRevertReplacement = `
    setConfirmModalData({
      isOpen: true,
      title: 'بازگردانی وضعیت',
      message: 'آیا از بازگرداندن چک به وضعیت قبلی اطمینان دارید؟ در صورت وجود سند حسابداری، باید آن را به صورت دستی اصلاح یا لغو کنید.',
      onConfirm: async () => {
        setConfirmModalData(null);
        setSaving(true);
        try {
          const docRef = doc(db, 'checks', check.id);
          const newHistory = [...check.history];
          const lastEntry = newHistory.pop();
          
          const updatedCheck = {
            ...check,
            status: previousStatus,
            history: newHistory,
            updatedAt: new Date().toISOString()
          };
          await updateDoc(docRef, updatedCheck);
          setCheck(updatedCheck);
          showNotification('وضعیت چک به حالت قبل بازگشت', 'success');
        } catch (error) {
          console.error(error);
          showNotification('خطا در بازگردانی وضعیت چک', 'error');
        } finally {
          setSaving(false);
        }
      }
    });
`;

code = code.replace(/if \(!confirm\([^)]+\)\) return;\s*setSaving\(true\);\s*try {[\s\S]*?finally {\s*setSaving\(false\);\s*}\s*}/m, handleRevertReplacement + '}');


// Now add the modal JSX at the end, just before the last </motion.div>
const confirmModalJSX = `
      <AnimatePresence>
      {confirmModalData?.isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8 max-w-sm w-full" dir="rtl">
            <h3 className="text-xl font-black text-slate-800 mb-4">{confirmModalData.title}</h3>
            <p className="text-slate-600 mb-6 font-medium leading-relaxed">{confirmModalData.message}</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmModalData(null)} className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition-colors">
                انصراف
              </button>
              <button onClick={confirmModalData.onConfirm} disabled={saving} className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2">
                {saving ? 'در حال پردازش...' : 'بله، تایید میکنم'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
      </AnimatePresence>
`;

code = code.replace(/(\s*)<\/motion\.div>\s*\);\s*}/, confirmModalJSX + '$1</motion.div>\n  );\n}');

fs.writeFileSync('src/components/financial/checks/CheckCardPage.tsx', code, 'utf8');
console.log('Patched CheckCardPage.tsx');
