import fs from 'fs';

const version = {
  version: '1.0.0',
  buildTime: new Date().toISOString()
};

fs.writeFileSync('./src/version.json', JSON.stringify(version, null, 2));
