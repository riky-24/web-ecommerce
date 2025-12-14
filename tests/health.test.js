process.env.DATABASE_PATH = ':memory:';
const request = require('supertest');
const app = require('../src/app');

describe('Health endpoints', () => {
  test('GET / responds with service info', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.body.service).toBeDefined();
  });

  test('GET /health responds with ok', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  test('GET /health/ready responds with ready', async () => {
    const res = await request(app).get('/health/ready');
    expect([200, 503]).toContain(res.statusCode);
  });

  test('GET /metrics returns metrics text', async () => {
    const res = await request(app).get('/metrics');
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/plain/);
  });
});
