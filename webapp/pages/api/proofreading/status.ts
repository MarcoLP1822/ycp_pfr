/**
 * @file pages/api/proofreading/status.ts
 * @description
 * This API endpoint retrieves the current status of a proofreading job.
 * It accepts a GET request with a query parameter "fileId" and returns the
 * current proofreading status, cancellation flag, and version number of the file.
 *
 * Key features:
 * - Validates that only GET requests are allowed.
 * - Checks for the required "fileId" parameter in the query string.
 * - Queries the "files" table for the file record matching the provided fileId.
 * - Returns a JSON object with the proofreading_status, cancellation_requested,
 *   and version_number.
 *
 * @dependencies
 * - Next.js API types for request and response.
 * - Drizzle ORM for database operations.
 * - Logger service for logging events.
 *
 * @notes
 * - This endpoint is intended to support frontend polling to monitor the job progress.
 * - If the file is not found, it responds with a 404 error.
 * - If the HTTP method is not GET, it responds with a 405 error.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import drizzleClient from '../../../services/drizzleClient';
import { files } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import Logger from '../../../services/logger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  Logger.info(`GET /api/proofreading/status invoked with method ${req.method}.`);

  // Allow only GET requests
  if (req.method !== 'GET') {
    Logger.warn('Method not allowed on proofreading status endpoint.');
    return res.status(405).json({ error: 'Method not allowed. Only GET requests are accepted.' });
  }

  // Extract and validate the fileId query parameter
  const { fileId } = req.query;
  if (!fileId || typeof fileId !== 'string') {
    Logger.error('Missing or invalid fileId parameter.');
    return res.status(400).json({ error: 'Missing or invalid fileId parameter.' });
  }

  try {
    // Query the database for the file record
    const fileRecords = await drizzleClient.select().from(files).where(eq(files.file_id, fileId));
    if (!fileRecords.length) {
      Logger.error(`File not found for fileId: ${fileId}`);
      return res.status(404).json({ error: 'File not found.' });
    }
    const fileRecord = fileRecords[0];

    // Prepare the response object with job status details
    const statusData = {
      proofreading_status: fileRecord.proofreading_status,
      cancellation_requested: fileRecord.cancellation_requested,
      version_number: fileRecord.version_number,
    };

    Logger.info(`Status retrieved successfully for fileId: ${fileId}`);
    return res.status(200).json(statusData);
  } catch (error: any) {
    Logger.error(`Error retrieving job status: ${error.message}`);
    return res.status(500).json({ error: 'Internal server error while retrieving job status.' });
  }
}
