/**
 * @file pages/api/files/upload.ts
 * @description
 * API endpoint to handle file metadata upload. This endpoint expects a POST request with
 * file metadata (user_id, file_name, file_type, file_url). It uploads the file to Supabase Storage,
 * extracts text from the file, and stores that text in the new columns 'original_text' and 'current_text'.
 *
 * @dependencies
 * - Next.js API types
 * - Drizzle ORM for database operations
 * - Logger service for logging
 * - createPagesServerClient for Supabase Storage interaction
 * - extractTextFromFile from services/textExtractor
 * - InferModel from drizzle-orm for type casting the insert payload
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import drizzleClient from '../../../services/drizzleClient';
import { files } from '../../../db/schema';
import Logger from '../../../services/logger';
import { eq } from 'drizzle-orm';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import { extractTextFromFile, SupportedFileType } from '../../../services/textExtractor';
import { InferModel } from 'drizzle-orm';

// Allowed file extensions for validation
const allowedExtensions = ['doc', 'docx', 'odt', 'odf', 'txt'];

// Define the type for inserting into the files table
type FileInsert = InferModel<typeof files, 'insert'>;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  Logger.info(`File upload endpoint invoked with method ${req.method}.`);

  if (req.method !== 'POST') {
    Logger.warn('Method not allowed on file upload endpoint.');
    return res.status(405).json({ error: 'Method not allowed. Only POST requests are accepted.' });
  }

  const { user_id, file_name, file_type, file_url } = req.body;
  if (!user_id || !file_name || !file_type || !file_url) {
    Logger.error('Missing required fields in file upload request.');
    return res.status(400).json({ error: 'Missing required fields: user_id, file_name, file_type, file_url.' });
  }

  const fileExtension = file_type.toLowerCase();
  if (!allowedExtensions.includes(fileExtension)) {
    Logger.error(`Invalid file type attempted: ${file_type}.`);
    return res.status(400).json({ error: 'Invalid file type. Allowed types are: doc, docx, odt, odf, txt.' });
  }

  try {
    // Create the insert payload including new columns.
    const newFileValues: FileInsert = {
      user_id,
      file_name,
      file_type,
      file_url,
      proofreading_status: 'pending',
      original_text: null,
      current_text: null,
    };

    // Insert file metadata into the 'files' table.
    const [newFile] = await drizzleClient.insert(files).values(newFileValues).returning();
    Logger.info(`File metadata inserted: ${JSON.stringify(newFile)}`);

    // Download the file from Supabase Storage for text extraction.
    const supabase = createPagesServerClient({ req, res });
    const { data: downloadData, error: downloadError } = await supabase.storage
      .from('uploads')
      .download(file_url);

    if (downloadError || !downloadData) {
      Logger.error(`Failed to download file for text extraction: ${downloadError?.message}`);
      return res.status(500).json({ error: 'Failed to download file for text extraction.' });
    }

    // Convert the Blob to a Buffer.
    const arrayBuffer = await downloadData.arrayBuffer();
    const fileBuffer = Buffer.from(new Uint8Array(arrayBuffer));

    // Extract text from the file.
    const extractedText = await extractTextFromFile(fileBuffer, fileExtension as SupportedFileType);

    // Update the inserted file row with the extracted text.
    const [updatedFile] = await drizzleClient
      .update(files)
      .set({
        original_text: extractedText,
        current_text: extractedText,
      })
      .where(eq(files.file_id, newFile.file_id))
      .returning();

    Logger.info(`File text extracted and stored: ${JSON.stringify(updatedFile)}`);
    return res.status(200).json(updatedFile);
  } catch (error: any) {
    Logger.error(`Error inserting file metadata or extracting text: ${error.message}`);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}
