const express = require('express');
const router = express.Router();
const { authRequired } = require('../middleware/auth');
const db = require('../db');
const { v4: uuidv4 } = require('uuid');

// admin unlock user account
router.post('/unlock', authRequired, async (req, res) => {
  const adminUser = process.env.ADMIN_USERNAME;
  if (!adminUser || req.user.username !== adminUser)
    return res.status(403).json({ error: 'forbidden' });
  const { username } = req.body || {};
  if (!username) return res.status(400).json({ error: 'username required' });
  await db.resetFailedLogin(username);
  await db.insertAudit({
    id: uuidv4(),
    actor: req.user.username,
    action: 'unlock',
    target: username,
    details: '',
    createdAt: new Date().toISOString(),
  });
  return res.json({ ok: true });
});

router.get('/audits', authRequired, async (req, res) => {
  const adminUser = process.env.ADMIN_USERNAME;
  if (!adminUser || req.user.username !== adminUser)
    return res.status(403).json({ error: 'forbidden' });
  const list = await db.listAudits();
  return res.json(list);
});

module.exports = router;
