const request = require('supertest');

describe('Audit on lock', () => {
  test('locking a user creates an audit entry', async () => {
    process.env.NODE_ENV = 'test';
    jest.resetModules();
    const db = require('../src/db');
    await db.deleteAllUsers();
    const app = require('../src/app');
    await request(app)
      .post('/auth/register')
      .send({ username: 'tlock', password: 'tlockpass' });
    // directly increment failed login to avoid rate-limiter interference
    for (let i = 0; i < 5; i++) await db.incrementFailedLogin('tlock');
    // admin audits (system lock) should be present
    // set admin and login
    process.env.ADMIN_USERNAME = 'admin';
    await request(app)
      .post('/auth/register')
      .send({ username: 'admin', password: 'adminpass' });
    const login = await request(app)
      .post('/auth/login')
      .send({ username: 'admin', password: 'adminpass' });
    const audits = await request(app)
      .get('/admin/audits')
      .set('Authorization', `Bearer ${login.body.token}`);
    expect(audits.status).toBe(200);
    const found = audits.body.find(
      (a) => a.action === 'lock' && a.target === 'tlock'
    );
    expect(found).toBeTruthy();
  });
});
