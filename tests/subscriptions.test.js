process.env.DATABASE_PATH = ':memory:';
const request = require('supertest');
// mock stripe so we don't perform real API calls
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    subscriptions: {
      retrieve: jest.fn(async (id) => ({
        id,
        metadata: { productId: global.__TEST_PRODUCT_ID },
        customer: 'cus_1',
      })),
    },
    customers: {
      retrieve: jest.fn(async (id) => ({ id, email: 'buyer@test' })),
    },
  }));
});

const app = require('../src/app');
const { getLicensesForUser } = require('../src/data/licenses');

describe('Subscriptions (webhook)', () => {
  test('invoice.payment_succeeded creates order and license', async () => {
    // create subscription product as admin
    process.env.ADMIN_USERNAME = 'admin';
    await request(app)
      .post('/auth/register')
      .send({ username: 'admin', password: 'adminpass' });
    const adminLogin = await request(app)
      .post('/auth/login')
      .send({ username: 'admin', password: 'adminpass' });
    const adminToken = adminLogin.body.token;
    const p = await request(app)
      .post('/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'SubTool',
        price: 10,
        currency: 'usd',
        type: 'subscription',
        license: true,
      });
    const productId = p.body.id;
    global.__TEST_PRODUCT_ID = productId;

    const fakeEvent = {
      type: 'invoice.payment_succeeded',
      data: {
        object: {
          id: 'in_1',
          amount_paid: 1000,
          currency: 'usd',
          subscription: 'sub_123',
          customer: 'cus_1',
        },
      },
    };

    const res = await request(app)
      .post('/webhooks/stripe')
      .send(fakeEvent)
      .set('Content-Type', 'application/json');
    expect(res.statusCode).toBe(200);

    const licenses = await getLicensesForUser('buyer@test');
    expect(licenses.length).toBeGreaterThan(0);
  });
});
