const http = require('http');
http.request('http://localhost:3000/api/db/health', { headers: { 'x-store-id': 'b1' } }, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log('Health:', data));
}).end();
