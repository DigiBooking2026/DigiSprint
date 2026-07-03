fetch('http://37.59.205.27/api/admin/projects', {
  headers: {
    'x-api-key': 'vBqUs2lfI5fMcaMXRbvsonmfxELwtPel'
  }
}).then(async r => {
  console.log('Status:', r.status);
  console.log('Headers:', Object.fromEntries(r.headers.entries()));
  console.log('Body:', await r.text());
}).catch(console.error);
