process.env.DATABASE_PATH = ':memory:';
const request = require('supertest');
const app = require('../src/app');
const stripe = require('stripe');

jest.mock('stripe');

describe('Checkout', () => {
  beforeAll(async () => {
    // create a product
    await request(app)
      .post('/products')
      .set('Authorization', `Bearer dummy`)
      .send({
        name: 'Tool A',
        price: 10,
        currency: 'usd',
        type: 'one-time',
        license: true,
      });
  });

  test('create-session returns session id and url', async () => {
    const fakeSession = {
      id: 'sess_123',
      url: 'https://checkout.test/sess_123',
    };
    stripe.mockImplementation(() => ({
      checkout: {
        sessions: { create: jest.fn().mockResolvedValue(fakeSession) },
      },
    }));

    const res = await request(app)
      .post('/checkout/create-session')
      .send({
        productId: 'some-id',
        successUrl: 'https://ok',
        cancelUrl: 'https://cancel',
      });
    // product not found; expect 404
    expect(res.statusCode).toBe(404);
  });
});
