const request = require('supertest');
const { v4: uuidv4 } = require('uuid');

describe('Admin actions', () => {
  beforeEach(async () => {
    jest.resetModules();
    process.env.NODE_ENV = 'test';
    const db = require('../src/db');
    await db.deleteAllUsers();
  });

  test('admin can unlock a user and audit is recorded', async () => {
    process.env.ADMIN_USERNAME = 'admin';
    const app = require('../src/app');
    // register admin and user
    await request(app)
      .post('/auth/register')
      .send({ username: 'admin', password: 'adminpass' });
    await request(app)
      .post('/auth/register')
      .send({ username: 'victim', password: 'victimpass' });
    // lock victim via db helper
    const db = require('../src/db');
    for (let i = 0; i < 5; i++) await db.incrementFailedLogin('victim');
    // login as admin
    const login = await request(app)
      .post('/auth/login')
      .send({ username: 'admin', password: 'adminpass' });
    const token = login.body.token;
    // unlock
    const res = await request(app)
      .post('/admin/unlock')
      .set('Authorization', `Bearer ${token}`)
      .send({ username: 'victim' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('ok', true);
    // audit should contain an entry
    const audits = await request(app)
      .get('/admin/audits')
      .set('Authorization', `Bearer ${token}`);
    expect(audits.status).toBe(200);
    expect(Array.isArray(audits.body)).toBe(true);
    expect(audits.body.length).toBeGreaterThanOrEqual(1);
  });

  test('non-admin cannot call admin endpoints', async () => {
    process.env.ADMIN_USERNAME = 'admin';
    const app = require('../src/app');
    await request(app)
      .post('/auth/register')
      .send({ username: 'user1', password: 'user1pass' });
    const login = await request(app)
      .post('/auth/login')
      .send({ username: 'user1', password: 'user1pass' });
    const token = login.body.token;
    const res = await request(app)
      .post('/admin/unlock')
      .set('Authorization', `Bearer ${token}`)
      .send({ username: 'victim' });
    expect(res.status).toBe(403);
  });
});
