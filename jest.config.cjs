// jest.config.cjs
// Must be .cjs for the same reason as babel.config.cjs — require() compatibility.
module.exports = {
  testEnvironment: "node",

  // Use babel-jest to transform JS/JSX files (handles ESM import/export)
  transform: {
    "^.+\\.(js|jsx)$": "babel-jest",
  },

  // Don't transform node_modules (standard)
  transformIgnorePatterns: ["/node_modules/"],

  // Map Next.js @/ path alias → src/ so test imports don't break.
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },

  // Only look for tests in src/ (where your Next.js code lives)
  roots: ["<rootDir>/src"],

  // Match test files
  testMatch: [
    "**/__tests__/**/*.[jt]s?(x)",
    "**/?(*.)+(spec|test).[jt]s?(x)",
  ],
};
