/**
 * @file pages/api/proofreading/process.ts
 * @description
 * Questo endpoint API gestisce il processo di proofreading per un file.
 * I passaggi sono:
 *  1. Validazione della richiesta e estrazione del file_id.
 *  2. Recupero del record del file dal database.
 *  3. Aggiornamento dello stato del file a "in-progress".
 *  4. Download del file dallo storage Supabase ed estrazione del testo.
 *  5. Invocazione dell'API OpenAI per il proofreading del testo.
 *  6. Calcolo di un diff carattere per carattere per evidenziare ogni modifica.
 *  7. Salvataggio del testo corretto (sia raw che diff-based) in proofreading_logs.
 *  8. Aggiornamento dello stato del file a "complete".
 *  9. Restituzione di un messaggio di successo.
 *
 * @dependencies
 * - Tipi API di Next.js
 * - Drizzle ORM (files, proofreadingLogs)
 * - Supabase Auth Helpers per operazioni server-side di storage (usando createPagesServerClient)
 * - extractTextFromFile da services/textExtractor
 * - proofreadDocument da services/openaiService
 * - highlightDifferences da services/diffHighlighter
 * - Logger per il logging
 *
 * @notes
 * - Assicurati di aver installato diff-match-patch.
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

  // Consenti solo richieste POST.
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
    // Recupera il record del file
    const fileRecords = await drizzleClient.select().from(files).where(eq(files.file_id, file_id));
    if (!fileRecords || fileRecords.length === 0) {
      Logger.error(`File not found for file_id: ${file_id}`);
      return res.status(404).json({ error: 'File not found.' });
    }
    const fileRecord = fileRecords[0];

    // Aggiorna lo stato del file a 'in-progress'
    await drizzleClient
      .update(files)
      .set({ proofreading_status: 'in-progress' })
      .where(eq(files.file_id, file_id));
    Logger.info(`Proofreading status updated to 'in-progress' for file_id: ${file_id}`);

    // Scarica il file dallo storage Supabase
    const supabase = createPagesServerClient({ req, res });
    const bucketName = 'uploads';
    const { data: downloadData, error: downloadError } = await supabase.storage
      .from(bucketName)
      .download(fileRecord.file_url);

    if (downloadError || !downloadData) {
      Logger.error(`Failed to download file: ${downloadError?.message}`);
      // Ripristina lo stato a 'pending' in caso di errore nel download
      await drizzleClient
        .update(files)
        .set({ proofreading_status: 'pending' })
        .where(eq(files.file_id, file_id));
      return res.status(500).json({ error: `Failed to download file: ${downloadError?.message}` });
    }
    Logger.info(`File downloaded successfully for file_id: ${file_id}`);

    // Converti il Blob scaricato in un Buffer
    const arrayBuffer = await downloadData.arrayBuffer();
    const fileBuffer = Buffer.from(new Uint8Array(arrayBuffer));

    // Estrai il testo dal file
    const fileType = fileRecord.file_type.toLowerCase() as SupportedFileType;
    let extractedText: string;
    try {
      extractedText = await extractTextFromFile(fileBuffer, fileType);
      Logger.info(`Text extraction successful for file_id: ${file_id}`);
    } catch (extractionError: any) {
      Logger.error(`Text extraction failed: ${extractionError.message}`);
      // Ripristina lo stato a 'pending' in caso di errore nell'estrazione
      await drizzleClient
        .update(files)
        .set({ proofreading_status: 'pending' })
        .where(eq(files.file_id, file_id));
      return res.status(500).json({ error: `Text extraction failed: ${extractionError.message}` });
    }

    // Chiama l'API OpenAI per il proofreading del testo
    let correctedText: string;
    try {
      const proofreadingResult = await proofreadDocument(extractedText);
      correctedText = proofreadingResult.correctedText;
      Logger.info(`Proofreading successful for file_id: ${file_id}`);
    } catch (llmError: any) {
      Logger.error(`Proofreading failed: ${llmError.message}`);
      // Ripristina lo stato a 'pending' in caso di errore nell'API LLM
      await drizzleClient
        .update(files)
        .set({ proofreading_status: 'pending' })
        .where(eq(files.file_id, file_id));
      return res.status(500).json({ error: `Proofreading failed: ${llmError.message}` });
    }

    // Esegui un diff carattere per carattere per evidenziare ogni modifica
    const fullyHighlighted = highlightDifferences(extractedText, correctedText);

    // Salva il risultato in proofreading_logs
    await drizzleClient.insert(proofreadingLogs).values({
      file_id: file_id,
      corrections: {
        rawCorrectedText: correctedText,
        correctedText: fullyHighlighted, // Contiene i tag <mark> per ogni differenza
      },
    });
    Logger.info(`Proofreading result logged for file_id: ${file_id}`);

    // Aggiorna lo stato del file a 'complete'
    await drizzleClient
      .update(files)
      .set({ proofreading_status: 'complete' })
      .where(eq(files.file_id, file_id));
    Logger.info(`Proofreading status updated to 'complete' for file_id: ${file_id}`);

    // Restituisce un messaggio di successo
    return res.status(200).json({
      message: 'Proofreading completed successfully.',
      correctedText: fullyHighlighted,
    });
  } catch (error: any) {
    Logger.error(`Internal server error during proofreading process: ${error.message}`);
    return res.status(500).json({ error: 'Internal server error during proofreading process.' });
  }
}
