using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using DiffMatchPatch; // NuGet package: "DiffMatchPatch"
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
        /// Loads a WordprocessingDocument from a Stream (read/write).
        /// </summary>
        public WordprocessingDocument LoadDocument(Stream stream)
        {
            if (stream == null)
                throw new ArgumentNullException(nameof(stream), "Input stream cannot be null.");
            _logger.LogInformation("Loading DOCX document from stream.");
            return WordprocessingDocument.Open(stream, true);
        }

        /// <summary>
        /// Merges the corrected text into the original DOCX, preserving run-level formatting and skipping paragraphs
        /// that are unchanged. Also enables Word's track revisions so that <w:ins> and <w:del> appear as real changes.
        /// 
        /// Steps:
        /// 1) Enable track revisions.
        /// 2) Split the corrected text into paragraphs.
        /// 3) For each paragraph up to the minimum count:
        ///    - Compare the entire original paragraph text (trimmed) to the corrected paragraph text (trimmed).
        ///    - If identical, do nothing (skip changes).
        ///    - If different, run the "run-by-run" approach to apply insert/delete on partial changes only.
        /// 4) If corrected has more paragraphs, insert them as new paragraphs.
        /// 5) If original has more paragraphs, mark them as deleted.
        /// 
        /// Returns a MemoryStream with the final .docx containing track changes.
        /// </summary>
        public MemoryStream MergeDocument(MemoryStream originalStream, string correctedText)
        {
            try
            {
                if (originalStream == null)
                    throw new ArgumentNullException(nameof(originalStream), "Original document stream cannot be null.");
                if (correctedText == null)
                    throw new ArgumentNullException(nameof(correctedText), "Corrected text cannot be null.");

                _logger.LogInformation("Starting DOCX merge with run-by-run track changes (with paragraph skip).");
                originalStream.Position = 0;

                using (var wordDoc = LoadDocument(originalStream))
                {
                    // 1) Enable track revisions
                    EnableTrackRevisions(wordDoc);

                    var body = wordDoc.MainDocumentPart?.Document?.Body;
                    if (body == null)
                        throw new Exception("Invalid DOCX structure: Missing document body.");

                    // 2) Split corrected text into paragraphs
                    var correctedParagraphs = correctedText.Split(new[] { "\r\n", "\n" }, StringSplitOptions.None);
                    var originalParagraphs = body.Elements<Paragraph>().ToList();

                    int commonCount = Math.Min(originalParagraphs.Count, correctedParagraphs.Length);

                    // 3) Process each paragraph in the overlapping range
                    for (int i = 0; i < commonCount; i++)
                    {
                        var origPara = originalParagraphs[i];
                        var correctedPara = correctedParagraphs[i];

                        // Gather full text of the original paragraph and trim both
                        string originalParaText = GetFullParagraphText(origPara).Trim();
                        correctedPara = correctedPara.Trim();

                        // If identical, skip changes entirely
                        if (originalParaText == correctedPara)
                        {
                            // Do nothing => paragraph remains as is, no track changes
                        }
                        else
                        {
                            // The run-by-run approach for partial changes
                            UpdateParagraphRunByRun(origPara, correctedPara);
                        }
                    }

                    // If corrected has more paragraphs, insert them as new
                    for (int i = commonCount; i < correctedParagraphs.Length; i++)
                    {
                        var newPara = new Paragraph();
                        InsertFullParagraphAsIns(newPara, correctedParagraphs[i]);
                        body.AppendChild(newPara);
                    }

                    // If original has more paragraphs, mark them as deleted
                    for (int i = commonCount; i < originalParagraphs.Count; i++)
                    {
                        MarkParagraphAsDeleted(originalParagraphs[i]);
                    }

                    wordDoc.MainDocumentPart.Document.Save();
                }

                // Return final doc
                var mergedStream = new MemoryStream(originalStream.ToArray());
                mergedStream.Position = 0;

                _logger.LogInformation("DOCX merge with run-by-run track changes and paragraph skip completed successfully.");
                return mergedStream;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during run-by-run DOCX merge (with paragraph skip).");
                throw;
            }
        }

        /// <summary>
        /// Enables Word's "track revisions" so that <w:ins> and <w:del> appear as real track changes.
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

            // <w:trackRevisions w:val="true"/>
            var trackRevisions = new TrackRevisions { Val = OnOffValue.FromBoolean(true) };
            settingsPart.Settings.AppendChild(trackRevisions);
            settingsPart.Settings.Save();
        }

        /// <summary>
        /// Edits a single paragraph in place, run by run. For each original run, we diff with the
        /// "remaining" corrected text, then build <w:ins> / <w:del> for changed text only.
        /// 
        /// We also call diff_cleanupSemantic to reduce spurious small insert/delete pairs.
        /// </summary>
        private void UpdateParagraphRunByRun(Paragraph paragraph, string correctedParaText)
        {
            // Gather all runs in the paragraph
            var originalRuns = paragraph.Elements<Run>().ToList();

            // We'll create a new list of child elements that represent the updated content
            var newChildren = new List<OpenXmlElement>();

            // "Cursor" into the correctedParaText
            int correctedIndex = 0;
            int correctedLength = correctedParaText.Length;

            // For each original run, see how it changed
            foreach (var run in originalRuns)
            {
                string runText = string.Concat(run.Elements<Text>().Select(t => t.Text));
                var runProps = run.RunProperties?.CloneNode(true) as RunProperties;

                // If there's no text in the run, just copy it over
                if (string.IsNullOrEmpty(runText))
                {
                    newChildren.Add(run.CloneNode(true));
                    continue;
                }

                // Diff this run's text vs. the remainder of the corrected text
                var dmp = new diff_match_patch();
                string correctedRemainder = correctedParaText.Substring(correctedIndex);
                var diffs = dmp.diff_main(runText, correctedRemainder, false);

                // Clean up small trivial diffs
                dmp.diff_cleanupSemantic(diffs);

                int localCorrectedUsed = 0;

                foreach (var diff in diffs)
                {
                    var op = diff.operation;
                    var text = diff.text;

                    if (op == Operation.EQUAL)
                    {
                        // unchanged => same run properties, no <w:ins>/<w:del>
                        var runElement = new Run();
                        if (runProps != null)
                            runElement.RunProperties = (RunProperties)runProps.CloneNode(true);

                        runElement.AppendChild(new Text(text) { Space = SpaceProcessingModeValues.Preserve });
                        newChildren.Add(runElement);

                        // We consumed "text.Length" from the corrected side
                        localCorrectedUsed += text.Length;
                    }
                    else if (op == Operation.DELETE)
                    {
                        // This text was removed => <w:del>
                        var delRun = BuildDeletedRun(text, runProps);
                        newChildren.Add(delRun);
                        // No consumption from corrected text
                    }
                    else if (op == Operation.INSERT)
                    {
                        // This text was inserted => <w:ins>
                        var insRun = BuildInsertedRun(text, runProps);
                        newChildren.Add(insRun);

                        localCorrectedUsed += text.Length;
                    }
                }

                // After finishing diffs for this run, move correctedIndex forward
                correctedIndex += localCorrectedUsed;
                if (correctedIndex > correctedLength)
                    correctedIndex = correctedLength;
            }

            // If there's leftover corrected text => <w:ins>
            if (correctedIndex < correctedLength)
            {
                string leftover = correctedParaText.Substring(correctedIndex);
                var insRun = BuildInsertedRun(leftover, null);
                newChildren.Add(insRun);
                correctedIndex = correctedLength;
            }

            // Replace old runs with newChildren
            paragraph.RemoveAllChildren<Run>();
            paragraph.RemoveAllChildren<BookmarkStart>();
            paragraph.RemoveAllChildren<BookmarkEnd>();

            foreach (var child in newChildren)
            {
                paragraph.AppendChild(child);
            }
        }

        /// <summary>
        /// Creates a run that is marked as deleted text (<w:del> with <w:delText>).
        /// Preserves the original run properties if provided.
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
        /// Creates a run that is marked as inserted text (<w:ins> with normal <w:t>).
        /// Preserves the original run properties if you wish (or pass null for no props).
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
        /// Inserts a brand-new paragraph as a full insertion.
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
        /// Marks an entire paragraph as deleted, used when the original doc has
        /// more paragraphs than the corrected text.
        /// </summary>
        private void MarkParagraphAsDeleted(Paragraph paragraph)
        {
            // Wrap each run in <w:del>
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
        /// Concatenates all text from the runs in a paragraph into a single string.
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
        // (Same as in your previous code; included here for completeness.)
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
