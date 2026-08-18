const { getAllDbData } = require('./dist/server.cjs') || {};
if (!getAllDbData) console.log('getAllDbData not exported');
