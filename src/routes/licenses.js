const express = require('express');
const router = express.Router();
const { authRequired } = require('../middleware/auth');
const db = require('../db');

// list licenses: admin sees all, normal user sees their own
router.get('/', authRequired, async (req, res) => {
  const adminUser = process.env.ADMIN_USERNAME;
  if (req.user.username === adminUser) {
    const all = await db.listLicenses();
    return res.json(all);
  }
  const list = await db.listLicensesForUser(req.user.username);
  return res.json(list);
});

// get license by key
router.get('/:key', authRequired, async (req, res) => {
  const lic = await db.getLicenseByKey(req.params.key);
  if (!lic) return res.status(404).json({ error: 'not found' });
  const adminUser = process.env.ADMIN_USERNAME;
  if (lic.username !== req.user.username && req.user.username !== adminUser)
    return res.status(403).json({ error: 'forbidden' });
  return res.json(lic);
});

module.exports = router;
