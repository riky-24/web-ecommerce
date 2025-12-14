const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.get('/ready', (req, res) => {
  // readiness probe — we'll set app readiness in index.js
  const ready = req.app.get('ready');
  if (ready) return res.json({ status: 'ready' });
  return res.status(503).json({ status: 'not ready' });
});

module.exports = router;
