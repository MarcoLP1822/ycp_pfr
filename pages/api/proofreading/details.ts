/**
 * @file pages/api/proofreading/details.ts
 * @description
 * Questo endpoint API recupera i dettagli del proofreading per un file specifico.
 * I passaggi sono:
 *  - Validazione della richiesta GET e estrazione del parametro fileId.
 *  - Recupero dell'ultima voce di proofreading_logs per il file.
 *  - Recupero del record del file dal database per ottenere file_url e file_type.
 *  - Download del file da Supabase Storage ed estrazione del testo originale.
 *  - Restituzione di un JSON contenente il testo originale e il testo corretto (con evidenziazione diff-based).
 *
 * @dependencies
 * - Tipi API di Next.js
 * - Drizzle ORM per operazioni di database.
 * - Supabase Auth Helpers (usando createPagesServerClient)
 * - extractTextFromFile da services/textExtractor
 * - Logger per il logging.
 *
 * @notes
 * - Assicurati che l'ambiente sia correttamente configurato.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import drizzleClient from '../../../services/drizzleClient';
import { files, proofreadingLogs } from '../../../db/schema';
import { eq, desc } from 'drizzle-orm';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import { extractTextFromFile, SupportedFileType } from '../../../services/textExtractor';
import Logger from '../../../services/logger';
import { ProofreadingResult } from '../../../services/openaiService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  Logger.info(`GET /api/proofreading/details invoked with method ${req.method}.`);

  // Consenti solo richieste GET.
  if (req.method !== 'GET') {
    Logger.warn('Method not allowed on proofreading details endpoint.');
    return res.status(405).json({ error: 'Method not allowed. Only GET requests are accepted.' });
  }

  // Estrai fileId dai parametri della query e valida.
  const { fileId } = req.query;
  if (!fileId || typeof fileId !== 'string') {
    Logger.error('Missing or invalid fileId parameter.');
    return res.status(400).json({ error: 'Missing or invalid fileId parameter.' });
  }

  try {
    // Recupera l'ultima voce di proofreading_logs per il file
    const logs = await drizzleClient
      .select()
      .from(proofreadingLogs)
      .where(eq(proofreadingLogs.file_id, fileId))
      .orderBy(desc(proofreadingLogs.timestamp));

    if (!logs || logs.length === 0) {
      Logger.error(`Proofreading details not found for fileId: ${fileId}`);
      return res.status(404).json({ error: 'Proofreading details not found.' });
    }
    const logEntry = logs[0];

    // Recupera il record del file per ottenere file_url e file_type
    const fileRecords = await drizzleClient
      .select()
      .from(files)
      .where(eq(files.file_id, fileId));
    if (!fileRecords || fileRecords.length === 0) {
      Logger.error(`File record not found for fileId: ${fileId}`);
      return res.status(404).json({ error: 'File record not found.' });
    }
    const fileRecord = fileRecords[0];

    // Crea un client Supabase per scaricare il file.
    const supabase = createPagesServerClient({ req, res });
    const bucketName = 'uploads';
    const { data: downloadData, error: downloadError } = await supabase.storage
      .from(bucketName)
      .download(fileRecord.file_url);

    if (downloadError || !downloadData) {
      Logger.error(`Failed to download file: ${downloadError?.message}`);
      return res.status(500).json({ error: 'Failed to download file for original text extraction.' });
    }

    // Converti il Blob in un Buffer.
    const arrayBuffer = await downloadData.arrayBuffer();
    const fileBuffer = Buffer.from(new Uint8Array(arrayBuffer));

    // Estrai il testo originale dal file.
    const fileType = fileRecord.file_type.toLowerCase() as SupportedFileType;
    const originalText = await extractTextFromFile(fileBuffer, fileType);

    // Cast delle correzioni al tipo ProofreadingResult.
    const corrections = logEntry.corrections as ProofreadingResult;

    Logger.info(`Successfully fetched proofreading details for fileId: ${fileId}`);
    return res.status(200).json({
      originalText,
      correctedText: corrections.correctedText,
    });
  } catch (error: any) {
    Logger.error(`Error fetching proofreading details: ${error.message}`);
    return res.status(500).json({ error: 'Internal server error while fetching proofreading details.' });
  }
}
