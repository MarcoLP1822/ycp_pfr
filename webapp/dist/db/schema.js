"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.proofreadingLogs = exports.files = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.files = (0, pg_core_1.pgTable)('files', {
    file_id: (0, pg_core_1.uuid)('file_id').defaultRandom().primaryKey(),
    user_id: (0, pg_core_1.uuid)('user_id').notNull(),
    file_name: (0, pg_core_1.text)('file_name').notNull(),
    file_type: (0, pg_core_1.text)('file_type').notNull(),
    upload_timestamp: (0, pg_core_1.timestamp)('upload_timestamp').defaultNow().notNull(),
    proofreading_status: (0, pg_core_1.text)('proofreading_status').notNull(),
    version_number: (0, pg_core_1.integer)('version_number').default(1).notNull(),
    file_url: (0, pg_core_1.text)('file_url').notNull(),
    // New columns: these are used to store extracted texts.
    original_text: (0, pg_core_1.text)('original_text').notNull(),
    current_text: (0, pg_core_1.text)('current_text').notNull(),
    // New column to support cancellation of the proofreading process.
    cancellation_requested: (0, pg_core_1.boolean)('cancellation_requested').default(false).notNull(),
});
exports.proofreadingLogs = (0, pg_core_1.pgTable)('proofreading_logs', {
    log_id: (0, pg_core_1.uuid)('log_id').defaultRandom().primaryKey(),
    file_id: (0, pg_core_1.uuid)('file_id').notNull(),
    corrections: (0, pg_core_1.json)('corrections').notNull(),
    timestamp: (0, pg_core_1.timestamp)('timestamp').defaultNow().notNull(),
});
