const fs = require('fs');
let code = fs.readFileSync('src/components/admin/DatabaseDashboard.tsx', 'utf8');

code = code.replace(
`      const res = await fetch('/api/db/backups/create', { method: 'POST' });
      if (!res.ok) throw new Error('Backup failed');`,
`      const res = await fetch('/api/db/backups/create', { method: 'POST' });
      if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || 'خطای سرور');
      }`);

code = code.replace(
`    } catch(err) {
      showNotification('خطا در تهیه بک‌آپ', 'error');`,
`    } catch(err: any) {
      showNotification('خطا در تهیه بک‌آپ: ' + err.message, 'error');`);

code = code.replace(
`        details: 'خطا در عملیات بک‌آپ'
      }, ...logs]);`,
`        details: 'خطای بک‌آپ: ' + err.message
      }, ...logs]);`);

fs.writeFileSync('src/components/admin/DatabaseDashboard.tsx', code);
