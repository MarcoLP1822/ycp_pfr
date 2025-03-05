/**
 * @file pages/api/proofreading/merge-docx.ts
 * @description
 * Questo endpoint gestisce la fusione delle correzioni in un file DOCX complesso
 * invocando un servizio esterno di merge.
 *
 * Workflow:
 * 1. Accetta una richiesta POST con payload:
 *    - file_id: l'identificativo univoco del file.
 *    - correctedText: il testo corretto da integrare.
 * 2. Verifica il payload e, se necessario, tenta di parsare il corpo della richiesta.
 * 3. Recupera il record del file dal database.
 * 4. Scarica il DOCX originale dallo storage di Supabase.
 * 5. Inoltra il file originale (come stream binario) e il testo corretto al servizio esterno.
 * 6. Riceve il DOCX fuso e lo restituisce con i corretti header.
 * 7. In caso di fallimento del servizio esterno, attiva un meccanismo di fallback
 *    che genera un file DOCX di base usando la libreria "docx".
 *
 * @dependencies
 * - drizzleClient per operazioni sul database.
 * - Supabase Storage per il recupero del file DOCX originale.
 * - Logger per il logging.
 * - docx: per la generazione di un fallback DOCX.
 *
 * @notes
 * - Se il corpo della richiesta è una stringa, viene parsato in JSON.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import drizzleClient from '../../../services/drizzleClient';
import { files } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import Logger from '../../../services/logger';
import { Document, Packer, Paragraph, TextRun } from 'docx';

// Aggiunge parsing del body se è una stringa (utile per ambienti di test)
if (typeof globalThis.process !== 'undefined') {
  // Nessuna logica speciale per il body, ma la seguente funzione viene usata nel handler.
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  Logger.info(`POST /api/proofreading/merge-docx invoked with method ${req.method}.`);

  // Verifica che il metodo sia POST
  if (req.method !== 'POST') {
    Logger.warn('Method not allowed on merge-docx endpoint.');
    return res.status(405).json({ error: 'Method not allowed. Only POST requests are accepted.' });
  }

  // Se req.body è una stringa, prova a parsarlo in JSON
  if (typeof req.body === 'string') {
    try {
      req.body = JSON.parse(req.body);
    } catch (error) {
      Logger.error('Failed to parse request body as JSON.');
      return res.status(400).json({ error: 'Invalid JSON in request body.' });
    }
  }

  const { file_id, correctedText } = req.body;
  if (!file_id || !correctedText) {
    Logger.error('Missing required fields: file_id and/or correctedText.');
    return res.status(400).json({ error: 'Missing required fields: file_id and correctedText.' });
  }

  // Recupera il record del file dal database
  const fileRecords = await drizzleClient.select().from(files).where(eq(files.file_id, file_id));
  if (!fileRecords || fileRecords.length === 0) {
    Logger.error(`File not found for file_id: ${file_id}`);
    return res.status(404).json({ error: 'File not found.' });
  }
  const fileRecord = fileRecords[0];

  // Crea un client Supabase e scarica il file DOCX originale
  const supabase = createPagesServerClient({ req, res });
  const bucketName = 'uploads';
  const { data: downloadData, error: downloadError } = await supabase.storage
    .from(bucketName)
    .download(fileRecord.file_url);

  if (downloadError || !downloadData) {
    Logger.error(`Failed to download DOCX file: ${downloadError?.message}`);
    throw new Error('Failed to download the original DOCX file.');
  }

  // Converte il Blob in un Buffer
  const arrayBuffer = await downloadData.arrayBuffer();
  const fileBuffer = Buffer.from(new Uint8Array(arrayBuffer));

  // Prepara il form-data da inviare al servizio di merge esterno
  const formData = new FormData();
  formData.append('correctedText', correctedText);
  const fileBlob = new Blob([fileBuffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  formData.append('file', fileBlob, fileRecord.file_name);

  const mergeServiceUrl = process.env.EXTERNAL_DOCX_MERGE_URL;
  if (!mergeServiceUrl) {
    Logger.error('EXTERNAL_DOCX_MERGE_URL environment variable is not set.');
    return res.status(500).json({ error: 'Merge service is not configured properly.' });
  }

  try {
    Logger.info(`Forwarding DOCX file and corrected text to external merge service at ${mergeServiceUrl}.`);
    const mergeResponse = await fetch(mergeServiceUrl, {
      method: 'POST',
      body: formData,
    });

    // Se il servizio esterno fallisce, attiva il fallback
    if (!mergeResponse.ok) {
      const errorText = await mergeResponse.text();
      Logger.error(`External merge service error: ${mergeResponse.status} - ${errorText}`);
      throw new Error('External merge service failed.');
    }

    const mergedBuffer = await mergeResponse.arrayBuffer();
    Logger.info(`Successfully merged DOCX file for file_id: ${file_id} using external service.`);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    const mergedFileName = `proofread-${fileRecord.file_name.replace(/\.[^/.]+$/, '')}.docx`;
    res.setHeader('Content-Disposition', `attachment; filename=${mergedFileName}`);

    return res.status(200).send(Buffer.from(mergedBuffer));
  } catch (error: any) {
    Logger.error(`Error in merge-docx endpoint: ${error.message}. Falling back to basic DOCX generation.`);
    try {
      const paragraphs = correctedText.split(/\r?\n/).map((line) => new Paragraph({
        children: [new TextRun(line)],
      }));

      const doc = new Document({
        sections: [
          {
            children: paragraphs,
          },
        ],
      });

      const fallbackBuffer = await Packer.toBuffer(doc);

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );
      const fallbackFileName = `proofread-${fileRecord.file_name.replace(/\.[^/.]+$/, '')}.docx`;
      res.setHeader('Content-Disposition', `attachment; filename=${fallbackFileName}`);

      Logger.info(`Fallback DOCX generation successful for file_id: ${file_id}. Returning fallback file.`);
      return res.status(200).send(fallbackBuffer);
    } catch (fallbackError: any) {
      Logger.error(`Fallback DOCX generation failed: ${fallbackError.message}`);
      return res.status(500).json({ error: 'Internal server error during fallback DOCX generation.' });
    }
  }
}
