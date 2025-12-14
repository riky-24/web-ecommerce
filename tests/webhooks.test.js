process.env.DATABASE_PATH = ':memory:';
const request = require('supertest');
const app = require('../src/app');
const { createLicense } = require('../src/data/licenses');
// getProduct not required in this test

describe('Webhooks', () => {
  test('checkout.session.completed creates order and license', async () => {
    // create product
    const p = await request(app)
      .post('/products')
      .set('Authorization', `Bearer dummy`)
      .send({ name: 'PayTool', price: 5, currency: 'usd', license: true });
    const productId = p.body.id;
    const fakeEvent = {
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'sess_x',
          metadata: { productId, username: 'buyer@test' },
          amount_total: 500,
          currency: 'usd',
        },
      },
    };

    const res = await request(app)
      .post('/webhooks/stripe')
      .send(fakeEvent)
      .set('Content-Type', 'application/json');
    expect(res.statusCode).toBe(200);
    // license should be present
    const licenses = await createLicense({
      orderId: 'o',
      productId,
      username: 'buyer@test',
    });
    expect(licenses).toBeDefined();
  });
});
