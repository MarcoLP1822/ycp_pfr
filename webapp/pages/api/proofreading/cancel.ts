/**
 * @file pages/api/proofreading/cancel.ts
 * @description
 * This endpoint handles canceling an ongoing proofreading job. It accepts a POST request
 * with a file_id and sets the corresponding record’s cancellation_requested flag to true.
 * This flag can be used by the proofreading process to determine if it should abort.
 *
 * Key features:
 * - Validates the HTTP method to ensure only POST requests are accepted.
 * - Checks for the required field file_id in the request body.
 * - Updates the 'files' table to mark the job as canceled.
 *
 * @dependencies
 * - Next.js API types for request and response handling.
 * - Drizzle ORM for database operations.
 * - Logger service for logging events.
 * - Database schema from db/schema.ts.
 *
 * @notes
 * - Ensure that the new column 'cancellation_requested' has been added to the database schema.
 * - This endpoint does not immediately terminate the process; it only sets the flag.
 * - A temporary type assertion is used to bypass the TS error until types are regenerated.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import drizzleClient from '../../../services/drizzleClient';
import { files } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import Logger from '../../../services/logger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  Logger.info(`Proofreading cancel endpoint invoked with method ${req.method}.`);

  // Only allow POST requests for canceling a job.
  if (req.method !== 'POST') {
    Logger.warn('Method not allowed on cancel endpoint.');
    return res.status(405).json({ error: 'Method not allowed. Only POST requests are accepted.' });
  }

  const { file_id } = req.body;
  if (!file_id) {
    Logger.error('Missing required field: file_id in cancel request.');
    return res.status(400).json({ error: 'Missing required field: file_id.' });
  }

  try {
    // Use a type assertion to bypass TypeScript error until the types are regenerated.
    const [updatedFile] = await drizzleClient.update(files)
      .set({ cancellation_requested: true } as any)
      .where(eq(files.file_id, file_id))
      .returning();

    Logger.info(`Cancellation requested for file_id: ${file_id}`);
    return res.status(200).json({ message: 'Cancellation requested successfully.', updatedFile });
  } catch (error: any) {
    Logger.error(`Error requesting cancellation: ${error.message}`);
    return res.status(500).json({ error: 'Internal server error during cancellation request.' });
  }
}
