/**
 * @description
 * This file initializes and exports the Supabase client for interacting with Supabase services,
 * including Authentication, Storage, and Database operations. It retrieves the Supabase URL and
 * ANON key from environment variables.
 *
 * @dependencies
 * - @supabase/supabase-js: Library for creating the Supabase client.
 *
 * @notes
 * - Ensure that environment variables NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.
 * - The client will throw an error if these variables are missing.
 */

import { createClient } from '@supabase/supabase-js';

// Retrieve environment variables for Supabase configuration
const SUPABASE_URL: string = process.env.DATABASE_URL as string;
const SUPABASE_ANON_KEY: string = process.env.DATABASE_ANON_KEY as string;

// Validate that the necessary environment variables are provided
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Missing Supabase URL or ANON Key. Please set DATABASE_URL and DATABASE_ANON_KEY in your environment variables.'
  );
}

// Initialize the Supabase client with the provided URL and key
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default supabaseClient;
