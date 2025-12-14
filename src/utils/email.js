const sg = require('@sendgrid/mail');

function ensureSendGrid() {
  const key = process.env.SENDGRID_API_KEY;
  if (!key) return null;
  try {
    sg.setApiKey(key);
    return sg;
  } catch (e) {
    console.error('SendGrid setup failed', e.message);
    return null;
  }
}

async function sendLicenseEmail(to, license, product = null) {
  const sgClient = ensureSendGrid();
  if (!sgClient) {
    console.log('SendGrid not configured — skipping email to', to);
    return;
  }

  const templateId = process.env.SENDGRID_LICENSE_TEMPLATE_ID;
  const from = process.env.EMAIL_FROM || 'no-reply@example.com';

  if (templateId) {
    const msg = {
      to,
      from,
      template_id: templateId,
      dynamic_template_data: {
        license_key: license.key,
        product_id: license.productId,
        product_name: product && product.name,
        order_id: license.orderId,
      },
    };
    await sgClient.send(msg);
    return;
  }

  // fallback to simple email
  const msg = {
    to,
    from,
    subject: `Your license key for ${license.productId}`,
    text: `Thanks for your purchase. Your license key: ${license.key}`,
    html: `<p>Thanks for your purchase.</p><p>Your license key: <strong>${license.key}</strong></p>`,
  };
  await sgClient.send(msg);
}

module.exports = { sendLicenseEmail };
