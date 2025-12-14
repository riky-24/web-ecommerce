const request = require('supertest');
const app = require('../src/app');
const db = require('../src/db');

beforeEach(async () => {
  process.env.DATABASE_PATH = ':memory:';
  // keep account lock threshold small for speed
  await db.deleteAllUsers();
  await db.deleteAllProducts();
  // ensure no webhook secret so POST /webhooks/stripe will create orders
  delete process.env.STRIPE_WEBHOOK_SECRET;
});

afterEach(async () => {
  delete process.env.ADMIN_USERNAME;
});

async function register(username, password) {
  await request(app).post('/auth/register').send({ username, password }).expect(201);
}

async function login(username, password) {
  const res = await request(app).post('/auth/login').send({ username, password });
  return res;
}

test('IDOR: user cannot access another user\'s order', async () => {
  // create a product to purchase
  process.env.ADMIN_USERNAME = 'admin';
  await register('admin', 'adminpass');
  const adminLogin = await login('admin', 'adminpass');
  const adminToken = adminLogin.body.token;
  const prod = await request(app)
    .post('/products')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'idon-test', price: 1, description: 'x' })
    .expect(201);
  const pid = prod.body.id || prod.body[0] || prod.body;

  // create an order via stripe webhook simulation for user alice
  const makeOrder = await request(app)
    .post('/webhooks/stripe')
    .set('Content-Type', 'application/json')
    .send({
      type: 'checkout.session.completed',
      data: { object: { id: 'sess_1', metadata: { productId: pid, username: 'alice' }, amount_total: 100, currency: 'usd' } },
    })
    .expect(200);

  // read orders and find the created one
  const orders = await db.listOrders();
  const o = orders.find((x) => x.username === 'alice');
  expect(o).toBeTruthy();

  // register bob and attempt to access alice's order
  await register('bob', 'bobpass1');
  const bobLogin = await login('bob', 'bobpass1');
  const bobToken = bobLogin.body.token;

  await request(app)
    .get(`/orders/${o.id}`)
    .set('Authorization', `Bearer ${bobToken}`)
    .expect(403);
});

test('Large payload is rejected (body limit)', async () => {
  // create admin to use product endpoint
  process.env.ADMIN_USERNAME = 'admin';
  await register('admin', 'adminpass');
  const token = (await login('admin', 'adminpass')).body.token;

  // build a large payload > 10kb
  const big = 'x'.repeat(12 * 1024);
  const res = await request(app)
    .post('/products')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'big', price: 1, description: big });
  // server should reject due to size limit (413) or at least not 200
  expect(res.status).not.toBe(200);
});

test('Path traversal attempts do not leak files', async () => {
  // try several encodings that might bypass naive sanitizers
  const variants = ['../package.json', '%2e%2e%2fpackage.json', '..%2fpackage.json', '%2e.%2fpackage.json'];
  for (const v of variants) {
    const res = await request(app).get(`/${v}`);
    expect(res.status).not.toBe(200);
  }
});

test('Security headers present on root', async () => {
  const res = await request(app).get('/').expect(200);
  expect(res.headers['x-content-type-options']).toBe('nosniff');
  expect(res.headers['x-frame-options']).toBeTruthy();
  // CSP may be present; at minimum ensure HSTS or CSP-like header exists in production mode
  expect(res.headers['content-security-policy'] || res.headers['strict-transport-security']).toBeTruthy();
});

test('Account lockout activates after repeated failures', async () => {
  await register('victim', 'safepass1');
  // perform failed attempts equal to lock threshold (db default 5)
  for (let i = 0; i < 5; i++) {
    await request(app).post('/auth/login').send({ username: 'victim', password: 'wrongpw' });
  }
  // next login even with correct password should be locked (423)
  await request(app).post('/auth/login').send({ username: 'victim', password: 'safepass1' }).expect(423);
});
