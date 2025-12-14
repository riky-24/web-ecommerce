const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authRequired } = require('../middleware/auth');
const {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('../data/products');

router.get('/', async (req, res) => {
  res.json(await listProducts());
});

router.get('/:id', async (req, res) => {
  const p = await getProduct(req.params.id);
  if (!p) return res.status(404).json({ error: 'not found' });
  return res.json(p);
});

router.post(
  '/',
  authRequired,
  body('name').isString().isLength({ min: 1 }),
  body('price').isNumeric(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });
    const {
      name,
      price,
      description,
      currency,
      license,
      type,
      interval,
      stripeId,
    } = req.body || {};
    const p = await createProduct({
      name,
      price,
      description,
      currency,
      license,
      type,
      interval,
      stripeId,
    });
    return res.status(201).json(p);
  }
);

router.put('/:id', authRequired, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });
  const updated = await updateProduct(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'not found' });
  return res.json(updated);
});

router.delete('/:id', authRequired, async (req, res) => {
  const ok = await deleteProduct(req.params.id);
  if (!ok) return res.status(404).json({ error: 'not found' });
  return res.status(204).end();
});

module.exports = router;
