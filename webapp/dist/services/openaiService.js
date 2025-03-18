"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.proofreadDocument = proofreadDocument;
const logger_1 = __importDefault(require("./logger"));
const tiktoken_1 = require("@dqbd/tiktoken");
function chunkTextByTokens(text, maxTokens, model) {
    const encoding = (0, tiktoken_1.encoding_for_model)(model);
    const tokens = encoding.encode(text);
    const chunks = [];
    for (let i = 0; i < tokens.length; i += maxTokens) {
        const tokenChunk = tokens.slice(i, i + maxTokens);
        const decoded = encoding.decode(tokenChunk);
        chunks.push(decoded.toString());
    }
    return chunks;
}
function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
async function proofreadChunk(chunk) {
    var _a, _b;
    const API_URL = "https://api.openai.com/v1/chat/completions";
    const API_KEY = process.env.OPENAI_API_KEY;
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 1000;
    const payload = {
        model: "gpt-4o-mini",
        messages: [
            {
                role: "system",
                content: "Sei un assistente AI editor ed esperto di correzione testi che corregge errori di grammatica, punteggiatura e ortografia. Restituisci solo la versione corretta in forma semplice del testo.",
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
            logger_1.default.info(`Invio chunk (tentativo ${attempt + 1}): lunghezza ${chunk.length} caratteri.`);
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
            logger_1.default.info(`Richiesta completata in ${duration}ms per chunk di lunghezza ${chunk.length}.`);
            if (!response.ok) {
                const errorResponse = await response.text();
                throw new Error(`OpenAI API error: ${response.status} - ${errorResponse}`);
            }
            const data = await response.json();
            const messageContent = data.choices && ((_b = (_a = data.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content);
            if (!messageContent) {
                throw new Error("Nessun contenuto restituito dall'API OpenAI.");
            }
            logger_1.default.info(`Chunk corretto con successo (tentativo ${attempt + 1}).`);
            return messageContent;
        }
        catch (error) {
            attempt++;
            logger_1.default.error(`Tentativo ${attempt} fallito per questo chunk: ${error.message}`);
            if (attempt >= MAX_RETRIES) {
                throw new Error(`Fallito il proofreading del chunk dopo ${MAX_RETRIES} tentativi: ${error.message}`);
            }
            await delay(RETRY_DELAY_MS);
        }
    }
    throw new Error("Errore inaspettato nella funzione proofreadChunk.");
}
/**
 * Processa l'intero testo da correggere inviando i chunk uno alla volta.
 * @param text Il testo da correggere.
 * @param isCancelled Funzione che ritorna true se il processo è stato cancellato.
 * @returns Il testo corretto.
 */
async function proofreadDocument(text, isCancelled) {
    const model = "gpt-4o-mini";
    const MAX_TOKENS_PER_CHUNK = 3000;
    logger_1.default.info(`Inizio proofreading del documento: lunghezza totale ${text.length} caratteri.`);
    const startTimeTotal = Date.now();
    const encoding = (0, tiktoken_1.encoding_for_model)(model);
    const tokensRaw = encoding.encode(text);
    const tokens = tokensRaw instanceof Uint32Array ? tokensRaw : new Uint32Array(tokensRaw);
    const totalTokens = tokens.length;
    logger_1.default.info(`Il documento contiene circa ${totalTokens} token.`);
    if (totalTokens <= MAX_TOKENS_PER_CHUNK) {
        logger_1.default.info("Testo breve, procedo con una singola chiamata.");
        const corrected = await proofreadChunk(text);
        logger_1.default.info(`Proofreading completato in ${Date.now() - startTimeTotal}ms.`);
        return { correctedText: corrected };
    }
    const chunks = chunkTextByTokens(text, MAX_TOKENS_PER_CHUNK, model);
    logger_1.default.info(`Testo diviso in ${chunks.length} chunk basati sui token.`);
    const correctedChunks = [];
    for (let i = 0; i < chunks.length; i++) {
        if (isCancelled && isCancelled()) {
            logger_1.default.info(`Processo cancellato prima del chunk ${i + 1}.`);
            throw new Error("Processo di proofreading cancellato dall'utente.");
        }
        const chunkStart = Date.now();
        logger_1.default.info(`Invio chunk ${i + 1}/${chunks.length}: lunghezza ${chunks[i].length} caratteri.`);
        try {
            const corrected = await proofreadChunk(chunks[i]);
            correctedChunks.push(corrected);
            logger_1.default.info(`Chunk ${i + 1} elaborato con successo in ${Date.now() - chunkStart}ms.`);
            logger_1.default.info(`Memoria corrente: ${JSON.stringify(process.memoryUsage())}`);
        }
        catch (err) {
            logger_1.default.error(`Errore nell'elaborazione del chunk ${i + 1}: ${err.message}`);
            throw err;
        }
    }
    const combinedCorrectedText = correctedChunks.join("\n");
    logger_1.default.info(`Proofreading completato in ${Date.now() - startTimeTotal}ms.`);
    return { correctedText: combinedCorrectedText };
}
