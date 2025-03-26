/**
 * @file pages/api/files/upload.ts
 * @description
 * API endpoint to handle file metadata upload. This endpoint expects a POST request with
 * file metadata (user_id, file_name, file_type, file_url). It uploads the file to Supabase Storage,
 * extracts text from the file, and stores that text in the new columns 'original_text' and 'current_text'.
 *
 * This updated version includes una validazione lato server basata sul contenuto del file utilizzando la libreria "file-type".
 *
 * NOTA: Assicurati di aver installato il modulo "file-type" eseguendo:
 *       npm install file-type
 * oppure
 *       yarn add file-type
 * Se TypeScript non trova il modulo, aggiungi anche un file "file-type.d.ts" nella root con:
 *       declare module 'file-type';
 *
 * @dependencies
 * - Next.js API types
 * - Drizzle ORM per le operazioni sul database
 * - Logger per il logging
 * - createPagesServerClient per l'interazione con Supabase Storage
 * - extractTextFromFile per l'estrazione del testo
 * - file-type: per determinare il MIME type effettivo dal buffer del file
 *
 * @notes
 * - Assicurarsi di aver installato file-type: `npm install file-type`
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import drizzleClient from '../../../services/drizzleClient';
import { files } from '../../../db/schema';
import Logger from '../../../services/logger';
import { eq } from 'drizzle-orm';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import { extractTextFromFile, SupportedFileType } from '../../../services/textExtractor';
import { InferModel } from 'drizzle-orm';
// Importa la funzione fileTypeFromBuffer (non ha default export)
import { fileTypeFromBuffer } from 'file-type';

type FileInsert = InferModel<typeof files, 'insert'>;

const allowedExtensions = ['doc', 'docx', 'odt', 'odf', 'txt'];
// Mappa tra estensione e MIME type atteso
const allowedMimeTypes: { [key: string]: string } = {
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt: 'text/plain',
  odt: 'application/vnd.oasis.opendocument.text',
  odf: 'application/vnd.oasis.opendocument.text'
};

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
    // Inserisci la nuova riga nella tabella "files"
    const newFileValues: FileInsert = {
      user_id,
      file_name,
      file_type,
      file_url,
      proofreading_status: 'pending',
      original_text: "",
      current_text: "",
    };

    const [newFile] = await drizzleClient.insert(files).values(newFileValues).returning();
    Logger.info(`File metadata inserted: ${JSON.stringify(newFile)}`);

    // Crea il client Supabase e scarica il file dallo storage
    const supabase = createPagesServerClient({ req, res });
    const { data: downloadData, error: downloadError } = await supabase.storage
      .from('uploads')
      .download(file_url);

    if (downloadError || !downloadData) {
      Logger.error(`Failed to download file for text extraction: ${downloadError?.message}`);
      return res.status(500).json({ error: 'Failed to download file for text extraction.' });
    }

    // Converti il Blob in un Buffer
    const arrayBuffer = await downloadData.arrayBuffer();
    const fileBuffer = Buffer.from(new Uint8Array(arrayBuffer));

    // Validazione lato server: rileva il MIME type effettivo dal buffer
    const detected = await fileTypeFromBuffer(fileBuffer);
    const expectedMime = allowedMimeTypes[fileExtension];
    if (!detected || detected.mime !== expectedMime) {
      Logger.error(
        `File content MIME type mismatch. Expected: ${expectedMime}, Detected: ${detected ? detected.mime : 'unknown'}`
      );
      return res.status(400).json({ error: 'Il contenuto del file non corrisponde al tipo atteso.' });
    }

    // Estrai il testo dal file
    const extractedText = await extractTextFromFile(fileBuffer, fileExtension as SupportedFileType);

    // Aggiorna la riga inserita con il testo estratto
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
