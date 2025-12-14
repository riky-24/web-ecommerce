require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const healthRouter = require('./routes/health');
const authRouter = require('./routes/auth');
const productsRouter = require('./routes/products');
const checkoutRouter = require('./routes/checkout');
const webhooksRouter = require('./routes/webhooks');
const client = require('prom-client');

const app = express();

// Helmet with CSP/HSTS in non-test environments
if (process.env.NODE_ENV !== 'test') {
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          frameAncestors: ["'none'"],
        },
      },
      hsts: { maxAge: 63072000, includeSubDomains: true },
    })
  );
} else {
  app.use(helmet());
}

// CORS configuration
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim());
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // allow non-browser clients
      if (allowedOrigins.indexOf(origin) !== -1) return cb(null, true);
      return cb(new Error('Not allowed by CORS'));
    },
  })
);
app.use(morgan('dev'));

// mount webhooks before JSON parser so routes using express.raw() get the raw body
app.use('/webhooks', webhooksRouter);

app.use(express.json({ limit: '10kb' }));

// global rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// tighter rate limiting for auth endpoints (helps prevent brute-force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(
    process.env.AUTH_RATE_LIMIT_MAX ||
      (process.env.NODE_ENV === 'test' ? 1000 : 20)
  ),
  message: { error: 'Too many auth attempts, try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/auth', authLimiter);

// readiness state
app.set('ready', false);

app.use('/health', healthRouter);
app.use('/auth', authRouter);
app.use('/products', productsRouter);
app.use('/checkout', checkoutRouter);
app.use('/orders', require('./routes/orders'));
app.use('/coupons', require('./routes/coupons'));
app.use('/licenses', require('./routes/licenses'));
app.use('/admin', require('./routes/admin'));

// metrics
const collectDefaultMetrics = client.collectDefaultMetrics;
if (process.env.NODE_ENV !== 'test') {
  collectDefaultMetrics();
}
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
  } catch (ex) {
    res.status(500).end(ex.message);
  }
});

app.get('/', (req, res) => {
  res.json({
    service: process.env.SERVICE_NAME || 'microservice-sample',
    status: 'ok',
  });
});

module.exports = app;
