const express = require('express');
const router = express.Router();
const { createUser, verifyUser } = require('../data/users');
const { sign } = require('../middleware/auth');

const { body, validationResult } = require('express-validator');

router.post(
  '/register',
  body('username').isString().isLength({ min: 3 }),
  body('password').isString().isLength({ min: 8 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });
    const { username, password } = req.body || {};
    try {
      const user = await createUser({ username, password });
      return res.status(201).json(user);
    } catch (e) {
      return res.status(409).json({ error: e.message });
    }
  }
);

router.post(
  '/login',
  body('username').isString().isLength({ min: 3 }),
  body('password').isString().isLength({ min: 6 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });
    const { username, password } = req.body || {};
    const ok = await verifyUser({ username, password });
    if (ok && ok.locked) {
      return res.status(423).json({ error: 'account locked', until: ok.until });
    }
    if (!ok) return res.status(401).json({ error: 'invalid credentials' });
    const token = sign({ username });
    return res.json({ token });
  }
);

module.exports = router;
