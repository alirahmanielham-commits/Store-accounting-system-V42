const { getBackupsDir } = require('./dist/server.cjs') || {};
const fs = require('fs');
console.log(getBackupsDir());
