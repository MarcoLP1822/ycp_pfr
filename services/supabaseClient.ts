/**
 * @file services/supabaseClient.ts
 * @description
 * This file initializes and exports the Supabase client for interacting with Supabase services,
 * including Authentication, Storage, and Database operations.
 * 
 * @dependencies
 * - @supabase/supabase-js: Library for creating the Supabase client.
 * 
 * @notes
 * - Ensure that the environment variables NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.
 * - These variables are exposed to the client; do not store any sensitive information here.
 */

import { createClient } from '@supabase/supabase-js';

// Retrieve environment variables for Supabase configuration (publicly exposed)
const SUPABASE_URL: string = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_ANON_KEY: string = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

// Validate that the necessary environment variables are provided
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Missing Supabase URL or ANON Key. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment variables.'
  );
}

// Initialize the Supabase client with the provided URL and key
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default supabaseClient;
