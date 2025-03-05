/**
 * @file docx_merge_service/Services/DocxService.cs
 * @description
 * This service class encapsulates operations on DOCX files using the Open XML SDK.
 * It provides methods to open a DOCX document from a stream, merge corrected text into the DOCX,
 * extract various document parts (body, headers, footers, styles), merge headers and footers,
 * and now merge style definitions from multiple source documents into a target document.
 *
 * Key features:
 * - OpenDocument(Stream stream): Opens a DOCX file in read/write mode.
 * - MergeDocument(MemoryStream originalStream, string correctedText): Merges corrected text into the DOCX.
 * - UpdateRunText(Run run, string newText): Updates the text of a Run element while preserving formatting.
 * - ExtractBody(WordprocessingDocument doc): Extracts the document body.
 * - ExtractHeaders(WordprocessingDocument doc): Extracts header parts.
 * - ExtractFooters(WordprocessingDocument doc): Extracts footer parts.
 * - ExtractStyles(WordprocessingDocument doc): Extracts styles definitions.
 * - MergeHeaders(WordprocessingDocument sourceDoc, WordprocessingDocument targetDoc): Merges header parts.
 * - MergeFooters(WordprocessingDocument sourceDoc, WordprocessingDocument targetDoc): Merges footer parts.
 * - MergeStyles(WordprocessingDocument targetDoc, List<WordprocessingDocument> sourceDocs): Merges style definitions from multiple source documents
 *   into the target document, renaming conflicting styles.
 *
 * @dependencies
 * - DocumentFormat.OpenXml.Packaging: For opening and saving DOCX files.
 * - DocumentFormat.OpenXml.Wordprocessing: For accessing and manipulating document elements.
 *
 * @notes
 * - The merging strategy for headers and footers is simple: if a header/footer exists in the source document,
 *   the first one is copied to the target document, replacing any existing default header/footer.
 * - In the MergeStyles method, if a style conflict is detected (i.e. same style id but different definition),
 *   the conflicting style from the source is renamed by appending "_merged".
 * - This is a simplified approach and does not update style references in the document content.
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

        /// <summary>
        /// Merges the header parts from the source document into the target document.
        /// This method copies the first header from the source document, creates a new header part in the target,
        /// and updates the target document's section properties to reference the new header.
        /// </summary>
        /// <param name="sourceDoc">The source WordprocessingDocument containing the header to merge.</param>
        /// <param name="targetDoc">The target WordprocessingDocument where the header should be merged.</param>
        public void MergeHeaders(WordprocessingDocument sourceDoc, WordprocessingDocument targetDoc)
        {
            // Extract headers from the source document.
            var sourceHeaders = ExtractHeaders(sourceDoc);
            if (sourceHeaders.Count == 0)
            {
                // No header to merge; exit method.
                return;
            }

            // For simplicity, take the first header from the source.
            var firstHeader = sourceHeaders.First();

            // Get the main document part of the target document.
            var mainPart = targetDoc.MainDocumentPart;
            if (mainPart == null)
            {
                throw new Exception("Target document is missing a MainDocumentPart.");
            }

            // Create a new header part in the target document and copy the content from the source header.
            var newHeaderPart = mainPart.AddNewPart<HeaderPart>();
            using (var headerStream = firstHeader.GetStream())
            {
                newHeaderPart.FeedData(headerStream);
            }

            // Create a header reference to attach to the section properties.
            var headerReference = new HeaderReference()
            {
                Id = mainPart.GetIdOfPart(newHeaderPart),
                Type = HeaderFooterValues.Default
            };

            // Get or create section properties in the target document.
            var body = mainPart.Document.Body;
            var sectPr = body.Elements<SectionProperties>().FirstOrDefault();
            if (sectPr == null)
            {
                sectPr = new SectionProperties();
                body.Append(sectPr);
            }

            // Remove any existing default header references and add the new one.
            sectPr.RemoveAllChildren<HeaderReference>();
            sectPr.Append(headerReference);

            // Save changes to the target document.
            mainPart.Document.Save();
        }

        /// <summary>
        /// Merges the footer parts from the source document into the target document.
        /// This method copies the first footer from the source document, creates a new footer part in the target,
        /// and updates the target document's section properties to reference the new footer.
        /// </summary>
        /// <param name="sourceDoc">The source WordprocessingDocument containing the footer to merge.</param>
        /// <param name="targetDoc">The target WordprocessingDocument where the footer should be merged.</param>
        public void MergeFooters(WordprocessingDocument sourceDoc, WordprocessingDocument targetDoc)
        {
            // Extract footers from the source document.
            var sourceFooters = ExtractFooters(sourceDoc);
            if (sourceFooters.Count == 0)
            {
                // No footer to merge; exit method.
                return;
            }

            // For simplicity, take the first footer from the source.
            var firstFooter = sourceFooters.First();

            // Get the main document part of the target document.
            var mainPart = targetDoc.MainDocumentPart;
            if (mainPart == null)
            {
                throw new Exception("Target document is missing a MainDocumentPart.");
            }

            // Create a new footer part in the target document and copy the content from the source footer.
            var newFooterPart = mainPart.AddNewPart<FooterPart>();
            using (var footerStream = firstFooter.GetStream())
            {
                newFooterPart.FeedData(footerStream);
            }

            // Create a footer reference to attach to the section properties.
            var footerReference = new FooterReference()
            {
                Id = mainPart.GetIdOfPart(newFooterPart),
                Type = HeaderFooterValues.Default
            };

            // Get or create section properties in the target document.
            var body = mainPart.Document.Body;
            var sectPr = body.Elements<SectionProperties>().FirstOrDefault();
            if (sectPr == null)
            {
                sectPr = new SectionProperties();
                body.Append(sectPr);
            }

            // Remove any existing default footer references and add the new one.
            sectPr.RemoveAllChildren<FooterReference>();
            sectPr.Append(footerReference);

            // Save changes to the target document.
            mainPart.Document.Save();
        }

        /// <summary>
        /// Merges the style definitions from multiple source documents into the target document.
        /// It extracts the styles from each source document and integrates them into the target's StyleDefinitionsPart.
        /// If a style with the same style ID already exists in the target but with a different definition,
        /// the source style is renamed by appending "_merged" to avoid conflicts.
        /// 
        /// <para>
        /// This method assumes that the target document's StyleDefinitionsPart is either present or will be created.
        /// </para>
        /// </summary>
        /// <param name="targetDoc">The target WordprocessingDocument to which styles will be merged.</param>
        /// <param name="sourceDocs">A list of source WordprocessingDocuments whose styles are to be merged.</param>
        public void MergeStyles(WordprocessingDocument targetDoc, List<WordprocessingDocument> sourceDocs)
        {
            if (targetDoc == null)
                throw new ArgumentNullException(nameof(targetDoc), "Target document cannot be null.");
            if (sourceDocs == null || sourceDocs.Count == 0)
                throw new ArgumentException("No source documents provided for merging styles.", nameof(sourceDocs));

            // Get or create the StyleDefinitionsPart for the target document.
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

            // Load the current styles in the target document.
            var targetStyles = targetStylesPart.Styles.Elements<Style>().ToList();

            // Iterate through each source document.
            foreach (var sourceDoc in sourceDocs)
            {
                var sourceStyles = ExtractStyles(sourceDoc);
                if (sourceStyles == null)
                    continue;

                foreach (var sourceStyle in sourceStyles.Elements<Style>())
                {
                    // Get the style ID.
                    var styleId = sourceStyle.StyleId?.Value;
                    if (string.IsNullOrEmpty(styleId))
                        continue;

                    // Check if this style already exists in the target.
                    var existingStyle = targetStyles.FirstOrDefault(s => s.StyleId?.Value == styleId);
                    if (existingStyle == null)
                    {
                        // Clone the source style and add it to the target.
                        var clonedStyle = (Style)sourceStyle.CloneNode(true);
                        targetStylesPart.Styles.AppendChild(clonedStyle);
                        targetStyles.Add(clonedStyle);
                    }
                    else
                    {
                        // If the style exists, compare the definitions.
                        if (existingStyle.OuterXml != sourceStyle.OuterXml)
                        {
                            // Conflict detected; rename the source style.
                            var newStyleId = styleId + "_merged";
                            // Clone the source style and update the style ID.
                            var clonedStyle = (Style)sourceStyle.CloneNode(true);
                            if (clonedStyle.StyleId != null)
                            {
                                clonedStyle.StyleId.Value = newStyleId;
                            }
                            // Optionally, update any style references within the cloned style (not implemented here).
                            targetStylesPart.Styles.AppendChild(clonedStyle);
                            targetStyles.Add(clonedStyle);
                        }
                        // If they are identical, do nothing.
                    }
                }
            }

            // Save the updated styles part.
            targetStylesPart.Styles.Save();
        }
    }
}
