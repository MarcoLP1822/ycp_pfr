export interface ProofreadingResult {
  correctedText: string;
  inlineCorrections?: any;
}

/**
 * Restituisce un array di chunk a partire dal testo in input.
 * La funzione tenta di suddividere il testo per paragrafi e, se un paragrafo è troppo lungo,
 * lo suddivide ulteriormente per frasi.
 *
 * @param text Il testo da suddividere.
 * @param maxChunkLength Numero massimo di caratteri per ogni chunk.
 * @returns Un array di stringhe, ognuna contenente un chunk del testo.
 */
function chunkText(text: string, maxChunkLength: number): string[] {
  const paragraphs = text.split(/\n+/);
  const chunks: string[] = [];
  let currentChunk = "";

  for (const para of paragraphs) {
    // Se aggiungendo il paragrafo corrente il chunk non supera il limite, lo accumuliamo.
    if (currentChunk.length + para.length + 1 <= maxChunkLength) {
      currentChunk += (currentChunk ? "\n" : "") + para;
    } else {
      // Se il paragrafo è troppo lungo da solo, lo dividiamo ulteriormente per frasi.
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
        // Il paragrafo intero rientra da solo, quindi iniziamo un nuovo chunk.
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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function proofreadDocument(text: string): Promise<ProofreadingResult> {
  const API_URL = "https://api.openai.com/v1/chat/completions";
  const API_KEY = process.env.OPENAI_API_KEY;
  
  if (!API_KEY) {
    throw new Error("OPENAI_API_KEY is not set in the environment variables.");
  }
  
  // Parametro per il chunking: ad esempio, 10.000 caratteri (questo valore può essere calibrato)
  const MAX_CHUNK_LENGTH = 10000;
  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 1000;
  
  // Funzione che invia una richiesta di proofreading per un singolo chunk
  async function proofreadChunk(chunk: string): Promise<string> {
    const payload = {
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Sei un assistente AI editor ed esperto di correzione testi che corregge errori di grammatica, punteggiatura e ortografia. Restituisci solo la versione corretta in forma semplice del testo."
        },
        {
          role: "user",
          content: `\n\n"${chunk}"`
        }
      ],
      temperature: 0.2,
    };
  
    let attempt = 0;
    while (attempt < MAX_RETRIES) {
      try {
        const response = await fetch(API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${API_KEY}`,
          },
          body: JSON.stringify(payload),
        });
  
        if (!response.ok) {
          const errorResponse = await response.text();
          throw new Error(`OpenAI API error: ${response.status} - ${errorResponse}`);
        }
  
        const data = await response.json();
        const messageContent = data.choices && data.choices[0]?.message?.content;
        if (!messageContent) {
          throw new Error("No content returned from OpenAI API.");
        }
  
        return messageContent;
      } catch (error: any) {
        attempt++;
        console.error(`Attempt ${attempt} for chunk failed: ${error.message}`);
        if (attempt >= MAX_RETRIES) {
          throw new Error(`Failed to proofread chunk after ${MAX_RETRIES} attempts: ${error.message}`);
        }
        await delay(RETRY_DELAY_MS);
      }
    }
    throw new Error("Unexpected error in proofreadChunk function.");
  }
  
  // Se il testo è corto, processalo in un’unica chiamata
  if (text.length <= MAX_CHUNK_LENGTH) {
    const corrected = await proofreadChunk(text);
    return { correctedText: corrected };
  }
  
  // Altrimenti, suddividi il testo in chunk
  const chunks = chunkText(text, MAX_CHUNK_LENGTH);
  const correctedChunks: string[] = [];
  
  for (const chunk of chunks) {
    const correctedChunk = await proofreadChunk(chunk);
    correctedChunks.push(correctedChunk);
  }
  
  // Unisci i risultati mantenendo le separazioni originali (ad esempio, una nuova linea tra i chunk)
  const combinedCorrectedText = correctedChunks.join("\n");
  
  return { correctedText: combinedCorrectedText };
}
