using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using DocumentFormat.OpenXml;
using DiffMatchPatch;

namespace DocxMergeService.Services
{
    /// <summary>
    /// Servizio che esegue un merge "granulare" del testo corretto in un DOCX.
    /// Il risultato è un file in cui solo le parole cambiate sono segnalate come revisioni (ins/del),
    /// preservando interamente la formattazione originale.
    /// </summary>
    public class DocxService
    {
        /// <summary>
        /// Esegue la fusione parziale tra il testo originale contenuto nel DOCX e il testo corretto (da DB).
        /// Utilizza un diff word-level per ridurre il numero di nodi creati.
        /// </summary>
        public MemoryStream MergeDocumentPartial(MemoryStream originalStream, string correctedText)
        {
            // Scriviamo il contenuto in un file temporaneo
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

                    // Suddividiamo il testo corretto in paragrafi (assumendo \n come separatore)
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
                            // Aggiungiamo un nuovo paragrafo con il testo corretto come inserimento
                            var newP = new Paragraph();
                            InsertParagraphAsInsertion(newP, correctedParagraphs[i]);
                            body.AppendChild(newP);
                        }
                        else
                        {
                            // Paragrafo in eccesso nell'originale: lo marcamo come eliminato
                            MarkParagraphAsDeleted(originalParagraphs[i]);
                        }
                    }

                    doc.MainDocumentPart.Document.Save();
                }

                // Ritorna il file finale in uno stream
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
        /// Abilita Track Revisions nel documento.
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
        /// Costruisce una mappa dei run del paragrafo, ottenendo la concatenazione del testo originale
        /// e salvando per ciascun run il range (start-end) e le RunProperties.
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
        /// Esegue il diff word-level tra originalParaText e correctedParaText e ricostruisce il paragrafo
        /// creando run normali, <w:del> e <w:ins> secondo le differenze.
        /// </summary>
        private void UpdateParagraphWithDiff(Paragraph paragraph, string originalParaText, string correctedParaText, List<RunPositionInfo> runMap)
        {
            // Rimuoviamo i figli del paragrafo, mantenendo eventuali ParagraphProperties
            var pPr = paragraph.ParagraphProperties?.CloneNode(true) as ParagraphProperties;
            paragraph.RemoveAllChildren();
            if (pPr != null)
                paragraph.AppendChild(pPr);

            // Eseguiamo un diff word-level:
            // 1) Tokenizziamo in parole e punteggiatura usando un delimitatore speciale
            char delimiter = '\u001F';
            string[] origTokens = System.Text.RegularExpressions.Regex.Split(originalParaText, @"(\W+)");
            string[] corrTokens = System.Text.RegularExpressions.Regex.Split(correctedParaText, @"(\W+)");
            string origJoined = string.Join(delimiter, origTokens);
            string corrJoined = string.Join(delimiter, corrTokens);

            var dmp = new diff_match_patch();
            var diffs = dmp.diff_main(origJoined, corrJoined, false);
            // Non eseguiamo cleanup per mantenere la granularità word-level

            // Dopo il diff, per ciascun segmento, ricostruiamo il testo (spezzando sul delimitatore)
            int originalPos = 0;
            foreach (var diff in diffs)
            {
                // Sostituiamo il delimitatore con uno spazio per ottenere il testo finale
                string tokenText = diff.text.Replace(delimiter.ToString(), " ");
                if (string.IsNullOrEmpty(tokenText))
                    continue;

                if (diff.operation == Operation.EQUAL)
                {
                    BuildEqualRuns(paragraph, tokenText, ref originalPos, runMap);
                }
                else if (diff.operation == Operation.DELETE)
                {
                    BuildDeletedRuns(paragraph, tokenText, ref originalPos, runMap);
                }
                else if (diff.operation == Operation.INSERT)
                {
                    BuildInsertedRuns(paragraph, tokenText, originalPos, runMap);
                }
            }
        }

        /// <summary>
        /// Crea run normali (EQUAL) copiando la formattazione dal runMap.
        /// </summary>
        private void BuildEqualRuns(Paragraph paragraph, string text, ref int originalPos, List<RunPositionInfo> runMap)
        {
            // Per word-level diff si assume che le modifiche siano blocchi più grandi
            var rpInfo = FindRunPropsForPosition(runMap, originalPos);
            var run = new Run();
            if (rpInfo?.RunProperties != null)
                run.RunProperties = rpInfo.RunProperties.CloneNode(true) as RunProperties;
            run.AppendChild(new Text(text) { Space = SpaceProcessingModeValues.Preserve });
            paragraph.AppendChild(run);
            originalPos += text.Length;
        }

        /// <summary>
        /// Crea run per la parte DELETE racchiudendoli in <w:del>.
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
        /// Crea run per la parte INSERT racchiudendoli in <w:ins>.
        /// </summary>
        private void BuildInsertedRuns(Paragraph paragraph, string text, int originalPos, List<RunPositionInfo> runMap)
        {
            // Per gli inserimenti, usiamo la formattazione "vicina" (se disponibile)
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
        /// Cerca nella runMap la RunProperties per la posizione indicata.
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
        /// Inserisce un intero paragrafo come inserito (<w:ins>).
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
    /// Struttura di supporto per mappare un run: indica l'intervallo di caratteri e le relative RunProperties.
    /// </summary>
    public class RunPositionInfo
    {
        public int StartPos { get; set; }
        public int EndPos { get; set; }
        public RunProperties RunProperties { get; set; }
    }
}
