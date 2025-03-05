/**
 * @file MergeController.cs
 * @description
 * Questo controller espone un endpoint per fondere il testo corretto in un file DOCX originale,
 * preservandone la struttura e la formattazione. Per ciascun paragrafo, il testo originale viene
 * estratto dai Run e confrontato con il testo corretto (diviso in paragrafi). Viene usato il
 * diff-match-patch per calcolare le differenze e ricostruire i Run preservando le proprietà di formattazione,
 * in particolare utilizzando il formato del primo Run del paragrafo originale.
 * 
 * @dependencies
 * - DocumentFormat.OpenXml: Per manipolare i file DOCX.
 * - DiffMatchPatch: Per calcolare le differenze tra il testo originale e quello corretto.
 * - ASP.NET Core: Per gestire le richieste HTTP e il logging.
 * 
 * @notes
 * - Questa implementazione è una soluzione best-effort che aggiorna il contenuto dei paragrafi,
 *   mantenendo intatti gli stili (titoli, normali, elenchi, note a piè di pagina, ecc.) secondo le proprietà del primo Run.
 * - Utilizza una tokenizzazione basata su Regex per dividere in maniera più fine il testo.
 */

using System;
using System.IO;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Text.RegularExpressions;
using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using DiffMatchPatch;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace DocxMergeService.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class MergeController : ControllerBase
    {
        private readonly ILogger<MergeController> _logger;

        public MergeController(ILogger<MergeController> logger)
        {
            _logger = logger;
        }

        /// <summary>
        /// Endpoint che fonde il testo corretto in un file DOCX originale mantenendo, ove possibile, 
        /// la formattazione dei Run originali.
        /// </summary>
        [HttpPost("merge")]
        public async Task<IActionResult> Merge([FromForm] IFormFile file, [FromForm] string correctedText)
        {
            if (file == null || string.IsNullOrWhiteSpace(correctedText))
            {
                _logger.LogError("File o correctedText mancanti nella richiesta.");
                return BadRequest(new { error = "Entrambi 'file' e 'correctedText' sono richiesti." });
            }

            try
            {
                using var memoryStream = new MemoryStream();
                await file.CopyToAsync(memoryStream);
                memoryStream.Position = 0;

                using var wordDoc = WordprocessingDocument.Open(memoryStream, true);
                var body = wordDoc.MainDocumentPart?.Document?.Body;
                if (body == null)
                {
                    _logger.LogError("Il documento DOCX non contiene un body valido.");
                    return StatusCode(StatusCodes.Status500InternalServerError, new { error = "Struttura DOCX non valida." });
                }

                // Suddividi il testo corretto in paragrafi (newline)
                var correctedParagraphs = correctedText.Split(new[] { "\r\n", "\n", "\r" }, StringSplitOptions.None);
                var originalParagraphs = body.Elements<Paragraph>().ToList();
                int minCount = Math.Min(originalParagraphs.Count, correctedParagraphs.Length);

                // Aggiorna i paragrafi comuni
                for (int i = 0; i < minCount; i++)
                {
                    MergeParagraphRuns(originalParagraphs[i], correctedParagraphs[i]);
                }

                // Se ci sono paragrafi in più nel testo corretto, aggiungili
                for (int i = minCount; i < correctedParagraphs.Length; i++)
                {
                    var extraPara = new Paragraph(
                        new Run(new Text(correctedParagraphs[i]) { Space = new EnumValue<SpaceProcessingModeValues>(SpaceProcessingModeValues.Preserve) })
                    );
                    body.AppendChild(extraPara);
                }

                wordDoc.MainDocumentPart.Document.Save();
                memoryStream.Position = 0;

                return File(memoryStream.ToArray(),
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    "merged.docx");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Errore durante il merge del documento DOCX.");
                return StatusCode(StatusCodes.Status500InternalServerError, new { error = "Errore interno durante il merge." });
            }
        }

        /// <summary>
        /// Esegue un merge "run per run" a livello di token. 
        /// Se un token viene corretto in modo simile (es. correzione ortografica), mantiene la formattazione.
        /// Se è totalmente diverso, applica la formattazione base del run di riferimento.
        /// </summary>
        private void MergeParagraphRuns(Paragraph paragraph, string correctedText)
        {
            // 1. Estrai i token originali con le relative RunProperties
            var originalTokens = ExtractTokensFromParagraph(paragraph);
            _logger.LogInformation("Original Tokens: " + string.Join("|", originalTokens.Select(o => o.text)));

            // 2. Crea i token dal testo corretto (plain text)
            var correctedTokens = Tokenize(correctedText);
            _logger.LogInformation("Corrected Tokens: " + string.Join("|", correctedTokens));

            // 3. Calcola un diff a livello di token
            var dmp = new diff_match_patch();
            var originalConcat = string.Join("\u0001", originalTokens.Select(o => o.text));
            var correctedConcat = string.Join("\u0001", correctedTokens);
            var diffs = dmp.diff_main(originalConcat, correctedConcat, false);
            _logger.LogInformation("Diffs: " + string.Join(" | ", diffs.Select(d => $"[{d.operation}:{d.text}]")));
            // Commenta se necessario per testare diff più grezzi:
            // dmp.diff_cleanupSemantic(diffs);

            // 4. Ricostruisci i Run in base al diff
            var newRuns = RebuildRunsFromDiff(originalTokens, correctedTokens, diffs);

            // 5. Svuota il paragrafo e aggiungi i nuovi Run
            paragraph.RemoveAllChildren<Run>();
            foreach (var run in newRuns)
            {
                paragraph.AppendChild(run);
            }
        }

        /// <summary>
        /// Estrae i token dal paragrafo, in cui ciascun token è una "parola" o simbolo,
        /// mantenendo la relativa formattazione.
        /// </summary>
        private List<TokenRun> ExtractTokensFromParagraph(Paragraph paragraph)
        {
            var result = new List<TokenRun>();
            var runs = paragraph.Elements<Run>().ToList();
            foreach (var r in runs)
            {
                var textEl = r.GetFirstChild<Text>();
                if (textEl != null)
                {
                    // Usa la nuova tokenizzazione basata su Regex
                    var partialTokens = Tokenize(textEl.Text);
                    foreach (var t in partialTokens)
                    {
                        result.Add(new TokenRun
                        {
                            text = t,
                            runProperties = r.RunProperties != null ? (RunProperties)r.RunProperties.CloneNode(true) : new RunProperties()
                        });
                    }
                }
            }
            return result;
        }

        /// <summary>
        /// Divide una stringa in token utilizzando Regex per catturare sia parole che spazi e punteggiatura.
        /// </summary>
        private List<string> Tokenize(string input)
        {
            if (string.IsNullOrEmpty(input)) return new List<string>();
            // La regex cattura sequenze di caratteri alfanumerici e simboli separati da caratteri non alfanumerici.
            var tokens = Regex.Split(input, "([\\W]+)")
                              .Where(t => !string.IsNullOrEmpty(t))
                              .ToList();
            return tokens;
        }

        /// <summary>
        /// Ricostruisce la lista di Run dal diff dei token, mantenendo la formattazione quando possibile.
        /// </summary>
        private List<Run> RebuildRunsFromDiff(
            List<TokenRun> originalTokens,
            List<string> correctedTokens,
            List<Diff> diffs)
        {
            var newRuns = new List<Run>();
            int originalIndex = 0;

            foreach (var diff in diffs)
            {
                var diffTokens = diff.text.Split(new[] { "\u0001" }, StringSplitOptions.None);

                if (diff.operation == Operation.EQUAL)
                {
                    foreach (var token in diffTokens)
                    {
                        if (originalIndex < originalTokens.Count)
                        {
                            var ot = originalTokens[originalIndex];
                            originalIndex++;
                            var run = CreateRun(ot.text, ot.runProperties);
                            newRuns.Add(run);
                        }
                        else break;
                    }
                }
                else if (diff.operation == Operation.INSERT)
                {
                    foreach (var token in diffTokens)
                    {
                        RunProperties style = null;
                        if (originalIndex < originalTokens.Count)
                        {
                            style = TryFindSimilarStyle(originalTokens, originalIndex, token);
                        }
                        var run = CreateRun(token, style);
                        newRuns.Add(run);
                    }
                }
                else if (diff.operation == Operation.DELETE)
                {
                    for (int i = 0; i < diffTokens.Length; i++)
                    {
                        if (originalIndex < originalTokens.Count)
                            originalIndex++;
                        else break;
                    }
                }
            }

            return newRuns;
        }

        /// <summary>
        /// Crea un nuovo Run con il testo specificato e le RunProperties fornite.
        /// </summary>
        private Run CreateRun(string text, RunProperties style)
        {
            var r = new Run();
            if (style != null)
            {
                r.RunProperties = (RunProperties)style.CloneNode(true);
            }
            r.AppendChild(new Text(text) { Space = new EnumValue<SpaceProcessingModeValues>(SpaceProcessingModeValues.Preserve) });
            return r;
        }

        /// <summary>
        /// Cerca di trovare uno stile simile tra i token originali vicini al token corrente.
        /// </summary>
        private RunProperties TryFindSimilarStyle(List<TokenRun> originalTokens, int originalIndex, string newToken)
        {
            int range = 3;
            double threshold = 0.4;

            for (int offset = -range; offset <= range; offset++)
            {
                int idx = originalIndex + offset;
                if (idx < 0 || idx >= originalTokens.Count) continue;
                var candidate = originalTokens[idx];
                double sim = Similarity(candidate.text, newToken);
                if (sim > threshold)
                {
                    return candidate.runProperties;
                }
            }
            return null;
        }

        /// <summary>
        /// Calcola la similarità tra due stringhe (0-1) usando la distanza di Levenshtein normalizzata.
        /// </summary>
        private double Similarity(string a, string b)
        {
            int dist = LevenshteinDistance(a, b);
            int maxLen = Math.Max(a.Length, b.Length);
            if (maxLen == 0) return 1.0;
            return 1.0 - (double)dist / maxLen;
        }

        /// <summary>
        /// Calcola la distanza di Levenshtein tra due stringhe.
        /// </summary>
        private int LevenshteinDistance(string a, string b)
        {
            if (string.IsNullOrEmpty(a)) return (b ?? "").Length;
            if (string.IsNullOrEmpty(b)) return a.Length;

            int[,] dp = new int[a.Length + 1, b.Length + 1];
            for (int i = 0; i <= a.Length; i++) dp[i, 0] = i;
            for (int j = 0; j <= b.Length; j++) dp[0, j] = j;

            for (int i = 1; i <= a.Length; i++)
            {
                for (int j = 1; j <= b.Length; j++)
                {
                    int cost = (a[i - 1] == b[j - 1]) ? 0 : 1;
                    dp[i, j] = Math.Min(
                        Math.Min(dp[i - 1, j] + 1, dp[i, j - 1] + 1),
                        dp[i - 1, j - 1] + cost
                    );
                }
            }
            return dp[a.Length, b.Length];
        }
    }

    /// <summary>
    /// Classe che rappresenta un token estratto da un Run, includendo il testo e le proprietà di formattazione.
    /// </summary>
    public class TokenRun
    {
        public string text { get; set; } = string.Empty;
        public RunProperties runProperties { get; set; } = new RunProperties();
    }
}
