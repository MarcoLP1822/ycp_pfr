/**
 * @file pages/api/proofreading/process.ts
 * @description
 * This API endpoint handles the proofreading process for a given file.
 * It performs the following actions:
 *  - Validates the incoming request and extracts the file_id.
 *  - Retrieves the file record from the database.
 *  - Updates the file's proofreading status to "in-progress".
 *  - Downloads the file from Supabase Storage using the file_url.
 *  - Extracts the plain text from the file based on its file type.
 *  - Calls the OpenAI LLM API to proofread the text and obtain corrections.
 *  - Stores the proofreading results in the proofreading_logs table.
 *  - Updates the file's proofreading status to "complete".
 *  - Returns the corrected text (and any inline correction metadata) in the response.
 *
 * @dependencies
 * - Next.js API types for request/response handling.
 * - drizzleClient for database operations.
 * - Supabase client for file storage operations.
 * - extractTextFromFile from services/textExtractor to extract text.
 * - proofreadDocument from services/openaiService to call the LLM API.
 *
 * @notes
 * - This endpoint expects a POST request with a JSON body containing the "file_id".
 * - Proper error handling is implemented to ensure that any failure during the process is logged and returned.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import drizzleClient from '../../../services/drizzleClient';
import { files, proofreadingLogs } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import supabaseClient from '../../../services/supabaseClient';
import { extractTextFromFile, SupportedFileType } from '../../../services/textExtractor';
import { proofreadDocument, ProofreadingResult } from '../../../services/openaiService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Allow only POST requests.
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Only POST requests are accepted.' });
  }

  // Extract file_id from the request body.
  const { file_id } = req.body;
  if (!file_id) {
    return res.status(400).json({ error: 'Missing required field: file_id.' });
  }

  try {
    // Retrieve the file record from the database using Drizzle ORM.
    const fileRecords = await drizzleClient.select().from(files).where(eq(files.file_id, file_id));
    if (!fileRecords || fileRecords.length === 0) {
      return res.status(404).json({ error: 'File not found.' });
    }
    const fileRecord = fileRecords[0];

    // Update the file status to 'in-progress' to indicate that proofreading has started.
    await drizzleClient
      .update(files)
      .set({ proofreading_status: 'in-progress' })
      .where(eq(files.file_id, file_id));

    // Download the file from Supabase Storage.
    // Assumption: The file_url stored in the record is the path in the storage bucket.
    const bucketName = 'uploads';
    const { data: downloadData, error: downloadError } = await supabaseClient.storage
      .from(bucketName)
      .download(fileRecord.file_url);
    if (downloadError || !downloadData) {
      // Update status to pending if download fails.
      await drizzleClient
        .update(files)
        .set({ proofreading_status: 'pending' })
        .where(eq(files.file_id, file_id));
      return res.status(500).json({ error: `Failed to download file: ${downloadError?.message}` });
    }

    // Convert the downloaded Blob to a Buffer.
    // @ts-ignore: Blob.arrayBuffer is available in node environments with proper polyfills.
    const arrayBuffer = await downloadData.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // Extract the plain text from the file based on its type.
    // Supported file types are managed in services/textExtractor.ts.
    const fileType = fileRecord.file_type.toLowerCase() as SupportedFileType;
    let extractedText: string;
    try {
      extractedText = await extractTextFromFile(fileBuffer, fileType);
    } catch (extractionError: any) {
      // Update status to pending if extraction fails.
      await drizzleClient
        .update(files)
        .set({ proofreading_status: 'pending' })
        .where(eq(files.file_id, file_id));
      return res.status(500).json({ error: `Text extraction failed: ${extractionError.message}` });
    }

    // Call the OpenAI LLM API to proofread the extracted text.
    let proofreadingResult: ProofreadingResult;
    try {
      proofreadingResult = await proofreadDocument(extractedText);
    } catch (llmError: any) {
      // Update status to pending if the LLM API call fails.
      await drizzleClient
        .update(files)
        .set({ proofreading_status: 'pending' })
        .where(eq(files.file_id, file_id));
      return res.status(500).json({ error: `Proofreading failed: ${llmError.message}` });
    }

    // Store the proofreading result in the proofreading_logs table.
    await drizzleClient
      .insert(proofreadingLogs)
      .values({
        file_id: file_id,
        corrections: proofreadingResult, // Stores the corrected text and any inline metadata.
      });

    // Update the file status to 'complete'.
    await drizzleClient
      .update(files)
      .set({ proofreading_status: 'complete' })
      .where(eq(files.file_id, file_id));

    // Return the proofreading result to the client.
    return res.status(200).json({
      message: 'Proofreading completed successfully.',
      correctedText: proofreadingResult.correctedText,
      inlineCorrections: proofreadingResult.inlineCorrections || null,
    });
  } catch (error: any) {
    console.error('Error in proofreading process:', error);
    return res.status(500).json({ error: 'Internal server error during proofreading process.' });
  }
}
