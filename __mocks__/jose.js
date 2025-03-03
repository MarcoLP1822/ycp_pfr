/**
 * @file __mocks__/jose.js
 * @description
 * This is a manual mock for the "jose" package to avoid ESM syntax errors in Jest.
 * It exports the necessary functions using CommonJS syntax.
 *
 * Key features:
 * - Mocks the "compactDecrypt" function with a dummy implementation.
 *
 * @notes
 * - Adjust or extend this mock to include additional exports as needed by your tests.
 */

module.exports = {
    compactDecrypt: (input, key, options) => {
      // Return a dummy result. Adjust as necessary for your testing requirements.
      return {
        plaintext: Buffer.from('dummy plaintext'),
        protectedHeader: {},
      };
    },
    // Add more mocks here if your code uses other exports from "jose".
  };
  