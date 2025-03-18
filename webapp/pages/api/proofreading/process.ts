import type { NextApiRequest, NextApiResponse } from 'next';
import drizzleClient from '../../../services/drizzleClient';
import { files, proofreadingLogs } from '../../../db/schema';
import { eq, sql } from 'drizzle-orm';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import { extractTextFromFile, SupportedFileType } from '../../../services/textExtractor';
import { proofreadDocument } from '../../../services/openaiService';
import { highlightDifferences } from '../../../services/diffHighlighter';
import Logger from '../../../services/logger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  Logger.info(`Proofreading process endpoint invoked with method ${req.method}.`);
  
  if (req.method !== 'POST') {
    Logger.warn('Method not allowed on proofreading process endpoint.');
    return res.status(405).json({ error: 'Method not allowed. Only POST requests are accepted.' });
  }
  
  let cancelled = false;
  req.on('aborted', () => {
    cancelled = true;
    Logger.info("Request aborted by client.");
  });
  
  const { file_id } = req.body;
  if (!file_id) {
    Logger.error('Missing required field: file_id in proofreading process request.');
    return res.status(400).json({ error: 'Missing required field: file_id.' });
  }
  
  try {
    const fileRecords = await drizzleClient.select().from(files).where(eq(files.file_id, file_id));
    if (!fileRecords || fileRecords.length === 0) {
      Logger.error(`File not found for file_id: ${file_id}`);
      return res.status(404).json({ error: 'File not found.' });
    }
    const fileRecord = fileRecords[0];
    
    // Se già in elaborazione, evita duplicazioni
    if (fileRecord.proofreading_status === 'in-progress') {
      Logger.info(`Proofreading already in progress for file_id: ${file_id}`);
      return res.status(409).json({ error: 'Proofreading already in progress.' });
    }
    
    await drizzleClient
      .update(files)
      .set({ proofreading_status: 'in-progress' })
      .where(eq(files.file_id, file_id));
    Logger.info(`Proofreading status updated to 'in-progress' for file_id: ${file_id}`);
    
    const supabase = createPagesServerClient({ req, res });
    const bucketName = 'uploads';
    const { data: downloadData, error: downloadError } = await supabase.storage
      .from(bucketName)
      .download(fileRecord.file_url);
    
    if (downloadError || !downloadData) {
      Logger.error(`Failed to download file: ${downloadError?.message}`);
      await drizzleClient
        .update(files)
        .set({ proofreading_status: 'pending' })
        .where(eq(files.file_id, file_id));
      return res.status(500).json({ error: `Failed to download file: ${downloadError?.message}` });
    }
    Logger.info(`File downloaded successfully for file_id: ${file_id}`);
    
    const arrayBuffer = await downloadData.arrayBuffer();
    const fileBuffer = Buffer.from(new Uint8Array(arrayBuffer));
    
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
    
    Logger.info(`Inizio proofreading del documento: lunghezza totale ${extractedText.length} caratteri.`);
    
    // Passa la funzione isCancelled al proofreading
    const proofreadingResult = await proofreadDocument(extractedText, () => cancelled);
    const correctedText = proofreadingResult.correctedText;
    Logger.info(`Proofreading successful for file_id: ${file_id}`);
    
    const fullyHighlighted = highlightDifferences(extractedText, correctedText);
    
    await drizzleClient.insert(proofreadingLogs).values({
      file_id,
      corrections: {
        rawCorrectedText: correctedText,
        correctedText: fullyHighlighted,
      },
    });
    Logger.info(`Proofreading log inserted for file_id: ${file_id}`);
    
    await drizzleClient
      .update(files)
      .set({
        proofreading_status: 'complete' as const,
        current_text: correctedText,
        [files.version_number.name]: sql`${files.version_number} + 1`,
      })
      .where(eq(files.file_id, file_id));
    Logger.info(`Proofreading status updated to 'complete' for file_id: ${file_id}`);
    
    return res.status(200).json({
      message: 'Proofreading completed successfully.',
      correctedText: fullyHighlighted,
    });
  } catch (error: any) {
    if (cancelled) {
      Logger.info(`Proofreading process cancelled for file_id: ${file_id}`);
      return; // oppure: return res.status(499).json({ error: 'Proofreading process cancelled by user.' });
    }
    Logger.error(`Internal server error during proofreading process: ${error.message}`);
    return res.status(500).json({ error: 'Internal server error during proofreading process.' });
  }
}
