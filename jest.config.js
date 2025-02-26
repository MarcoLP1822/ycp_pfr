/**
 * @file jest.config.js
 * @description
 * This file contains the configuration settings for Jest.
 * It uses ts-jest as a preset for TypeScript, sets the test environment to jsdom
 * (which simulates a browser for testing React components), maps CSS/SCSS files 
 * using identity-obj-proxy, and now includes a custom tsconfig for handling JSX transformation.
 * 
 * Key features:
 * - Uses ts-jest for transforming TypeScript and TSX files.
 * - Sets the test environment to jsdom.
 * - Maps style files to identity-obj-proxy.
 * - Specifies a custom tsconfig (tsconfig.jest.json) for compiling JSX.
 * 
 * @dependencies
 * - ts-jest: Jest preset for TypeScript.
 * - identity-obj-proxy: To mock CSS modules.
 * - jest: Testing framework.
 */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest"
  },
  globals: {
    'ts-jest': {
      tsconfig: "tsconfig.jest.json"
    }
  },
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: ['/node_modules/', '/.next/'],
};
