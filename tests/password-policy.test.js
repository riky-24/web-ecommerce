const request = require('supertest');

describe('Password policy', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.NODE_ENV = 'test';
  });

  test('rejects weak password', async () => {
    const app = require('../src/app');
    const res = await request(app)
      .post('/auth/register')
      .send({ username: 'wp', password: 'short' });
    expect(res.status).toBe(400);
  });

  test('accepts stronger password', async () => {
    const app = require('../src/app');
    const res = await request(app)
      .post('/auth/register')
      .send({ username: 'good', password: 'goodpass1' });
    expect(res.status).toBe(201);
  });
});
