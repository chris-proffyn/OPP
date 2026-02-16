/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/packages', '<rootDir>/apps/web'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  collectCoverageFrom: [
    'packages/*/src/**/*.ts',
    'apps/web/src/**/*.{ts,tsx}',
    '!**/*.test.ts',
    '!**/*.test.tsx',
    '!**/*.d.ts',
  ],
  coverageDirectory: 'coverage',
  modulePathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/dist/'],
};
