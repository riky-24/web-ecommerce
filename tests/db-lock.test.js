const db = require('../src/db');

describe('db lock helpers', () => {
  beforeEach(async () => {
    // reset users
    await db.deleteAllUsers();
  });

  test('incrementFailedLogin sets lockUntil after limit', async () => {
    await db.insertUser('bob', 'pw', new Date().toISOString());
    for (let i = 0; i < 5; i++) {
      await db.incrementFailedLogin('bob');
    }
    const u = await db.getUser('bob');
    expect(u.failedAttempts).toBeGreaterThanOrEqual(5);
    expect(u.lockUntil).toBeTruthy();
  });
});
