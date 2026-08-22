const fs = require('fs');

let code = fs.readFileSync('src/components/payroll/ContractsManager.tsx', 'utf8');

const targetStr = `                setContractForm({ 
                  personId: null,
    contractNumber: '',
    terminationDate: null, 
                  
                  startDate: new Date(new Date().setHours(0,0,0,0)), 
                  endDate: new Date(new Date().setHours(0,0,0,0)), 
                  location: '',
    workplaceId: '', 
                  status: 'draft', 

                                                                                                                                               
                  selectedComponents: []
                });`;

const replaceStr = `                setContractForm({ 
                  personId: null,
                  contractNumber: '',
                  startDate: new Date(new Date().setHours(0,0,0,0)), 
                  endDate: new Date(new Date().setHours(0,0,0,0)), 
                  location: '',
                  workplaceId: '', 
                  status: 'draft'
                });`;

code = code.replace(targetStr, replaceStr);

fs.writeFileSync('src/components/payroll/ContractsManager.tsx', code);
console.log('Done');
