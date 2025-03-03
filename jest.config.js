/**
 * @file jest.config.js
 * @description
 * This configuration file sets up Jest with ts-jest (with ESM enabled) for transforming TypeScript files.
 * It also maps CSS modules using identity-obj-proxy and remaps any import of "jose" (including its subpaths)
 * to a manual mock. This avoids the ERR_PACKAGE_PATH_NOT_EXPORTED error caused by trying to resolve
 * subpaths that are not defined in the "exports" field of jose's package.json.
 *
 * Key features:
 * - Uses ts-jest with useESM enabled.
 * - Maps CSS imports to identity-obj-proxy.
 * - Maps "^jose(.*)$" to the manual mock at "<rootDir>/__mocks__/jose.js".
 * - Configures transformIgnorePatterns to process specified modules in node_modules.
 *
 * @dependencies
 * - ts-jest: Jest preset for TypeScript.
 * - identity-obj-proxy: For CSS module mapping.
 * - jest: Testing framework.
 */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  transform: {
    "^.+\\.(ts|tsx)$": ["ts-jest", {
      useESM: true,
      tsconfig: "tsconfig.jest.json"
    }]
  },
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    // Remap any import starting with "jose" to our manual mock.
    '^jose(.*)$': '<rootDir>/__mocks__/jose.js',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: ['/node_modules/', '/.next/'],
  // Ensure that node_modules are transformed for our specified modules
  transformIgnorePatterns: ["/node_modules/(?!(jose|@supabase)/)"],
  extensionsToTreatAsEsm: [".ts", ".tsx"],
};
