with open('src/components/payroll/WorkplacesManager.tsx', 'r') as f:
    lines = f.readlines()

new_lines = []
skip = False
for line in lines:
    if "useEffect(() => {" in line:
        new_lines.append("  useEffect(() => {\n")
        new_lines.append("    fetchWorkplaces();\n")
        new_lines.append("    setEditingWorkplaceId(null);\n")
        new_lines.append("    resetForm();\n")
        new_lines.append("  }, []);\n")
        skip = True
        continue
    if skip and "}, [isOpen]);" in line:
        skip = False
        continue
    if skip:
        continue
    
    if "if (!isOpen) return null;" in line:
        continue
    if '<div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" dir="rtl">' in line:
        new_lines.append('    <div className="h-full bg-slate-50 flex flex-col relative overflow-hidden" dir="rtl">\n')
        continue
    if '<div className="bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl flex flex-col">' in line:
        new_lines.append('      <div className="flex-1 overflow-auto p-6 pt-4 w-full mx-auto">\n')
        continue
    if '<div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-3xl">' in line:
        new_lines.append('        <div className="p-6 mb-6 border-b border-slate-200 bg-white rounded-3xl shadow-sm">\n')
        continue
    if '<div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">' in line:
        new_lines.append('            <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center shadow-sm">\n')
        continue
    if '<h2 className="text-xl font-black text-slate-800">مدیریت کارگاه‌ها</h2>' in line:
        new_lines.append('              <h1 className="text-2xl font-black text-slate-800">مدیریت کارگاه‌ها</h1>\n')
        continue
    if '<button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors">' in line:
        skip = True # skip the close button
        continue
    if skip and '</button>' in line:
        skip = False
        continue
    
    new_lines.append(line)

with open('src/components/payroll/WorkplacesManager.tsx', 'w') as f:
    f.writelines(new_lines)
