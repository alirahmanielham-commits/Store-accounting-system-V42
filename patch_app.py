import re

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add import
import_pattern = r'''(const ContractsManager = React\.lazy\(\(\) => import\('\./components/payroll/ContractsManager'\)\);)'''
import_repl = r'''\1
const EmployeeProfilesManager = React.lazy(() => import('./components/payroll/EmployeeProfilesManager'));'''

content = re.sub(import_pattern, import_repl, content)

# Add route
route_pattern = r'''(<Route path="/employee_contracts" element=\{<ContractsManager.*?\/>\} \/>)'''
route_repl = r'''<Route path="/employee_profiles" element={<EmployeeProfilesManager personsData={persons} showNotification={showNotification} />} />
            \1'''

content = re.sub(route_pattern, route_repl, content)

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
