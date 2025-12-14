module.exports = {
  testEnvironment: 'node',
  collectCoverage: true,
  coverageDirectory: 'coverage',
  // ignore frontend tests (they use Playwright/vitest configs)
  testPathIgnorePatterns: ['/frontend/'],
  // Allow transforming modern ESM packages (e.g., `uuid`) so Jest can
  // execute tests in a CommonJS project without a full Babel setup.
  transform: {
    '^.+\\.[tj]s$': 'esbuild-jest'
  },
  transformIgnorePatterns: ['/node_modules/(?!(uuid)/)'],
};
