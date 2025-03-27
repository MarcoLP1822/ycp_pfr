using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using DocumentFormat.OpenXml;
using DiffMatchPatch; // Libreria diff-match-patch per il confronto a livello di parola
using Microsoft.Extensions.Logging;
using Codeuctivity.OpenXmlPowerTools;
using Codeuctivity.OpenXmlPowerTools.WmlComparer;

namespace DocxMergeService.Services
{
    /// <summary>
    /// Servizio per l'elaborazione e il merge di documenti DOCX, incluso il supporto per il merge parziale e tramite WmlComparer.
    /// </summary>
    public class DocxService
    {
        private readonly ILogger<DocxService> _logger;

        public DocxService(ILogger<DocxService> logger)
        {
            _logger = logger;
        }

        /// <summary>
        /// Carica un documento DOCX da uno stream.
        /// </summary>
        /// <param name="stream">Lo stream da cui caricare il documento.</param>
        /// <returns>Il documento WordprocessingDocument aperto in modalità sola lettura.</returns>
        public WordprocessingDocument LoadDocument(Stream stream)
        {
            if (stream == null)
                throw new ArgumentNullException(nameof(stream));
            return WordprocessingDocument.Open(stream, false);
        }

        /// <summary>
        /// Estrae il Body dal documento DOCX.
        /// </summary>
        /// <param name="doc">Il documento DOCX aperto.</param>
        /// <returns>Il Body del documento.</returns>
        public Body ExtractBody(WordprocessingDocument doc)
        {
            if (doc == null)
                throw new ArgumentNullException(nameof(doc));
            if (doc.MainDocumentPart?.Document == null)
                throw new Exception("Invalid DOCX: missing document.");
            return doc.MainDocumentPart.Document.Body;
        }

        /// <summary>
        /// Esegue il merge parziale tra il testo originale contenuto nel DOCX e il testo corretto.
        /// </summary>
        /// <param name="originalStream">Lo stream del documento originale.</param>
        /// <param name="correctedText">Il testo corretto da integrare.</param>
        /// <returns>Un MemoryStream contenente il documento modificato.</returns>
        public MemoryStream MergeDocumentPartial(MemoryStream originalStream, string correctedText)
        {
            // Salva il contenuto originale in un file temporaneo.
            string tempFilePath = Path.GetTempFileName();
            originalStream.Position = 0;
            using (var fs = new FileStream(tempFilePath, FileMode.Create, FileAccess.Write))
            {
                originalStream.CopyTo(fs);
            }

            try
            {
                using (var doc = WordprocessingDocument.Open(tempFilePath, true))
                {
                    EnableTrackRevisions(doc);

                    var body = doc.MainDocumentPart.Document.Body;
                    if (body == null)
                        throw new Exception("Invalid DOCX: missing body.");

                    // Suddividi il testo corretto in paragrafi (usando \n come separatore)
                    var correctedParagraphs = correctedText.Split(new[] { "\r\n", "\n" }, StringSplitOptions.None);
                    var originalParagraphs = body.Elements<Paragraph>().ToList();
                    int maxCount = Math.Max(originalParagraphs.Count, correctedParagraphs.Length);

                    for (int i = 0; i < maxCount; i++)
                    {
                        if (i < originalParagraphs.Count && i < correctedParagraphs.Length)
                        {
                            var paragraph = originalParagraphs[i];
                            string originalParaText;
                            var runMap = BuildRunMapFromParagraph(paragraph, out originalParaText);
                            string correctedParaText = correctedParagraphs[i];

                            if (!string.Equals(originalParaText, correctedParaText))
                            {
                                UpdateParagraphWithDiff(paragraph, originalParaText, correctedParaText, runMap);
                            }
                        }
                        else if (i >= originalParagraphs.Count)
                        {
                            // Aggiungi un nuovo paragrafo con il testo corretto come inserzione
                            var newP = new Paragraph();
                            InsertParagraphAsInsertion(newP, correctedParagraphs[i]);
                            body.AppendChild(newP);
                        }
                        else
                        {
                            // Paragrafo in eccesso nell'originale: marcato come eliminato
                            MarkParagraphAsDeleted(originalParagraphs[i]);
                        }
                    }

                    doc.MainDocumentPart.Document.Save();
                }

                var mergedStream = new MemoryStream();
                using (var fs = new FileStream(tempFilePath, FileMode.Open, FileAccess.Read))
                {
                    fs.CopyTo(mergedStream);
                }
                mergedStream.Position = 0;
                try { File.Delete(tempFilePath); } catch { }
                return mergedStream;
            }
            catch (Exception ex)
            {
                throw new Exception($"Merge partial operation failed: {ex.Message}", ex);
            }
        }

        /// <summary>
        /// Esegue il merge del documento originale con il testo corretto utilizzando WmlComparer,
        /// in modo da mantenere stili, formattazione e tracciare le revisioni.
        /// </summary>
        /// <param name="originalStream">Lo stream del documento DOCX originale.</param>
        /// <param name="correctedText">Il testo corretto da integrare.</param>
        /// <returns>Un MemoryStream contenente il DOCX fuso con track changes.</returns>
        public MemoryStream MergeDocumentUsingWmlComparer(MemoryStream originalStream, string correctedText)
        {
            originalStream.Position = 0;

            // Salva lo stream originale in un file temporaneo.
            string originalTempPath = Path.GetTempFileName();
            using (var fs = new FileStream(originalTempPath, FileMode.Create, FileAccess.Write))
            {
                originalStream.CopyTo(fs);
            }

            // Crea un documento DOCX dal testo corretto: suddivide il testo in paragrafi.
            var correctedParagraphs = correctedText
                .Split(new[] { "\r\n", "\n" }, StringSplitOptions.None)
                .Select(line => new Paragraph(new Run(new Text(line) { Space = SpaceProcessingModeValues.Preserve })))
                .ToList();
            var doc = new Document(new Body(correctedParagraphs));
            byte[] correctedDocBytes = DocumentFormat.OpenXml.Packaging.Packer.ToByteArray(doc);
            string correctedTempPath = Path.GetTempFileName();
            File.WriteAllBytes(correctedTempPath, correctedDocBytes);

            // Crea i WmlDocument dai file temporanei.
            var wmlOriginal = new WmlDocument(originalTempPath);
            var wmlCorrected = new WmlDocument(correctedTempPath);

            // Configura le impostazioni per WmlComparer.
            var comparerSettings = new WmlComparerSettings
            {
                AuthorForRevisions = "AI Correction",
                DetailThreshold = 0
            };

            // Confronta i due documenti per generare il DOCX finale con track changes.
            var mergedWml = WmlComparer.Compare(wmlOriginal, wmlCorrected, comparerSettings);

            // Pulisci i file temporanei.
            try
            {
                File.Delete(originalTempPath);
                File.Delete(correctedTempPath);
            }
            catch (Exception ex)
            {
                _logger.LogWarning($"Impossibile eliminare i file temporanei: {ex.Message}");
            }

            return new MemoryStream(mergedWml.DocumentByteArray);
        }

        /// <summary>
        /// Abilita il Track Revisions nel documento.
        /// </summary>
        private void EnableTrackRevisions(WordprocessingDocument doc)
        {
            var settingsPart = doc.MainDocumentPart.DocumentSettingsPart;
            if (settingsPart == null)
            {
                settingsPart = doc.MainDocumentPart.AddNewPart<DocumentSettingsPart>();
                settingsPart.Settings = new Settings();
            }
            if (settingsPart.Settings == null)
            {
                settingsPart.Settings = new Settings();
            }
            var trackRevisions = new TrackRevisions { Val = OnOffValue.FromBoolean(true) };
            settingsPart.Settings.AppendChild(trackRevisions);
            settingsPart.Settings.Save();
        }

        /// <summary>
        /// Costruisce una mappa dei run in un paragrafo e restituisce il testo concatenato.
        /// </summary>
        private List<RunPositionInfo> BuildRunMapFromParagraph(Paragraph paragraph, out string originalParaText)
        {
            var runMap = new List<RunPositionInfo>();
            var runs = paragraph.Elements<Run>().ToList();
            var sb = new StringBuilder();
            int currentPos = 0;
            foreach (var run in runs)
            {
                string runText = string.Concat(run.Elements<Text>().Select(t => t.Text));
                int length = runText.Length;
                if (length > 0)
                {
                    runMap.Add(new RunPositionInfo
                    {
                        StartPos = currentPos,
                        EndPos = currentPos + length - 1,
                        RunProperties = run.RunProperties?.CloneNode(true) as RunProperties
                    });
                    sb.Append(runText);
                    currentPos += length;
                }
            }
            originalParaText = sb.ToString();
            return runMap;
        }

        /// <summary>
        /// Esegue il diff word-level tra il testo originale e quello corretto, ricostruendo il paragrafo.
        /// </summary>
        private void UpdateParagraphWithDiff(Paragraph paragraph, string originalParaText, string correctedParaText, List<RunPositionInfo> runMap)
        {
            // Conserva le proprietà del paragrafo.
            var pPr = paragraph.ParagraphProperties?.CloneNode(true) as ParagraphProperties;
            paragraph.RemoveAllChildren();
            if (pPr != null)
                paragraph.AppendChild(pPr);

            // Tokenizza in parole e spazi usando un delimitatore speciale.
            char delimiter = '\u001F';
            string[] origTokens = System.Text.RegularExpressions.Regex.Split(originalParaText, @"(\s+)");
            string[] corrTokens = System.Text.RegularExpressions.Regex.Split(correctedParaText, @"(\s+)");
            string origJoined = string.Join(delimiter, origTokens);
            string corrJoined = string.Join(delimiter, corrTokens);

            var dmp = new DiffMatchPatch.diff_match_patch();
            var diffs = dmp.diff_main(origJoined, corrJoined, false);

            int originalPos = 0;
            foreach (var diff in diffs)
            {
                string tokenText = diff.text.Replace(delimiter.ToString(), " ");
                if (string.IsNullOrEmpty(tokenText))
                    continue;

                if (diff.operation == DiffMatchPatch.Operation.EQUAL)
                {
                    BuildEqualRuns(paragraph, tokenText, ref originalPos, runMap);
                }
                else if (diff.operation == DiffMatchPatch.Operation.DELETE)
                {
                    BuildDeletedRuns(paragraph, tokenText, ref originalPos, runMap);
                }
                else if (diff.operation == DiffMatchPatch.Operation.INSERT)
                {
                    BuildInsertedRuns(paragraph, tokenText, originalPos, runMap);
                }
            }
        }

        /// <summary>
        /// Crea run normali per il testo uguale.
        /// </summary>
        private void BuildEqualRuns(Paragraph paragraph, string text, ref int originalPos, List<RunPositionInfo> runMap)
        {
            var rpInfo = FindRunPropsForPosition(runMap, originalPos);
            var run = new Run();
            if (rpInfo?.RunProperties != null)
                run.RunProperties = rpInfo.RunProperties.CloneNode(true) as RunProperties;
            run.AppendChild(new Text(text) { Space = SpaceProcessingModeValues.Preserve });
            paragraph.AppendChild(run);
            originalPos += text.Length;
        }

        /// <summary>
        /// Crea run per il testo da eliminare, racchiudendolo in <w:del>.
        /// </summary>
        private void BuildDeletedRuns(Paragraph paragraph, string text, ref int originalPos, List<RunPositionInfo> runMap)
        {
            var rpInfo = FindRunPropsForPosition(runMap, originalPos);
            var run = new Run();
            if (rpInfo?.RunProperties != null)
                run.RunProperties = rpInfo.RunProperties.CloneNode(true) as RunProperties;
            run.AppendChild(new DeletedText(text) { Space = SpaceProcessingModeValues.Preserve });
            var delRun = new DeletedRun
            {
                Author = "AI Correction",
                Date = DateTime.UtcNow
            };
            delRun.Append(run);
            paragraph.AppendChild(delRun);
            originalPos += text.Length;
        }

        /// <summary>
        /// Crea run per il testo da inserire, racchiudendolo in <w:ins>.
        /// </summary>
        private void BuildInsertedRuns(Paragraph paragraph, string text, int originalPos, List<RunPositionInfo> runMap)
        {
            var rpInfo = FindRunPropsForPosition(runMap, originalPos);
            var run = new Run();
            if (rpInfo?.RunProperties != null)
                run.RunProperties = rpInfo.RunProperties.CloneNode(true) as RunProperties;
            run.AppendChild(new Text(text) { Space = SpaceProcessingModeValues.Preserve });
            var insRun = new InsertedRun
            {
                Author = "AI Correction",
                Date = DateTime.UtcNow
            };
            insRun.Append(run);
            paragraph.AppendChild(insRun);
        }

        /// <summary>
        /// Cerca nella mappa dei run le proprietà per la posizione specificata.
        /// </summary>
        private RunPositionInfo FindRunPropsForPosition(List<RunPositionInfo> runMap, int position)
        {
            foreach (var info in runMap)
            {
                if (position >= info.StartPos && position <= info.EndPos)
                    return info;
            }
            return runMap.LastOrDefault();
        }

        /// <summary>
        /// Inserisce un intero paragrafo come inserzione.
        /// </summary>
        private void InsertParagraphAsInsertion(Paragraph para, string paragraphText)
        {
            var insRun = new InsertedRun
            {
                Author = "AI Correction",
                Date = DateTime.UtcNow
            };
            var run = new Run(new Text(paragraphText) { Space = SpaceProcessingModeValues.Preserve });
            insRun.Append(run);
            para.AppendChild(insRun);
        }

        /// <summary>
        /// Marca un intero paragrafo come eliminato.
        /// </summary>
        private void MarkParagraphAsDeleted(Paragraph paragraph)
        {
            var runs = paragraph.Elements<Run>().ToList();
            foreach (var run in runs)
            {
                string text = string.Concat(run.Elements<Text>().Select(t => t.Text));
                run.RemoveAllChildren<Text>();
                var delText = new DeletedText(text) { Space = SpaceProcessingModeValues.Preserve };
                run.AppendChild(delText);
                var delRun = new DeletedRun
                {
                    Author = "AI Correction",
                    Date = DateTime.UtcNow
                };
                delRun.Append(run);
                run.Parent.InsertAfter(delRun, run);
                run.Remove();
            }
        }
    }

    /// <summary>
    /// Classe di supporto per mappare le proprietà dei run in un paragrafo.
    /// </summary>
    public class RunPositionInfo
    {
        public int StartPos { get; set; }
        public int EndPos { get; set; }
        public RunProperties RunProperties { get; set; }
    }
}
