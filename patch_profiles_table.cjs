const fs = require('fs');
let code = fs.readFileSync('src/components/payroll/EmployeeProfilesManager.tsx', 'utf8');

const targetStr = `{filteredEmployees.map((emp: any) => {
                  const profile = profiles.find(p => p.personId === emp.id);
                  const isCompleted = profile && profile.insuranceNumber && profile.jobTitle;
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-bold text-slate-800">{emp.name}</td>
                      <td className="p-4 text-slate-600">{profile?.jobTitle || '---'}</td>`;

const replacement = `{filteredEmployees.map((emp: any) => {
                  const isCompleted = emp.insuranceNumber && emp.jobTitle;
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-bold text-slate-800">{emp.name}</td>
                      <td className="p-4 text-slate-600">{emp.jobTitle || '---'}</td>`;

// Because line numbers might be tricky, let's use regex
code = code.replace(/\{filteredEmployees\.map\(\(emp: any\) => \{[\s\S]*?<td className="p-4 text-slate-600">\{profile\?\.jobTitle \|\| '--'\}<\/td>/m, replacement);
// Or string replace if exact matches
code = code.replace("const profile = profiles.find(p => p.personId === emp.id);", "");
code = code.replace("const isCompleted = profile && profile.insuranceNumber && profile.jobTitle;", "const isCompleted = emp.insuranceNumber && emp.jobTitle;");
code = code.replace("{profile?.jobTitle || '---'}", "{emp.jobTitle || '---'}");

fs.writeFileSync('src/components/payroll/EmployeeProfilesManager.tsx', code);
console.log("Success");
