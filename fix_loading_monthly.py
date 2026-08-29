import re

with open('src/components/payroll/MonthlyAttendance.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("const handleSave = async (targetIds?: string[]) => {", "const handleSave = async (targetIds?: string[]) => {\n    if (loading) return;\n    setLoading(true);")
content = content.replace("showNotification(`کارکرد ${toPersianDigits(targets.length)} نفر با موفقیت ذخیره شد`, 'success');\n      fetchAttendance();\n    } catch (e) {\n      showNotification('خطا در ذخیره سازی', 'error');\n    }\n  };", "showNotification(`کارکرد ${toPersianDigits(targets.length)} نفر با موفقیت ذخیره شد`, 'success');\n      await fetchAttendance();\n    } catch (e) {\n      showNotification('خطا در ذخیره سازی', 'error');\n    } finally {\n      setLoading(false);\n    }\n  };")

content = content.replace("const handleCalculateFromDaily = async (targetIds?: string[]) => {", "const handleCalculateFromDaily = async (targetIds?: string[]) => {\n    if (loading) return;\n    setLoading(true);")
content = content.replace("showNotification(`کارکرد ${toPersianDigits(idsToCalc.length)} نفر با موفقیت محاسبه شد. برای ثبت نهایی روی ذخیره کلیک کنید.`, 'success');\n    } catch (e) {\n      showNotification('خطا در محاسبه کارکرد', 'error');\n    }\n  };", "showNotification(`کارکرد ${toPersianDigits(idsToCalc.length)} نفر با موفقیت محاسبه شد. برای ثبت نهایی روی ذخیره کلیک کنید.`, 'success');\n    } catch (e) {\n      showNotification('خطا در محاسبه کارکرد', 'error');\n    } finally {\n      setLoading(false);\n    }\n  };")

# Add disabled and loading spinner to main action buttons in MonthlyAttendance
def replace_button(text_to_find, replacement):
    global content
    content = content.replace(text_to_find, replacement)

replace_button(
    '<button onClick={() => handleCalculateFromDaily()} className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 font-bold transition-colors">',
    '<button onClick={() => handleCalculateFromDaily()} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 font-bold transition-colors disabled:opacity-50">'
)
replace_button(
    '<Calculator className="w-5 h-5" />',
    '{loading ? <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /> : <Calculator className="w-5 h-5" />}'
)

replace_button(
    '<button onClick={() => handleSave()} className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm font-bold transition-colors">',
    '<button onClick={() => handleSave()} disabled={loading} className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm font-bold transition-colors disabled:opacity-50">'
)
replace_button(
    '<Save className="w-5 h-5" />',
    '{loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />}'
)

overlay = """
      {loading && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/20 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center gap-4 min-w-[200px] border border-slate-100">
            <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
            <span className="font-bold text-slate-700 animate-pulse">در حال پردازش...</span>
          </div>
        </div>
      )}
"""
content = content.replace(
    '<div className="bg-slate-50 min-h-[calc(100vh-2rem)] p-4 md:p-8" dir="rtl">',
    '<div className="bg-slate-50 min-h-[calc(100vh-2rem)] p-4 md:p-8 relative" dir="rtl">' + overlay
)

with open('src/components/payroll/MonthlyAttendance.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
