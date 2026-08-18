const { getAllDbData } = require('./dist/server.cjs') || {};
if (getAllDbData) {
  getAllDbData().then(rows => console.log('Rows count:', rows.length)).catch(console.error);
}
