const { getBackupsDir } = require('./dist/server.cjs') || {};
if (getBackupsDir) {
  console.log(getBackupsDir());
} else {
  console.log('Not exported');
}
