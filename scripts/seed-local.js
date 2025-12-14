#!/usr/bin/env node
const products = require('../src/data/products');
const users = require('../src/data/users');

async function seed() {
  console.log('Seeding local database...');
  try {
    await products.clearProducts();
    await users.clearUsers();

    await users.createUser({ username: 'admin', password: 'password123' });

    await products.createProduct({
      name: 'Pro Editor',
      price: 19.99,
      description: 'A productivity editor license',
      currency: 'usd',
      license: true,
      type: 'one-time',
    });

    await products.createProduct({
      name: 'Cloud Storage (Monthly)',
      price: 4.99,
      description: 'Monthly subscription for cloud storage',
      currency: 'usd',
      license: false,
      type: 'subscription',
      interval: 'month',
    });

    // Game products templates
    await products.createProduct({
      name: 'Game Account (Starter)',
      price: 15000,
      description: 'Starter game account with basic items',
      currency: 'idr',
      license: false,
      type: 'one-time',
      category: 'game-account',
    });

    await products.createProduct({
      name: 'Top-up 50k',
      price: 50000,
      description: 'Top-up credit for in-game purchases',
      currency: 'idr',
      license: false,
      type: 'one-time',
      category: 'topup',
    });

    await products.createProduct({
      name: 'Tool: Auto-Farm',
      price: 25000,
      description: 'One-time license for Auto-Farm tool',
      currency: 'idr',
      license: true,
      type: 'one-time',
      category: 'tool',
    });

    console.log('Seeding complete. Admin user: admin / password123');
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

seed();
