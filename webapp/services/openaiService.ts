/**
 * @file webapp/services/openaiService.ts
 * @description
 * Questo file fornisce le funzioni per il proofreading tramite OpenAI.
 * Include la funzione di suddivisione del testo in chunk basati sul numero di token,
 * la chiamata a OpenAI per correggere ogni chunk e la funzione principale che elabora
 * l'intero testo.
 *
 * @dependencies
 * - Logger per il logging
 * - @dqbd/tiktoken per la tokenizzazione
 *
 * @notes
 * La funzione chunkTextByTokens ora utilizza direttamente encoding.decode(tokenChunk)
 * per uniformare la conversione dei token in stringa.
 */

import Logger from './logger';
import { encoding_for_model } from '@dqbd/tiktoken';

/**
 * Risultato finale del proofreading:
 * - correctedText: il testo corretto unito
 * - inlineCorrections: eventuali correzioni in linea (opzionale)
 */
export interface ProofreadingResult {
  correctedText: string;
  inlineCorrections?: any;
}

/**
 * Suddivide il testo in chunk di massimo `maxTokens` token,
 * decodificando i token in stringa per inviare testo vero a OpenAI.
 */
function chunkTextByTokens(text: string, maxTokens: number, model: string): string[] {
  const encoding = encoding_for_model(model as any);
  // Otteniamo l'array di token (numeri)
  const tokens = encoding.encode(text);
  const chunks: string[] = [];
  for (let i = 0; i < tokens.length; i += maxTokens) {
    // Ricaviamo una "fetta" di token
    const tokenChunk = tokens.slice(i, i + maxTokens);
    // Decodifichiamo i token in una stringa in modo diretto
    const decodedArray = encoding.decode(tokenChunk);
    const decodedString = new TextDecoder().decode(decodedArray);
    chunks.push(decodedString);
  }
  return chunks;
}

/** 
 * Ritarda l'esecuzione di ms millisecondi 
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Esegue la chiamata a OpenAI per correggere il singolo chunk di testo.
 */
async function proofreadChunk(chunk: string): Promise<string> {
  const API_URL = "https://api.openai.com/v1/chat/completions";
  const API_KEY = process.env.OPENAI_API_KEY;
  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 1000;

  const payload = {
    model: "gpt-4o-mini", // o il modello che usi
    messages: [
      {
        role: "system",
        content:
          "Sei un assistente AI editor ed esperto di correzione testi che corregge errori di grammatica, punteggiatura e ortografia. Restituisci solo la versione corretta in forma semplice del testo.",
      },
      {
        role: "user",
        content: chunk,
      },
    ],
    temperature: 0.2,
  };

  let attempt = 0;
  while (attempt < MAX_RETRIES) {
    try {
      Logger.info(`Invio chunk (tentativo ${attempt + 1}): lunghezza ${chunk.length} caratteri.`);
      const startTime = Date.now();
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify(payload),
      });
      const duration = Date.now() - startTime;
      Logger.info(`Richiesta completata in ${duration}ms per chunk di lunghezza ${chunk.length}.`);

      if (!response.ok) {
        const errorResponse = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${errorResponse}`);
      }

      const data = await response.json();
      const messageContent = data.choices?.[0]?.message?.content;
      if (!messageContent) {
        throw new Error("Nessun contenuto restituito dall'API OpenAI.");
      }

      Logger.info(`Chunk corretto con successo (tentativo ${attempt + 1}).`);
      return messageContent;
    } catch (error: any) {
      attempt++;
      Logger.error(`Tentativo ${attempt} fallito per questo chunk: ${error.message}`);
      if (attempt >= MAX_RETRIES) {
        throw new Error(`Fallito il proofreading del chunk dopo ${MAX_RETRIES} tentativi: ${error.message}`);
      }
      await delay(RETRY_DELAY_MS);
    }
  }
  throw new Error("Errore inaspettato nella funzione proofreadChunk.");
}

/**
 * Processa l'intero testo inviandolo a chunk. Se isCancelled() ritorna true,
 * interrompe il processo.
 */
export async function proofreadDocument(
  text: string,
  isCancelled?: () => boolean
): Promise<ProofreadingResult> {
  // Scegli il modello e il numero massimo di token per chunk
  const model = "gpt-4o-mini";
  const MAX_TOKENS_PER_CHUNK = 3000;

  Logger.info(`Inizio proofreading del documento: lunghezza totale ${text.length} caratteri.`);
  const startTimeTotal = Date.now();

  // Calcoliamo i token totali
  const encoding = encoding_for_model(model as any);
  const tokensRaw = encoding.encode(text);
  const totalTokens = tokensRaw.length;
  Logger.info(`Il documento contiene circa ${totalTokens} token.`);

  // Se il testo è più corto di MAX_TOKENS_PER_CHUNK, inviamo in un solo chunk
  if (totalTokens <= MAX_TOKENS_PER_CHUNK) {
    Logger.info("Testo breve, procedo con una singola chiamata.");
    const corrected = await proofreadChunk(text);
    Logger.info(`Proofreading completato in ${Date.now() - startTimeTotal}ms.`);
    return { correctedText: corrected };
  }

  // Altrimenti, lo dividiamo in chunk
  const chunks = chunkTextByTokens(text, MAX_TOKENS_PER_CHUNK, model);
  Logger.info(`Testo diviso in ${chunks.length} chunk basati sui token.`);

  const correctedChunks: string[] = [];
  for (let i = 0; i < chunks.length; i++) {
    if (isCancelled && isCancelled()) {
      Logger.info(`Processo cancellato prima del chunk ${i + 1}.`);
      throw new Error("Processo di proofreading cancellato dall'utente.");
    }
    const chunkStart = Date.now();
    Logger.info(`Invio chunk ${i + 1}/${chunks.length}: lunghezza ${chunks[i].length} caratteri.`);
    try {
      const corrected = await proofreadChunk(chunks[i]);
      correctedChunks.push(corrected);
      Logger.info(`Chunk ${i + 1} elaborato con successo in ${Date.now() - chunkStart}ms.`);
      Logger.info(`Memoria corrente: ${JSON.stringify(process.memoryUsage())}`);
    } catch (err) {
      Logger.error(`Errore nell'elaborazione del chunk ${i + 1}: ${err instanceof Error ? err.message : err}`);
      throw err;
    }
  }

  const combinedCorrectedText = correctedChunks.join("\n");
  Logger.info(`Proofreading completato in ${Date.now() - startTimeTotal}ms.`);
  return { correctedText: combinedCorrectedText };
}
