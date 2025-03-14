/// <reference types="vite/client" />

/**
 * @file services/openaiService.ts
 * @description
 * This module integrates with the OpenAI API to provide proofreading services.
 * It sends a given text to the OpenAI LLM (using the chat completions endpoint) 
 * for grammar, punctuation, and spelling correction, and returns a corrected 
 * version with inline highlights.
 *
 * Key features:
 * - Proofread text using OpenAI API.
 * - Implements error handling and retry logic.
 * - Uses the chat completions endpoint with a system prompt to guide corrections.
 *
 * @dependencies
 * - Relies on the global fetch API provided by Next.js or the browser.
 *
 * @notes
 * - Ensure the OPENAI_API_KEY environment variable is set.
 * - Adjust model parameters, temperature, or endpoint URL based on your needs.
 */

export interface ProofreadingResult {
    /**
     * The corrected text returned by the OpenAI API.
     */
    correctedText: string;
    /**
     * Optional field for additional inline corrections metadata if provided.
     */
    inlineCorrections?: any;
  }
  
  /**
   * A helper function that returns a promise that resolves after a given delay.
   * @param ms - The number of milliseconds to delay.
   * @returns Promise that resolves after the delay.
   */
  function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  
  /**
   * Calls the OpenAI API to proofread the provided text.
   * It uses a retry mechanism to handle transient errors.
   *
   * @param text - The text that needs to be proofread.
   * @returns A promise that resolves to a ProofreadingResult containing the corrected text.
   *
   * @throws Error if all retry attempts fail.
   */
  export async function proofreadDocument(text: string): Promise<ProofreadingResult> {
    // Define API endpoint and configuration
    const API_URL = "https://api.openai.com/v1/chat/completions";
    const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
    
    if (!API_KEY) {
      throw new Error("OPENAI_API_KEY is not set in the environment variables.");
    }
  
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 1000;
  
    // Prepare the payload with system and user messages.
    const payload = {
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Sei un assistente AI editor ed esperto di correzione testi che corregge errori di grammatica, punteggiatura e ortografia. Restituisci solo la versione corretta in forma semplice del testo."
        },
        {
          role: "user",
          content: `\n\n"${text}"`
        }
      ],
      temperature: 0.2,
      // You may add additional parameters such as max_tokens if necessary.
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
  
        // Check if the response is successful.
        if (!response.ok) {
          const errorResponse = await response.text();
          throw new Error(`OpenAI API error: ${response.status} - ${errorResponse}`);
        }
  
        // Parse the response data.
        const data = await response.json();
  
        // Extract the corrected text from the first choice.
        const messageContent = data.choices && data.choices[0]?.message?.content;
        if (!messageContent) {
          throw new Error("No content returned from OpenAI API.");
        }
  
        // Optionally, you can parse the response further if inline corrections metadata is provided.
        const result: ProofreadingResult = {
          correctedText: messageContent,
        };
  
        return result;
      } catch (error: any) {
        attempt++;
        console.error(`Attempt ${attempt} failed: ${error.message}`);
        if (attempt >= MAX_RETRIES) {
          throw new Error(`Failed to proofread document after ${MAX_RETRIES} attempts: ${error.message}`);
        }
        // Wait before retrying.
        await delay(RETRY_DELAY_MS);
      }
    }
    // This point should not be reached.
    throw new Error("Unexpected error in proofreadDocument function.");
  }
  