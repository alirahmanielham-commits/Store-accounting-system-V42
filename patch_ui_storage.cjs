const fs = require('fs');
let code = fs.readFileSync('src/components/admin/DatabaseDashboard.tsx', 'utf8');

code = code.replace(
  "body: JSON.stringify({ path: storageConfig.localPath, storageType: storageConfig.type, remoteProvider: storageConfig.cloudProvider })",
  "body: JSON.stringify({ path: storageConfig.localPath, storageType: storageConfig.type, remoteProvider: storageConfig.cloudProvider, cloudAuthUrl: storageConfig.cloudAuthUrl, cloudUser: storageConfig.cloudUser, cloudPass: storageConfig.cloudPass })"
);

code = code.replace(
  "cloudProvider: data.remoteProvider || 's3'",
  "cloudProvider: data.remoteProvider || 's3', cloudAuthUrl: data.cloudAuthUrl || prev.cloudAuthUrl, cloudUser: data.cloudUser || prev.cloudUser, cloudPass: data.cloudPass || prev.cloudPass"
);

fs.writeFileSync('src/components/admin/DatabaseDashboard.tsx', code);
