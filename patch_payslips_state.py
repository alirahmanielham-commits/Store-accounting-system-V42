import re

with open('src/components/payroll/PayslipsManager.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

state_inject = """  const [allSlipItems, setAllSlipItems] = useState([]);"""
new_state = """  const [allSlipItems, setAllSlipItems] = useState([]);
  const [isEditingAttendance, setIsEditingAttendance] = useState(false);
  const [editAttendanceForm, setEditAttendanceForm] = useState(null);
  
  const handleEditAttendance = () => {
    if (selectedAttendance) {
      setEditAttendanceForm(selectedAttendance);
      setIsEditingAttendance(true);
    }
  };

  const handleSaveAndRecalculateAttendance = async () => {
    try {
      if (!editAttendanceForm) return;
      const { updateMonthlyAttendance } = await import('../../services/hrService');
      await updateMonthlyAttendance(editAttendanceForm.id, editAttendanceForm);
      showNotification('کارکرد با موفقیت ذخیره شد. در حال محاسبه مجدد...', 'success');
      setIsEditingAttendance(false);
      await handleGenerate();
    } catch (e) {
      console.error(e);
      showNotification('خطا در ذخیره کارکرد', 'error');
    }
  };
"""

code = code.replace(state_inject, new_state)

with open('src/components/payroll/PayslipsManager.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
