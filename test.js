fetch('http://localhost:3000/api/test').then(async r => console.log(r.status, await r.text()))  
