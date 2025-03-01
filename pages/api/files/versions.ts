/**
 * @file pages/api/files/versions.ts
 * @description
 * API endpoint to list version history for a specific file based on proofreading logs.
 * It retrieves all proofreading_logs entries for the provided fileId, orders them by timestamp (ascending),
 * and maps them to version objects containing an id, versionNumber, timestamp, and description.
 *
 * Key features:
 * - Supports GET requests only.
 * - Validates the fileId query parameter.
 * - Maps proofreading_logs to a version list for display in the VersionControlModal.
 *
 * @dependencies
 * - Next.js API types for request and response handling.
 * - Drizzle ORM for database queries.
 * - Database schema from db/schema.ts for the 'proofreading_logs' table.
 * - Logger service for logging events.
 *
 * @notes
 * - Ensure that the middleware or authentication is handling access to this endpoint as needed.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import drizzleClient from '../../../services/drizzleClient';
import { proofreadingLogs } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import Logger from '../../../services/logger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  Logger.info(`GET /api/files/versions invoked with method ${req.method}.`);

  // Allow only GET requests
  if (req.method !== 'GET') {
    Logger.warn('Method not allowed on versions endpoint.');
    return res.status(405).json({ error: 'Method not allowed. Only GET requests are accepted.' });
  }

  // Validate fileId query parameter
  const { fileId } = req.query;
  if (!fileId || typeof fileId !== 'string') {
    Logger.error('Missing or invalid fileId parameter.');
    return res.status(400).json({ error: 'Missing or invalid fileId parameter.' });
  }

  try {
    // Retrieve proofreading logs for the given fileId, ordered by timestamp ascending
    const logs = await drizzleClient
      .select()
      .from(proofreadingLogs)
      .where(eq(proofreadingLogs.file_id, fileId))
      .orderBy(proofreadingLogs.timestamp);

    // Map logs to version objects with sequential version numbers
    const versions = logs.map((log, index) => ({
      id: log.log_id,
      versionNumber: index + 1,
      timestamp: log.timestamp.toISOString(),
      description: 'Proofreading revision'
    }));

    Logger.info(`Retrieved ${versions.length} versions for fileId: ${fileId}`);
    return res.status(200).json(versions);
  } catch (error: any) {
    Logger.error(`Error retrieving versions: ${error.message}`);
    return res.status(500).json({ error: 'Internal server error while retrieving versions.' });
  }
}
