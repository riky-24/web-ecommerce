const request = require('supertest');

describe('Security headers', () => {
  test('CSP and HSTS present in non-test env', async () => {
    process.env.NODE_ENV = 'production';
    jest.resetModules();
    const app = require('../src/app');
    const res = await request(app).get('/');
    expect(res.headers['content-security-policy']).toBeTruthy();
    expect(res.headers['strict-transport-security']).toBeTruthy();
  });
});
