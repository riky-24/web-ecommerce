const request = require('supertest');
const db = require('../src/db');

let app;
beforeEach(async () => {
  process.env.DATABASE_PATH = ':memory:';
  // ensure small auth rate limit for tests
  process.env.AUTH_RATE_LIMIT_MAX = '5';
  // require app after setting env so rate limiter picks up the value
  jest.resetModules();
  app = require('../src/app');
  await db.deleteAllUsers();
  await db.deleteAllProducts();
});

afterEach(async () => {
  delete process.env.AUTH_RATE_LIMIT_MAX;
  delete process.env.STRIPE_WEBHOOK_SECRET;
  delete process.env.ADMIN_USERNAME;
});

test('SQL injection on login should not authenticate', async () => {
  // create a user
  await request(app)
    .post('/auth/register')
    .send({ username: 'safeuser', password: 'strongpass1' })
    .expect(201);

  // attempt SQL injection payload in username
  const res = await request(app)
    .post('/auth/login')
    .send({ username: "' OR '1'='1", password: 'x' });
  // should not return 200/auth token
  expect(res.status).not.toBe(200);
  expect(res.body.token).toBeFalsy();
});

test('auth rate limiter blocks after configured attempts', async () => {
  for (let i = 0; i < 5; i++) {
    const res = await request(app)
      .post('/auth/login')
      // use a password that passes validation but is incorrect
      .send({ username: 'noone', password: 'wrongpw' });
    // should consistently return 401 for bad credentials
    expect(res.status).toBe(401);
  }
  // next attempt should be rejected by rate limiter (429)
  const final = await request(app)
    .post('/auth/login')
    .send({ username: 'noone', password: 'wrongpw' });
  expect(final.status).toBe(429);
});

test('stored XSS payload stored in product name (server does not sanitize)', async () => {
  process.env.ADMIN_USERNAME = 'admin';
  // register admin and login
  await request(app)
    .post('/auth/register')
    .send({ username: 'admin', password: 'adminpass' })
    .expect(201);
  const login = await request(app)
    .post('/auth/login')
    .send({ username: 'admin', password: 'adminpass' })
    .expect(200);
  const token = login.body.token;

  const xss = '<script>evil()</script>';
  await request(app)
    .post('/products')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: xss, price: 1, description: 'desc' })
    .expect(201);

  const res = await request(app).get('/products').expect(200);
  expect(res.body.some(p => p.name && p.name.includes('<script>'))).toBe(true);
});

test('CORS rejects disallowed Origin', async () => {
  // request with an origin not in CORS_ORIGINS
  const res = await request(app)
    .get('/')
    .set('Origin', 'http://evil.com')
    .expect(500);
  expect(res.text).toMatch(/Not allowed by CORS/);
});

test('Stripe webhook rejects when signature secret set and no valid signature provided', async () => {
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
  const res = await request(app)
    .post('/webhooks/stripe')
    .set('Content-Type', 'application/json')
    .send({ type: 'checkout.session.completed', data: { object: {} } })
    .expect(400);
  expect(res.text).toMatch(/Webhook Error/);
});
