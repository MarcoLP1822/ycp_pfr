using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using DiffMatchPatch; // NuGet package "DiffMatchPatch"
using Microsoft.Extensions.Logging;

namespace DocxMergeService.Services
{
    public class DocxService
    {
        private readonly ILogger<DocxService> _logger;

        public DocxService(ILogger<DocxService> logger)
        {
            _logger = logger;
        }

        /// <summary>
        /// Loads a WordprocessingDocument from a Stream (in read/write mode).
        /// </summary>
        public WordprocessingDocument LoadDocument(Stream stream)
        {
            if (stream == null)
                throw new ArgumentNullException(nameof(stream), "Input stream cannot be null.");
            _logger.LogInformation("Loading DOCX document from stream.");
            return WordprocessingDocument.Open(stream, true);
        }

        /// <summary>
        /// Merges the corrected text into the original DOCX while preserving paragraph properties.
        /// This method:
        /// 1) Enables track revisions.
        /// 2) Splits corrected text into paragraphs.
        /// 3) For each paragraph in the overlapping range, compares the full (trimmed) text.
        ///    - If unchanged, leaves the paragraph intact (thus preserving <w:pPr> and style).
        ///    - Otherwise, applies a run-by-run diff to insert <w:ins> and <w:del> elements.
        /// 4) Inserts extra paragraphs (if any) or marks extra original paragraphs as deleted.
        /// </summary>
        public MemoryStream MergeDocument(MemoryStream originalStream, string correctedText)
        {
            try
            {
                if (originalStream == null)
                    throw new ArgumentNullException(nameof(originalStream), "Original document stream cannot be null.");
                if (correctedText == null)
                    throw new ArgumentNullException(nameof(correctedText), "Corrected text cannot be null.");

                _logger.LogInformation("Starting DOCX merge with run-by-run track changes (preserving paragraph styles).");
                originalStream.Position = 0;

                using (var wordDoc = LoadDocument(originalStream))
                {
                    // Enable track revisions so Word shows the changes
                    EnableTrackRevisions(wordDoc);

                    var body = wordDoc.MainDocumentPart?.Document?.Body;
                    if (body == null)
                        throw new Exception("Invalid DOCX structure: Missing document body.");

                    // Split the corrected text into paragraphs (using newlines)
                    var correctedParagraphs = correctedText.Split(new[] { "\r\n", "\n" }, StringSplitOptions.None);
                    var originalParagraphs = body.Elements<Paragraph>().ToList();

                    int commonCount = Math.Min(originalParagraphs.Count, correctedParagraphs.Length);

                    for (int i = 0; i < commonCount; i++)
                    {
                        var origPara = originalParagraphs[i];
                        string correctedPara = correctedParagraphs[i];

                        // Get full text from original paragraph and trim whitespace
                        string originalParaText = GetFullParagraphText(origPara).Trim();
                        correctedPara = correctedPara.Trim();

                        // If paragraph text is identical, do nothing so that the existing <w:p> node (with its <w:pPr>) remains untouched.
                        if (originalParaText == correctedPara)
                        {
                            _logger.LogInformation($"Paragraph {i} unchanged; preserving existing formatting.");
                            continue;
                        }
                        else
                        {
                            // Otherwise, update the paragraph using a run-by-run approach.
                            UpdateParagraphRunByRun(origPara, correctedPara);
                        }
                    }

                    // If corrected text has extra paragraphs, insert them as new paragraphs.
                    for (int i = commonCount; i < correctedParagraphs.Length; i++)
                    {
                        var newPara = new Paragraph();
                        InsertFullParagraphAsIns(newPara, correctedParagraphs[i]);
                        body.AppendChild(newPara);
                    }

                    // If the original document has extra paragraphs, mark them as deleted.
                    for (int i = commonCount; i < originalParagraphs.Count; i++)
                    {
                        MarkParagraphAsDeleted(originalParagraphs[i]);
                    }

                    wordDoc.MainDocumentPart.Document.Save();
                }

                // Return the final document as a MemoryStream.
                var mergedStream = new MemoryStream(originalStream.ToArray());
                mergedStream.Position = 0;

                _logger.LogInformation("DOCX merge completed successfully.");
                return mergedStream;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during DOCX merge.");
                throw;
            }
        }

        /// <summary>
        /// Enables Word's track revisions feature so that <w:ins> and <w:del> appear as tracked changes.
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
                settingsPart.Settings = new Settings();

            var trackRevisions = new TrackRevisions { Val = OnOffValue.FromBoolean(true) };
            settingsPart.Settings.AppendChild(trackRevisions);
            settingsPart.Settings.Save();
        }

        /// <summary>
        /// Updates a paragraph in place using a run-by-run diff.
        /// This method only replaces the runs (<w:r> children) of the paragraph,
        /// leaving the paragraph node (<w:p>) and its properties (<w:pPr>) intact.
        /// </summary>
        private void UpdateParagraphRunByRun(Paragraph paragraph, string correctedParaText)
        {
            // Get the original runs from the paragraph.
            var originalRuns = paragraph.Elements<Run>().ToList();

            // This list will hold the newly constructed run elements.
            var newChildren = new List<OpenXmlElement>();

            // We'll use a cursor to track how much of the correctedParaText has been processed.
            int correctedIndex = 0;
            int correctedLength = correctedParaText.Length;

            foreach (var run in originalRuns)
            {
                string runText = string.Concat(run.Elements<Text>().Select(t => t.Text));
                var runProps = run.RunProperties?.CloneNode(true) as RunProperties;

                if (string.IsNullOrEmpty(runText))
                {
                    // If the run has no text, simply clone and add it.
                    newChildren.Add(run.CloneNode(true));
                    continue;
                }

                // Diff this run's text against the remaining corrected text.
                var dmp = new diff_match_patch();
                string correctedRemainder = correctedParaText.Substring(correctedIndex);
                var diffs = dmp.diff_main(runText, correctedRemainder, false);

                // Clean up small differences to reduce noise.
                dmp.diff_cleanupSemantic(diffs);

                int localCorrectedUsed = 0;

                foreach (var diff in diffs)
                {
                    var op = diff.operation;
                    var text = diff.text;

                    if (op == Operation.EQUAL)
                    {
                        // Unchanged text: preserve original run properties.
                        var runElement = new Run();
                        if (runProps != null)
                            runElement.RunProperties = (RunProperties)runProps.CloneNode(true);
                        runElement.AppendChild(new Text(text) { Space = SpaceProcessingModeValues.Preserve });
                        newChildren.Add(runElement);
                        localCorrectedUsed += text.Length;
                    }
                    else if (op == Operation.DELETE)
                    {
                        // Text removed: mark with <w:del>.
                        var delRun = BuildDeletedRun(text, runProps);
                        newChildren.Add(delRun);
                    }
                    else if (op == Operation.INSERT)
                    {
                        // Text inserted: mark with <w:ins>.
                        var insRun = BuildInsertedRun(text, runProps);
                        newChildren.Add(insRun);
                        localCorrectedUsed += text.Length;
                    }
                }

                // Move the corrected text cursor forward.
                correctedIndex += localCorrectedUsed;
                if (correctedIndex > correctedLength)
                    correctedIndex = correctedLength;
            }

            // If there is leftover corrected text, mark it as inserted.
            if (correctedIndex < correctedLength)
            {
                string leftover = correctedParaText.Substring(correctedIndex);
                var insRun = BuildInsertedRun(leftover, null);
                newChildren.Add(insRun);
                correctedIndex = correctedLength;
            }

            // IMPORTANT: We only remove the run children so that the <w:p> node and its properties (<w:pPr>) remain intact.
            paragraph.RemoveAllChildren<Run>();
            paragraph.RemoveAllChildren<BookmarkStart>();
            paragraph.RemoveAllChildren<BookmarkEnd>();

            foreach (var child in newChildren)
            {
                paragraph.AppendChild(child);
            }
        }

        /// <summary>
        /// Creates a run wrapped in a <w:del> element to indicate deleted text.
        /// </summary>
        private OpenXmlElement BuildDeletedRun(string text, RunProperties runProps)
        {
            var runElement = new Run();
            if (runProps != null)
                runElement.RunProperties = (RunProperties)runProps.CloneNode(true);
            runElement.AppendChild(new DeletedText(text) { Space = SpaceProcessingModeValues.Preserve });

            var delRun = new DeletedRun
            {
                Author = "GPT-4 Correction",
                Date = DateTime.UtcNow
            };
            delRun.Append(runElement);
            return delRun;
        }

        /// <summary>
        /// Creates a run wrapped in a <w:ins> element to indicate inserted text.
        /// </summary>
        private OpenXmlElement BuildInsertedRun(string text, RunProperties runProps)
        {
            var runElement = new Run();
            if (runProps != null)
                runElement.RunProperties = (RunProperties)runProps.CloneNode(true);
            runElement.AppendChild(new Text(text) { Space = SpaceProcessingModeValues.Preserve });

            var insRun = new InsertedRun
            {
                Author = "GPT-4 Correction",
                Date = DateTime.UtcNow
            };
            insRun.Append(runElement);
            return insRun;
        }

        /// <summary>
        /// Inserts a full new paragraph as an insertion.
        /// </summary>
        private void InsertFullParagraphAsIns(Paragraph para, string paragraphText)
        {
            var run = new Run(new Text(paragraphText) { Space = SpaceProcessingModeValues.Preserve });
            var ins = new InsertedRun
            {
                Author = "GPT-4 Correction",
                Date = DateTime.UtcNow
            };
            ins.Append(run);
            para.AppendChild(ins);
        }

        /// <summary>
        /// Marks an entire paragraph as deleted.
        /// </summary>
        private void MarkParagraphAsDeleted(Paragraph paragraph)
        {
            // For each run in the paragraph, wrap its text in <w:del>
            var runs = paragraph.Elements<Run>().ToList();
            foreach (var run in runs)
            {
                string originalText = string.Concat(run.Elements<Text>().Select(t => t.Text));
                run.RemoveAllChildren<Text>();
                var delText = new DeletedText(originalText) { Space = SpaceProcessingModeValues.Preserve };
                run.AppendChild(delText);

                var delRun = new DeletedRun
                {
                    Author = "GPT-4 Correction",
                    Date = DateTime.UtcNow
                };
                run.Parent.InsertAfter(delRun, run);
                delRun.Append(run);
                run.Remove();
            }
        }

        /// <summary>
        /// Concatenates and returns the full text of a paragraph (from all its runs).
        /// </summary>
        private string GetFullParagraphText(Paragraph p)
        {
            return string.Concat(
                p.Elements<Run>()
                 .SelectMany(r => r.Elements<Text>())
                 .Select(t => t.Text)
            );
        }

        // ----------------------------------------------------------------
        // Additional methods for merging headers, footers, styles, etc.
        // (These are carried over from your previous code.)
        // ----------------------------------------------------------------

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
