/**
 * @file docx_merge_service/Services/DocxService.cs
 * @description
 * This service class encapsulates operations on DOCX files using the Open XML SDK.
 * It provides methods to open a DOCX document from a stream and to merge corrected text
 * into the document, replacing or appending paragraphs while preserving the basic formatting.
 * 
 * Key features:
 * - OpenDocument(Stream stream): Opens a DOCX document in read/write mode.
 * - MergeDocument(MemoryStream originalStream, string correctedText): Merges corrected text into the DOCX.
 *   It replaces the text in existing paragraphs and appends new paragraphs if the corrected text
 *   contains more lines than the original document.
 * 
 * @dependencies
 * - DocumentFormat.OpenXml.Packaging: For opening and saving DOCX files.
 * - DocumentFormat.OpenXml.Wordprocessing: For manipulating document elements like Paragraph and Run.
 * 
 * @notes
 * - This implementation assumes that the DOCX file has a valid MainDocumentPart and Body.
 * - It uses a simple line-based merge strategy (splitting the corrected text by newline characters).
 * - Advanced merging (e.g., preserving detailed run formatting or merging headers/footers) can be added later.
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

            // Open the DOCX file in read/write mode (true)
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
    }
}
