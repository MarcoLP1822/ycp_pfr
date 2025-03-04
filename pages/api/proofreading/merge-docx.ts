/**
 * @file pages/api/proofreading/merge-docx.ts
 * @description
 * This API endpoint handles merging corrections into a complex DOCX file
 * by invoking an external merge service.
 *
 * Workflow:
 * 1. Accepts a POST request with payload:
 *    - file_id: The unique identifier of the file.
 *    - correctedText: The corrected plain text that should be merged.
 * 2. Validates the request payload.
 * 3. Retrieves the file record from the database.
 * 4. Downloads the original DOCX file from Supabase Storage.
 * 5. Forwards the original DOCX (as a binary stream) and the corrected text
 *    to the external merge service using a POST request with multipart/form-data.
 * 6. Receives the merged DOCX from the external service.
 * 7. Returns the merged DOCX file to the client with proper Content-Type and Content-Disposition headers.
 *
 * @dependencies
 * - drizzleClient for database operations.
 * - Supabase Storage for file retrieval.
 * - External merge service (configured via EXTERNAL_DOCX_MERGE_URL env variable).
 * - Logger for logging.
 *
 * @notes
 * - Ensure that the external merge service endpoint is reachable and properly configured.
 * - This implementation does not yet include a fallback mechanism (to be added in Step 3).
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import drizzleClient from '../../../services/drizzleClient';
import { files } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import Logger from '../../../services/logger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  Logger.info(`POST /api/proofreading/merge-docx invoked with method ${req.method}.`);

  // Allow only POST requests
  if (req.method !== 'POST') {
    Logger.warn('Method not allowed on merge-docx endpoint.');
    return res.status(405).json({ error: 'Method not allowed. Only POST requests are accepted.' });
  }

  // Extract file_id and correctedText from the request body
  const { file_id, correctedText } = req.body;
  if (!file_id || !correctedText) {
    Logger.error('Missing required fields: file_id and/or correctedText.');
    return res.status(400).json({ error: 'Missing required fields: file_id and correctedText.' });
  }

  // Retrieve the external merge service URL from environment variables
  const mergeServiceUrl = process.env.EXTERNAL_DOCX_MERGE_URL;
  if (!mergeServiceUrl) {
    Logger.error('EXTERNAL_DOCX_MERGE_URL environment variable is not set.');
    return res.status(500).json({ error: 'Merge service is not configured properly.' });
  }

  try {
    // Retrieve the file record from the database using the provided file_id
    const fileRecords = await drizzleClient.select().from(files).where(eq(files.file_id, file_id));
    if (!fileRecords || fileRecords.length === 0) {
      Logger.error(`File not found for file_id: ${file_id}`);
      return res.status(404).json({ error: 'File not found.' });
    }
    const fileRecord = fileRecords[0];

    // Create a Supabase client and download the original DOCX file from the storage bucket
    const supabase = createPagesServerClient({ req, res });
    const bucketName = 'uploads';
    const { data: downloadData, error: downloadError } = await supabase.storage
      .from(bucketName)
      .download(fileRecord.file_url);

    if (downloadError || !downloadData) {
      Logger.error(`Failed to download DOCX file: ${downloadError?.message}`);
      return res.status(500).json({ error: 'Failed to download the original DOCX file.' });
    }

    // Convert the downloaded Blob to a Buffer
    const arrayBuffer = await downloadData.arrayBuffer();
    const fileBuffer = Buffer.from(new Uint8Array(arrayBuffer));

    // Prepare form data to send to the external merge service
    // Create a new FormData instance. (Node.js v18+ provides a global FormData.)
    const formData = new FormData();
    // Append the corrected text
    formData.append('correctedText', correctedText);
    // Convert the file buffer to a Blob and append it with the original file name
    const fileBlob = new Blob([fileBuffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    formData.append('file', fileBlob, fileRecord.file_name);

    Logger.info(`Forwarding DOCX file and corrected text to external merge service at ${mergeServiceUrl}.`);

    // Call the external merge service
    const mergeResponse = await fetch(mergeServiceUrl, {
      method: 'POST',
      body: formData,
    });

    if (!mergeResponse.ok) {
      const errorText = await mergeResponse.text();
      Logger.error(`External merge service error: ${mergeResponse.status} - ${errorText}`);
      return res.status(500).json({ error: 'External merge service failed to merge the DOCX.' });
    }

    // Get the merged DOCX file as a buffer
    const mergedBuffer = await mergeResponse.arrayBuffer();

    Logger.info(`Successfully merged DOCX file for file_id: ${file_id}. Returning merged file to client.`);

    // Set response headers for file download
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    // Create a file name for the merged document (e.g., proofread-{originalName}.docx)
    const mergedFileName = `proofread-${fileRecord.file_name.replace(/\.[^/.]+$/, '')}.docx`;
    res.setHeader('Content-Disposition', `attachment; filename=${mergedFileName}`);

    // Send the merged DOCX file back to the client
    return res.status(200).send(Buffer.from(mergedBuffer));
  } catch (error: any) {
    Logger.error(`Error in merge-docx endpoint: ${error.message}`);
    return res.status(500).json({ error: 'Internal server error during DOCX merge process.' });
  }
}
