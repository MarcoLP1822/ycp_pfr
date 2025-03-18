/**
 * @file worker.ts
 * @description
 * This background worker continuously polls the database for proofreading jobs (files with
 * proofreading_status set to "pending"), processes them by downloading the file from Supabase Storage,
 * extracting the text, running the proofreading process via the AI service, and updating the file record
 * with the corrected text. It also handles cancellation and error scenarios.
 * 
 * Key features:
 * - Polls the 'files' table for jobs with proofreading_status "pending".
 * - Updates job status to "in-progress" to avoid duplicate processing.
 * - Downloads the DOCX file from Supabase Storage and extracts its text.
 * - Invokes the AI proofreading service to obtain the corrected text.
 * - Inserts a proofreading log entry and updates the file record (including version incrementation).
 * - Handles cancellation by checking the cancellation_requested flag.
 * - Uses a continuous loop with delays when no jobs are found.
 * 
 * @dependencies
 * - drizzle-orm for database interactions.
 * - @supabase/supabase-js for interacting with Supabase Storage.
 * - Proofreading functions from openaiService and textExtractor.
 * - Logger for logging events.
 * 
 * @notes
 * - Ensure that the environment variables NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.
 * - This worker should be started as a separate process (e.g., with ts-node worker.ts) in production.
 */

import { eq, sql } from 'drizzle-orm';
import drizzleClient from './webapp/services/drizzleClient';
import { files, proofreadingLogs } from './webapp/db/schema';
import Logger from './webapp/services/logger';
import { proofreadDocument } from './webapp/services/openaiService';
import { extractTextFromFile, SupportedFileType } from './webapp/services/textExtractor';
import { createClient } from '@supabase/supabase-js';

/**
 * Create a Supabase client for storage access using environment variables.
 * (Using the public anon key here; for production, consider using a service role key.)
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL or Anon key is not set in the environment variables.");
}
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Processes the next available proofreading job.
 * @returns {Promise<boolean>} Returns true if a job was processed (or attempted), false if no job was found.
 */
async function processNextJob(): Promise<boolean> {
  try {
    // Query for one file with a pending proofreading job.
    const pendingJobs = await drizzleClient
      .select()
      .from(files)
      .where(eq(files.proofreading_status, 'pending'))
      .limit(1);
    
    if (pendingJobs.length === 0) {
      return false; // No pending job found.
    }
    
    const job = pendingJobs[0];
    Logger.info(`Found pending job for file_id: ${job.file_id}`);

    // Mark the job as "in-progress" to avoid duplicate processing.
    await drizzleClient
      .update(files)
      .set({ proofreading_status: 'in-progress' })
      .where(eq(files.file_id, job.file_id));

    // Check if the job has been cancelled.
    if (job.cancellation_requested) {
      Logger.info(`Job cancelled for file_id: ${job.file_id}`);
      await drizzleClient
        .update(files)
        .set({ proofreading_status: 'canceled' })
        .where(eq(files.file_id, job.file_id));
      return true;
    }

    // Download the file from Supabase Storage.
    const bucketName = 'uploads';
    const { data: downloadData, error: downloadError } = await supabase.storage
      .from(bucketName)
      .download(job.file_url);
    
    if (downloadError || !downloadData) {
      Logger.error(`Failed to download file for file_id: ${job.file_id}: ${downloadError?.message}`);
      await drizzleClient
        .update(files)
        .set({ proofreading_status: 'failed' })
        .where(eq(files.file_id, job.file_id));
      return true;
    }
    Logger.info(`File downloaded successfully for file_id: ${job.file_id}`);
    
    // Convert the downloaded data to a Buffer.
    const arrayBuffer = await downloadData.arrayBuffer();
    const fileBuffer = Buffer.from(new Uint8Array(arrayBuffer));
    const fileType = (job.file_type.toLowerCase() as SupportedFileType);
    
    // Extract text from the file.
    let extractedText: string;
    try {
      extractedText = await extractTextFromFile(fileBuffer, fileType);
      Logger.info(`Text extraction successful for file_id: ${job.file_id}`);
    } catch (extractionError: any) {
      Logger.error(`Text extraction failed for file_id: ${job.file_id}: ${extractionError.message}`);
      await drizzleClient
        .update(files)
        .set({ proofreading_status: 'failed' })
        .where(eq(files.file_id, job.file_id));
      return true;
    }
    
    // (Optional) Additional cancellation check could be placed here.

    // Process proofreading using the AI service.
    let proofreadingResult;
    try {
      proofreadingResult = await proofreadDocument(extractedText, () => false);
    } catch (proofreadError: any) {
      Logger.error(`Proofreading failed for file_id: ${job.file_id}: ${proofreadError.message}`);
      await drizzleClient
        .update(files)
        .set({ proofreading_status: 'failed' })
        .where(eq(files.file_id, job.file_id));
      return true;
    }
    const correctedText = proofreadingResult.correctedText;

    // Insert a new proofreading log with the results.
    await drizzleClient.insert(proofreadingLogs).values({
      file_id: job.file_id,
      corrections: {
        rawCorrectedText: correctedText,
        correctedText: correctedText, // For simplicity, using the corrected text directly.
      },
    });
    Logger.info(`Proofreading log inserted for file_id: ${job.file_id}`);

    // Update the file record with the corrected text, mark as complete, and increment version number.
    await drizzleClient
      .update(files)
      .set({
        proofreading_status: 'complete',
        current_text: correctedText,
        [files.version_number.name]: sql`${files.version_number} + 1`,
      })
      .where(eq(files.file_id, job.file_id));
    Logger.info(`Proofreading completed successfully for file_id: ${job.file_id}`);
    
    return true;
  } catch (error: any) {
    Logger.error(`Error in processNextJob: ${error.message}`);
    return true;
  }
}

/**
 * A helper function to introduce a delay.
 * @param ms - Number of milliseconds to delay.
 * @returns {Promise<void>}
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * The main worker loop which continuously polls for and processes proofreading jobs.
 */
async function workerLoop(): Promise<void> {
  while (true) {
    const processed = await processNextJob();
    if (!processed) {
      // No job was found; wait for 5 seconds before polling again.
      await delay(5000);
    }
  }
}

// Start the worker loop and handle any unexpected errors.
workerLoop().catch((error) => {
  Logger.error(`Worker loop encountered an error: ${error.message}`);
  process.exit(1);
});
