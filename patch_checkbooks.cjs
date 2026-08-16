const fs = require('fs');

let code = fs.readFileSync('src/components/financial/CheckbooksManager.tsx', 'utf8');

const targetState = `  const [cbIssued, setCbIssued] = useState('');`;
const replacementState = `  const [cbIssued, setCbIssued] = useState('');\n  const [isSubmitting, setIsSubmitting] = useState(false);`;

code = code.replace(targetState, replacementState);

const targetFn = `  const handleSaveCheckbook = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {`;
const replacementFn = `  const handleSaveCheckbook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.confirm(editingCheckbookId ? 'آیا از ویرایش این دسته چک اطمینان دارید؟' : 'آیا از ثبت این دسته چک اطمینان دارید؟')) return;
    setIsSubmitting(true);
    const payload = {`;

code = code.replace(targetFn, replacementFn);

const targetTry = `      setIsCheckbookModalOpen(false);
      setCheckbooks(await getCheckbooks());
    } catch (error) {
      notify('خطا در ذخیره دسته چک', 'error');
    }
  };`;
const replacementTry = `      setIsCheckbookModalOpen(false);
      setCheckbooks(await getCheckbooks());
    } catch (error) {
      notify('خطا در ذخیره دسته چک', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };`;

code = code.replace(targetTry, replacementTry);

const targetBtn = `<button type="submit" className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-md shadow-indigo-200 transition-all hover:-translate-y-0.5">
                      <Save className="w-4 h-4" /> {editingCheckbookId ? 'ذخیره تغییرات' : 'ثبت و تعریف'}
                    </button>`;
const replacementBtn = `<button disabled={isSubmitting} type="submit" className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-md shadow-indigo-200 transition-all">
                      {isSubmitting ? (
                         <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                         <Save className="w-4 h-4" />
                      )}
                      {editingCheckbookId ? 'ذخیره تغییرات' : 'ثبت و تعریف'}
                    </button>`;

code = code.replace(targetBtn, replacementBtn);

fs.writeFileSync('src/components/financial/CheckbooksManager.tsx', code, 'utf8');
console.log("Patched CheckbooksManager.tsx");
