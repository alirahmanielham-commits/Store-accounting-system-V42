import re

with open('src/components/payroll/EmployeeOrdersManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# formData
old_formdata = """  const [formData, setFormData] = useState({
    personId: '',
    contractId: '',
    templateId: '',
    issueDate: new Date(),
    status: 'draft'
  });"""
new_formdata = """  const [formData, setFormData] = useState({
    personId: '',
    contractId: '',
    templateId: '',
    name: '',
    items: [] as any[],
    issueDate: new Date(),
    status: 'draft'
  });"""
content = content.replace(old_formdata, new_formdata)

# Reset form on open
old_add_btn = """              <button onClick={() => {
                setEditingId(null);
                setFormData({ personId: '', contractId: '', templateId: '', issueDate: new Date(), status: 'draft' });
                setIsModalOpen(true);
              }}"""
new_add_btn = """              <button onClick={() => {
                setEditingId(null);
                setFormData({ personId: '', contractId: '', templateId: '', name: '', items: [], issueDate: new Date(), status: 'draft' });
                setIsModalOpen(true);
              }}"""
content = content.replace(old_add_btn, new_add_btn)

# Edit logic
old_edit_btn = """                            <button onClick={() => {
                              setEditingId(order.id);
                              setFormData({
                                personId: order.personId,
                                contractId: order.contractId,
                                templateId: order.templateId,
                                issueDate: order.issueDate ? new Date(Number(order.issueDate)) : new Date(),
                                status: order.status
                              });
                              setIsModalOpen(true);
                            }}"""
new_edit_btn = """                            <button onClick={() => {
                              setEditingId(order.id);
                              setFormData({
                                personId: order.personId,
                                contractId: order.contractId,
                                templateId: order.templateId,
                                name: order.name || '',
                                items: order.items || [],
                                issueDate: order.issueDate ? new Date(Number(order.issueDate)) : new Date(),
                                status: order.status
                              });
                              setIsModalOpen(true);
                            }}"""
content = content.replace(old_edit_btn, new_edit_btn)

# Table Header
content = content.replace('<th className="p-4 font-bold">قالب حکم</th>', '<th className="p-4 font-bold">عنوان حکم</th>')
# Table Row
old_td = """<td className="p-4 text-slate-600 font-medium font-mono">{contract?.contractNumber || '---'}</td>
                        <td className="p-4 text-slate-600">{template?.name || '---'}</td>"""
new_td = """<td className="p-4 text-slate-600 font-medium font-mono">{contract?.contractNumber || '---'}</td>
                        <td className="p-4 text-slate-600">{order.name || template?.name || '---'}</td>"""
content = content.replace(old_td, new_td)

# Payload save
old_payload = """      const payload = {
        personId: formData.personId,
        contractId: formData.contractId,
        templateId: formData.templateId,
        issueDate: issueDateStr,
        status: formData.status
      };"""
new_payload = """      const payload = {
        personId: formData.personId,
        contractId: formData.contractId,
        templateId: formData.templateId,
        name: formData.name,
        items: formData.items,
        issueDate: issueDateStr,
        status: formData.status
      };"""
content = content.replace(old_payload, new_payload)

with open('src/components/payroll/EmployeeOrdersManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Logic patched.")
