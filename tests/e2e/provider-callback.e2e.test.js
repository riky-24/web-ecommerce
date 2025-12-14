const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/db');

beforeEach(async () => {
  process.env.DATABASE_PATH = ':memory:';
  await db.deleteAllUsers();
  await db.deleteAllProducts();
});

test('E2E QRIS provider callback updates order status (mocked)', async () => {
  // create admin and product
  process.env.ADMIN_USERNAME = 'admin';
  await request(app).post('/auth/register').send({ username: 'admin', password: 'adminpass' }).expect(201);
  const login = await request(app).post('/auth/login').send({ username: 'admin', password: 'adminpass' }).expect(200);
  const token = login.body.token;
  const prod = await request(app)
    .post('/products')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'e2e-prod', price: 1, description: 'desc' })
    .expect(201);
  const productId = prod.body.id;

  // create QRIS payment (mock provider)
  const res = await request(app).post('/checkout/create-qris').send({ productId }).expect(200);
  const paymentId = res.body.paymentId;

  // simulate provider callback using fallback payload
  await request(app).post('/checkout/qris-callback').send({ paymentId }).expect(200);

  // poll status
  const status = await request(app).get(`/checkout/qris-status/${paymentId}`).expect(200);
  expect(status.body.status).toBe('paid');
});
