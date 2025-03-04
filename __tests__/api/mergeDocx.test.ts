/**
 * @file __tests__/api/mergeDocx.test.ts
 * @description
 * Questo file contiene test unitari/integrati per l'endpoint /api/proofreading/merge-docx.
 * I test simulano:
 * - Una chiamata di successo al servizio esterno di merge DOCX.
 * - Uno scenario di fallimento che attiva il meccanismo di fallback.
 * - La validazione degli input, verificando che campi mancanti restituiscano un errore 400.
 *
 * Key features:
 * - Mocks delle dipendenze esterne (drizzleClient, Supabase storage e globalThis.fetch)
 *   per simulare diversi scenari di risposta.
 * - Usa node-mocks-http per creare oggetti request/response per l'handler dell'API.
 *
 * @dependencies
 * - jest: Per mocking e asserzioni.
 * - node-mocks-http: Per creare mocks di request/response.
 *
 * @notes
 * - I test modificano le variabili d'ambiente e globalThis.fetch.
 * - Il record fittizio simula un file presente nel database.
 */

// Se globalThis.fetch non è definito, definiscilo come mock vuoto
if (typeof globalThis.fetch !== 'function') {
    globalThis.fetch = jest.fn();
  }
  
  import { createMocks } from 'node-mocks-http';
  import type { NextApiRequest, NextApiResponse } from 'next';
  import handler from '../../pages/api/proofreading/merge-docx';
  
  // --- Mocks per drizzleClient ---
  jest.mock('../../services/drizzleClient', () => {
    return {
      __esModule: true,
      default: {
        select: jest.fn(() => ({
          from: jest.fn(() => ({
            where: jest.fn().mockResolvedValue([
              {
                file_id: 'test-file-id',
                file_name: 'test.docx',
                file_url: 'test.docx',
                user_id: 'dummy-user',
                proofreading_status: 'pending',
                version_number: 1,
                original_text: 'Original text',
                current_text: 'Original text'
              }
            ])
          }))
        })),
        update: jest.fn(() => ({
          set: jest.fn(() => ({
            where: jest.fn().mockResolvedValue([{ file_id: 'test-file-id' }])
          }))
        }))
      }
    };
  });
  
  // --- Mocks per Supabase client ---
  jest.mock('@supabase/auth-helpers-nextjs', () => {
    return {
      createPagesServerClient: jest.fn(() => ({
        storage: {
          from: jest.fn(() => ({
            download: jest.fn(() =>
              Promise.resolve({
                data: {
                  arrayBuffer: () => Promise.resolve(Buffer.from('dummy docx content').buffer)
                },
                error: null
              })
            )
          }))
        }
      }))
    };
  });
  
  // --- Funzione helper per creare una Response fittizia per il servizio di merge esterno ---
  const createDummyFetchResponse = (ok: boolean, status: number, responseText: string | null, mergedContent?: string) => {
    return {
      ok,
      status,
      text: async () => responseText || '',
      arrayBuffer: async () => Buffer.from(mergedContent || 'merged docx content').buffer
    };
  };
  
  describe('Merge DOCX API Endpoint', () => {
    const originalEnv = process.env.EXTERNAL_DOCX_MERGE_URL;
    beforeAll(() => {
      process.env.EXTERNAL_DOCX_MERGE_URL = 'http://dummy-merge-service/merge';
    });
    afterAll(() => {
      process.env.EXTERNAL_DOCX_MERGE_URL = originalEnv;
    });
  
    afterEach(() => {
      jest.restoreAllMocks();
    });
  
    test('Successful external merge returns merged DOCX file', async () => {
      // Mocks di globalThis.fetch per simulare una chiamata di successo al servizio esterno
      jest.spyOn(globalThis, 'fetch').mockResolvedValue(
        createDummyFetchResponse(true, 200, null, 'merged docx from external service') as any
      );
  
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {
          file_id: 'test-file-id',
          correctedText: 'Corrected text'
        }
      });
  
      await handler(req, res);
      expect(res._getStatusCode()).toBe(200);
      const headers = res.getHeaders();
      expect(headers['content-type']).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      expect(headers['content-disposition']).toContain('proofread-test');
      // Verifica che il corpo della risposta sia un Buffer (contenuto DOCX unito)
      expect(Buffer.isBuffer(res._getData())).toBe(true);
    });
  
    test('External merge service failure triggers fallback DOCX generation', async () => {
      // Mocks di globalThis.fetch per simulare un fallimento del servizio esterno
      jest.spyOn(globalThis, 'fetch').mockResolvedValue(
        createDummyFetchResponse(false, 500, 'Internal Error') as any
      );
  
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {
          file_id: 'test-file-id',
          correctedText: 'Corrected text fallback'
        }
      });
  
      await handler(req, res);
      expect(res._getStatusCode()).toBe(200);
      const headers = res.getHeaders();
      expect(headers['content-type']).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      expect(headers['content-disposition']).toContain('proofread-test');
      // Il fallback DOCX viene generato dal testo corretto; verifica che il risultato sia un Buffer.
      expect(Buffer.isBuffer(res._getData())).toBe(true);
    });
  
    test('Missing required fields returns 400 error', async () => {
      // Test per file_id mancante
      let { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {
          correctedText: 'Some text'
        }
      });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(400);
      let data = JSON.parse(res._getData());
      expect(data.error).toMatch(/Missing required fields/);
  
      // Test per correctedText mancante
      ({ req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {
          file_id: 'test-file-id'
        }
      }));
      await handler(req, res);
      expect(res._getStatusCode()).toBe(400);
      data = JSON.parse(res._getData());
      expect(data.error).toMatch(/Missing required fields/);
    });
  });
  