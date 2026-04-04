// jest.config.mjs
export default {
  testEnvironment: "node",
  transform: {}, // disable transforms unless you use Babel/ts-jest
  testMatch: ["<rootDir>/tests/**/*.test.js"],
  // If you need .js treated as ESM explicitly:
  // extensionsToTreatAsEsm: ['.js'],
};
