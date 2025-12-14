// Environment validation and configuration helpers
/* eslint-disable no-console */
const REQUIRED = ['JWT_SECRET'];

function validateEnv() {
  // Allow missing secrets in test/dev but enforce in production
  const env = process.env.NODE_ENV || 'development';

  const missing = REQUIRED.filter((k) => !process.env[k]);

  if (missing.length === 0) return;

  if (env === 'production') {
    console.error(
      'Missing required environment variables:',
      missing.join(', ')
    );
    process.exit(1);
  }

  // Non-production: warn and set safe defaults where sensible
  missing.forEach((k) => {
    if (k === 'JWT_SECRET') {
      console.warn('Warning: JWT_SECRET not set. Using insecure dev default.');
      process.env.JWT_SECRET = 'dev-secret';
    } else {
      console.warn(`Warning: ${k} not set.`);
    }
  });
}

module.exports = { validateEnv };
