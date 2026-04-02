/** @type {import('jest').Config} */
const config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.ts"],
  setupFilesAfterEnv: ["<rootDir>/src/__tests__/setup.ts"],
  coverageDirectory: "coverage",
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/types/**",
    "!src/index.ts",
  ],
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig.json" }],
  },
  clearMocks: true,
  restoreMocks: true,
};

module.exports = config;
