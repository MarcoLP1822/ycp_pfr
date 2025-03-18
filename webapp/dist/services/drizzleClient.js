"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const node_postgres_1 = require("drizzle-orm/node-postgres");
const pg_1 = require("pg");
// Retrieve the connection string from environment variables
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error('Missing DATABASE_URL environment variable. Please set it in your environment.');
}
// Create a PostgreSQL connection pool using the connection string
const pool = new pg_1.Pool({
    connectionString,
});
// Initialize the Drizzle ORM client with the PostgreSQL pool
const drizzleClient = (0, node_postgres_1.drizzle)(pool);
exports.default = drizzleClient;
