process.env.DATABASE_PATH = ':memory:';
const request = require('supertest');
const app = require('../src/app');
const { createLicense } = require('../src/data/licenses');

describe('Licenses API', () => {
  const user = { username: 'licuser', password: 'pass1234' };
  const admin = {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: 'adminpass',
  };
  beforeAll(async () => {
    process.env.ADMIN_USERNAME = admin.username;
    await request(app).post('/auth/register').send(user);
    await request(app).post('/auth/register').send(admin);
  });

  test('user can list their licenses; admin can list all', async () => {
    // create a license for user
    const lic = await createLicense({
      orderId: 'o1',
      productId: 'p1',
      username: user.username,
    });

    const login = await request(app).post('/auth/login').send(user);
    expect(login.statusCode).toBe(200);
    const token = login.body.token;
    const res = await request(app)
      .get('/licenses')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.find((l) => l.key === lic.key)).toBeDefined();

    const adminLogin = await request(app).post('/auth/login').send(admin);
    expect(adminLogin.statusCode).toBe(200);
    const adminToken = adminLogin.body.token;
    const all = await request(app)
      .get('/licenses')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(all.statusCode).toBe(200);
    expect(all.body.length).toBeGreaterThan(0);
  });
});
