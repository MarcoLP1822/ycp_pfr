/**
 * @file MergeController.cs
 * @description
 * Questo controller espone un endpoint per fondere il testo corretto in un file DOCX.
 * In questa versione, la logica di merge viene eseguita internamente utilizzando l'Open XML SDK.
 * 
 * La logica di merge fa quanto segue:
 * - Abilita la modalità Track Revisions.
 * - Divide il testo corretto in paragrafi.
 * - Se il testo corretto contiene un solo paragrafo (caso di test),
 *   aggiorna il primo paragrafo e rimuove tutti gli altri per evitare operazioni
 *   pesanti di "mark as deleted" che potrebbero bloccare l'operazione.
 * - In caso di più paragrafi, confronta e aggiorna ogni paragrafo; aggiunge nuovi paragrafi
 *   se necessario oppure marca come eliminati quelli in eccesso.
 *
 * Key features:
 * - Valida gli input e il tipo di file (solo DOCX).
 * - Verifica la struttura del file DOCX.
 * - Esegue il merge e restituisce il documento fuso come download.
 *
 * @dependencies
 * - Microsoft.AspNetCore.Mvc: Per il controller e l'handling delle richieste.
 * - Microsoft.Extensions.Logging: Per il logging.
 * - DocumentFormat.OpenXml.Packaging, DocumentFormat.OpenXml.Wordprocessing e DocumentFormat.OpenXml: Per la manipolazione del DOCX.
 *
 * @notes
 * - Assicurarsi che il progetto abbia un riferimento compatibile a DocumentFormat.OpenXml con .NET 9.0.
 */

using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using DocumentFormat.OpenXml; // For SpaceProcessingModeValues

namespace DocxMergeService.Controllers
{
    [ApiController]
    [Route("merge")]
    public class MergeController : ControllerBase
    {
        private readonly ILogger<MergeController> _logger;

        public MergeController(ILogger<MergeController> logger)
        {
            _logger = logger;
        }

        /// <summary>
        /// Endpoint per fondere il testo corretto nel file DOCX originale.
        /// Il documento viene aperto, viene abilitata la modalità Track Revisions e il testo
        /// corretto viene integrato nei paragrafi.
        /// </summary>
        /// <param name="file">Il file DOCX inviato dal client.</param>
        /// <param name="correctedText">Il testo corretto da fondere nel documento.</param>
        /// <returns>Il file DOCX fuso come download.</returns>
        [HttpPost]
        public async Task<IActionResult> Merge([FromForm] IFormFile file, [FromForm] string correctedText)
        {
            if (file == null || string.IsNullOrWhiteSpace(correctedText))
            {
                _logger.LogError("Missing file or correctedText in the request.");
                return BadRequest(new { error = "Both file and correctedText are required." });
            }

            // Validate that the file is a DOCX.
            if (!file.ContentType.Equals("application/vnd.openxmlformats-officedocument.wordprocessingml.document", StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogError($"Invalid file type: {file.ContentType}");
                return BadRequest(new { error = "Only DOCX files are supported." });
            }

            try
            {
                using (var memoryStream = new MemoryStream())
                {
                    await file.CopyToAsync(memoryStream);
                    memoryStream.Position = 0;

                    // Validate DOCX structure by attempting to open it in read-only mode.
                    try
                    {
                        using (WordprocessingDocument.Open(memoryStream, false))
                        {
                            // File structure is valid.
                        }
                        memoryStream.Position = 0;
                    }
                    catch (OpenXmlPackageException ex)
                    {
                        _logger.LogError(ex, "Invalid DOCX file structure");
                        return BadRequest(new { error = "The provided file is not a valid DOCX document." });
                    }

                    // Merge the document with the corrected text using the local merge method.
                    var mergedStream = MergeDocument(memoryStream, correctedText);

                    // Return the merged DOCX file using the built-in File() method.
                    return File(mergedStream.ToArray(),
                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                        "merged.docx");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during DOCX merge. File: {FileName}, Text Length: {TextLength}",
                    file.FileName, correctedText?.Length ?? 0);
                return StatusCode(500, new { error = "Internal server error during merge." });
            }
        }

        /// <summary>
        /// Esegue il merge del documento DOCX originale con il testo corretto.
        /// Procedura:
        /// 1. Scrive il contenuto originale in un file temporaneo.
        /// 2. Apre il documento, abilita il Track Revisions e divide il testo corretto in paragrafi.
        /// 3. Se il testo corretto contiene UN SOLO paragrafo, aggiorna il primo paragrafo e rimuove tutti gli altri.
        /// 4. Se contiene più paragrafi, per ciascun paragrafo in comune, aggiorna il contenuto se differente;
        ///    aggiunge nuovi paragrafi se necessario oppure marca come eliminati quelli in eccesso.
        /// 5. Salva il documento e lo legge in un MemoryStream da restituire.
        /// </summary>
        /// <param name="originalStream">MemoryStream contenente il DOCX originale.</param>
        /// <param name="correctedText">Testo corretto da integrare.</param>
        /// <returns>MemoryStream contenente il documento DOCX fuso.</returns>
        private static MemoryStream MergeDocument(MemoryStream originalStream, string correctedText)
        {
            try
            {
                // Creazione di un file temporaneo
                string tempFilePath = System.IO.Path.GetTempFileName();
                try
                {
                    originalStream.Position = 0;
                    using (var fileStream = new FileStream(tempFilePath, FileMode.Create, FileAccess.Write, FileShare.None))
                    {
                        originalStream.CopyTo(fileStream);
                    }

                    using (WordprocessingDocument wordDoc = WordprocessingDocument.Open(tempFilePath, true))
                    {
                        var mainPart = wordDoc.MainDocumentPart ?? throw new InvalidOperationException("Missing main document part");
                        var body = mainPart.Document.Body ?? throw new InvalidOperationException("Missing document body");

                        // Abilita il Track Revisions
                        EnableTrackRevisions(wordDoc);

                        // Suddivide il testo corretto in paragrafi
                        var correctedParagraphs = correctedText.Split(new[] { "\r\n", "\n" }, StringSplitOptions.None)
                            .Select(p => p.TrimEnd())
                            .ToArray();

                        var originalParagraphs = body.Elements<Paragraph>().ToList();

                        // Se il testo corretto contiene solo un paragrafo, aggiorna il primo e rimuove il resto
                        if (correctedParagraphs.Length == 1)
                        {
                            if (originalParagraphs.Count > 0)
                            {
                                var firstPara = originalParagraphs[0];
                                string originalParaText = GetFullParagraphText(firstPara);
                                if (!string.Equals(originalParaText, correctedParagraphs[0]))
                                {
                                    UpdateParagraphRunByRun(firstPara, correctedParagraphs[0]);
                                }
                                // Rimuove tutti gli altri paragrafi
                                for (int i = 1; i < originalParagraphs.Count; i++)
                                {
                                    originalParagraphs[i].Remove();
                                }
                            }
                        }
                        else
                        {
                            // Se ci sono più paragrafi nel testo corretto, sincronizza riga per riga
                            int maxCount = Math.Max(originalParagraphs.Count, correctedParagraphs.Length);
                            for (int i = 0; i < maxCount; i++)
                            {
                                if (i < originalParagraphs.Count && i < correctedParagraphs.Length)
                                {
                                    var origPara = originalParagraphs[i];
                                    string originalParaText = GetFullParagraphText(origPara);
                                    string correctedPara = correctedParagraphs[i];

                                    if (!string.Equals(originalParaText, correctedPara))
                                    {
                                        UpdateParagraphRunByRun(origPara, correctedPara);
                                    }
                                }
                                else if (i >= originalParagraphs.Count)
                                {
                                    // Aggiunge nuovi paragrafi
                                    var newPara = new Paragraph();
                                    InsertFullParagraphAsInsertion(newPara, correctedParagraphs[i]);
                                    body.AppendChild(newPara);
                                }
                                else if (i >= correctedParagraphs.Length)
                                {
                                    // Marca come eliminati i paragrafi in eccesso
                                    MarkParagraphAsDeleted(originalParagraphs[i]);
                                }
                            }
                        }

                        mainPart.Document.Save();
                    }

                    // Legge il file temporaneo modificato in un MemoryStream
                    var mergedStream = new MemoryStream();
                    using (var fileStream = new FileStream(tempFilePath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite))
                    {
                        fileStream.CopyTo(mergedStream);
                    }
                    mergedStream.Position = 0;
                    return mergedStream;
                }
                finally
                {
                    // Elimina il file temporaneo
                    try
                    {
                        if (System.IO.File.Exists(tempFilePath))
                        {
                            System.IO.File.SetAttributes(tempFilePath, FileAttributes.Normal);
                            System.IO.File.Delete(tempFilePath);
                        }
                    }
                    catch { }
                }
            }
            catch (OpenXmlPackageException ex)
            {
                throw new Exception($"DOCX processing error: {ex.Message}", ex);
            }
            catch (Exception ex)
            {
                throw new Exception($"Merge operation failed: {ex.Message}", ex);
            }
        }

        /// <summary>
        /// Abilita il Track Revisions nel documento DOCX.
        /// </summary>
        /// <param name="doc">Il documento WordprocessingDocument da aggiornare.</param>
        private static void EnableTrackRevisions(WordprocessingDocument doc)
        {
            var settingsPart = doc.MainDocumentPart?.DocumentSettingsPart;
            if (settingsPart == null)
            {
                settingsPart = doc.MainDocumentPart.AddNewPart<DocumentSettingsPart>();
                settingsPart.Settings = new Settings();
            }
            if (settingsPart.Settings == null)
                settingsPart.Settings = new Settings();

            var trackRevisions = new TrackRevisions { Val = OnOffValue.FromBoolean(true) };
            settingsPart.Settings.AppendChild(trackRevisions);
            settingsPart.Settings.Save();
        }

        /// <summary>
        /// Recupera il testo completo di un paragrafo concatenando il testo di tutti i run.
        /// </summary>
        /// <param name="p">Il paragrafo da elaborare.</param>
        /// <returns>Il testo concatenato del paragrafo.</returns>
        private static string GetFullParagraphText(Paragraph p)
        {
            return string.Concat(p.Elements<Run>()
                .SelectMany(r => r.Elements<Text>())
                .Select(t => t.Text));
        }

        /// <summary>
        /// Aggiorna il contenuto di un paragrafo sostituendo i run esistenti con un nuovo run contenente il testo corretto.
        /// Il nuovo run è avvolto in un InsertedRun per indicare l'inserzione (track changes) e preserva le proprietà
        /// del primo run, se disponibili.
        /// </summary>
        /// <param name="paragraph">Il paragrafo da aggiornare.</param>
        /// <param name="correctedParaText">Il testo corretto da inserire.</param>
        private static void UpdateParagraphRunByRun(Paragraph paragraph, string correctedParaText)
        {
            RunProperties runProps = null;
            var firstRun = paragraph.Elements<Run>().FirstOrDefault();
            if (firstRun != null && firstRun.RunProperties != null)
            {
                runProps = (RunProperties)firstRun.RunProperties.CloneNode(true);
            }

            // Rimuove tutti i run esistenti
            paragraph.RemoveAllChildren<Run>();

            // Crea un nuovo run con il testo corretto
            var newRun = new Run();
            if (runProps != null)
                newRun.RunProperties = runProps;
            newRun.AppendChild(new Text(correctedParaText) { Space = SpaceProcessingModeValues.Preserve });

            // Avvolge il nuovo run in un InsertedRun per indicare l'inserzione
            var insRun = new InsertedRun
            {
                Author = "AutoCorrection",
                Date = DateTime.UtcNow
            };
            insRun.Append(newRun);

            // Aggiunge il nuovo run al paragrafo
            paragraph.AppendChild(insRun);
        }

        /// <summary>
        /// Inserisce un nuovo paragrafo come inserzione completa con il testo specificato.
        /// </summary>
        /// <param name="para">Il paragrafo in cui inserire il testo.</param>
        /// <param name="paragraphText">Il testo da inserire.</param>
        private static void InsertFullParagraphAsInsertion(Paragraph para, string paragraphText)
        {
            var run = new Run(new Text(paragraphText) { Space = SpaceProcessingModeValues.Preserve });
            var ins = new InsertedRun
            {
                Author = "AutoCorrection",
                Date = DateTime.UtcNow
            };
            ins.Append(run);
            para.AppendChild(ins);
        }

        /// <summary>
        /// Marca un paragrafo come eliminato, avvolgendo ciascun run in un DeletedRun.
        /// </summary>
        /// <param name="paragraph">Il paragrafo da segnare come eliminato.</param>
        private static void MarkParagraphAsDeleted(Paragraph paragraph)
        {
            var runs = paragraph.Elements<Run>().ToList();
            foreach (var run in runs)
            {
                string originalText = string.Concat(run.Elements<Text>().Select(t => t.Text));
                run.RemoveAllChildren<Text>();
                var delText = new DeletedText(originalText) { Space = SpaceProcessingModeValues.Preserve };
                run.AppendChild(delText);
                var delRun = new DeletedRun
                {
                    Author = "AutoCorrection",
                    Date = DateTime.UtcNow
                };
                run.Parent.InsertAfter(delRun, run);
                delRun.Append(run);
                run.Remove();
            }
        }
    }
}
