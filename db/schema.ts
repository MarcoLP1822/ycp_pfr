/**
 * @file db/schema.ts
 * @description
 * This file defines the database schema using Drizzle ORM for the Web Proofreading App.
 * It includes table definitions for the 'files' and 'proofreading_logs' tables.
 * 
 * The 'files' table stores metadata for uploaded files:
 *  - file_id: Primary key (UUID)
 *  - user_id: References the user who uploaded the file (UUID)
 *  - file_name: Name of the file (text)
 *  - file_type: Type of the file (text)
 *  - upload_timestamp: Time when the file was uploaded (timestamp)
 *  - proofreading_status: Status of the proofreading process (text, e.g., 'pending', 'in-progress', 'complete')
 *  - version_number: Current version of the file (integer)
 *  - file_url: URL of the file in Supabase Storage (text)
 * 
 * The 'proofreading_logs' table stores logs for each proofreading action:
 *  - log_id: Primary key (UUID)
 *  - file_id: Foreign key referencing files.file_id (UUID)
 *  - corrections: JSONB field containing details of the inline corrections (JSON)
 *  - timestamp: Time when the proofreading log was created (timestamp)
 * 
 * @dependencies
 * - drizzle-orm/pg-core: Provides table and column definitions for PostgreSQL.
 * 
 * @notes
 * - Users are managed by Supabase Auth, so a separate users table is not defined here.
 * - Ensure that the DATABASE_URL environment variable is correctly set for the PostgreSQL connection.
 */

import { pgTable, uuid, text, timestamp, integer, json } from "drizzle-orm/pg-core";

// Define the 'files' table schema
export const files = pgTable("files", {
  /**
   * file_id: Unique identifier for the file.
   * Default is generated using a random UUID.
   */
  file_id: uuid("file_id").defaultRandom().primaryKey(),

  /**
   * user_id: Identifier of the user who owns the file.
   */
  user_id: uuid("user_id").notNull(),

  /**
   * file_name: The name of the uploaded file.
   */
  file_name: text("file_name").notNull(),

  /**
   * file_type: The type/extension of the file (doc, docx, odf, txt).
   */
  file_type: text("file_type").notNull(),

  /**
   * upload_timestamp: Timestamp when the file was uploaded.
   * Default is the current timestamp.
   */
  upload_timestamp: timestamp("upload_timestamp").defaultNow().notNull(),

  /**
   * proofreading_status: Current proofreading status.
   * Expected values: 'pending', 'in-progress', 'complete'.
   */
  proofreading_status: text("proofreading_status").notNull(),

  /**
   * version_number: Version control number for the file.
   * Default version is 1.
   */
  version_number: integer("version_number").default(1).notNull(),

  /**
   * file_url: The URL where the file is stored.
   */
  file_url: text("file_url").notNull(),
});

// Define the 'proofreading_logs' table schema
export const proofreadingLogs = pgTable("proofreading_logs", {
  /**
   * log_id: Unique identifier for the proofreading log.
   * Default is generated using a random UUID.
   */
  log_id: uuid("log_id").defaultRandom().primaryKey(),

  /**
   * file_id: Identifier of the file this log entry is associated with.
   * This should reference files.file_id.
   */
  file_id: uuid("file_id").notNull(),

  /**
   * corrections: JSON field containing details of inline corrections.
   * This field stores the correction data returned by the LLM API.
   */
  corrections: json("corrections").notNull(),

  /**
   * timestamp: Timestamp when this proofreading log was created.
   * Default is the current timestamp.
   */
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});
