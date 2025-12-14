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
