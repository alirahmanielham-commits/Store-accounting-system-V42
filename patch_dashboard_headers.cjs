const fs = require('fs');
let code = fs.readFileSync('src/components/admin/DatabaseDashboard.tsx', 'utf8');

const replacement = `const apiFetch = async (url: string, options: any = {}) => {
  const storeId = localStorage.getItem('activeStoreId') || 'default';
  const token = localStorage.getItem('access_token') || '';
  const headers = { ...options.headers, 'x-store-id': storeId, 'Authorization': 'Bearer ' + token };
  return fetch(url, { ...options, headers });
};`;

code = code.replace(/export function DatabaseDashboard\(\) \{/, replacement + '\nexport function DatabaseDashboard() {');
code = code.replace(/await fetch\(/g, 'await apiFetch(');
code = code.replace(/fetch\('\/api\/db\/health'\)/g, "apiFetch('/api/db/health')");
code = code.replace(/fetch\('\/api\/db\/table-sizes'\)/g, "apiFetch('/api/db/table-sizes')");

fs.writeFileSync('src/components/admin/DatabaseDashboard.tsx', code);
