/**
 * @file docx_merge_service/Tests/DocxServiceTests.cs
 * @description
 * This file contains unit tests for the DocxService class.
 * It tests key functionalities including:
 * - Opening a DOCX document from a stream.
 * - Merging corrected text into an existing DOCX.
 * - Extracting the document body.
 * - Merging header parts and footer parts.
 * - Merging styles from multiple documents with conflict resolution.
 *
 * Key features:
 * - Validates input parameters and expects exceptions.
 * - Uses in-memory DOCX creation for testing.
 * - Verifies that text merging replaces and appends paragraphs appropriately.
 *
 * @dependencies
 * - xUnit: For unit testing.
 * - DocumentFormat.OpenXml: For DOCX manipulation.
 * - DocxMergeService.Services: For the DocxService.
 * - Microsoft.Extensions.Logging.Abstractions: To supply a dummy logger.
 *
 * @notes
 * - Uses NullLogger to satisfy the logger dependency.
 * - All tests are run in the separate test project (docx_merge_service.Tests.csproj).
 */

using System;
using System.IO;
using System.Linq;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using DocxMergeService.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace DocxMergeService.Tests
{
    public class DocxServiceTests
    {
        // Use a dummy logger from NullLogger to satisfy the dependency.
        private readonly DocxService _docxService = new DocxService(NullLogger<DocxService>.Instance);

        /// <summary>
        /// Helper method to create a simple DOCX document in memory with a single paragraph.
        /// </summary>
        /// <param name="paragraphText">The text to include in the document's paragraph.</param>
        /// <returns>A MemoryStream containing the DOCX file.</returns>
        private MemoryStream CreateSimpleDocx(string paragraphText)
        {
            MemoryStream memStream = new MemoryStream();
            using (WordprocessingDocument wordDoc = WordprocessingDocument.Create(memStream, WordprocessingDocumentType.Document, true))
            {
                var mainPart = wordDoc.AddMainDocumentPart();
                mainPart.Document = new Document();
                var body = new Body();
                var para = new Paragraph(new Run(new Text(paragraphText)
                {
                    Space = DocumentFormat.OpenXml.SpaceProcessingModeValues.Preserve
                }));
                body.Append(para);
                mainPart.Document.Append(body);
                mainPart.Document.Save();
            }
            memStream.Position = 0;
            return memStream;
        }

        [Fact]
        public void OpenDocument_NullStream_ThrowsArgumentNullException()
        {
            Assert.Throws<ArgumentNullException>(() => _docxService.LoadDocument(null));
        }

        [Fact]
        public void OpenDocument_ValidStream_ReturnsWordprocessingDocument()
        {
            using (MemoryStream ms = CreateSimpleDocx("Hello"))
            {
                using (var doc = _docxService.LoadDocument(ms))
                {
                    Assert.NotNull(doc);
                    Assert.NotNull(doc.MainDocumentPart);
                    Assert.NotNull(doc.MainDocumentPart.Document);
                }
            }
        }

        [Fact]
        public void MergeDocument_UpdatesParagraphsCorrectly()
        {
            string originalText = "Hello";
            string correctedText = "Hello world\nThis is a new paragraph";
            using (MemoryStream ms = CreateSimpleDocx(originalText))
            {
                MemoryStream mergedStream = _docxService.MergeDocumentPartial(ms, correctedText);
                mergedStream.Position = 0;
                using (var mergedDoc = WordprocessingDocument.Open(mergedStream, false))
                {
                    Body body = mergedDoc.MainDocumentPart.Document.Body;
                    var paragraphs = body.Elements<Paragraph>().ToList();
                    Assert.Equal(2, paragraphs.Count);

                    var firstParaText = string.Concat(paragraphs[0].Descendants<Text>().Select(t => t.Text));
                    Assert.Equal("Hello world", firstParaText);

                    var secondParaText = string.Concat(paragraphs[1].Descendants<Text>().Select(t => t.Text));
                    Assert.Equal("This is a new paragraph", secondParaText);
                }
            }
        }

        [Fact]
        public void ExtractBody_ReturnsValidBody()
        {
            using (MemoryStream ms = CreateSimpleDocx("Test Body"))
            {
                using (var doc = _docxService.LoadDocument(ms))
                {
                    Body body = _docxService.ExtractBody(doc);
                    Assert.NotNull(body);
                    var text = string.Concat(body.Descendants<Text>().Select(t => t.Text));
                    Assert.Contains("Test Body", text);
                }
            }
        }

        [Fact]
        public void MergeDocumentUsingWmlComparer_ReturnsMergedDocxWithTrackChanges()
        {
            // Crea un documento semplice con un paragrafo di testo originale.
            string originalText = "This is the original document text.";
            // Modifica minima per simulare una correzione.
            string correctedText = "This is the modified document text.";
            using (MemoryStream ms = CreateSimpleDocx(originalText))
            {
                // Chiama il nuovo metodo che utilizza WmlComparer.
                MemoryStream mergedStream = _docxService.MergeDocumentUsingWmlComparer(ms, correctedText);
                mergedStream.Position = 0;
                // Apri il documento fuso e verifica che contenga almeno un elemento <w:ins> per indicare una revisione.
                using (var mergedDoc = WordprocessingDocument.Open(mergedStream, false))
                {
                    var insElements = mergedDoc.MainDocumentPart.Document.Body.Descendants<InsertedRun>().ToList();
                    Assert.NotEmpty(insElements);
                }
            }
        }
    }
}
