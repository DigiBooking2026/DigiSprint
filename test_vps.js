Promise.all([
  fetch('http://localhost:3000/api/projects'),
  fetch('http://localhost:3000/api/tasks'),
  fetch('http://localhost:3000/api/activity')
]).then(async ([p, t, a]) => {
  console.log('Projects:', p.status, await p.text());
  console.log('Tasks:', t.status, await t.text());
  console.log('Activity:', a.status, await a.text());
}).catch(console.error);
