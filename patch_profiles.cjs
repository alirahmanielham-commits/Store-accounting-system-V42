const fs = require('fs');
let code = fs.readFileSync('src/components/payroll/EmployeeProfilesManager.tsx', 'utf8');

const newHeader = `import React, { useState, useMemo } from 'react';
import { Users, Edit2, Search, XCircle, FileText, CheckCircle, Save } from 'lucide-react';
import { updatePerson } from '../../services/personService';

export default function EmployeeProfilesManager({ personsData, fetchPersons, showNotification }: any) {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'incomplete'>('all');
  
  const [formData, setFormData] = useState({
    insuranceNumber: '',
    insuranceType: '',
    educationLevel: '',
    experienceYears: '',
    maritalStatus: 'single',
    studyField: '',
    jobTitle: '',
    jobCategory: '',
    employmentType: 'full_time',
    childrenCount: '0'
  });

  const employees = useMemo(() => {
    return (personsData || []).filter((p: any) => p.role === 'employee');
  }, [personsData]);

  const filteredEmployees = useMemo(() => {
    let result = employees;
    if (activeTab === 'incomplete') {
      result = result.filter((e: any) => {
        return !(e.insuranceNumber && e.jobTitle);
      });
    }
    if (searchQuery) {
      result = result.filter((e: any) => e.name?.includes(searchQuery));
    }
    return result;
  }, [employees, searchQuery, activeTab]);

  const handleEdit = (personId: string) => {
    setEditingPersonId(personId);
    const existingPerson = employees.find((p: any) => p.id === personId);
    if (existingPerson) {
      setFormData({
        insuranceNumber: existingPerson.insuranceNumber || '',
        insuranceType: existingPerson.insuranceType || '',
        educationLevel: existingPerson.educationLevel || '',
        experienceYears: existingPerson.experienceYears || '',
        maritalStatus: existingPerson.maritalStatus || 'single',
        studyField: existingPerson.studyField || '',
        jobTitle: existingPerson.jobTitle || '',
        jobCategory: existingPerson.jobCategory || '',
        employmentType: existingPerson.employmentType || 'full_time',
        childrenCount: existingPerson.childrenCount || '0'
      });
    }
  };

  const handleSave = async () => {
    if (!editingPersonId) return;
    try {
      const existingPerson = employees.find((p: any) => p.id === editingPersonId);
      if (existingPerson) {
        await updatePerson(existingPerson.id, { ...existingPerson, ...formData });
      }
      showNotification('اطلاعات پرسنلی با موفقیت ذخیره شد', 'success');
      setEditingPersonId(null);
      if (fetchPersons) fetchPersons();
    } catch (e) {
      console.error(e);
      showNotification('خطا در ذخیره اطلاعات', 'error');
    }
  };`;

// replace up to line 110
const parts = code.split(/const handleSave = async \(\) => \{[\s\S]*?^  \};/m);
if (parts.length > 1) {
  const newCode = newHeader + parts[1];
  fs.writeFileSync('src/components/payroll/EmployeeProfilesManager.tsx', newCode);
  console.log("Success");
} else {
  console.log("Could not match the replacement block.");
}
