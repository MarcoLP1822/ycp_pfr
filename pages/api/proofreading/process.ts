/**
 * @file pages/api/proofreading/process.ts
 * @description
 * This endpoint handles the proofreading process for a file. It:
 *  1. Fetches the file record from the DB.
 *  2. Updates the file's status to 'in-progress'.
 *  3. Downloads and extracts the file text from Supabase Storage.
 *  4. Calls OpenAI to get a corrected version of the text.
 *  5. Generates a diff-based highlighted version of the text (<mark> tags).
 *  6. Saves both the plain corrected text and the highlighted text to proofreading_logs.
 *  7. Updates the file's current_text with the plain corrected text (no <mark> tags),
 *     so that we don't store leftover HTML markup.
 *  8. Sets proofreading_status to 'complete'.
 *
 * Key changes:
 * - We only store the plain corrected text (proofreadingResult.correctedText) in `files.current_text`,
 *   avoiding leftover <mark> tags in the final text.
 *
 * @dependencies
 * - Next.js API types for request/response
 * - Drizzle ORM for DB queries
 * - Supabase Auth Helpers for server-side storage
 * - textExtractor for reading the doc
 * - openaiService for calling the LLM
 * - diffHighlighter for generating <mark>-based diffs
 * - Logger for logging
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import drizzleClient from '../../../services/drizzleClient';
import { files, proofreadingLogs } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import { extractTextFromFile, SupportedFileType } from '../../../services/textExtractor';
import { proofreadDocument } from '../../../services/openaiService';
import { highlightDifferences } from '../../../services/diffHighlighter';
import Logger from '../../../services/logger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  Logger.info(`Proofreading process endpoint invoked with method ${req.method}.`);

  // Only POST is allowed
  if (req.method !== 'POST') {
    Logger.warn('Method not allowed on proofreading process endpoint.');
    return res.status(405).json({ error: 'Method not allowed. Only POST requests are accepted.' });
  }

  const { file_id } = req.body;
  if (!file_id) {
    Logger.error('Missing required field: file_id in proofreading process request.');
    return res.status(400).json({ error: 'Missing required field: file_id.' });
  }

  try {
    // 1. Retrieve the file record
    const fileRecords = await drizzleClient.select().from(files).where(eq(files.file_id, file_id));
    if (!fileRecords || fileRecords.length === 0) {
      Logger.error(`File not found for file_id: ${file_id}`);
      return res.status(404).json({ error: 'File not found.' });
    }
    const fileRecord = fileRecords[0];

    // 2. Update file status to 'in-progress'
    await drizzleClient
      .update(files)
      .set({ proofreading_status: 'in-progress' })
      .where(eq(files.file_id, file_id));
    Logger.info(`Proofreading status updated to 'in-progress' for file_id: ${file_id}`);

    // 3. Download the file from Supabase Storage
    const supabase = createPagesServerClient({ req, res });
    const bucketName = 'uploads';
    const { data: downloadData, error: downloadError } = await supabase.storage
      .from(bucketName)
      .download(fileRecord.file_url);

    if (downloadError || !downloadData) {
      Logger.error(`Failed to download file: ${downloadError?.message}`);
      // revert status
      await drizzleClient
        .update(files)
        .set({ proofreading_status: 'pending' })
        .where(eq(files.file_id, file_id));
      return res.status(500).json({ error: `Failed to download file: ${downloadError?.message}` });
    }
    Logger.info(`File downloaded successfully for file_id: ${file_id}`);

    // Convert the downloaded Blob to a Buffer
    const arrayBuffer = await downloadData.arrayBuffer();
    const fileBuffer = Buffer.from(new Uint8Array(arrayBuffer));

    // 4. Extract text from the file
    const fileType = fileRecord.file_type.toLowerCase() as SupportedFileType;
    let extractedText: string;
    try {
      extractedText = await extractTextFromFile(fileBuffer, fileType);
      Logger.info(`Text extraction successful for file_id: ${file_id}`);
    } catch (extractionError: any) {
      Logger.error(`Text extraction failed: ${extractionError.message}`);
      await drizzleClient
        .update(files)
        .set({ proofreading_status: 'pending' })
        .where(eq(files.file_id, file_id));
      return res.status(500).json({ error: `Text extraction failed: ${extractionError.message}` });
    }

    // 5. Call OpenAI to get a corrected version
    let correctedText: string;
    try {
      const proofreadingResult = await proofreadDocument(extractedText);
      correctedText = proofreadingResult.correctedText;
      Logger.info(`Proofreading successful for file_id: ${file_id}`);
    } catch (llmError: any) {
      Logger.error(`Proofreading failed: ${llmError.message}`);
      await drizzleClient
        .update(files)
        .set({ proofreading_status: 'pending' })
        .where(eq(files.file_id, file_id));
      return res.status(500).json({ error: `Proofreading failed: ${llmError.message}` });
    }

    // 6. Generate a diff-based highlighted version (with <mark> tags)
    const fullyHighlighted = highlightDifferences(extractedText, correctedText);

    // 7. Insert a proofreading log (storing both raw text & <mark> text)
    await drizzleClient.insert(proofreadingLogs).values({
      file_id,
      corrections: {
        rawCorrectedText: correctedText,
        correctedText: fullyHighlighted,
      },
    });
    Logger.info(`Proofreading log inserted for file_id: ${file_id}`);

    // 8. Update the file's current_text with the plain corrected text
    await drizzleClient
      .update(files)
      .set({
        proofreading_status: 'complete',
        // Notice we store the plain corrected text, not the highlight with <mark> tags
        current_text: correctedText,
      })
      .where(eq(files.file_id, file_id));

    Logger.info(`Proofreading status updated to 'complete' and current_text replaced for file_id: ${file_id}`);

    return res.status(200).json({
      message: 'Proofreading completed successfully.',
      correctedText: fullyHighlighted,
    });
  } catch (error: any) {
    Logger.error(`Internal server error during proofreading process: ${error.message}`);
    return res.status(500).json({ error: 'Internal server error during proofreading process.' });
  }
}
