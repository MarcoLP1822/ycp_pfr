/**
 * @file db/schema.ts
 * @description
 * This file defines the database schema using Drizzle ORM for the Web Proofreading App.
 * It now includes the new columns 'original_text' and 'current_text' in the 'files' table,
 * which are used to store the extracted text at upload and the active text respectively.
 *
 * Key features:
 * - 'files' table includes metadata for uploaded files.
 * - 'original_text' and 'current_text' are optional and default to null.
 * - 'proofreading_logs' stores logs of proofreading actions.
 *
 * @dependencies
 * - drizzle-orm/pg-core: Provides table and column definitions for PostgreSQL.
 */

import { pgTable, uuid, text, timestamp, integer, json } from 'drizzle-orm/pg-core';

export const files = pgTable('files', {
  file_id: uuid('file_id').defaultRandom().primaryKey(),
  user_id: uuid('user_id').notNull(),
  file_name: text('file_name').notNull(),
  file_type: text('file_type').notNull(),
  upload_timestamp: timestamp('upload_timestamp').defaultNow().notNull(),
  proofreading_status: text('proofreading_status').notNull(),
  version_number: integer('version_number').default(1).notNull(),
  file_url: text('file_url').notNull(),

  // New columns: these default to null so they're optional
  original_text: text('original_text').notNull(),
  current_text: text('current_text').notNull(),
});

export const proofreadingLogs = pgTable('proofreading_logs', {
  log_id: uuid('log_id').defaultRandom().primaryKey(),
  file_id: uuid('file_id').notNull(),
  corrections: json('corrections').notNull(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
});
