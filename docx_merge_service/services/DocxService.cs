/**
 * @file docx_merge_service/Services/DocxService.cs
 * @description
 * This service encapsulates DOCX operations using the Open XML SDK.
 * In this updated version, the MergeDocument method now uses a two-step process:
 * 1. It generates a "corrected" DOCX from the original DOCX while preserving its formatting,
 *    using the new GenerateCorrectedDocx helper method.
 * 2. It calls DocxComparerService.CompareDocuments to produce a merged DOCX that shows track changes.
 *
 * Key features:
 * - Loads a DOCX document from a stream.
 * - Generates a corrected DOCX by replacing paragraph texts while preserving formatting.
 * - Uses DocxComparerService to compare the original and corrected DOCX documents.
 * - Also includes legacy methods for merging headers, footers, and styles.
 *
 * @dependencies
 * - DocumentFormat.OpenXml for DOCX manipulation.
 * - DiffMatchPatch (legacy, not used in new merge) – kept for historical context.
 * - OpenXmlPowerTools (via DocxComparerService) for DOCX comparison.
 *
 * @notes
 * - The new merge process preserves paragraph formatting by reusing original paragraph properties.
 * - If there are more corrected paragraphs than in the original, new paragraphs are appended.
 */

using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using DiffMatchPatch; // Legacy dependency, kept for reference.
using Microsoft.Extensions.Logging;
using DocxMergeService.Services; // For DocxComparerService

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
        /// <param name="stream">The input stream containing the DOCX file.</param>
        /// <returns>A WordprocessingDocument object for manipulation.</returns>
        public WordprocessingDocument LoadDocument(Stream stream)
        {
            if (stream == null)
                throw new ArgumentNullException(nameof(stream), "Input stream cannot be null.");
            _logger.LogInformation("Loading DOCX document from stream.");
            return WordprocessingDocument.Open(stream, true);
        }

        /// <summary>
        /// Merges the corrected text into the original DOCX file.
        /// Instead of manually diffing runs, this method creates a corrected DOCX that preserves
        /// the original document's formatting and then uses WmlComparer to generate a merged DOCX
        /// with tracked changes.
        /// </summary>
        /// <param name="originalStream">The MemoryStream of the original DOCX file.</param>
        /// <param name="correctedText">The plain corrected text.</param>
        /// <returns>A MemoryStream containing the merged DOCX file with track changes.</returns>
        public MemoryStream MergeDocument(MemoryStream originalStream, string correctedText)
        {
            try
            {
                if (originalStream == null)
                    throw new ArgumentNullException(nameof(originalStream), "Original document stream cannot be null.");
                if (correctedText == null)
                    throw new ArgumentNullException(nameof(correctedText), "Corrected text cannot be null.");

                _logger.LogInformation("Starting DOCX merge using WmlComparer.");

                // Create a copy of the original stream for comparison.
                MemoryStream originalCopy = new MemoryStream(originalStream.ToArray());
                originalCopy.Position = 0;

                // Generate a corrected DOCX using the original document's structure.
                MemoryStream correctedDocx = GenerateCorrectedDocx(new MemoryStream(originalStream.ToArray()), correctedText);
                correctedDocx.Position = 0;

                // Use the DocxComparerService to compare the original and corrected documents.
                MemoryStream mergedStream = DocxComparerService.CompareDocuments(originalCopy, correctedDocx);
                mergedStream.Position = 0;

                _logger.LogInformation("DOCX merge completed successfully using WmlComparer.");
                return mergedStream;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during DOCX merge.");
                throw;
            }
        }

        /// <summary>
        /// Generates a corrected DOCX file based on the original document structure by replacing the text in each paragraph.
        /// The method splits the correctedText by newlines and updates the corresponding paragraphs in the original document.
        /// If there are more corrected paragraphs than the original, new paragraphs are appended.
        /// </summary>
        /// <param name="originalStream">A MemoryStream containing the original DOCX file.</param>
        /// <param name="correctedText">The corrected plain text to apply.</param>
        /// <returns>A MemoryStream containing the newly generated corrected DOCX.</returns>
        public MemoryStream GenerateCorrectedDocx(MemoryStream originalStream, string correctedText)
        {
            if (originalStream == null)
                throw new ArgumentNullException(nameof(originalStream), "Original document stream cannot be null.");
            if (correctedText == null)
                throw new ArgumentNullException(nameof(correctedText), "Corrected text cannot be null.");

            // Open the original DOCX document in editable mode.
            using (WordprocessingDocument wordDoc = WordprocessingDocument.Open(originalStream, true))
            {
                var body = wordDoc.MainDocumentPart.Document.Body;
                // Split the corrected text into paragraphs.
                string[] correctedParagraphs = correctedText.Split(new string[] { "\r\n", "\n" }, StringSplitOptions.None);
                var originalParagraphs = body.Elements<Paragraph>().ToList();
                int commonCount = Math.Min(originalParagraphs.Count, correctedParagraphs.Length);

                // Update existing paragraphs with the corrected text while preserving paragraph properties.
                for (int i = 0; i < commonCount; i++)
                {
                    Paragraph para = originalParagraphs[i];
                    // Remove all text from all runs within the paragraph.
                    foreach (var run in para.Elements<Run>())
                    {
                        run.RemoveAllChildren<Text>();
                    }
                    // Create a new run with the corrected paragraph text.
                    Run newRun = new Run(new Text(correctedParagraphs[i]) { Space = SpaceProcessingModeValues.Preserve });
                    para.AppendChild(newRun);
                }
                // Append any extra corrected paragraphs if they exist.
                for (int i = commonCount; i < correctedParagraphs.Length; i++)
                {
                    Paragraph newPara = new Paragraph(new Run(new Text(correctedParagraphs[i]) { Space = SpaceProcessingModeValues.Preserve }));
                    body.AppendChild(newPara);
                }
                // Save changes to the document.
                wordDoc.MainDocumentPart.Document.Save();
            }
            // Return a new MemoryStream based on the updated originalStream.
            return new MemoryStream(originalStream.ToArray());
        }

        // Legacy methods for track changes using run-by-run diff are kept for reference.
        // ---------------------------------------------------------------
        // Original methods: EnableTrackRevisions, UpdateParagraphRunByRun, BuildDeletedRun,
        // BuildInsertedRun, InsertFullParagraphAsIns, MarkParagraphAsDeleted, GetFullParagraphText.
        // These are not used in the new merge implementation.
        // ---------------------------------------------------------------

        public void EnableTrackRevisions(WordprocessingDocument doc)
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
