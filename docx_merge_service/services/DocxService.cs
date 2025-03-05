/**
 * @file docx_merge_service/Services/DocxService.cs
 * @description
 * This service class encapsulates operations on DOCX files using the Open XML SDK.
 * It provides methods to open a DOCX document from a stream, merge corrected text into the document,
 * and extract various document parts such as the body, headers, footers, and styles.
 *
 * Key features:
 * - OpenDocument(Stream stream): Opens a DOCX document in read/write mode.
 * - MergeDocument(MemoryStream originalStream, string correctedText): Merges corrected text into the DOCX.
 *   This method now updates the first run of each paragraph (to preserve formatting) and removes extra runs.
 * - ExtractBody(WordprocessingDocument doc): Extracts the main document body.
 * - ExtractHeaders(WordprocessingDocument doc): Extracts header parts from the document.
 * - ExtractFooters(WordprocessingDocument doc): Extracts footer parts from the document.
 * - ExtractStyles(WordprocessingDocument doc): Extracts the styles from the document.
 *
 * @dependencies
 * - DocumentFormat.OpenXml.Packaging: For opening and saving DOCX files.
 * - DocumentFormat.OpenXml.Wordprocessing: For accessing document elements like Body, Header, Footer, and Styles.
 *
 * @notes
 * - The merging strategy is based on splitting the corrected text into paragraphs (using newline delimiters)
 *   and updating each corresponding paragraph in the original document.
 * - If a paragraph exists in the original document, only its first run is updated (to preserve formatting)
 *   while any additional runs are removed.
 * - Extra paragraphs in the corrected text are appended as new paragraphs.
 * - This implementation assumes that a one-to-one mapping exists between the corrected text paragraphs and
 *   the original document paragraphs for the overlapping sections.
 */

using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using DocumentFormat.OpenXml;

namespace DocxMergeService.Services
{
    public class DocxService
    {
        /// <summary>
        /// Opens a DOCX document from the provided stream in read/write mode.
        /// </summary>
        /// <param name="stream">The stream containing the DOCX file.</param>
        /// <returns>A WordprocessingDocument instance.</returns>
        /// <exception cref="ArgumentNullException">Thrown if the stream is null.</exception>
        public WordprocessingDocument OpenDocument(Stream stream)
        {
            if (stream == null)
                throw new ArgumentNullException(nameof(stream), "Input stream cannot be null.");

            // Open the DOCX file in read/write mode.
            return WordprocessingDocument.Open(stream, true);
        }

        /// <summary>
        /// Merges the corrected text into the DOCX document.
        /// It updates the existing paragraphs by modifying the text in the first run of each paragraph
        /// (preserving run formatting) and removes extra runs. If the corrected text contains more paragraphs
        /// than the original, extra paragraphs are appended.
        /// </summary>
        /// <param name="originalStream">The MemoryStream containing the original DOCX file.</param>
        /// <param name="correctedText">The corrected text to merge into the document.</param>
        /// <returns>A new MemoryStream containing the merged DOCX file.</returns>
        /// <exception cref="ArgumentNullException">Thrown if originalStream or correctedText is null.</exception>
        /// <exception cref="Exception">Throws an exception if the DOCX structure is invalid.</exception>
        public MemoryStream MergeDocument(MemoryStream originalStream, string correctedText)
        {
            if (originalStream == null)
                throw new ArgumentNullException(nameof(originalStream), "Original document stream cannot be null.");
            if (correctedText == null)
                throw new ArgumentNullException(nameof(correctedText), "Corrected text cannot be null.");

            // Reset the stream position to ensure proper reading.
            originalStream.Position = 0;
            using (var wordDoc = OpenDocument(originalStream))
            {
                // Retrieve the document body.
                var body = wordDoc.MainDocumentPart?.Document?.Body;
                if (body == null)
                {
                    throw new Exception("Invalid DOCX structure: Missing document body.");
                }

                // Split the corrected text into paragraphs using newline delimiters.
                var correctedParagraphs = correctedText.Split(new[] { "\r\n", "\n", "\r" }, StringSplitOptions.None);
                var originalParagraphs = body.Elements<Paragraph>().ToList();

                // Determine the number of paragraphs to update (minimum of both counts).
                int minCount = Math.Min(originalParagraphs.Count, correctedParagraphs.Length);

                // Update existing paragraphs with corrected text.
                for (int i = 0; i < minCount; i++)
                {
                    string newParaText = correctedParagraphs[i];

                    // Get the current paragraph.
                    var para = originalParagraphs[i];

                    // Get all runs in the paragraph.
                    var runs = para.Elements<Run>().ToList();

                    if (runs.Any())
                    {
                        // Update the first run's text with the new paragraph text.
                        UpdateRunText(runs.First(), newParaText);

                        // Remove any additional runs to prevent duplicate or conflicting formatting.
                        foreach (var extraRun in runs.Skip(1).ToList())
                        {
                            extraRun.Remove();
                        }
                    }
                    else
                    {
                        // If no run exists, create a new run with the corrected text.
                        Run newRun = new Run(new Text(newParaText)
                        {
                            // Preserve spaces if needed.
                            Space = new EnumValue<SpaceProcessingModeValues>(SpaceProcessingModeValues.Preserve)
                        });
                        para.Append(newRun);
                    }
                }

                // If the corrected text contains more paragraphs than the original,
                // append new paragraphs for the extra lines.
                for (int i = minCount; i < correctedParagraphs.Length; i++)
                {
                    Paragraph extraParagraph = new Paragraph(
                        new Run(new Text(correctedParagraphs[i])
                        {
                            Space = new EnumValue<SpaceProcessingModeValues>(SpaceProcessingModeValues.Preserve)
                        })
                    );
                    body.Append(extraParagraph);
                }

                // Save the changes made to the document.
                wordDoc.MainDocumentPart.Document.Save();
            }

            // Create a new MemoryStream from the modified document.
            MemoryStream mergedStream = new MemoryStream(originalStream.ToArray());
            mergedStream.Position = 0;
            return mergedStream;
        }

        /// <summary>
        /// Updates the text of the provided Run element while preserving its formatting.
        /// This method removes any existing Text children and adds a new one with the specified text.
        /// </summary>
        /// <param name="run">The Run element to update.</param>
        /// <param name="newText">The new text to set in the run.</param>
        private void UpdateRunText(Run run, string newText)
        {
            if (run == null)
                throw new ArgumentNullException(nameof(run), "Run element cannot be null.");
            if (newText == null)
                throw new ArgumentNullException(nameof(newText), "New text cannot be null.");

            // Remove all existing Text children in the run.
            var texts = run.Elements<Text>().ToList();
            foreach (var text in texts)
            {
                text.Remove();
            }

            // Create a new Text element with the new text and preserve spacing.
            Text newTextElement = new Text(newText)
            {
                Space = new EnumValue<SpaceProcessingModeValues>(SpaceProcessingModeValues.Preserve)
            };

            // Append the new Text element to the run.
            run.Append(newTextElement);
        }

        /// <summary>
        /// Extracts the main document body from the given WordprocessingDocument.
        /// </summary>
        /// <param name="doc">The WordprocessingDocument instance.</param>
        /// <returns>The Body element of the document.</returns>
        /// <exception cref="Exception">Throws an exception if the document body is missing.</exception>
        public Body ExtractBody(WordprocessingDocument doc)
        {
            var body = doc.MainDocumentPart?.Document?.Body;
            if (body == null)
            {
                throw new Exception("The DOCX document does not contain a valid body.");
            }
            return body;
        }

        /// <summary>
        /// Extracts all header parts from the given WordprocessingDocument.
        /// </summary>
        /// <param name="doc">The WordprocessingDocument instance.</param>
        /// <returns>A list of HeaderPart objects. If none are found, returns an empty list.</returns>
        public List<HeaderPart> ExtractHeaders(WordprocessingDocument doc)
        {
            var headers = doc.MainDocumentPart?.HeaderParts;
            return headers != null ? headers.ToList() : new List<HeaderPart>();
        }

        /// <summary>
        /// Extracts all footer parts from the given WordprocessingDocument.
        /// </summary>
        /// <param name="doc">The WordprocessingDocument instance.</param>
        /// <returns>A list of FooterPart objects. If none are found, returns an empty list.</returns>
        public List<FooterPart> ExtractFooters(WordprocessingDocument doc)
        {
            var footers = doc.MainDocumentPart?.FooterParts;
            return footers != null ? footers.ToList() : new List<FooterPart>();
        }

        /// <summary>
        /// Extracts the styles from the given WordprocessingDocument.
        /// </summary>
        /// <param name="doc">The WordprocessingDocument instance.</param>
        /// <returns>The Styles object containing style definitions, or null if no styles are found.</returns>
        public Styles ExtractStyles(WordprocessingDocument doc)
        {
            var stylesPart = doc.MainDocumentPart?.StyleDefinitionsPart;
            if (stylesPart == null)
            {
                // Return null or you might choose to throw an exception based on your error handling strategy.
                return null;
            }
            return stylesPart.Styles;
        }
    }
}
