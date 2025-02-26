/**
 * @file pages/api/files/upload.ts
 * @description
 * API endpoint to handle file metadata upload. This endpoint expects a POST request
 * with file metadata including user_id, file_name, file_type, and file_url.
 * It validates the file type and inserts a new record into the 'files' table using Drizzle ORM.
 * Now includes logging calls for performance monitoring and debugging.
 *
 * @dependencies
 * - Next.js API types: For request and response handling.
 * - Drizzle ORM: For type-safe database operations.
 * - Database schema from db/schema.ts for the 'files' table.
 * - Logger service for logging events.
 *
 * @notes
 * - Ensure that this endpoint is protected via authentication middleware in production.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import drizzleClient from '../../../services/drizzleClient';
import { files } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import Logger from '../../../services/logger';

// Allowed file extensions for validation
const allowedExtensions = ['doc', 'docx', 'odt', 'odf', 'txt'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  Logger.info(`File upload endpoint invoked with method ${req.method}.`);

  // Allow only POST requests
  if (req.method !== 'POST') {
    Logger.warn('Method not allowed on file upload endpoint.');
    return res.status(405).json({ error: 'Method not allowed. Only POST requests are accepted.' });
  }

  // Destructure required fields from the request body
  const { user_id, file_name, file_type, file_url } = req.body;

  // Validate that all required fields are provided
  if (!user_id || !file_name || !file_type || !file_url) {
    Logger.error('Missing required fields in file upload request.');
    return res.status(400).json({ error: 'Missing required fields: user_id, file_name, file_type, file_url.' });
  }

  // Validate file type (extension) is allowed
  const fileExtension = file_type.toLowerCase();
  if (!allowedExtensions.includes(fileExtension)) {
    Logger.error(`Invalid file type attempted: ${file_type}.`);
    return res.status(400).json({ error: 'Invalid file type. Allowed types are: doc, docx, odt, odf, txt.' });
  }

  try {
    // Insert the new file metadata into the 'files' table.
    // Initial proofreading_status is set to 'pending', and version_number is defaulted in the schema.
    const newFile = await drizzleClient.insert(files).values({
      user_id,
      file_name,
      file_type,
      file_url,
      proofreading_status: 'pending',
    }).returning();

    Logger.info(`File uploaded successfully: ${JSON.stringify(newFile)}`);
    // Return the inserted file record to the client
    return res.status(200).json(newFile);
  } catch (error: any) {
    Logger.error(`Error inserting file metadata: ${error.message}`);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}
