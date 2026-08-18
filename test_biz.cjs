const http = require('http');
http.request('http://localhost:3000/api/data/businesses', { headers: { 'x-store-id': 'default' } }, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log('Businesses:', data));
}).end();
