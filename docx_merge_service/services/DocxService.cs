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
 * - The current implementation uses a simple line-based merge strategy in MergeDocument.
 * - Future enhancements may include more sophisticated merging and error handling.
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
        /// It replaces existing paragraph content with the corrected text while preserving the basic formatting.
        /// If the corrected text has more paragraphs than the original document, extra paragraphs are appended.
        /// </summary>
        /// <param name="originalStream">The MemoryStream containing the original DOCX file.</param>
        /// <param name="correctedText">The corrected text to merge into the document.</param>
        /// <returns>A new MemoryStream containing the merged DOCX file.</returns>
        /// <exception cref="Exception">Throws an exception if the DOCX structure is invalid.</exception>
        public MemoryStream MergeDocument(MemoryStream originalStream, string correctedText)
        {
            if (originalStream == null)
                throw new ArgumentNullException(nameof(originalStream), "Original document stream cannot be null.");
            if (correctedText == null)
                throw new ArgumentNullException(nameof(correctedText), "Corrected text cannot be null.");

            // Reset the stream position to ensure proper reading
            originalStream.Position = 0;
            using (var wordDoc = OpenDocument(originalStream))
            {
                // Retrieve the document body
                var body = wordDoc.MainDocumentPart?.Document?.Body;
                if (body == null)
                {
                    throw new Exception("Invalid DOCX structure: Missing document body.");
                }

                // Split the corrected text into paragraphs based on newline characters.
                var correctedParagraphs = correctedText.Split(new[] { "\r\n", "\n", "\r" }, StringSplitOptions.None);
                var originalParagraphs = body.Elements<Paragraph>().ToList();

                // Determine the number of paragraphs to update (minimum of both counts)
                int minCount = Math.Min(originalParagraphs.Count, correctedParagraphs.Length);

                // Update existing paragraphs with corrected text.
                for (int i = 0; i < minCount; i++)
                {
                    // Remove all existing runs in the paragraph to replace the text.
                    originalParagraphs[i].RemoveAllChildren<Run>();

                    // Create a new run with the corrected paragraph text.
                    Run newRun = new Run(new Text(correctedParagraphs[i])
                    {
                        // Ensure spaces are preserved
                        Space = new EnumValue<SpaceProcessingModeValues>(SpaceProcessingModeValues.Preserve)
                    });

                    // Append the new run to the paragraph.
                    originalParagraphs[i].Append(newRun);
                }

                // If the corrected text contains more paragraphs, append them.
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
