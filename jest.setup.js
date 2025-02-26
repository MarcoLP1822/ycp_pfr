/**
 * @file jest.setup.js
 * @description
 * This file sets up the testing environment before each test.
 * It sets dummy environment variables required for Supabase and Drizzle ORM,
 * adds polyfills for TextEncoder/TextDecoder to resolve issues in Node.js,
 * and imports @testing-library/jest-dom to extend Jest's expect functionality with custom DOM matchers.
 * 
 * Key features:
 * - Sets up necessary dummy environment variables for Supabase client usage in tests.
 * - Adds a dummy DATABASE_URL environment variable for Drizzle ORM.
 * - Adds polyfills for TextEncoder and TextDecoder to resolve ReferenceError in Node.js.
 * - Loads extended DOM matchers like toBeInTheDocument.
 * 
 * @dependencies
 * - @testing-library/jest-dom: Provides custom DOM matchers.
 * - Node.js 'util' module: Provides TextEncoder and TextDecoder.
 */

// Polyfill for TextEncoder and TextDecoder for Node.js environments
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Set dummy environment variables for Supabase if they are not already defined
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dummy.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "dummy-anon-key";

// Set a dummy DATABASE_URL for testing purposes to avoid errors in drizzleClient
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgres://dummy:dummy@localhost:5432/dummy";

// Import @testing-library/jest-dom to extend Jest's expect with custom matchers
require('@testing-library/jest-dom');
