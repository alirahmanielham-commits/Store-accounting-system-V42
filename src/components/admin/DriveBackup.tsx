import React from 'react';
import DatabaseDashboard from './DatabaseDashboard';

interface LocalBackupProps {
  showNotification: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export default function DriveBackup({ showNotification }: LocalBackupProps) {
  return <DatabaseDashboard showNotification={showNotification} />;
}
