using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using DiffMatchPatch; // From the "DiffMatchPatch" NuGet package
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
        /// Merges the corrected text into the original DOCX, preserving formatting
        /// and creating real track changes (insertions/deletions).
        /// 
        /// Steps:
        /// 1) Enable track revisions in document settings.
        /// 2) For each paragraph in the document, do a diff with the corresponding corrected paragraph text.
        /// 3) Edit runs in place: 
        ///    - Mark new text as <w:ins>.
        ///    - Mark removed text as <w:del>.
        ///    - Keep unchanged text as normal runs with original RunProperties.
        /// 4) If corrected text has more paragraphs than the original, append them as inserted paragraphs.
        ///    If original has more than corrected, mark them as deleted paragraphs.
        /// 
        /// Returns a MemoryStream of the final merged docx with track changes.
        /// </summary>
        public MemoryStream MergeDocument(MemoryStream originalStream, string correctedText)
        {
            try
            {
                if (originalStream == null)
                    throw new ArgumentNullException(nameof(originalStream), "Original document stream cannot be null.");
                if (correctedText == null)
                    throw new ArgumentNullException(nameof(correctedText), "Corrected text cannot be null.");

                _logger.LogInformation("Starting DOCX merge process with track changes (in-place).");
                originalStream.Position = 0;

                using (var wordDoc = LoadDocument(originalStream))
                {
                    // 1) Enable track revisions at the document level
                    EnableTrackRevisions(wordDoc);

                    var body = wordDoc.MainDocumentPart?.Document?.Body;
                    if (body == null)
                        throw new Exception("Invalid DOCX structure: Missing document body.");

                    // Split corrected text into paragraphs by newline
                    var correctedParagraphs = correctedText.Split(
                        new[] { "\r\n", "\n" }, StringSplitOptions.None
                    );
                    var originalParagraphs = body.Elements<Paragraph>().ToList();

                    int commonCount = Math.Min(originalParagraphs.Count, correctedParagraphs.Length);

                    // 2) For each paragraph in the overlapping range, update in place
                    for (int i = 0; i < commonCount; i++)
                    {
                        var origPara = originalParagraphs[i];
                        var correctedParaText = correctedParagraphs[i];
                        UpdateParagraphWithTrackChanges(origPara, correctedParaText);
                    }

                    // 3) If corrected has more paragraphs, insert them as new paragraphs
                    for (int i = commonCount; i < correctedParagraphs.Length; i++)
                    {
                        var newPara = new Paragraph();
                        InsertFullParagraphAsIns(newPara, correctedParagraphs[i]);
                        body.AppendChild(newPara);
                    }

                    // 4) If original has more paragraphs, mark them as deleted
                    for (int i = commonCount; i < originalParagraphs.Count; i++)
                    {
                        MarkParagraphAsDeleted(originalParagraphs[i]);
                    }

                    wordDoc.MainDocumentPart.Document.Save();
                }

                // Return final doc as MemoryStream
                MemoryStream mergedStream = new MemoryStream(originalStream.ToArray());
                mergedStream.Position = 0;

                _logger.LogInformation("DOCX merge with track changes completed successfully.");
                return mergedStream;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred during DOCX merge with track changes.");
                throw;
            }
        }

        /// <summary>
        /// Enables Word's track revisions so that <w:ins> and <w:del> show up as tracked changes.
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

            // <w:trackRevisions w:val="true" />
            var trackRevisions = new TrackRevisions { Val = OnOffValue.FromBoolean(true) };
            settingsPart.Settings.AppendChild(trackRevisions);
            settingsPart.Settings.Save();
        }

        /// <summary>
        /// Updates a single paragraph in place using track changes:
        /// - Uses diff-match-patch to compare original paragraph text vs. corrected text.
        /// - Replaces the paragraph's runs with new runs that preserve formatting but mark inserted/deleted text.
        /// </summary>
        private void UpdateParagraphWithTrackChanges(Paragraph paragraph, string correctedParaText)
        {
            // 1) Flatten original runs => single string
            var runList = paragraph.Elements<Run>().ToList();
            string originalText = string.Concat(runList.Select(r => string.Concat(r.Elements<Text>().Select(t => t.Text))));

            // 2) Diff with corrected text
            var dmp = new diff_match_patch();
            var diffs = dmp.diff_main(originalText, correctedParaText, false);
            // Optional: dmp.diff_cleanupSemantic(diffs);

            // 3) Flatten the original runs into (text, runProps) for more granular sub-run manipulation
            var flattenedRuns = FlattenRuns(runList);

            // We'll build a brand new set of child elements for the paragraph
            List<OpenXmlElement> newChildren = new List<OpenXmlElement>();

            int runIndex = 0;
            int runLocalPos = 0;

            // 4) Walk through each diff chunk
            foreach (var diff in diffs)
            {
                var op = diff.operation;
                var chunkText = diff.text;

                if (op == Operation.EQUAL)
                {
                    // No change => normal runs with original formatting
                    newChildren.AddRange(
                        RebuildRuns(flattenedRuns, chunkText, isDeleted: false, isInserted: false,
                                    ref runIndex, ref runLocalPos)
                    );
                }
                else if (op == Operation.DELETE)
                {
                    // Mark as deleted
                    newChildren.AddRange(
                        RebuildRuns(flattenedRuns, chunkText, isDeleted: true, isInserted: false,
                                    ref runIndex, ref runLocalPos)
                    );
                }
                else if (op == Operation.INSERT)
                {
                    // Inserted text => new runs
                    newChildren.AddRange(
                        BuildInsertedRuns(chunkText)
                    );
                }
            }

            // 5) Clear out the old runs and replace with newChildren
            paragraph.RemoveAllChildren<Run>();
            paragraph.RemoveAllChildren<BookmarkStart>(); // (optional) remove old bookmarks if needed
            paragraph.RemoveAllChildren<BookmarkEnd>();   // (optional)
            // Then re-append
            foreach (var child in newChildren)
            {
                paragraph.AppendChild(child);
            }
        }

        /// <summary>
        /// Converts a list of runs into a list of (text, runProperties).
        /// This is used to match portions of text with their original formatting.
        /// </summary>
        private List<(string text, RunProperties? props)> FlattenRuns(List<Run> runs)
        {
            var result = new List<(string text, RunProperties? props)>();
            foreach (var run in runs)
            {
                var runProps = run.RunProperties?.CloneNode(true) as RunProperties;
                string runText = string.Concat(run.Elements<Text>().Select(t => t.Text));
                if (!string.IsNullOrEmpty(runText))
                {
                    result.Add((runText, runProps));
                }
            }
            return result;
        }

        /// <summary>
        /// Rebuilds runs (normal or deleted) from the portion of text that matches
        /// the flattened original runs' formatting. 
        /// 
        /// - If isDeleted=true, wraps them in <w:del> with DeletedText.
        /// - If isInserted=true, we skip here and handle in a separate method (BuildInsertedRuns).
        /// </summary>
        private List<OpenXmlElement> RebuildRuns(
            List<(string text, RunProperties? props)> flattenedRuns,
            string chunkText,
            bool isDeleted,
            bool isInserted, // not used here, but left for clarity
            ref int runIndex,
            ref int runLocalPos)
        {
            var output = new List<OpenXmlElement>();
            int needed = chunkText.Length;
            int consumed = 0;

            while (needed > 0 && runIndex < flattenedRuns.Count)
            {
                var (origText, origProps) = flattenedRuns[runIndex];
                int remainingInRun = origText.Length - runLocalPos;
                if (remainingInRun <= 0)
                {
                    runIndex++;
                    runLocalPos = 0;
                    continue;
                }

                int takeLen = Math.Min(remainingInRun, needed);
                string subText = origText.Substring(runLocalPos, takeLen);

                // Build the run with subText
                var runElement = new Run();
                if (origProps != null)
                {
                    runElement.RunProperties = (RunProperties)origProps.CloneNode(true);
                }

                if (isDeleted)
                {
                    // For deleted text, use <w:delText> inside <w:del>
                    var delText = new DeletedText(subText) { Space = SpaceProcessingModeValues.Preserve };
                    runElement.Append(delText);

                    // Wrap in <w:del> to represent a revision
                    var delRun = new DeletedRun
                    {
                        Author = "GPT-4 Correction",
                        Date = DateTime.UtcNow
                    };
                    delRun.Append(runElement);
                    output.Add(delRun);
                }
                else
                {
                    // Normal text
                    runElement.Append(new Text(subText) { Space = SpaceProcessingModeValues.Preserve });
                    output.Add(runElement);
                }

                consumed += takeLen;
                needed -= takeLen;
                runLocalPos += takeLen;

                // If we've consumed the entire run text, move to the next
                if (runLocalPos >= origText.Length)
                {
                    runIndex++;
                    runLocalPos = 0;
                }
            }

            // If there's leftover text but no more runs, we can create runs with no props or ignore
            if (needed > 0 && runIndex >= flattenedRuns.Count)
            {
                // We'll just create a new run with default properties
                string leftover = chunkText.Substring(consumed, needed);
                if (isDeleted)
                {
                    var runElement = new Run(new DeletedText(leftover) { Space = SpaceProcessingModeValues.Preserve });
                    var delRun = new DeletedRun
                    {
                        Author = "GPT-4 Correction",
                        Date = DateTime.UtcNow
                    };
                    delRun.Append(runElement);
                    output.Add(delRun);
                }
                else
                {
                    var runElement = new Run(new Text(leftover) { Space = SpaceProcessingModeValues.Preserve });
                    output.Add(runElement);
                }
            }

            return output;
        }

        /// <summary>
        /// Builds runs for inserted text. 
        /// Wraps them in <w:ins> elements to mark as an insertion.
        /// By default, uses no run properties or you can define a default set.
        /// </summary>
        private List<OpenXmlElement> BuildInsertedRuns(string insertedText)
        {
            var result = new List<OpenXmlElement>();

            // You could split insertedText into lines or keep it as is
            var runElement = new Run(new Text(insertedText) { Space = SpaceProcessingModeValues.Preserve });

            var insRun = new InsertedRun
            {
                Author = "GPT-4 Correction",
                Date = DateTime.UtcNow
            };
            insRun.Append(runElement);

            result.Add(insRun);
            return result;
        }

        /// <summary>
        /// Inserts a brand-new paragraph as a full insertion.
        /// This is used when the corrected text has more paragraphs than the original.
        /// </summary>
        private void InsertFullParagraphAsIns(Paragraph para, string paragraphText)
        {
            // Create a single inserted run for the entire paragraph
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
        /// Marks an entire paragraph as deleted. This is used when the original doc has more paragraphs
        /// than the corrected text, so we treat them as removed.
        /// </summary>
        private void MarkParagraphAsDeleted(Paragraph paragraph)
        {
            // Option A: wrap all runs in <w:del>
            // Option B: Replace the entire paragraph with a single run that says "[Paragraph deleted]"
            // For demonstration, we wrap each run in <w:del>.

            var runs = paragraph.Elements<Run>().ToList();
            foreach (var run in runs)
            {
                // Move run's text to <w:delText>
                var originalText = string.Concat(run.Elements<Text>().Select(t => t.Text));

                run.RemoveAllChildren<Text>();
                var delText = new DeletedText(originalText) { Space = SpaceProcessingModeValues.Preserve };
                run.AppendChild(delText);

                // Wrap the run in <w:del>
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

        // --------------------------------------------------------------------
        // The following methods are the same from your original code
        // for merging headers, footers, styles, etc.
        // --------------------------------------------------------------------

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
