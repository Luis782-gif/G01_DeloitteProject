/** @type {import('jest').Config} */
module.exports = {
  rootDir: '.',
  testEnvironment: 'node',
  testRegex: '(test|src)/.*\\.spec\\.ts$',
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json', diagnostics: false }] },
  globalSetup: '<rootDir>/test/harness/global-setup.ts',
  globalTeardown: '<rootDir>/test/harness/global-teardown.ts',
  testTimeout: 60000,
};
