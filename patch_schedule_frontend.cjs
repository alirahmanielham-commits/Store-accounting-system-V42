const fs = require('fs');
let code = fs.readFileSync('src/components/admin/DatabaseDashboard.tsx', 'utf8');

// Replace loadConfig
const oldLoadConfig = /const loadConfig = async \(\) => \{[\s\S]*?\} catch \(e\) \{\}\n  \};/;
const newLoadConfig = `const loadConfig = async () => {
    try {
      const res = await fetch('/api/db/backup-config');
      const data = await res.json();
      if (data) {
        setScheduleConfig(prev => ({
          ...prev,
          enabled: data.enabled !== undefined ? data.enabled : data.intervalHours > 0,
          frequency: data.frequency || 'daily',
          time: data.time || '02:00',
          retention: data.retention || 5,
          cron: data.cron || '0 2 * * *'
        }));
        if (data.path || data.storageType) {
          setStorageConfig(prev => ({ 
            ...prev, 
            localPath: data.path || '', 
            type: data.storageType || 'local', 
            cloudProvider: data.remoteProvider || 's3' 
          }));
        }
      }
    } catch (e) {}
  };`;
code = code.replace(oldLoadConfig, newLoadConfig);

// Replace saveScheduleSettings
const oldSaveSchedule = /const saveScheduleSettings = async \(\) => \{[\s\S]*?\} catch \(e\) \{[\s\S]*?\}\n  \};/;
const newSaveSchedule = `const saveScheduleSettings = async () => {
    try {
      let intervalHours = 24;
      if (scheduleConfig.frequency === 'weekly') intervalHours = 168;
      if (scheduleConfig.frequency === 'monthly') intervalHours = 720;
      if (scheduleConfig.frequency === 'custom') intervalHours = 4; // Arbitrary for custom right now
      
      await fetch('/api/db/backup-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          enabled: scheduleConfig.enabled,
          frequency: scheduleConfig.frequency,
          time: scheduleConfig.time,
          retention: scheduleConfig.retention,
          cron: scheduleConfig.cron,
          intervalHours: intervalHours
        })
      });
      showNotification('تنظیمات زمان‌بندی ذخیره شد', 'success');
    } catch (e) {
      showNotification('خطا در ذخیره تنظیمات', 'error');
    }
  };`;
code = code.replace(oldSaveSchedule, newSaveSchedule);

fs.writeFileSync('src/components/admin/DatabaseDashboard.tsx', code);
console.log('Patched frontend for full schedule support.');
