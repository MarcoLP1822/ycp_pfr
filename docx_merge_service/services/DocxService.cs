/**
 * @file docx_merge_service/Services/DocxService.cs
 * @description
 * This service class encapsulates operations on DOCX files using the Open XML SDK.
 * It provides methods to load a DOCX document from a stream, merge corrected text into the DOCX,
 * extract various document parts (body, headers, footers, styles), merge headers and footers,
 * and merge style definitions from multiple source documents into a target document.
 *
 * Key features:
 * - LoadDocument(Stream stream): Loads a DOCX file in read/write mode.
 * - MergeDocument(MemoryStream originalStream, string correctedText): Merges corrected text into the DOCX.
 *   Instead of simply replacing text, it uses a character-level diff to wrap inserted text in a revision element
 *   (representing an insertion: w:ins) and deleted text in a revision element (representing a deletion: w:del with a 
 *   w:delText child) so that Word's Track Changes functionality is enabled.
 * - ExtractBody(WordprocessingDocument doc): Extracts the document body.
 * - ExtractHeaders(WordprocessingDocument doc): Extracts header parts.
 * - ExtractFooters(WordprocessingDocument doc): Extracts footer parts.
 * - ExtractStyles(WordprocessingDocument doc): Extracts style definitions.
 * - MergeHeaders(WordprocessingDocument sourceDoc, WordprocessingDocument targetDoc): Merges header parts.
 * - MergeFooters(WordprocessingDocument sourceDoc, WordprocessingDocument targetDoc): Merges footer parts.
 * - MergeStyles(WordprocessingDocument targetDoc, List<WordprocessingDocument> sourceDocs): Merges style definitions
 *   from multiple source documents into the target document, renaming conflicting styles.
 *
 * @dependencies
 * - DocumentFormat.OpenXml.Packaging: For opening and saving DOCX files.
 * - DocumentFormat.OpenXml.Wordprocessing: For accessing and manipulating document elements.
 * - Microsoft.Extensions.Logging: For logging errors and informational messages.
 * - DiffMatchPatch: For character-level diffing to determine track changes.
 *
 * @notes
 * - The merging strategy uses a diff on a flattened representation (character + formatting) of each paragraph.
 *   For each diff segment, text unchanged is output normally, inserted text is wrapped in a revision element,
 *   and deleted text is wrapped in a revision element containing a DeletedText element.
 * - Revision attributes (Author and Date) are set on these custom elements.
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

        /// <summary>
        /// Constructs a new instance of DocxService with the specified logger.
        /// </summary>
        /// <param name="logger">The logger used for logging informational messages and errors.</param>
        public DocxService(ILogger<DocxService> logger)
        {
            _logger = logger;
        }

        /// <summary>
        /// Loads a DOCX document from the provided stream in read/write mode.
        /// </summary>
        /// <param name="stream">The stream containing the DOCX file.</param>
        /// <returns>A WordprocessingDocument instance.</returns>
        /// <exception cref="ArgumentNullException">Thrown if the stream is null.</exception>
        public WordprocessingDocument LoadDocument(Stream stream)
        {
            if (stream == null)
                throw new ArgumentNullException(nameof(stream), "Input stream cannot be null.");
            _logger.LogInformation("Loading DOCX document from stream.");
            return WordprocessingDocument.Open(stream, true);
        }

        /// <summary>
        /// Merges the corrected text into the DOCX document by generating a new version that
        /// uses Word's Track Changes functionality. It computes a character-level diff between the
        /// original and corrected text for each paragraph, wrapping inserted text in a revision element
        /// (w:ins) and deleted text in a revision element (w:del with a w:delText child).
        /// </summary>
        /// <param name="originalStream">The MemoryStream containing the original DOCX file.</param>
        /// <param name="correctedText">The corrected text to merge into the document.</param>
        /// <returns>A new MemoryStream containing the merged DOCX file with track changes.</returns>
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

                    // Split corrected text into paragraphs.
                    var correctedParagraphs = correctedText.Split(new[] { "\r\n", "\n", "\r" }, StringSplitOptions.None);
                    var originalParagraphs = body.Elements<Paragraph>().ToList();
                    int minCount = Math.Min(originalParagraphs.Count, correctedParagraphs.Length);

                    // Process paragraphs in common using track changes.
                    for (int i = 0; i < minCount; i++)
                    {
                        var origPara = originalParagraphs[i];
                        var newPara = BuildTrackChangesParagraph(origPara, correctedParagraphs[i]);
                        origPara.InsertAfterSelf(newPara);
                        origPara.Remove();
                    }
                    // Append extra paragraphs from corrected text as full insertions.
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
        /// Builds a new Paragraph element by comparing the original paragraph and the corrected text.
        /// Inserts revision elements for insertions and deletions based on a character-level diff.
        /// </summary>
        /// <param name="originalParagraph">The original paragraph element.</param>
        /// <param name="correctedParaText">The corrected text for this paragraph.</param>
        /// <returns>A new Paragraph element with track changes markup.</returns>
        private Paragraph BuildTrackChangesParagraph(Paragraph originalParagraph, string correctedParaText)
        {
            var flattened = FlattenParagraph(originalParagraph);
            string originalText = new string(flattened.Select(x => x.c).ToArray());

            var dmp = new diff_match_patch();
            var diffs = dmp.diff_main(originalText, correctedParaText, false);
            dmp.diff_cleanupSemantic(diffs);

            var newParagraph = new Paragraph();
            int origIndex = 0;

            foreach (var diff in diffs)
            {
                switch (diff.operation)
                {
                    case Operation.EQUAL:
                        if (diff.text.Length > 0)
                        {
                            RunProperties? props = (origIndex < flattened.Count) ? flattened[origIndex].props : null;
                            var run = BuildRun(diff.text, props);
                            newParagraph.AppendChild(run);
                        }
                        origIndex += diff.text.Length;
                        break;
                    case Operation.INSERT:
                        RunProperties? insProps = (origIndex > 0) ? flattened[origIndex - 1].props : null;
                        var insRun = BuildRun(diff.text, insProps);
                        var inserted = CreateRevisionElement("ins", insRun, "GPT-4 Correction");
                        newParagraph.AppendChild(inserted);
                        break;
                    case Operation.DELETE:
                        RunProperties? delProps = (origIndex < flattened.Count && diff.text.Length > 0) ? flattened[origIndex].props : null;
                        var delRun = BuildDeletedRun(diff.text, delProps);
                        var deleted = CreateRevisionElement("del", delRun, "GPT-4 Correction");
                        newParagraph.AppendChild(deleted);
                        origIndex += diff.text.Length;
                        break;
                }
            }
            return newParagraph;
        }

        /// <summary>
        /// Creates a revision element as a composite element using OpenXmlUnknownElement.
        /// tagName should be "ins" for insertions or "del" for deletions.
        /// </summary>
        /// <param name="tagName">The revision tag ("ins" or "del").</param>
        /// <param name="childRun">The Run element to include as content.</param>
        /// <param name="author">The revision author.</param>
        /// <returns>An OpenXmlElement representing the revision.</returns>
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
        /// Flattens a paragraph into a list of (char, RunProperties?) pairs,
        /// representing each character and its associated formatting.
        /// </summary>
        /// <param name="paragraph">The Paragraph to flatten.</param>
        /// <returns>A list of (char, RunProperties?) pairs.</returns>
        private List<(char c, RunProperties? props)> FlattenParagraph(Paragraph paragraph)
        {
            var result = new List<(char c, RunProperties? props)>();
            foreach (var run in paragraph.Elements<Run>())
            {
                var runProps = run.RunProperties?.CloneNode(true) as RunProperties;
                string runText = string.Concat(run.Elements<Text>().Select(t => t.Text));
                foreach (char ch in runText)
                {
                    result.Add((ch, runProps));
                }
            }
            return result;
        }

        /// <summary>
        /// Creates a Run element with the given text and optional RunProperties.
        /// </summary>
        /// <param name="text">The text content.</param>
        /// <param name="props">The RunProperties to apply (can be null).</param>
        /// <returns>A new Run element.</returns>
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
        /// Creates a Run element for a deletion using a DeletedText element.
        /// </summary>
        /// <param name="text">The text content to mark as deleted.</param>
        /// <param name="props">The RunProperties to apply (can be null).</param>
        /// <returns>A new Run element containing a DeletedText child.</returns>
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

        /// <summary>
        /// Merges the header parts from the source document into the target document.
        /// This method copies the first header from the source document, creates a new header part in the target,
        /// and updates the target document's section properties to reference the new header.
        /// </summary>
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

        /// <summary>
        /// Merges the footer parts from the source document into the target document.
        /// This method copies the first footer from the source document, creates a new footer part in the target,
        /// and updates the target document's section properties to reference the new footer.
        /// </summary>
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

        /// <summary>
        /// Extracts the main document body from the given WordprocessingDocument.
        /// </summary>
        public Body ExtractBody(WordprocessingDocument doc)
        {
            var body = doc.MainDocumentPart?.Document?.Body;
            if (body == null)
                throw new Exception("The DOCX document does not contain a valid body.");
            return body;
        }

        /// <summary>
        /// Extracts all header parts from the given WordprocessingDocument.
        /// </summary>
        public List<HeaderPart> ExtractHeaders(WordprocessingDocument doc)
        {
            var headers = doc.MainDocumentPart?.HeaderParts;
            return headers != null ? headers.ToList() : new List<HeaderPart>();
        }

        /// <summary>
        /// Extracts all footer parts from the given WordprocessingDocument.
        /// </summary>
        public List<FooterPart> ExtractFooters(WordprocessingDocument doc)
        {
            var footers = doc.MainDocumentPart?.FooterParts;
            return footers != null ? footers.ToList() : new List<FooterPart>();
        }

        /// <summary>
        /// Extracts the styles from the given WordprocessingDocument.
        /// </summary>
        public Styles ExtractStyles(WordprocessingDocument doc)
        {
            var stylesPart = doc.MainDocumentPart?.StyleDefinitionsPart;
            if (stylesPart == null)
                return null;
            return stylesPart.Styles;
        }

        /// <summary>
        /// Merges the style definitions from multiple source documents into the target document.
        /// If a style conflict is detected, the source style is renamed with "_merged".
        /// </summary>
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
