/**
 * @file pages/api/files/versions.ts
 * @description
 * API endpoint to list version history for a specific file based on proofreading logs.
 * It now limits the result to a maximum of 5 logs (the most recent 5).
 *
 * Key features:
 * - Supports GET requests only
 * - Validates the fileId query parameter
 * - Returns up to 5 logs from the newest to oldest
 *
 * @dependencies
 * - Drizzle ORM
 * - Database schema from db/schema.ts
 * - Logger
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import drizzleClient from '../../../services/drizzleClient';
import { proofreadingLogs } from '../../../db/schema';
import { eq, desc } from 'drizzle-orm';
import Logger from '../../../services/logger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  Logger.info(`GET /api/files/versions invoked with method ${req.method}.`);

  // Allow only GET
  if (req.method !== 'GET') {
    Logger.warn('Method not allowed on versions endpoint.');
    return res.status(405).json({ error: 'Method not allowed. Only GET requests are accepted.' });
  }

  // Validate fileId
  const { fileId } = req.query;
  if (!fileId || typeof fileId !== 'string') {
    Logger.error('Missing or invalid fileId parameter.');
    return res.status(400).json({ error: 'Missing or invalid fileId parameter.' });
  }

  try {
    // Retrieve up to the last 5 logs, newest first
    const logs = await drizzleClient
      .select()
      .from(proofreadingLogs)
      .where(eq(proofreadingLogs.file_id, fileId))
      .orderBy(desc(proofreadingLogs.timestamp))
      .limit(5);

    // If you want them oldest->newest in the final result, do logs.reverse():
    const logsOrdered = logs.slice().reverse();

    // Map logs to version objects with sequential version numbers
    // versionNumber: index + 1 means 1-based indexing from oldest->newest
    const versions = logsOrdered.map((log, index) => ({
      id: log.log_id,
      versionNumber: index + 1,
      timestamp: log.timestamp.toISOString(),
      description: 'Proofreading revision',
    }));

    Logger.info(`Retrieved ${versions.length} versions for fileId: ${fileId}`);
    return res.status(200).json(versions);
  } catch (error: any) {
    Logger.error(`Error retrieving versions: ${error.message}`);
    return res.status(500).json({ error: 'Internal server error while retrieving versions.' });
  }
}
