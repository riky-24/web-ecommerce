describe('Email util', () => {
  afterEach(() => {
    jest.resetModules();
    delete process.env.SENDGRID_API_KEY;
    delete process.env.SENDGRID_LICENSE_TEMPLATE_ID;
    delete process.env.EMAIL_FROM;
  });

  test('no-op when SENDGRID not configured', async () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const { sendLicenseEmail } = require('../src/utils/email');
    await sendLicenseEmail('test@example.com', { key: 'k1', productId: 'p1' });
    expect(spy).toHaveBeenCalledWith(
      'SendGrid not configured — skipping email to',
      'test@example.com'
    );
    spy.mockRestore();
  });

  test('sends templated email when configured', async () => {
    process.env.SENDGRID_API_KEY = 'SG.KEY';
    process.env.SENDGRID_LICENSE_TEMPLATE_ID = 'tmpl_1';
    process.env.EMAIL_FROM = 'sales@example.com';

    const mockSend = jest.fn();
    const mockSet = jest.fn();
    jest.mock('@sendgrid/mail', () => ({ setApiKey: mockSet, send: mockSend }));
    jest.resetModules();

    const { sendLicenseEmail } = require('../src/utils/email');
    const license = { key: 'lic123', productId: 'p1', orderId: 'o1' };
    await sendLicenseEmail('buyer@example.com', license, { name: 'Prod' });
    expect(mockSet).toHaveBeenCalledWith('SG.KEY');
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'buyer@example.com',
        from: 'sales@example.com',
        template_id: 'tmpl_1',
        dynamic_template_data: expect.objectContaining({
          license_key: 'lic123',
        }),
      })
    );
  });
});
