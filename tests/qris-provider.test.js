const provider = require('../src/payments/provider');

test('default provider is mock and returns a data image QR', async () => {
  // ensure default provider (when QRIS_PROVIDER not set) is mock
  const info = await provider.createPayment({ product: { id: 'p1', name: 'x' }, amount: 1000, currency: 'idr' });
  expect(info.id).toBeTruthy();
  expect(info.qr).toMatch(/^data:image\//i);
});

test('xendit provider requires API key', async () => {
  process.env.QRIS_PROVIDER = 'xendit';
  delete process.env.XENDIT_API_KEY;
  // re-require factory to pick up env change
  jest.resetModules();
  const providerX = require('../src/payments/provider');
  await expect(providerX.createPayment({ product: { id: 'p2', name: 'x' }, amount: 1000 })).rejects.toThrow();
  delete process.env.QRIS_PROVIDER;
});

test('midtrans provider maps create response', async () => {
  process.env.QRIS_PROVIDER = 'midtrans';
  process.env.MIDTRANS_SERVER_KEY = 'mid-key';
  process.env.MIDTRANS_CREATE_QR_URL = 'https://api.test/m';
  jest.resetModules();
  const axios = require('axios');
  jest.spyOn(axios, 'post').mockResolvedValue({ data: { redirect_url: 'https://pay.test/m/123', qr_image: 'data:image/svg+xml;base64,yyy', expires_at: '2099-01-01T00:00:00Z' } });
  const providerM = require('../src/payments/provider');
  const info = await providerM.createPayment({ product: { id: 'p4', name: 'title' }, amount: 2000, currency: 'idr' });
  expect(info.id).toBeTruthy();
  expect(info.paymentUrl).toBe('https://pay.test/m/123');
  expect(info.qr).toMatch(/^data:image\//i);
  delete process.env.QRIS_PROVIDER;
  delete process.env.MIDTRANS_SERVER_KEY;
  delete process.env.MIDTRANS_CREATE_QR_URL;
});

test('xendit provider maps create response', async () => {
  process.env.QRIS_PROVIDER = 'xendit';
  process.env.XENDIT_API_KEY = 'test-key';
  process.env.XENDIT_CREATE_QR_URL = 'https://api.test/x';
  jest.resetModules();
  // mock axios in provider
  const axios = require('axios');
  jest.spyOn(axios, 'post').mockResolvedValue({ data: { qr_url: 'https://pay.test/q/123', qr_image: 'data:image/svg+xml;base64,xxx', expires_at: '2099-01-01T00:00:00Z' } });
  const providerX = require('../src/payments/provider');
  const info = await providerX.createPayment({ product: { id: 'p3', name: 'title' }, amount: 1000, currency: 'idr' });
  expect(info.id).toBeTruthy();
  expect(info.paymentUrl).toBe('https://pay.test/q/123');
  expect(info.qr).toMatch(/^data:image\//i);
  delete process.env.QRIS_PROVIDER;
  delete process.env.XENDIT_API_KEY;
  delete process.env.XENDIT_CREATE_QR_URL;
});
