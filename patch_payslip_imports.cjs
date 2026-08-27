const fs = require('fs');
let code = fs.readFileSync('src/components/payroll/PayslipsManager.tsx', 'utf8');

code = code.replace(
  `import { Calculator, Printer, CheckCircle, Search, FileText, X, Download, FileSpreadsheet, Building2, MapPin, Calendar, Clock, DollarSign, Wallet, TrendingUp, TrendingDown, User, Check, AlertCircle, RotateCcw } from 'lucide-react';`,
  `import { Calculator, Printer, CheckCircle, Search, FileText, X, Download, FileSpreadsheet, Building2, MapPin, Calendar, Clock, DollarSign, Wallet, TrendingUp, TrendingDown, User, Check, AlertCircle, RotateCcw, Trash2 } from 'lucide-react';`
);

code = code.replace(
  `import { getOrderTemplates, getPayslips, addPayslip, updatePayslip, getMonthlyAttendances, getEmployeeContracts, getPayslipItems, getSalaryComponents, addPayslipItem, deletePayslipItemsByPayslipId, getEmployeeOrders } from '../../services/hrService';`,
  `import { getOrderTemplates, getPayslips, addPayslip, updatePayslip, deletePayslip, getMonthlyAttendances, getEmployeeContracts, getPayslipItems, getSalaryComponents, addPayslipItem, deletePayslipItemsByPayslipId, getEmployeeOrders } from '../../services/hrService';`
);

fs.writeFileSync('src/components/payroll/PayslipsManager.tsx', code);
