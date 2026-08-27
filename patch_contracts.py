import re

with open('src/components/payroll/ContractsManager.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

generator_func = """
  const autoGenerateContractNumber = (selectedPersonId: any, sDate: any, eDate: any) => {
    if (!selectedPersonId || !sDate || !eDate || !personsData) return '';
    const person = personsData.find(p => String(p.id) === String(selectedPersonId));
    if (!person) return '';
    const code = person.personCode || person.id;
    try {
      const sYear = new Intl.DateTimeFormat('fa-IR-u-nu-latn', { year: 'numeric' }).format(sDate);
      const eYear = new Intl.DateTimeFormat('fa-IR-u-nu-latn', { year: 'numeric' }).format(eDate);
      return `${code}${sYear}${eYear}`;
    } catch(e) {
      return '';
    }
  };

  useEffect(() => {
    if (!editingContractId && contractForm.personId && contractForm.startDate && contractForm.endDate) {
      const generated = autoGenerateContractNumber(contractForm.personId.value, contractForm.startDate, contractForm.endDate);
      if (generated && generated !== contractForm.contractNumber) {
        setContractForm(prev => ({ ...prev, contractNumber: generated }));
      }
    }
  }, [contractForm.personId, contractForm.startDate, contractForm.endDate, editingContractId, personsData]);
"""

target = "status: 'draft'\n  });"
if "autoGenerateContractNumber" not in code:
    code = code.replace(target, target + "\n" + generator_func)

with open('src/components/payroll/ContractsManager.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
