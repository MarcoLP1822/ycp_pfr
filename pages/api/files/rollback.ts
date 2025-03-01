/**
 * @file pages/api/files/rollback.ts
 * @description
 * This endpoint performs a rollback of a file's 'current_text' to either:
 * - The previous proofread version (retrieved from the last proofreading log)
 * - The original text stored in 'files.original_text'
 *
 * Usage (POST):
 *  { fileId: string, rollbackType: 'previous' | 'original' }
 *
 * @dependencies
 * - Next.js API types
 * - Drizzle ORM for database operations
 * - Logger service for logging
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import drizzleClient from '../../../services/drizzleClient';
import { files, proofreadingLogs } from '../../../db/schema';
import { eq, desc } from 'drizzle-orm';
import Logger from '../../../services/logger';

interface RollbackRequestBody {
  fileId: string;
  rollbackType: 'previous' | 'original';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  Logger.info(`Rollback endpoint invoked with method ${req.method}.`);

  if (req.method !== 'POST') {
    Logger.warn('Method not allowed on rollback endpoint.');
    return res.status(405).json({ error: 'Method not allowed. Only POST requests are accepted.' });
  }

  const { fileId, rollbackType } = req.body as RollbackRequestBody;
  if (!fileId || !rollbackType) {
    Logger.error('Missing fileId or rollbackType in request body.');
    return res.status(400).json({ error: 'Missing fileId or rollbackType.' });
  }

  try {
    // Fetch the file record
    const fileRecords = await drizzleClient.select().from(files).where(eq(files.file_id, fileId));
    if (!fileRecords.length) {
      Logger.error(`File not found for fileId: ${fileId}`);
      return res.status(404).json({ error: 'File not found.' });
    }
    const fileRecord = fileRecords[0];

    let newText: string;
    if (rollbackType === 'original') {
      if (!fileRecord.original_text) {
        return res.status(400).json({ error: 'No original_text found to rollback to.' });
      }
      newText = fileRecord.original_text;
    } else {
      // Rollback to previous version: get the latest proofreading log.
      const logs = await drizzleClient
        .select()
        .from(proofreadingLogs)
        .where(eq(proofreadingLogs.file_id, fileId))
        .orderBy(desc(proofreadingLogs.timestamp));
      if (!logs.length) {
        return res.status(400).json({ error: 'No logs found. Cannot rollback to previous version.' });
      }
      const lastLog = logs[0];
      const corrections = lastLog.corrections as { rawCorrectedText?: string };
      if (!corrections.rawCorrectedText) {
        return res.status(400).json({ error: 'No rawCorrectedText found in last log.' });
      }
      newText = corrections.rawCorrectedText;
    }

    // Update the file's current_text with the new text.
    const [updatedFile] = await drizzleClient
      .update(files)
      .set({
        current_text: newText,
        proofreading_status: 'pending',
      })
      .where(eq(files.file_id, fileId))
      .returning();

    Logger.info(`Rollback successful for fileId: ${fileId}, type: ${rollbackType}`);
    return res.status(200).json({ message: 'Rollback successful.', updatedFile });
  } catch (error: any) {
    Logger.error(`Rollback failed: ${error.message}`);
    return res.status(500).json({ error: 'Internal server error during rollback.' });
  }
}
