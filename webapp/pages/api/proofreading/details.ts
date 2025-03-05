/**
 * @file pages/api/proofreading/details.ts
 * @description
 * This endpoint retrieves the proofreading details for a file.
 * It returns:
 * - originalText: The text as originally uploaded (from files.original_text)
 * - correctedText: The current text with highlighting applied (computed via diffHighlighter by comparing original_text and current_text)
 * - versionNumber: The file's current version number.
 *
 * This way, if you perform a rollback (which updates files.current_text), then the highlighted differences
 * will be recalculated and "View Current Version" will display the rolled-back content.
 *
 * @dependencies
 * - Drizzle ORM for database queries
 * - Logger for logging
 * - diffHighlighter to compute inline highlighting differences
 *
 * @notes
 * - This simplified version does not download or re-extract the file from storage.
 *   It assumes that files.original_text and files.current_text are up to date.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import drizzleClient from '../../../services/drizzleClient';
import { files } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import Logger from '../../../services/logger';
import { highlightDifferences } from '../../../services/diffHighlighter';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  Logger.info(`GET /api/proofreading/details invoked with method ${req.method}.`);

  if (req.method !== 'GET') {
    Logger.warn('Method not allowed on proofreading details endpoint.');
    return res.status(405).json({ error: 'Method not allowed. Only GET requests are accepted.' });
  }

  const { fileId } = req.query;
  if (!fileId || typeof fileId !== 'string') {
    Logger.error('Missing or invalid fileId parameter.');
    return res.status(400).json({ error: 'Missing or invalid fileId parameter.' });
  }

  try {
    // Fetch the file record from the database
    const fileRecords = await drizzleClient
      .select()
      .from(files)
      .where(eq(files.file_id, fileId));
    if (!fileRecords.length) {
      Logger.error(`File not found for fileId: ${fileId}`);
      return res.status(404).json({ error: 'File not found.' });
    }
    const fileRecord = fileRecords[0];

    // Compute highlighted corrected text using diffHighlighter,
    // which compares the original text and the current (possibly rolled-back) text.
    const highlightedText = highlightDifferences(fileRecord.original_text, fileRecord.current_text);

    Logger.info(`Successfully fetched file details for fileId: ${fileId}`);
    return res.status(200).json({
      originalText: fileRecord.original_text,
      correctedText: highlightedText,
      versionNumber: fileRecord.version_number,
    });
  } catch (error: any) {
    Logger.error(`Error fetching proofreading details: ${error.message}`);
    return res.status(500).json({ error: 'Internal server error while fetching proofreading details.' });
  }
}
