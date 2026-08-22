import re

with open('src/components/payroll/EmployeeOrdersManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the template change logic to set name correctly
old_template_logic = """                    onChange={e => {
                      const tId = e.target.value;
                      const tpl = templates.find(t => String(t.id) === String(tId));
                      if (tpl) {
                        setFormData({
                          ...formData, 
                          templateId: tId, 
                          name: formData.name || tpl.name || '', 
                          items: JSON.parse(JSON.stringify(tpl.items || []))
                        });
                      } else {
                        setFormData({...formData, templateId: tId});
                      }
                    }}"""

new_template_logic = """                    onChange={e => {
                      const tId = e.target.value;
                      const tpl = templates.find(t => String(t.id) === String(tId));
                      if (tpl) {
                        setFormData({
                          ...formData, 
                          templateId: tId, 
                          name: `حکم کارگزینی ${tpl.name}`, 
                          items: JSON.parse(JSON.stringify(tpl.items || []))
                        });
                      } else {
                        setFormData({...formData, templateId: tId});
                      }
                    }}"""

content = content.replace(old_template_logic, new_template_logic)

# We want to change the rendering to:
# if (isModalOpen) { return <Form /> }
# return <List />

# Finding the boundaries
# 1. Main return
idx = content.find("  return (\n    <div className=\"min-h-full bg-slate-50/50 p-4 md:p-8\" dir=\"rtl\">")

before_return = content[:idx]
render_body = content[idx:]

# the render body contains the modal code wrapped in `{isModalOpen && ( ... )}`
# We will just replace `{isModalOpen && (` and `)}` with nothing, but wait, the modal is currently a popup.
# Let's write a regular expression to extract the modal content.
# The modal content starts after `{isModalOpen && (` and ends before the last `)}`
modal_match = re.search(r'\{isModalOpen && \(\s*(<div.*?)\s*\)\}\s*</div>\s*\);\s*\}', render_body, re.DOTALL)

if not modal_match:
    print("Could not find modal match")
    exit(1)

modal_html = modal_match.group(1)

# Now remove the modal from the main render
list_render = render_body[:modal_match.start()] + "\n    </div>\n  );\n}"

# Fix up modal HTML to be a full page
# currently it has: <div className="fixed inset-0 ..."> 
# we'll replace the outer div classes.
modal_html = modal_html.replace('<div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">', '<div className="min-h-full bg-slate-50/50 p-4 md:p-8" dir="rtl">')
modal_html = modal_html.replace('<div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">', '<div className="bg-white rounded-3xl w-full max-w-4xl mx-auto shadow-sm border border-slate-200">')
modal_html = modal_html.replace('<div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">', '<div className="bg-white border-b border-slate-100 px-6 py-6 flex items-center justify-between rounded-t-3xl">')

# also change the icon from XCircle to something like a back button, or keep it as cancel
# We can just keep XCircle or change to ArrowRight. Let's keep XCircle for now.

# Also add the item rendering that we already have in the modal. Wait, it's already in `modal_html`!
# Because the modal already has it. But wait, I put the item editor right above the status field.
# Let's check if the item editor is captured in modal_html. Yes, it is!

new_render = f"""  if (isModalOpen) {{
    return (
{modal_html}
    );
  }}

{list_render}
"""

with open('src/components/payroll/EmployeeOrdersManager.tsx', 'w', encoding='utf-8') as f:
    f.write(before_return + new_render)

print("Patch successful!")
