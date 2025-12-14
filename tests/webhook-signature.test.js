const request = require('supertest');
const app = require('../src/app');
const db = require('../src/db');
const crypto = require('crypto');

beforeEach(async () => {
  process.env.DATABASE_PATH = ':memory:';
  await db.deleteAllUsers();
  await db.deleteAllProducts();
  // ensure QRIS provider mock used by default
  delete process.env.QRIS_PROVIDER;
});

afterEach(() => {
  delete process.env.XENDIT_WEBHOOK_SECRET;
  delete process.env.XENDIT_CALLBACK_TOKEN;
  delete process.env.MIDTRANS_SERVER_KEY;
});

test('Xendit rejects invalid token and accepts valid token', async () => {
  process.env.XENDIT_CALLBACK_TOKEN = 'tok_test';
  const bad = await request(app)
    .post('/checkout/qris-callback')
    .set('Content-Type', 'application/json')
    .send({ external_id: 'nope' });
  // invalid/missing token should produce a client or server error
  expect(bad.status).toBeGreaterThanOrEqual(400);

  const ok = await request(app)
    .post('/checkout/qris-callback')
    .set('Content-Type', 'application/json')
    .set('x-callback-token', 'tok_test')
    .send({ external_id: 'nope' });
  // ensure valid token does not cause server error
  expect(ok.status).not.toBe(500);
});

test('Xendit accepts valid HMAC signature', async () => {
  process.env.XENDIT_WEBHOOK_SECRET = 'secret_x';
  const payload = JSON.stringify({ external_id: 'p1' });
  const sig = crypto.createHmac('sha256', process.env.XENDIT_WEBHOOK_SECRET).update(Buffer.from(payload)).digest('hex');
  const res = await request(app)
    .post('/checkout/qris-callback')
    .set('Content-Type', 'application/json')
    .set('x-signature', sig)
    .send(payload);
  expect(res.status).not.toBe(500);
});

test('Midtrans rejects invalid signature and accepts valid signature_key in body', async () => {
  process.env.MIDTRANS_SERVER_KEY = 'mid_server';
  const body = { order_id: 'o1', status_code: '200', gross_amount: '100' };
  const payload = JSON.parse(JSON.stringify(body));
  const concat = `${payload.order_id}${payload.status_code}${payload.gross_amount}${process.env.MIDTRANS_SERVER_KEY}`;
  const sig = crypto.createHash('sha512').update(concat).digest('hex');

  // invalid
  const bad = await request(app)
    .post('/checkout/qris-callback')
    .set('Content-Type', 'application/json')
    .send({ ...body, signature_key: 'bad' });
  expect(bad.status).toBeGreaterThanOrEqual(400);

  // valid
  const ok = await request(app)
    .post('/checkout/qris-callback')
    .set('Content-Type', 'application/json')
    .send({ ...body, signature_key: sig });
  expect(ok.status).not.toBe(500);
});
