/**
 * @file jest.setup.js
 * @description
 * This file sets up the testing environment before each test.
 * It sets dummy environment variables required for Supabase, and imports
 * @testing-library/jest-dom to extend Jest's expect functionality with custom DOM matchers.
 * 
 * Key features:
 * - Sets up necessary dummy environment variables for Supabase client usage in tests.
 * - Loads extended DOM matchers like toBeInTheDocument.
 * 
 * @dependencies
 * - @testing-library/jest-dom: Provides custom DOM matchers.
 */

// Set dummy environment variables for Supabase if they are not already defined
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dummy.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "dummy-anon-key";

// Import @testing-library/jest-dom to extend Jest's expect with custom matchers
require('@testing-library/jest-dom');
