module.exports = {
  testEnvironment: 'node',
  collectCoverage: true,
  coverageDirectory: 'coverage',
  // ignore frontend tests (they use Playwright/vitest configs)
  testPathIgnorePatterns: ['/frontend/'],
};
