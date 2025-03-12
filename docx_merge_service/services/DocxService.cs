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
    /// Servizio che esegue un merge "granulare" del testo corretto in un DOCX
    /// mostrando in Word solo le parole effettivamente cambiate come <w:del> e <w:ins>.
    /// </summary>
    public class DocxService
    {
        /// <summary>
        /// Fusione parziale in revisione: 
        /// - Abilita TrackRevisions
        /// - Confronta paragrafi originali con "correctedText"
        /// - Esegue diff e ricostruisce run con <w:del>/<w:ins>
        /// </summary>
        public MemoryStream MergeDocumentPartial(MemoryStream originalStream, string correctedText)
        {
            // Creiamo un file temporaneo
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
                    // 1) Abilita track revisions
                    EnableTrackRevisions(doc);

                    // 2) Legge i paragrafi del Body
                    var body = doc.MainDocumentPart.Document.Body;
                    if (body == null)
                        throw new Exception("Invalid DOCX: missing body.");

                    var originalParagraphs = body.Elements<Paragraph>().ToList();
                    // Suddividiamo il testo corretto in paragrafi su \n
                    var correctedParagraphs = correctedText.Split(new[] { "\r\n", "\n" }, StringSplitOptions.None);

                    // 3) Scorriamo in parallelo
                    int maxCount = Math.Max(originalParagraphs.Count, correctedParagraphs.Length);
                    for (int i = 0; i < maxCount; i++)
                    {
                        if (i < originalParagraphs.Count && i < correctedParagraphs.Length)
                        {
                            // Abbiamo un paragrafo "originale" e uno "corretto"
                            var paragraph = originalParagraphs[i];

                            // Costruiamo la mappa run->posizioni e il testo originale
                            string originalParaText;
                            var runMap = BuildRunMapFromParagraph(paragraph, out originalParaText);

                            string correctedParaText = correctedParagraphs[i];
                            if (!string.Equals(originalParaText, correctedParaText))
                            {
                                UpdateParagraphWithDiff(paragraph, originalParaText, correctedParaText, runMap);
                            }
                            // Altrimenti se sono identici, non tocchiamo nulla
                        }
                        else if (i >= originalParagraphs.Count)
                        {
                            // Non ci sono più paragrafi originali, ma ci sono paragrafi "corretti" in più
                            // -> Aggiungiamo come paragrafi "inseriti"
                            var newP = new Paragraph();
                            InsertParagraphAsInsertion(newP, correctedParagraphs[i]);
                            body.AppendChild(newP);
                        }
                        else
                        {
                            // Abbiamo paragrafi originali in eccesso
                            // -> Li marchiamo come cancellati
                            MarkParagraphAsDeleted(originalParagraphs[i]);
                        }
                    }

                    doc.MainDocumentPart.Document.Save();
                }

                // Ritorniamo il file finale in uno stream
                var mergedStream = new MemoryStream();
                using (var fs = new FileStream(tempFilePath, FileMode.Open, FileAccess.Read))
                {
                    fs.CopyTo(mergedStream);
                }
                mergedStream.Position = 0;

                // Cleanup
                try
                {
                    File.Delete(tempFilePath);
                }
                catch { /* ignore */ }

                return mergedStream;
            }
            catch (Exception ex)
            {
                throw new Exception($"Merge partial operation failed: {ex.Message}", ex);
            }
        }

        /// <summary>
        /// Abilita la funzionalità di TrackRevisions nel documento.
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
        /// Costruisce una mappa (startPos, endPos, runProperties) per i run di un paragrafo,
        /// e restituisce anche il testo completo "originalParaText".
        /// </summary>
        private List<RunPositionInfo> BuildRunMapFromParagraph(Paragraph paragraph, out string originalParaText)
        {
            var runMap = new List<RunPositionInfo>();
            var runs = paragraph.Elements<Run>().ToList();

            var sb = new StringBuilder();
            int currentPos = 0;

            foreach (var run in runs)
            {
                // Concateniamo tutto il testo di <w:t> in questo run
                string runText = string.Concat(run.Elements<Text>().Select(t => t.Text));
                int length = runText.Length;

                if (length > 0)
                {
                    var info = new RunPositionInfo
                    {
                        StartPos = currentPos,
                        EndPos = currentPos + length - 1,
                        RunProperties = run.RunProperties?.CloneNode(true) as RunProperties
                    };
                    runMap.Add(info);

                    sb.Append(runText);
                    currentPos += length;
                }
            }

            originalParaText = sb.ToString();
            return runMap;
        }

        /// <summary>
        /// Confronta originalParaText e correctedParaText e ricostruisce i run in <paragraph>
        /// usando <w:del> e <w:ins> per le differenze. Mantiene la formattazione dai run originali (runMap).
        /// </summary>
        private void UpdateParagraphWithDiff(Paragraph paragraph, string originalParaText, string correctedParaText, List<RunPositionInfo> runMap)
        {
            // Salviamo pPr
            var pPr = paragraph.ParagraphProperties?.CloneNode(true) as ParagraphProperties;

            // Rimuoviamo i child (run)
            paragraph.RemoveAllChildren();
            if (pPr != null)
            {
                paragraph.AppendChild(pPr);
            }

            // Diff con diff_match_patch
            var dmp = new diff_match_patch();
            var diffs = dmp.diff_main(originalParaText, correctedParaText, false);
            // Niente cleanup per mantenere granularità

            int originalPos = 0; // Indice globale sul testo originale

            foreach (var diff in diffs)
            {
                var op = diff.operation;
                var text = diff.text;
                if (string.IsNullOrEmpty(text)) continue;

                if (op == Operation.EQUAL)
                {
                    BuildEqualRuns(paragraph, text, ref originalPos, runMap);
                }
                else if (op == Operation.DELETE)
                {
                    BuildDeletedRuns(paragraph, text, ref originalPos, runMap);
                }
                else if (op == Operation.INSERT)
                {
                    BuildInsertedRuns(paragraph, text, originalPos, runMap);
                    // Inserimento non avanza originalPos perché non "consuma" testo dell'originale
                }
            }
        }

        /// <summary>
        /// Crea run normali per la parte EQUAL, copiando la formattazione dal runMap.
        /// Avanza originalPos.
        /// </summary>
        private void BuildEqualRuns(Paragraph paragraph, string text, ref int originalPos, List<RunPositionInfo> runMap)
        {
            int idx = 0;
            while (idx < text.Length)
            {
                var rpInfo = FindRunPropsForPosition(runMap, originalPos + idx);
                int chunkLength = CalculateChunkLength(originalPos + idx, text.Length - idx, rpInfo);
                string sub = text.Substring(idx, chunkLength);

                // Crea un run "normale"
                var run = new Run();
                if (rpInfo?.RunProperties != null)
                {
                    run.RunProperties = rpInfo.RunProperties.CloneNode(true) as RunProperties;
                }
                run.AppendChild(new Text(sub) { Space = SpaceProcessingModeValues.Preserve });
                paragraph.AppendChild(run);

                idx += chunkLength;
            }
            originalPos += text.Length;
        }

        /// <summary>
        /// Crea run racchiusi in <w:del> per la parte DELETE.
        /// Avanza originalPos.
        /// </summary>
        private void BuildDeletedRuns(Paragraph paragraph, string text, ref int originalPos, List<RunPositionInfo> runMap)
        {
            int idx = 0;
            while (idx < text.Length)
            {
                var rpInfo = FindRunPropsForPosition(runMap, originalPos + idx);
                int chunkLength = CalculateChunkLength(originalPos + idx, text.Length - idx, rpInfo);
                string sub = text.Substring(idx, chunkLength);

                var run = new Run();
                if (rpInfo?.RunProperties != null)
                {
                    run.RunProperties = rpInfo.RunProperties.CloneNode(true) as RunProperties;
                }
                // <w:del> si aspetta <w:delText> o <w:delRun>. 
                // Ma qui useremo DeletedText per marcare la parte di testo come cancellata
                run.AppendChild(new DeletedText(sub) { Space = SpaceProcessingModeValues.Preserve });

                var delRun = new DeletedRun
                {
                    Author = "AI Correction",
                    Date = DateTime.UtcNow
                };
                delRun.Append(run);
                paragraph.AppendChild(delRun);

                idx += chunkLength;
            }
            originalPos += text.Length;
        }

        /// <summary>
        /// Crea run racchiusi in <w:ins> per la parte INSERT.
        /// Non avanza originalPos, perché è testo nuovo.
        /// </summary>
        private void BuildInsertedRuns(Paragraph paragraph, string text, int originalPos, List<RunPositionInfo> runMap)
        {
            int idx = 0;
            while (idx < text.Length)
            {
                // Prendiamo la formattazione dal runMap "vicino"
                var rpInfo = FindRunPropsForPosition(runMap, originalPos + idx);
                int chunkLength = CalculateChunkLength(originalPos + idx, text.Length - idx, rpInfo);
                string sub = text.Substring(idx, chunkLength);

                var run = new Run();
                if (rpInfo?.RunProperties != null)
                {
                    run.RunProperties = rpInfo.RunProperties.CloneNode(true) as RunProperties;
                }
                run.AppendChild(new Text(sub) { Space = SpaceProcessingModeValues.Preserve });

                var insRun = new InsertedRun
                {
                    Author = "AI Correction",
                    Date = DateTime.UtcNow
                };
                insRun.Append(run);
                paragraph.AppendChild(insRun);

                idx += chunkLength;
            }
        }

        /// <summary>
        /// Cerca la RunProperties in runMap che copre "position".
        /// </summary>
        private RunPositionInfo FindRunPropsForPosition(List<RunPositionInfo> runMap, int position)
        {
            // Ritorna l'info che contiene 'position'
            foreach (var info in runMap)
            {
                if (position >= info.StartPos && position <= info.EndPos)
                    return info;
            }
            // Se nulla, ritorna l'ultima o null
            return runMap.LastOrDefault();
        }

        /// <summary>
        /// Calcola quanti caratteri possiamo "consumare" con la stessa formattazione.
        /// </summary>
        private int CalculateChunkLength(int currentPos, int remaining, RunPositionInfo rpInfo)
        {
            if (rpInfo == null) return remaining;
            int runEnd = rpInfo.EndPos;
            int chunk = runEnd - currentPos + 1;
            return chunk > remaining ? remaining : chunk;
        }

        /// <summary>
        /// Inserisce un paragrafo come "inserito" (<w:ins>).
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
        /// Marca l'intero paragrafo come cancellato.
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
    /// Struttura di supporto: definisce l'intervallo di testo (startPos..endPos)
    /// e le relative RunProperties originali.
    /// </summary>
    public class RunPositionInfo
    {
        public int StartPos { get; set; }
        public int EndPos { get; set; }
        public RunProperties RunProperties { get; set; }
    }
}
