import re

with open('src/components/payroll/EmployeeProfilesManager.tsx', 'r') as f:
    text = f.read()

text = text.replace(
    "const [editingPersonId, setEditingPersonId] = useState<string | null>(null);",
    "const [editingPersonId, setEditingPersonId] = useState<string | null>(null);\n  const [activeTab, setActiveTab] = useState<'all' | 'incomplete'>('all');"
)

# Modify filtering logic
old_filter_logic = """  const filteredEmployees = useMemo(() => {
    if (!searchQuery) return employees;
    return employees.filter((e: any) => e.name.includes(searchQuery));
  }, [employees, searchQuery]);"""

new_filter_logic = """  const filteredEmployees = useMemo(() => {
    let result = employees;
    if (activeTab === 'incomplete') {
      result = result.filter((e: any) => {
        const profile = profiles.find(p => p.personId === e.id);
        return !(profile && profile.insuranceNumber && profile.jobTitle);
      });
    }
    if (searchQuery) {
      result = result.filter((e: any) => e.name.includes(searchQuery));
    }
    return result;
  }, [employees, searchQuery, activeTab, profiles]);"""

text = text.replace(old_filter_logic, new_filter_logic)

# Add tabs UI
tabs_ui = """          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
              <button
                onClick={() => setActiveTab('all')}
                className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
              >
                همه افراد
              </button>
              <button
                onClick={() => setActiveTab('incomplete')}
                className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'incomplete' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
              >
                افراد ناقص
              </button>
            </div>
            <div className="relative w-full sm:w-96">"""

text = text.replace("""          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
            <div className="relative w-full sm:w-96">""", tabs_ui)

with open('src/components/payroll/EmployeeProfilesManager.tsx', 'w') as f:
    f.write(text)
