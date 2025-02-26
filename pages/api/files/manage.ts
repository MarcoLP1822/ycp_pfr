/**
 * @file pages/api/files/manage.ts
 * @description
 * API endpoint to manage file records by handling renaming and deletion actions.
 * Supported HTTP methods:
 * - PUT: To rename a file. Expects file_id and new_name in the request body.
 * - DELETE: To delete a file. Expects file_id in the request body.
 * 
 * Now includes logging calls for performance monitoring and debugging.
 *
 * @dependencies
 * - Next.js API types for request and response handling.
 * - Drizzle ORM for database operations.
 * - Database schema from db/schema.ts for the 'files' table.
 * - Logger service for logging events.
 *
 * @notes
 * - Ensure that proper authentication is in place to restrict these actions to authorized users.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import drizzleClient from '../../../services/drizzleClient';
import { files } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import Logger from '../../../services/logger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  Logger.info(`File management endpoint invoked with method ${req.method}.`);

  // Handle renaming of a file (HTTP PUT)
  if (req.method === 'PUT') {
    const { file_id, new_name } = req.body;

    // Validate input fields for renaming
    if (!file_id || !new_name) {
      Logger.error('Missing required fields for renaming.');
      return res.status(400).json({ error: 'Missing required fields for renaming: file_id and new_name.' });
    }

    try {
      // Update the file name where file_id matches using Drizzle ORM
      const updatedFile = await drizzleClient
        .update(files)
        .set({ file_name: new_name })
        .where(eq(files.file_id, file_id))
        .returning();

      Logger.info(`File renamed successfully: ${JSON.stringify(updatedFile)}`);
      return res.status(200).json(updatedFile);
    } catch (error: any) {
      Logger.error(`Error renaming file: ${error.message}`);
      return res.status(500).json({ error: 'Internal server error.' });
    }
  }
  // Handle deletion of a file (HTTP DELETE)
  else if (req.method === 'DELETE') {
    const { file_id } = req.body;

    // Validate that file_id is provided
    if (!file_id) {
      Logger.error('Missing file_id for deletion.');
      return res.status(400).json({ error: 'Missing file_id for deletion.' });
    }

    try {
      // Delete the file record where file_id matches using Drizzle ORM
      const deletedFile = await drizzleClient
        .delete(files)
        .where(eq(files.file_id, file_id))
        .returning();

      Logger.info(`File deleted successfully: ${JSON.stringify(deletedFile)}`);
      return res.status(200).json({ message: 'File deleted successfully.', deletedFile });
    } catch (error: any) {
      Logger.error(`Error deleting file: ${error.message}`);
      return res.status(500).json({ error: 'Internal server error.' });
    }
  } else {
    Logger.warn('Unsupported HTTP method on file management endpoint.');
    return res.status(405).json({ error: 'Method not allowed. Use PUT for renaming or DELETE for deletion.' });
  }
}
