/**
 * @file db/schema.ts
 * @description
 * This file defines the database schema using Drizzle ORM for the Web Proofreading App.
 * It includes the definition for the 'files' table which now stores metadata for uploaded files,
 * including new columns for the original and current texts as well as a flag to indicate if a 
 * proofreading job cancellation has been requested.
 *
 * Key features:
 * - 'files' table includes metadata for uploaded files.
 * - 'original_text' and 'current_text' store the extracted text at upload and after corrections.
 * - 'cancellation_requested' is a new column used to mark if a proofreading job should be canceled.
 *
 * @dependencies
 * - drizzle-orm/pg-core: Provides table and column definitions for PostgreSQL.
 *
 * @notes
 * - This schema is used by Drizzle ORM for type-safe database interactions.
 */

import { pgTable, uuid, text, timestamp, integer, json, boolean as pgBoolean } from 'drizzle-orm/pg-core';

export const files = pgTable('files', {
  file_id: uuid('file_id').defaultRandom().primaryKey(),
  user_id: uuid('user_id').notNull(),
  file_name: text('file_name').notNull(),
  file_type: text('file_type').notNull(),
  upload_timestamp: timestamp('upload_timestamp').defaultNow().notNull(),
  proofreading_status: text('proofreading_status').notNull(),
  version_number: integer('version_number').default(1).notNull(),
  file_url: text('file_url').notNull(),

  // New columns: these are used to store extracted texts.
  original_text: text('original_text').notNull(),
  current_text: text('current_text').notNull(),

  // New column to support cancellation of the proofreading process.
  cancellation_requested: pgBoolean('cancellation_requested').default(false).notNull(),
});

export const proofreadingLogs = pgTable('proofreading_logs', {
  log_id: uuid('log_id').defaultRandom().primaryKey(),
  file_id: uuid('file_id').notNull(),
  corrections: json('corrections').notNull(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
});
