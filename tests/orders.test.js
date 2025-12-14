process.env.DATABASE_PATH = ':memory:';
const request = require('supertest');
const app = require('../src/app');
const { createOrder } = require('../src/data/orders');

describe('Orders (admin)', () => {
  const admin = {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: 'adminpass',
  };
  beforeAll(async () => {
    process.env.ADMIN_USERNAME = admin.username;
    await request(app).post('/auth/register').send(admin);
  });

  test('admin can list orders', async () => {
    // create an order directly
    const ord = await createOrder({
      productId: 'p1',
      username: 'buyer',
      amount: 10,
      currency: 'usd',
      stripeSessionId: 's1',
      status: 'paid',
    });
    const login = await request(app).post('/auth/login').send(admin);
    const token = login.body.token;
    const res = await request(app)
      .get('/orders')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.find((o) => o.id === ord.id)).toBeDefined();
  });
});
