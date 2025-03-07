/**
 * @file DocxService.cs
 * @description
 * Questo servizio gestisce le operazioni sui file DOCX utilizzando l’Open XML SDK.
 * In questa versione aggiornata, il metodo di “flattening” dei run è stato modificato per
 * raggruppare i run contigui con le stesse proprietà, in modo da preservare la formattazione durante
 * l’applicazione delle modifiche tramite diff a livello di testo.
 *
 * Le principali modifiche sono:
 * - Aggiunta del metodo FlattenParagraphGrouped che restituisce una lista di segmenti (stringa, RunProperties).
 * - Aggiornamento del metodo BuildTrackChangesParagraph per usare i segmenti raggruppati e mappare correttamente
 *   il diff sul testo originale.
 *
 * Le altre funzionalità (merge di headers, footers e styles) rimangono invariate.
 */

using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using DocumentFormat.OpenXml;
using Microsoft.Extensions.Logging;
using DiffMatchPatch;

namespace DocxMergeService.Services
{
    public class DocxService
    {
        private readonly ILogger<DocxService> _logger;

        public DocxService(ILogger<DocxService> logger)
        {
            _logger = logger;
        }

        public WordprocessingDocument LoadDocument(Stream stream)
        {
            if (stream == null)
                throw new ArgumentNullException(nameof(stream), "Input stream cannot be null.");
            _logger.LogInformation("Loading DOCX document from stream.");
            return WordprocessingDocument.Open(stream, true);
        }

        public MemoryStream MergeDocument(MemoryStream originalStream, string correctedText)
        {
            try
            {
                if (originalStream == null)
                    throw new ArgumentNullException(nameof(originalStream), "Original document stream cannot be null.");
                if (correctedText == null)
                    throw new ArgumentNullException(nameof(correctedText), "Corrected text cannot be null.");

                _logger.LogInformation("Starting DOCX merge process with Track Changes.");
                originalStream.Position = 0;
                using (var wordDoc = LoadDocument(originalStream))
                {
                    var body = wordDoc.MainDocumentPart?.Document?.Body;
                    if (body == null)
                        throw new Exception("Invalid DOCX structure: Missing document body.");

                    // Dividi il testo corretto in paragrafi.
                    var correctedParagraphs = correctedText.Split(new[] { "\r\n", "\n", "\r" }, StringSplitOptions.None);
                    var originalParagraphs = body.Elements<Paragraph>().ToList();
                    int minCount = Math.Min(originalParagraphs.Count, correctedParagraphs.Length);

                    // Per ogni paragrafo in comune, applica il merge con track changes.
                    for (int i = 0; i < minCount; i++)
                    {
                        var origPara = originalParagraphs[i];
                        var newPara = BuildTrackChangesParagraph(origPara, correctedParagraphs[i]);
                        origPara.InsertAfterSelf(newPara);
                        origPara.Remove();
                    }
                    // Per i paragrafi extra nel testo corretto, li aggiunge come inserzioni complete.
                    for (int i = minCount; i < correctedParagraphs.Length; i++)
                    {
                        var insPara = new Paragraph();
                        var run = BuildRun(correctedParagraphs[i], null);
                        var inserted = CreateRevisionElement("ins", run, "GPT-4 Correction");
                        insPara.AppendChild(inserted);
                        body.AppendChild(insPara);
                    }
                    wordDoc.MainDocumentPart.Document.Save();
                    _logger.LogInformation("DOCX merge with Track Changes completed successfully.");
                }
                MemoryStream mergedStream = new MemoryStream(originalStream.ToArray());
                mergedStream.Position = 0;
                return mergedStream;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred during DOCX merge process with Track Changes.");
                throw;
            }
        }

        /// <summary>
        /// Costruisce un nuovo paragrafo applicando le revisioni (insertions e deletions) mediante diff.
        /// Utilizza una versione raggruppata dei run per preservare la formattazione.
        /// </summary>
        private Paragraph BuildTrackChangesParagraph(Paragraph originalParagraph, string correctedParaText)
        {
            // Raggruppa i run contigui in base alle proprietà.
            var grouped = FlattenParagraphGrouped(originalParagraph);
            var originalText = string.Join("", grouped.Select(g => g.Text));

            var dmp = new diff_match_patch();
            var diffs = dmp.diff_main(originalText, correctedParaText, false);
            dmp.diff_cleanupSemantic(diffs);

            var groupedDiffs = new List<(Operation op, string text, RunProperties? props)>();

            int globalIndex = 0;
            int groupIndex = 0;
            int groupStart = 0;
            RunProperties? currentProps = grouped.FirstOrDefault().Props;

            foreach (var diff in diffs)
            {
                // Aggiorna l'indice globale e determina le proprietà correnti in base al gruppo.
                while (groupIndex < grouped.Count && globalIndex >= groupStart + grouped[groupIndex].Text.Length)
                {
                    groupStart += grouped[groupIndex].Text.Length;
                    groupIndex++;
                    if (groupIndex < grouped.Count)
                        currentProps = grouped[groupIndex].Props;
                }

                RunProperties? diffProps = null;
                if (diff.operation == Operation.EQUAL || diff.operation == Operation.DELETE)
                {
                    diffProps = currentProps;
                }
                else if (diff.operation == Operation.INSERT)
                {
                    // Per le inserzioni, utilizza le proprietà del gruppo precedente se disponibili.
                    diffProps = groupIndex > 0 ? grouped[groupIndex - 1].Props : null;
                }

                // Raggruppa diff consecutivi con lo stesso tipo e proprietà.
                if (groupedDiffs.Count > 0 && groupedDiffs.Last().op == diff.operation &&
                    AreRunPropertiesEqual(groupedDiffs.Last().props, diffProps))
                {
                    var last = groupedDiffs.Last();
                    groupedDiffs[groupedDiffs.Count - 1] = (last.op, last.text + diff.text, last.props);
                }
                else
                {
                    groupedDiffs.Add((diff.operation, diff.text, diffProps));
                }

                if (diff.operation != Operation.INSERT)
                    globalIndex += diff.text.Length;
            }

            // Costruisce il nuovo paragrafo applicando le revisioni.
            var newParagraph = new Paragraph();
            foreach (var group in groupedDiffs)
            {
                Run run;
                switch (group.op)
                {
                    case Operation.EQUAL:
                        run = BuildRun(group.text, group.props);
                        newParagraph.AppendChild(run);
                        break;
                    case Operation.INSERT:
                        run = BuildRun(group.text, group.props);
                        var insElement = CreateRevisionElement("ins", run, "GPT-4 Correction");
                        newParagraph.AppendChild(insElement);
                        break;
                    case Operation.DELETE:
                        run = BuildDeletedRun(group.text, group.props);
                        var delElement = CreateRevisionElement("del", run, "GPT-4 Correction");
                        newParagraph.AppendChild(delElement);
                        break;
                }
            }
            return newParagraph;
        }

        /// <summary>
        /// Raggruppa i run contigui di un paragrafo in segmenti (stringa, RunProperties).
        /// </summary>
        private List<(string Text, RunProperties? Props)> FlattenParagraphGrouped(Paragraph paragraph)
        {
            var result = new List<(string Text, RunProperties? Props)>();

            foreach (var run in paragraph.Elements<Run>())
            {
                var runProps = run.RunProperties?.CloneNode(true) as RunProperties;
                string runText = string.Concat(run.Elements<Text>().Select(t => t.Text));
                if (!string.IsNullOrEmpty(runText))
                {
                    if (result.Count > 0 && AreRunPropertiesEqual(result.Last().Props, runProps))
                    {
                        var last = result.Last();
                        result[result.Count - 1] = (last.Text + runText, last.Props);
                    }
                    else
                    {
                        result.Add((runText, runProps));
                    }
                }
            }
            return result;
        }

        /// <summary>
        /// Confronta due istanze di RunProperties in base all'OuterXml.
        /// </summary>
        private bool AreRunPropertiesEqual(RunProperties? props1, RunProperties? props2)
        {
            if (props1 == null && props2 == null)
                return true;
            if (props1 == null || props2 == null)
                return false;
            return props1.OuterXml == props2.OuterXml;
        }

        /// <summary>
        /// Crea un elemento di revisione (inserimento o cancellazione) contenente il run fornito.
        /// </summary>
        private OpenXmlElement CreateRevisionElement(string tagName, Run childRun, string author)
        {
            string wordprocessingNamespace = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

            OpenXmlElement revision;
            if (tagName == "ins")
            {
                revision = new InsertedRun();
            }
            else
            {
                revision = new DeletedRun();
            }

            revision.SetAttribute(new OpenXmlAttribute("w", "author", wordprocessingNamespace, author));
            revision.SetAttribute(new OpenXmlAttribute("w", "date", wordprocessingNamespace, DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ")));

            if (childRun != null)
            {
                revision.AppendChild(childRun.CloneNode(true));
            }

            return revision;
        }

        /// <summary>
        /// Crea un Run con il testo specificato e le proprietà fornite.
        /// </summary>
        private Run BuildRun(string text, RunProperties? props)
        {
            var run = new Run();
            if (props != null)
            {
                run.RunProperties = props.CloneNode(true) as RunProperties;
            }
            run.Append(new Text(text) { Space = SpaceProcessingModeValues.Preserve });
            return run;
        }

        /// <summary>
        /// Crea un Run per il testo da cancellare, utilizzando l'elemento DeletedText.
        /// </summary>
        private Run BuildDeletedRun(string text, RunProperties? props)
        {
            var run = new Run();
            if (props != null)
            {
                run.RunProperties = props.CloneNode(true) as RunProperties;
            }
            run.Append(new DeletedText(text) { Space = SpaceProcessingModeValues.Preserve });
            return run;
        }

        // I metodi per il merge di headers, footers e styles rimangono invariati.

        public void MergeHeaders(WordprocessingDocument sourceDoc, WordprocessingDocument targetDoc)
        {
            var sourceHeaders = ExtractHeaders(sourceDoc);
            if (sourceHeaders.Count == 0) return;
            var firstHeader = sourceHeaders.First();
            var mainPart = targetDoc.MainDocumentPart;
            if (mainPart == null)
                throw new Exception("Target document is missing a MainDocumentPart.");
            var newHeaderPart = mainPart.AddNewPart<HeaderPart>();
            using (var headerStream = firstHeader.GetStream())
            {
                newHeaderPart.FeedData(headerStream);
            }
            var headerReference = new HeaderReference()
            {
                Id = mainPart.GetIdOfPart(newHeaderPart),
                Type = HeaderFooterValues.Default
            };
            var body = mainPart.Document.Body;
            var sectPr = body.Elements<SectionProperties>().FirstOrDefault();
            if (sectPr == null)
            {
                sectPr = new SectionProperties();
                body.Append(sectPr);
            }
            sectPr.RemoveAllChildren<HeaderReference>();
            sectPr.AppendChild(headerReference);
            mainPart.Document.Save();
        }

        public void MergeFooters(WordprocessingDocument sourceDoc, WordprocessingDocument targetDoc)
        {
            var sourceFooters = ExtractFooters(sourceDoc);
            if (sourceFooters.Count == 0) return;
            var firstFooter = sourceFooters.First();
            var mainPart = targetDoc.MainDocumentPart;
            if (mainPart == null)
                throw new Exception("Target document is missing a MainDocumentPart.");
            var newFooterPart = mainPart.AddNewPart<FooterPart>();
            using (var footerStream = firstFooter.GetStream())
            {
                newFooterPart.FeedData(footerStream);
            }
            var footerReference = new FooterReference()
            {
                Id = mainPart.GetIdOfPart(newFooterPart),
                Type = HeaderFooterValues.Default
            };
            var body = mainPart.Document.Body;
            var sectPr = body.Elements<SectionProperties>().FirstOrDefault();
            if (sectPr == null)
            {
                sectPr = new SectionProperties();
                body.Append(sectPr);
            }
            sectPr.RemoveAllChildren<FooterReference>();
            sectPr.AppendChild(footerReference);
            mainPart.Document.Save();
        }

        public Body ExtractBody(WordprocessingDocument doc)
        {
            var body = doc.MainDocumentPart?.Document?.Body;
            if (body == null)
                throw new Exception("The DOCX document does not contain a valid body.");
            return body;
        }

        public List<HeaderPart> ExtractHeaders(WordprocessingDocument doc)
        {
            var headers = doc.MainDocumentPart?.HeaderParts;
            return headers != null ? headers.ToList() : new List<HeaderPart>();
        }

        public List<FooterPart> ExtractFooters(WordprocessingDocument doc)
        {
            var footers = doc.MainDocumentPart?.FooterParts;
            return footers != null ? footers.ToList() : new List<FooterPart>();
        }

        public Styles ExtractStyles(WordprocessingDocument doc)
        {
            var stylesPart = doc.MainDocumentPart?.StyleDefinitionsPart;
            if (stylesPart == null)
                return null;
            return stylesPart.Styles;
        }

        public void MergeStyles(WordprocessingDocument targetDoc, List<WordprocessingDocument> sourceDocs)
        {
            if (targetDoc == null)
                throw new ArgumentNullException(nameof(targetDoc), "Target document cannot be null.");
            if (sourceDocs == null || sourceDocs.Count == 0)
                throw new ArgumentException("No source documents provided for merging styles.", nameof(sourceDocs));

            var mainPart = targetDoc.MainDocumentPart;
            if (mainPart == null)
                throw new Exception("Target document is missing a MainDocumentPart.");

            StyleDefinitionsPart targetStylesPart = mainPart.StyleDefinitionsPart;
            if (targetStylesPart == null)
            {
                targetStylesPart = mainPart.AddNewPart<StyleDefinitionsPart>();
                targetStylesPart.Styles = new Styles();
                targetStylesPart.Styles.Save();
            }

            var targetStyles = targetStylesPart.Styles.Elements<Style>().ToList();

            foreach (var sourceDoc in sourceDocs)
            {
                var sourceStyles = ExtractStyles(sourceDoc);
                if (sourceStyles == null)
                    continue;

                foreach (var sourceStyle in sourceStyles.Elements<Style>())
                {
                    var styleId = sourceStyle.StyleId?.Value;
                    if (string.IsNullOrEmpty(styleId))
                        continue;

                    var existingStyle = targetStyles.FirstOrDefault(s => s.StyleId?.Value == styleId);
                    if (existingStyle == null)
                    {
                        var clonedStyle = (Style)sourceStyle.CloneNode(true);
                        targetStylesPart.Styles.AppendChild(clonedStyle);
                        targetStyles.Add(clonedStyle);
                    }
                    else
                    {
                        if (existingStyle.OuterXml != sourceStyle.OuterXml)
                        {
                            var newStyleId = styleId + "_merged";
                            var clonedStyle = (Style)sourceStyle.CloneNode(true);
                            if (clonedStyle.StyleId != null)
                            {
                                clonedStyle.StyleId.Value = newStyleId;
                            }
                            targetStylesPart.Styles.AppendChild(clonedStyle);
                            targetStyles.Add(clonedStyle);
                        }
                    }
                }
            }
            targetStylesPart.Styles.Save();
        }
    }
}
