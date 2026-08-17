const fs = require('fs');
let code = fs.readFileSync('src/components/financial/CheckbooksManager.tsx', 'utf8');

// Add confirmModalData state
const stateToAdd = `
  const [confirmModalData, setConfirmModalData] = useState<{isOpen: boolean, title: string, message: string, onConfirm: () => void} | null>(null);
`;
code = code.replace('const [isSubmitting, setIsSubmitting] = useState(false);', 'const [isSubmitting, setIsSubmitting] = useState(false);\n' + stateToAdd);

// Replace the handleSaveCheckbook logic to use modal
code = code.replace(
  /const handleSaveCheckbook = async \(e: React\.FormEvent\) => \{\s*e\.preventDefault\(\);\s*if \(!window\.confirm[^;]+;\s*/,
  `const handleSaveCheckbook = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfirmModalData({
      isOpen: true,
      title: editingCheckbookId ? 'ویرایش دسته چک' : 'ثبت دسته چک',
      message: editingCheckbookId ? 'آیا از ویرایش این دسته چک اطمینان دارید؟' : 'آیا از ثبت این دسته چک اطمینان دارید؟',
      onConfirm: async () => {
        setConfirmModalData(null);
`
);

// Close the onConfirm logic
code = code.replace(
  /setCheckbooks\(await getCheckbooks\(\)\);\s*\} catch \(error\) \{\s*notify\('خطا در ذخیره دسته چک', 'error'\);\s*\} finally \{\s*setIsSubmitting\(false\);\s*\}\s*\};/m,
  `setCheckbooks(await getCheckbooks());
        } catch (error) {
          notify('خطا در ذخیره دسته چک', 'error');
        } finally {
          setIsSubmitting(false);
        }
      }
    });
  };`
);


// Also fix delete:
code = code.replace(
  /const deleteCb = async \(id: string \| number\) => \{\s*if \(window\.confirm\('آیا از حذف دسته چک مطمئن هستید؟'\)\) \{\s*setIsSubmitting\(true\);\s*try \{/m,
  `const deleteCb = async (id: string | number) => {
    setConfirmModalData({
      isOpen: true,
      title: 'حذف دسته چک',
      message: 'آیا از حذف دسته چک مطمئن هستید؟',
      onConfirm: async () => {
        setConfirmModalData(null);
        setIsSubmitting(true);
        try {`
);

code = code.replace(
  /notify\('خطا در حذف دسته چک', 'error'\);\s*\} finally \{\s*setIsSubmitting\(false\);\s*\}\s*\}\s*\};/m,
  `notify('خطا در حذف دسته چک', 'error');
        } finally {
          setIsSubmitting(false);
        }
      }
    });
  };`
);


// Add JSX for modal
const modalJsx = `
      <AnimatePresence>
      {confirmModalData?.isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 print:hidden">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8 max-w-sm w-full" dir="rtl">
            <h3 className="text-xl font-black text-slate-800 mb-4">{confirmModalData.title}</h3>
            <p className="text-slate-600 mb-6 font-medium leading-relaxed">{confirmModalData.message}</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmModalData(null)} className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition-colors">
                انصراف
              </button>
              <button onClick={confirmModalData.onConfirm} disabled={isSubmitting} className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2">
                {isSubmitting ? 'در حال پردازش...' : 'بله، تایید میکنم'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
      </AnimatePresence>
`;

code = code.replace(/(\s*)<\/div>\s*\);\s*}/, modalJsx + '$1</div>\n  );\n}');

fs.writeFileSync('src/components/financial/CheckbooksManager.tsx', code, 'utf8');
