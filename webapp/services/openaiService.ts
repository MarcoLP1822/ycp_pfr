// webapp/services/openaiService.ts

import DiffMatchPatch from 'diff-match-patch';
import Logger from './logger';

export interface ProofreadingResult {
  correctedText: string;
  inlineCorrections?: any;
}

/**
 * Suddivide il testo in chunk, utilizzando prima i paragrafi e, se necessario, ulteriori suddivisioni per frasi.
 *
 * @param text Il testo da suddividere.
 * @param maxChunkLength Numero massimo di caratteri per ogni chunk.
 * @returns Un array di stringhe, ciascuna rappresentante un chunk.
 */
function chunkText(text: string, maxChunkLength: number): string[] {
  const paragraphs = text.split(/\n+/);
  const chunks: string[] = [];
  let currentChunk = "";

  for (const para of paragraphs) {
    if (currentChunk.length + para.length + 1 <= maxChunkLength) {
      currentChunk += (currentChunk ? "\n" : "") + para;
    } else {
      // Se il paragrafo da solo supera il limite, lo suddividiamo ulteriormente per frasi.
      if (para.length > maxChunkLength) {
        if (currentChunk) {
          chunks.push(currentChunk);
          currentChunk = "";
        }
        const sentences = para.split(/(?<=[.?!])\s+/);
        let sentenceChunk = "";
        for (const sentence of sentences) {
          if (sentenceChunk.length + sentence.length + 1 <= maxChunkLength) {
            sentenceChunk += (sentenceChunk ? " " : "") + sentence;
          } else {
            if (sentenceChunk) {
              chunks.push(sentenceChunk);
            }
            sentenceChunk = sentence;
          }
        }
        if (sentenceChunk) {
          chunks.push(sentenceChunk);
        }
      } else {
        if (currentChunk) {
          chunks.push(currentChunk);
        }
        currentChunk = para;
      }
    }
  }
  if (currentChunk) {
    chunks.push(currentChunk);
  }
  return chunks;
}

/**
 * Restituisce una Promise che si risolve dopo un determinato ritardo.
 *
 * @param ms Numero di millisecondi di attesa.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Invia un singolo chunk all'API OpenAI per la correzione.
 * Vengono registrati log per ogni tentativo e per il successo di ciascun chunk.
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
      Logger.info(
        `Invio chunk (tentativo ${attempt + 1}): lunghezza ${chunk.length} caratteri.`
      );
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorResponse = await response.text();
        throw new Error(
          `OpenAI API error: ${response.status} - ${errorResponse}`
        );
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
      Logger.error(
        `Tentativo ${attempt} fallito per questo chunk: ${error.message}`
      );
      if (attempt >= MAX_RETRIES) {
        throw new Error(
          `Fallito il proofreading del chunk dopo ${MAX_RETRIES} tentativi: ${error.message}`
        );
      }
      await delay(RETRY_DELAY_MS);
    }
  }
  throw new Error("Errore inaspettato nella funzione proofreadChunk.");
}

/**
 * Processa l'intero testo da correggere: se il testo supera un certo limite, viene suddiviso in chunk,
 * ogni chunk viene inviato all'API OpenAI e infine i risultati vengono concatenati.
 *
 * @param text Il testo da correggere.
 * @returns Un oggetto ProofreadingResult contenente il testo corretto.
 */
export async function proofreadDocument(
  text: string
): Promise<ProofreadingResult> {
  const MAX_CHUNK_LENGTH = 10000;
  Logger.info(
    `Inizio proofreading del documento: lunghezza totale ${text.length} caratteri.`
  );

  if (text.length <= MAX_CHUNK_LENGTH) {
    Logger.info("Testo breve, procedo con una singola chiamata.");
    const corrected = await proofreadChunk(text);
    Logger.info("Proofreading completato per il testo completo.");
    return { correctedText: corrected };
  }

  // Suddivide il testo in chunk
  const chunks = chunkText(text, MAX_CHUNK_LENGTH);
  Logger.info(`Testo diviso in ${chunks.length} chunk.`);

  const correctedChunks: string[] = [];
  // Processa ogni chunk e logga il progresso
  for (let i = 0; i < chunks.length; i++) {
    Logger.info(
      `Elaborazione chunk ${i + 1} di ${chunks.length} (lunghezza ${chunks[i].length}).`
    );
    const correctedChunk = await proofreadChunk(chunks[i]);
    correctedChunks.push(correctedChunk);
    Logger.info(`Chunk ${i + 1} elaborato con successo.`);
  }

  const combinedCorrectedText = correctedChunks.join("\n");
  Logger.info(
    "Proofreading completato per tutti i chunk. Testo corretto combinato."
  );
  return { correctedText: combinedCorrectedText };
}
