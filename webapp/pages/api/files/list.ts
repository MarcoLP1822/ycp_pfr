/**
 * @file pages/api/files/list.ts
 * @description
 * API endpoint to list file metadata records from the 'files' table.
 * Supports GET requests to return an array of file metadata.
 * Optionally, it can filter files by user_id if provided as a query parameter.
 * 
 * Key features:
 * - Retrieves file records from the PostgreSQL database using Drizzle ORM.
 * - Returns a JSON array containing file metadata such as file_id, file_name, file_type, upload_timestamp,
 *   proofreading_status, version_number, and file_url.
 * - Validates the HTTP method and handles errors appropriately.
 * 
 * @dependencies
 * - Next.js API types for request and response handling.
 * - Drizzle ORM for database queries.
 * - Database schema from db/schema.ts for the 'files' table.
 * - Logger service for logging events.
 * - `desc` helper from drizzle-orm for ordering results.
 * 
 * @notes
 * - This endpoint is protected by middleware, so only authenticated users should be able to access it.
 * - The query parameter "user_id" can be used to filter the file list by a specific user.
 * - A local type (FileRow) is defined to resolve TypeScript type mismatches.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import drizzleClient from '../../../services/drizzleClient';
import { files } from '../../../db/schema';
import Logger from '../../../services/logger';
import { eq, desc } from 'drizzle-orm';

// Define a local type representing a row in the 'files' table.
type FileRow = {
  file_id: string;
  user_id: string;
  file_name: string;
  file_type: string;
  upload_timestamp: Date;
  proofreading_status: string;
  version_number: number;
  file_url: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  Logger.info(`GET /api/files/list invoked with method ${req.method}.`);

  // Validate that the method is GET.
  if (req.method !== 'GET') {
    Logger.warn('Method not allowed on files list endpoint.');
    return res.status(405).json({ error: 'Method not allowed. Only GET requests are accepted.' });
  }

  try {
    // Extract optional user_id query parameter to filter files by user.
    const { user_id } = req.query;
    let query = drizzleClient.select().from(files);

    if (user_id && typeof user_id === 'string') {
      query = query.where(eq(files.user_id, user_id)) as typeof query;
    }

    // Order the files by upload_timestamp in descending order using the desc() helper.
    const fileList = await query.orderBy(desc(files.upload_timestamp));

    Logger.info('File list retrieved successfully.');
    return res.status(200).json(fileList);
  } catch (error: any) {
    Logger.error(`Error retrieving file list: ${error.message}`);
    return res.status(500).json({ error: 'Internal server error while retrieving file list.' });
  }
}
