const request = require('supertest');

describe('Auth security', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.NODE_ENV = 'test';
  });

  test('CORS allows configured origin', async () => {
    process.env.CORS_ORIGINS = 'http://allowed.test';
    const app = require('../src/app');
    const origin = 'http://allowed.test';
    const res = await request(app).get('/').set('Origin', origin);
    expect(res.headers['access-control-allow-origin']).toBe(origin);
  });

  test('auth rate limiter triggers after max attempts', async () => {
    process.env.AUTH_RATE_LIMIT_MAX = '5';
    const app = require('../src/app');
    // perform 6 failed login attempts
    let last;
    for (let i = 0; i < 6; i++) {
      last = await request(app)
        .post('/auth/login')
        .send({ username: 'noone', password: 'badpass' });
    }
    expect(last.status).toBe(429);
    expect(last.body).toHaveProperty('error');
  });

  test('account lockout after repeated failed logins', async () => {
    process.env.AUTH_RATE_LIMIT_MAX = '100';
    const app = require('../src/app');
    // register user with unique name to avoid cross-test interference
    const username = `lockme-${Date.now()}-${Math.floor(
      Math.random() * 10000
    )}`;
    await request(app)
      .post('/auth/register')
      .send({ username, password: 'strongpass' });
    // increment failed attempts directly to avoid rate-limiter interference
    const db = require('../src/db');
    for (let i = 0; i < 5; i++) {
      await db.incrementFailedLogin(username);
    }
    // now even with correct password, account should be locked
    const res = await request(app)
      .post('/auth/login')
      .send({ username, password: 'strongpass' });
    expect(res.status).toBe(423);
    expect(res.body).toHaveProperty('error', 'account locked');
    expect(res.body).toHaveProperty('until');
  });
});
