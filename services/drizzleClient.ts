/**
 * @description
 * This file initializes and exports the Drizzle ORM client for type-safe database interactions.
 * It uses the 'pg' library to establish a PostgreSQL connection pool and configures Drizzle ORM with it.
 *
 * @dependencies
 * - drizzle-orm: ORM for type-safe database interactions.
 * - pg: PostgreSQL client for Node.js.
 *
 * @notes
 * - Ensure that the DATABASE_URL environment variable is set with your PostgreSQL connection string.
 * - The client will throw an error if the DATABASE_URL is missing.
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

// Retrieve the connection string from environment variables
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    'Missing DATABASE_URL environment variable. Please set it in your environment.'
  );
}

// Create a PostgreSQL connection pool using the connection string
const pool = new Pool({
  connectionString,
});

// Initialize the Drizzle ORM client with the PostgreSQL pool
const drizzleClient = drizzle(pool);

export default drizzleClient;
