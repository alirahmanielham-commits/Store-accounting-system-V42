import re

with open('src/components/payroll/DailyAttendanceManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add state for custom confirm
state_regex = r"const \[isMissionModalOpen, setIsMissionModalOpen\] = useState\(false\);"
new_states = """const [isMissionModalOpen, setIsMissionModalOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, message: '', onConfirm: () => {} });"""
content = content.replace("const [isMissionModalOpen, setIsMissionModalOpen] = useState(false);", new_states)

# 2. Replace window.confirm in handleDeleteAttendance, handleDeleteLeave, handleDeleteMission
content = re.sub(
    r"const handleDeleteAttendance = async \(id: string\) => \{\s*if \(\!window\.confirm\('آیا از حذف این تردد مطمئن هستید؟'\)\) return;",
    """const handleDeleteAttendance = (id: string) => {
    setConfirmConfig({
      isOpen: true,
      message: 'آیا از حذف این تردد مطمئن هستید؟',
      onConfirm: async () => {
        try {
          await deleteDailyAttendance(id);
          showNotification('تردد حذف شد', 'success');
          fetchData();
        } catch (error) {
          showNotification('خطا در حذف تردد', 'error');
        }
      }
    });
  };
  const _oldDeleteAttendance = async (id: string) => {
    // replaced""",
    content
)

content = re.sub(
    r"const handleDeleteLeave = async \(id: string\) => \{\s*if \(\!window\.confirm\('آیا از حذف این رکورد مطمئن هستید؟'\)\) return;",
    """const handleDeleteLeave = (id: string) => {
    setConfirmConfig({
      isOpen: true,
      message: 'آیا از حذف این رکورد مطمئن هستید؟',
      onConfirm: async () => {
        try {
          await deleteLeave(id);
          showNotification('رکورد با موفقیت حذف شد', 'success');
          fetchData();
        } catch (error) {
          showNotification('خطا در حذف رکورد', 'error');
        }
      }
    });
  };
  const _oldDeleteLeave = async (id: string) => {
    // replaced""",
    content
)

content = re.sub(
    r"const handleDeleteMission = async \(id: string\) => \{\s*if \(\!window\.confirm\('آیا از حذف این رکورد مطمئن هستید؟'\)\) return;",
    """const handleDeleteMission = (id: string) => {
    setConfirmConfig({
      isOpen: true,
      message: 'آیا از حذف این رکورد مطمئن هستید؟',
      onConfirm: async () => {
        try {
          await deleteMission(id);
          showNotification('رکورد با موفقیت حذف شد', 'success');
          fetchData();
        } catch (error) {
          showNotification('خطا در حذف رکورد', 'error');
        }
      }
    });
  };
  const _oldDeleteMission = async (id: string) => {
    // replaced""",
    content
)

# 3. Add the confirm modal JSX at the end of the return statement
modal_jsx = """
      {/* Custom Confirm Modal */}
      {confirmConfig.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden p-6 text-center">
            <h3 className="font-bold text-slate-800 text-lg mb-2">تایید حذف</h3>
            <p className="text-slate-600 mb-6">{confirmConfig.message}</p>
            <div className="flex justify-center gap-3">
              <button 
                type="button"
                onClick={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
              >
                انصراف
              </button>
              <button 
                type="button"
                onClick={() => {
                  setConfirmConfig({ ...confirmConfig, isOpen: false });
                  confirmConfig.onConfirm();
                }}
                className="px-4 py-2 bg-rose-500 text-white rounded-xl font-bold hover:bg-rose-600 transition-colors"
              >
                بله، حذف شود
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
"""

content = content.replace("    </div>\n  );\n}", modal_jsx)

# Also ensure type="button" on all Trash2 buttons to prevent form submission if any
content = content.replace("<button \n                        onClick={() => handleDeleteAttendance(a.id)}", "<button type=\\\"button\\\"\n                        onClick={() => handleDeleteAttendance(a.id)}")
content = content.replace("<button \n                                onClick={() => handleDeleteAttendance(a.id)}", "<button type=\\\"button\\\"\n                                onClick={() => handleDeleteAttendance(a.id)}")

with open('src/components/payroll/DailyAttendanceManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

