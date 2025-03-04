/**
 * @file pages/api/proofreading/merge-docx.ts
 * @description
 * This API endpoint handles merging corrections into a complex DOCX file by invoking an external merge service.
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
 * Fallback Mechanism (Implemented in Step 3):
 * If the external merge service fails (non-OK response or network error), the endpoint falls back
 * to a basic DOCX generation method using the `docx` library. This method converts the corrected text,
 * splitting by newline characters into paragraphs, to generate a DOCX file.
 * 
 * @dependencies
 * - drizzleClient for database operations.
 * - Supabase Storage for file retrieval.
 * - External merge service (configured via EXTERNAL_DOCX_MERGE_URL env variable).
 * - Logger for logging.
 * - docx: For generating a DOCX file as a fallback.
 * 
 * @notes
 * - Ensure that the external merge service endpoint is reachable and properly configured.
 * - In case of failure, the fallback ensures that users still receive a DOCX file.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import drizzleClient from '../../../services/drizzleClient';
import { files } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import Logger from '../../../services/logger';
import { Document, Packer, Paragraph, TextRun } from 'docx';

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
      throw new Error('Failed to download the original DOCX file.');
    }

    // Convert the downloaded Blob to a Buffer
    const arrayBuffer = await downloadData.arrayBuffer();
    const fileBuffer = Buffer.from(new Uint8Array(arrayBuffer));

    // Prepare form data to send to the external merge service
    const formData = new FormData();
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

    // If the external merge service returns an error, throw to trigger fallback
    if (!mergeResponse.ok) {
      const errorText = await mergeResponse.text();
      Logger.error(`External merge service error: ${mergeResponse.status} - ${errorText}`);
      throw new Error('External merge service failed.');
    }

    // Get the merged DOCX file as a buffer from the external service
    const mergedBuffer = await mergeResponse.arrayBuffer();
    Logger.info(`Successfully merged DOCX file for file_id: ${file_id} using external service.`);

    // Set response headers for file download
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    const mergedFileName = `proofread-${fileRecord.file_name.replace(/\.[^/.]+$/, '')}.docx`;
    res.setHeader('Content-Disposition', `attachment; filename=${mergedFileName}`);

    // Return the merged DOCX file to the client
    return res.status(200).send(Buffer.from(mergedBuffer));
  } catch (error: any) {
    Logger.error(`Error in merge-docx endpoint: ${error.message}. Falling back to basic DOCX generation.`);
    
    try {
      // Fallback mechanism: Generate a basic DOCX file using the corrected text.
      // Split the corrected text by newline characters to form individual paragraphs.
      const paragraphs = correctedText.split(/\r?\n/).map((line) => new Paragraph({
        children: [new TextRun(line)],
      }));

      // Create a new DOCX document with the generated paragraphs.
      const doc = new Document({
        sections: [
          {
            children: paragraphs,
          },
        ],
      });

      // Generate the DOCX file as a buffer.
      const fallbackBuffer = await Packer.toBuffer(doc);

      // Set response headers for file download using fallback DOCX.
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );
      // Use the original file name with a "proofread-" prefix.
      const fallbackFileName = `proofread-${(await drizzleClient.select().from(files).where(eq(files.file_id, file_id)))[0].file_name.replace(/\.[^/.]+$/, '')}.docx`;
      res.setHeader('Content-Disposition', `attachment; filename=${fallbackFileName}`);

      Logger.info(`Fallback DOCX generation successful for file_id: ${file_id}. Returning fallback file.`);
      return res.status(200).send(fallbackBuffer);
    } catch (fallbackError: any) {
      Logger.error(`Fallback DOCX generation failed: ${fallbackError.message}`);
      return res.status(500).json({ error: 'Internal server error during fallback DOCX generation.' });
    }
  }
}
