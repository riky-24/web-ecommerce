process.env.DATABASE_PATH = ':memory:';
const request = require('supertest');
const app = require('../src/app');

describe('Coupons (admin)', () => {
  const admin = {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: 'adminpass',
  };
  beforeAll(async () => {
    // ensure ADMIN_USERNAME env is set for admin-only routes in tests
    process.env.ADMIN_USERNAME = admin.username;
    // ensure admin user exists
    await request(app).post('/auth/register').send(admin);
  });

  test('create and list coupons as admin', async () => {
    const login = await request(app).post('/auth/login').send(admin);
    const token = login.body.token;
    const create = await request(app)
      .post('/coupons')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: 'DISC10', percentOff: 10 });
    expect(create.statusCode).toBe(201);
    const list = await request(app)
      .get('/coupons')
      .set('Authorization', `Bearer ${token}`);
    expect(list.statusCode).toBe(200);
    expect(list.body.length).toBeGreaterThan(0);
  });
});
