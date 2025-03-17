import Logger from './logger';
import { encoding_for_model } from '@dqbd/tiktoken';

export interface ProofreadingResult {
  correctedText: string;
  inlineCorrections?: any;
}

/**
 * Suddivide il testo in chunk basati su un limite massimo di token.
 *
 * @param text Il testo da suddividere.
 * @param maxTokens Numero massimo di token per ogni chunk.
 * @param model Il modello per l'encoding (es. "gpt-4o-mini").
 * @returns Un array di stringhe, ciascuna rappresentante un chunk.
 */
function chunkTextByTokens(text: string, maxTokens: number, model: string): string[] {
  const encoding = encoding_for_model(model as any);
  const tokens = encoding.encode(text);
  const chunks: string[] = [];
  
  for (let i = 0; i < tokens.length; i += maxTokens) {
    const tokenChunk = tokens.slice(i, i + maxTokens);
    const decoded = encoding.decode(tokenChunk);
    chunks.push(decoded.toString());
  }
  return chunks;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Invia un singolo chunk all'API OpenAI per la correzione.
 * Registra log dettagliati per ciascun tentativo e il tempo impiegato.
 *
 * @param chunk Il testo del chunk da correggere.
 * @returns Il testo corretto restituito dall'LLM.
 */
async function proofreadChunk(chunk: string): Promise<string> {
  const API_URL = "https://api.openai.com/v1/chat/completions";
  const API_KEY = process.env.OPENAI_API_KEY;
  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 1000;

  const payload = {
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "Sei un assistente AI editor ed esperto di correzione testi che corregge errori di grammatica, punteggiatura e ortografia. Restituisci solo la versione corretta in forma semplice del testo.",
      },
      {
        role: "user",
        content: `\n\n"${chunk}"`,
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
      const messageContent = data.choices && data.choices[0]?.message?.content;
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
 * Processa l'intero testo da correggere. Se il testo supera un certo numero di token,
 * viene suddiviso in chunk e ciascun chunk viene inviato uno alla volta all'API OpenAI per la correzione.
 * I risultati vengono poi concatenati.
 *
 * Log dettagliati registrano:
 * - Tempo totale di esecuzione
 * - Numero di token e chunk
 * - Inizio e fine di ciascun chunk, con logging dell'uso della memoria corrente
 *
 * @param text Il testo da correggere.
 * @returns Un oggetto ProofreadingResult contenente il testo corretto.
 */
export async function proofreadDocument(
  text: string
): Promise<ProofreadingResult> {
  const model = "gpt-4o-mini";
  const MAX_TOKENS_PER_CHUNK = 3000;
  
  Logger.info(`Inizio proofreading del documento: lunghezza totale ${text.length} caratteri.`);
  const startTimeTotal = Date.now();

  const encoding = encoding_for_model(model as any);
  const tokensRaw = encoding.encode(text);
  const tokens = tokensRaw instanceof Uint32Array ? tokensRaw : new Uint32Array(tokensRaw);
  const totalTokens = tokens.length;
  Logger.info(`Il documento contiene circa ${totalTokens} token.`);

  if (totalTokens <= MAX_TOKENS_PER_CHUNK) {
    Logger.info("Testo breve in termini di token, procedo con una singola chiamata.");
    const corrected = await proofreadChunk(text);
    Logger.info(`Proofreading completato per il testo completo in ${Date.now() - startTimeTotal}ms`);
    return { correctedText: corrected };
  }

  const chunks = chunkTextByTokens(text, MAX_TOKENS_PER_CHUNK, model);
  Logger.info(`Testo diviso in ${chunks.length} chunk basati sui token.`);

  // Elaborazione sequenziale: inviamo un chunk alla volta
  const correctedChunks: string[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunkStart = Date.now();
    Logger.info(`Invio chunk ${i + 1}/${chunks.length}: lunghezza ${chunks[i].length} caratteri.`);
    try {
      const corrected = await proofreadChunk(chunks[i]);
      correctedChunks.push(corrected);
      Logger.info(`Chunk ${i + 1} elaborato con successo in ${Date.now() - chunkStart}ms.`);
      Logger.info(`Memoria corrente: ${JSON.stringify(process.memoryUsage())}`);
    } catch (err: any) {
      Logger.error(`Errore nell'elaborazione del chunk ${i + 1}: ${err.message}`);
      throw err;
    }
  }

  const combinedCorrectedText = correctedChunks.join("\n");
  Logger.info(`Proofreading completato per tutti i chunk. Tempo totale: ${Date.now() - startTimeTotal}ms`);
  return { correctedText: combinedCorrectedText };
}
