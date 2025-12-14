function validateEnv() {
  // fail-fast for misconfigured production environments
  const env = process.env.NODE_ENV || 'development';
  if (env === 'production') {
    if (!process.env.STRIPE_SECRET_KEY)
      throw new Error('Missing required env: STRIPE_SECRET_KEY');
    if (!process.env.STRIPE_WEBHOOK_SECRET)
      throw new Error('Missing required env: STRIPE_WEBHOOK_SECRET');
    if (!process.env.JWT_SECRET)
      throw new Error('Missing required env: JWT_SECRET');
  }
  // warn for common missing values in non-prod envs
  if (!process.env.SERVICE_NAME) console.warn('SERVICE_NAME not set');
}

module.exports = { validateEnv };
