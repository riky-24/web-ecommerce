const request = require('supertest');
const app = require('../src/app');
const products = require('../src/data/products');

beforeEach(async () => {
  await products.clearProducts();
  await products.createProduct({
    name: 'Top-up 10k',
    price: 10000,
    description: 'Top-up 10k credits',
    currency: 'idr',
    category: 'topup',
  });
});

afterEach(async () => {
  await products.clearProducts();
});

test('create qris payment and confirm', async () => {
  const list = await products.listProducts();
  const p = list[0];
  const res = await request(app)
    .post('/checkout/create-qris')
    .send({ productId: p.id })
    .expect(200);
  expect(res.body.paymentId).toBeTruthy();
  expect(res.body.qr).toMatch(/^data:image\//i);

  const status = await request(app)
    .get(`/checkout/qris-status/${res.body.paymentId}`)
    .expect(200);
  expect(status.body.status).toBe('pending');

  const cb = await request(app)
    .post('/checkout/qris-callback')
    .send({ paymentId: res.body.paymentId })
    .expect(200);
  expect(cb.body.status).toBe('paid');

  const status2 = await request(app)
    .get(`/checkout/qris-status/${res.body.paymentId}`)
    .expect(200);
  expect(status2.body.status).toBe('paid');
});

test('provider webhook (xendit) updates status via callback handler', async () => {
  process.env.QRIS_PROVIDER = 'xendit';
  process.env.XENDIT_API_KEY = 'test-key';
  // reload modules so the provider factory picks up the new env
  jest.resetModules();
  const appReload = require('../src/app');
  const db = require('../src/db');
  const id = 'cb-test-1';
  await db.insertOrder({
    id,
    productId: 'p1',
    username: null,
    amount: 1000,
    currency: 'idr',
    paymentMethod: 'qris',
    paymentId: id,
    status: 'pending',
    createdAt: new Date().toISOString(),
  });

  const cb = await request(appReload)
    .post('/checkout/qris-callback')
    .send({ external_id: id })
    .expect(200);
  expect(cb.body.status).toBe('paid');

  const status = await request(appReload).get(`/checkout/qris-status/${id}`).expect(200);
  expect(status.body.status).toBe('paid');

  delete process.env.QRIS_PROVIDER;
  delete process.env.XENDIT_API_KEY;
});
