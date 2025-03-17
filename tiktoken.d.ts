// tiktoken.d.ts
declare module '@dqbd/tiktoken' {
    export interface Tiktoken {
      /**
       * Tokenizza una stringa e restituisce un array di numeri (i token).
       */
      encode(text: string): number[];
  
      /**
       * Decodifica un array di token (numeri) e restituisce la stringa corrispondente.
       */
      decode(tokens: number[]): string;
    }
  
    /**
     * Restituisce un'istanza di Tiktoken configurata per il modello specificato.
     * Il parametro model è una stringa (es. "gpt-4o-mini" o "gpt-3.5-turbo").
     */
    export function encoding_for_model(model: string): Tiktoken;
  }
  