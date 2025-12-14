(async () => {
  process.env.NODE_ENV = 'test';
  process.env.DEBUG_DB = 'true';
  const request = require('supertest');
  const db = require('../src/db');
  await db.deleteAllUsers();
  const app = require('../src/app');
  await request(app).post('/auth/register').send({ username: 'tlock', password: 'tlockpass' });
  for (let i = 0; i < 5; i++) await db.incrementFailedLogin('tlock');
  process.env.ADMIN_USERNAME = 'admin';
  await request(app).post('/auth/register').send({ username: 'admin', password: 'adminpass' });
  const loginRes = await request(app).post('/auth/login').send({ username: 'admin', password: 'adminpass' });
  const audits = await request(app).get('/admin/audits').set('Authorization', `Bearer ${loginRes.body.token}`);
  console.log('audits.status=', audits.status);
  console.log('audits.body=', audits.body);
})();
