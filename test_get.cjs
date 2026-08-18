const { getAllDbData } = require('./dist/server.cjs') || {};
if (getAllDbData) {
  getAllDbData().then(res => console.log(JSON.stringify(res))).catch(console.error);
}
