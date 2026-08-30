import re

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace import PayrollSettings with the new ones
content = content.replace("const PayrollSettings = React.lazy(() => import('./components/payroll/PayrollSettings'));",
"const OrderTemplatesManager = React.lazy(() => import('./components/payroll/OrderTemplatesManager'));\nconst WorkplacesManager = React.lazy(() => import('./components/payroll/WorkplacesManager'));")

# Replace route
content = content.replace('<Route path="/payroll_settings" element={<PayrollSettings showNotification={showNotification} storeSettings={storeSettings} />} />',
'<Route path="/order_templates" element={<OrderTemplatesManager showNotification={showNotification} storeSettings={storeSettings} />} />\n                          <Route path="/workplaces" element={<WorkplacesManager showNotification={showNotification} storeSettings={storeSettings} />} />')


with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

