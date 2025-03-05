/**
 * @file pages/api/proofreading/download.ts
 * @description
 * This API endpoint handles downloading the proofread text in DOCX format.
 * It retrieves the file record from the database using the provided fileId,
 * generates a DOCX document using the `docx` package, and sends the generated
 * file as a downloadable response. The formatting is preserved by converting
 * newline characters in the text into separate paragraphs.
 *
 * Key features:
 * - Validates the GET request and required query parameter "fileId".
 * - Retrieves the file record from the database (using Drizzle ORM).
 * - Generates a DOCX document with paragraphs created from the proofread text.
 * - Sets appropriate response headers for file download.
 *
 * @dependencies
 * - next: For API request and response types.
 * - docx: For creating and packing DOCX documents.
 * - drizzleClient & db/schema: For database interactions.
 * - Logger: For logging endpoint activity.
 *
 * @notes
 * - Ensure the "docx" package is installed in your project:
 *   Run: npm install docx
 * - This implementation converts newline characters to individual paragraphs.
 *   For more complex formatting, further enhancements would be required.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import drizzleClient from '../../../services/drizzleClient';
import { files } from '../../../db/schema';
import Logger from '../../../services/logger';
import { eq } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  Logger.info(`GET /api/proofreading/download invoked with method ${req.method}.`);

  // Ensure the method is GET.
  if (req.method !== 'GET') {
    Logger.warn('Method not allowed on download endpoint.');
    return res.status(405).json({ error: 'Method not allowed. Only GET requests are accepted.' });
  }

  // Extract the fileId from the query parameters.
  const { fileId } = req.query;
  if (!fileId || typeof fileId !== 'string') {
    Logger.error('Missing or invalid fileId parameter.');
    return res.status(400).json({ error: 'Missing or invalid fileId parameter.' });
  }

  try {
    // Retrieve the file record from the database.
    const fileRecords = await drizzleClient.select().from(files).where(eq(files.file_id, fileId));
    if (!fileRecords || fileRecords.length === 0) {
      Logger.error(`File not found for fileId: ${fileId}`);
      return res.status(404).json({ error: 'File not found.' });
    }
    const fileRecord = fileRecords[0];

    // Use the proofread (current) text for the DOCX generation.
    const proofreadText = fileRecord.current_text;
    if (!proofreadText) {
      Logger.error(`No proofread text available for fileId: ${fileId}`);
      return res.status(400).json({ error: 'No proofread text available for this file.' });
    }

    // Split the text by newline characters and create a paragraph for each.
    const paragraphs = proofreadText.split(/\r?\n/).map(line => {
      return new Paragraph({
        children: [new TextRun(line)],
      });
    });

    // Create a new DOCX document with sections using the Document constructor.
    const doc = new Document({
      sections: [
        {
          children: paragraphs,
        },
      ],
    });

    // Generate the DOCX file as a buffer.
    const buffer = await Packer.toBuffer(doc, false);

    // Set response headers for file download.
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename=proofread-${fileRecord.file_name.replace(/\.[^/.]+$/, "")}.docx`);

    // Send the generated DOCX file.
    return res.status(200).send(buffer);
  } catch (error: any) {
    Logger.error(`Error generating DOCX: ${error.message}`);
    return res.status(500).json({ error: 'Internal server error during DOCX generation.' });
  }
}
