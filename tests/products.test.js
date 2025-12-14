process.env.DATABASE_PATH = ':memory:';
const request = require('supertest');
const app = require('../src/app');
const { clearProducts } = require('../src/data/products');

let token;

beforeAll(async () => {
  // create a user and get token
  await request(app)
    .post('/auth/register')
    .send({ username: 'puser1', password: 'ppass1234' });
  const res = await request(app)
    .post('/auth/login')
    .send({ username: 'puser1', password: 'ppass1234' });
  token = res.body.token;
});

describe('Products API', () => {
  test('POST /products requires auth', async () => {
    const res = await request(app)
      .post('/products')
      .send({ name: 'A', price: 10 });
    expect(res.statusCode).toBe(401);
  });

  test('CRUD product', async () => {
    const create = await request(app)
      .post('/products')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'P', price: 42, currency: 'usd', license: true });
    expect(create.statusCode).toBe(201);
    expect(create.body.currency).toBe('usd');
    expect(create.body.license).toBe(true);
    const id = create.body.id;
    const get = await request(app).get(`/products/${id}`);
    expect(get.statusCode).toBe(200);
    expect(get.body.name).toBe('P');
    const update = await request(app)
      .put(`/products/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ price: 50 });
    expect(update.statusCode).toBe(200);
    expect(update.body.price).toBe(50);
    const del = await request(app)
      .delete(`/products/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(del.statusCode).toBe(204);
  });
});
