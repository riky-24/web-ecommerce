const users = require('../src/data/users');
const db = require('../src/db');

async function run() {
  const username = `debug-${Date.now()}`;
  await users.createUser({ username, password: 'strongpass' });
  console.log('created user');
  for (let i = 0; i < 5; i++) {
    const res = await db.incrementFailedLogin(username);
    console.log('increment', i + 1, res);
  }
  const u = await db.getUser(username);
  console.log('user:', u);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
