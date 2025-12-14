process.env.DATABASE_PATH = ':memory:';
const request = require('supertest');
const app = require('../src/app');
const { clearUsers } = require('../src/data/users');

describe('Auth', () => {
  beforeEach(async () => await clearUsers());

  test('register and login', async () => {
    const reg = await request(app)
      .post('/auth/register')
      .send({ username: 'user1', password: 'password1' });
    expect(reg.statusCode).toBe(201);
    const login = await request(app)
      .post('/auth/login')
      .send({ username: 'user1', password: 'password1' });
    expect(login.statusCode).toBe(200);
    expect(login.body.token).toBeDefined();
  });

  test('register duplicate returns 409', async () => {
    await request(app)
      .post('/auth/register')
      .send({ username: 'user2', password: 'password2' });
    const res = await request(app)
      .post('/auth/register')
      .send({ username: 'user2', password: 'password2' });
    expect(res.statusCode).toBe(409);
  });
});
