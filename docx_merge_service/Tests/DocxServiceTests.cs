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
 * - Validates input parameters (e.g., null streams) and expects exceptions.
 * - Uses in-memory DOCX creation for testing.
 * - Verifies that text merging replaces and appends paragraphs appropriately.
 * 
 * @dependencies
 * - xUnit for unit testing.
 * - DocumentFormat.OpenXml for DOCX manipulation.
 * - DocxMergeService.Services for the DocxService.
 * 
 * @notes
 * - This file assumes that the Open XML SDK is referenced.
 * - Helper functions are provided to generate simple DOCX documents in memory.
 */

using System;
using System.IO;
using System.Linq;
using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using DocxMergeService.Services;
using Xunit;

namespace DocxMergeService.Tests
{
    public class DocxServiceTests
    {
        private readonly DocxService _docxService = new DocxService();

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
                MainDocumentPart mainPart = wordDoc.AddMainDocumentPart();
                mainPart.Document = new Document();
                Body body = new Body();
                Paragraph para = new Paragraph(new Run(new Text(paragraphText)
                {
                    Space = SpaceProcessingModeValues.Preserve
                }));
                body.Append(para);
                mainPart.Document.Append(body);
                mainPart.Document.Save();
            }
            // Reset stream position for reading.
            memStream.Position = 0;
            return memStream;
        }

        [Fact]
        public void OpenDocument_NullStream_ThrowsArgumentNullException()
        {
            // Test that passing a null stream to OpenDocument throws an ArgumentNullException.
            Assert.Throws<ArgumentNullException>(() => _docxService.OpenDocument(null));
        }

        [Fact]
        public void OpenDocument_ValidStream_ReturnsWordprocessingDocument()
        {
            // Create a simple DOCX document and open it using DocxService.
            using (MemoryStream ms = CreateSimpleDocx("Hello"))
            {
                using (WordprocessingDocument doc = _docxService.OpenDocument(ms))
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
            // Create a DOCX with one paragraph containing "Hello".
            string originalText = "Hello";
            string correctedText = "Hello world\nThis is a new paragraph";
            using (MemoryStream ms = CreateSimpleDocx(originalText))
            {
                // Call MergeDocument to merge in the corrected text.
                MemoryStream mergedStream = _docxService.MergeDocument(ms, correctedText);
                mergedStream.Position = 0;
                using (WordprocessingDocument mergedDoc = WordprocessingDocument.Open(mergedStream, false))
                {
                    Body body = mergedDoc.MainDocumentPart.Document.Body;
                    var paragraphs = body.Elements<Paragraph>().ToList();
                    // Expect two paragraphs now: first updated and second appended.
                    Assert.Equal(2, paragraphs.Count);

                    // Check that the first paragraph's text is updated correctly.
                    var firstParaText = string.Concat(paragraphs[0].Descendants<Text>().Select(t => t.Text));
                    Assert.Equal("Hello world", firstParaText);

                    // Check that the second paragraph's text is as expected.
                    var secondParaText = string.Concat(paragraphs[1].Descendants<Text>().Select(t => t.Text));
                    Assert.Equal("This is a new paragraph", secondParaText);
                }
            }
        }

        [Fact]
        public void ExtractBody_ReturnsValidBody()
        {
            // Create a simple DOCX and test that ExtractBody returns its body.
            using (MemoryStream ms = CreateSimpleDocx("Test Body"))
            {
                using (WordprocessingDocument doc = _docxService.OpenDocument(ms))
                {
                    Body body = _docxService.ExtractBody(doc);
                    Assert.NotNull(body);
                    var text = string.Concat(body.Descendants<Text>().Select(t => t.Text));
                    Assert.Contains("Test Body", text);
                }
            }
        }

        [Fact]
        public void MergeHeaders_CopiesHeaderToTarget()
        {
            // Create a source document with a header and a target document without a header.
            MemoryStream sourceStream = new MemoryStream();
            MemoryStream targetStream = new MemoryStream();

            // Create source document with header.
            using (WordprocessingDocument sourceDoc = WordprocessingDocument.Create(sourceStream, WordprocessingDocumentType.Document, true))
            {
                MainDocumentPart mainPart = sourceDoc.AddMainDocumentPart();
                mainPart.Document = new Document(new Body(new Paragraph(new Run(new Text("Source Body")))));
                HeaderPart headerPart = mainPart.AddNewPart<HeaderPart>();
                // Create a simple header with text.
                Header header = new Header(new Paragraph(new Run(new Text("Header Content"))));
                headerPart.Header = header;
                headerPart.Header.Save();

                // Associate the header with section properties.
                SectionProperties sectPr = new SectionProperties();
                HeaderReference headerRef = new HeaderReference() { Id = mainPart.GetIdOfPart(headerPart), Type = HeaderFooterValues.Default };
                sectPr.Append(headerRef);
                mainPart.Document.Body.Append(sectPr);
                mainPart.Document.Save();
            }
            sourceStream.Position = 0;

            // Create target document without a header.
            using (WordprocessingDocument targetDoc = WordprocessingDocument.Create(targetStream, WordprocessingDocumentType.Document, true))
            {
                MainDocumentPart targetMainPart = targetDoc.AddMainDocumentPart();
                targetMainPart.Document = new Document(new Body(new Paragraph(new Run(new Text("Target Body")))));
                targetMainPart.Document.Save();

                // Perform header merge from source to target.
                using (WordprocessingDocument sourceDoc = WordprocessingDocument.Open(sourceStream, false))
                {
                    _docxService.MergeHeaders(sourceDoc, targetDoc);
                }
                targetMainPart.Document.Save();

                // Verify that target document now has a header.
                Body body = targetMainPart.Document.Body;
                var sectPr = body.Elements<SectionProperties>().FirstOrDefault();
                Assert.NotNull(sectPr);
                var headerRefs = sectPr.Elements<HeaderReference>().ToList();
                Assert.Single(headerRefs);
                Assert.Equal(HeaderFooterValues.Default, headerRefs.First().Type);
            }
        }

        [Fact]
        public void MergeFooters_CopiesFooterToTarget()
        {
            // Create a source document with a footer and a target document without a footer.
            MemoryStream sourceStream = new MemoryStream();
            MemoryStream targetStream = new MemoryStream();

            // Create source document with footer.
            using (WordprocessingDocument sourceDoc = WordprocessingDocument.Create(sourceStream, WordprocessingDocumentType.Document, true))
            {
                MainDocumentPart mainPart = sourceDoc.AddMainDocumentPart();
                mainPart.Document = new Document(new Body(new Paragraph(new Run(new Text("Source Body")))));
                FooterPart footerPart = mainPart.AddNewPart<FooterPart>();
                // Create a simple footer with text.
                Footer footer = new Footer(new Paragraph(new Run(new Text("Footer Content"))));
                footerPart.Footer = footer;
                footerPart.Footer.Save();

                // Associate the footer with section properties.
                SectionProperties sectPr = new SectionProperties();
                FooterReference footerRef = new FooterReference() { Id = mainPart.GetIdOfPart(footerPart), Type = HeaderFooterValues.Default };
                sectPr.Append(footerRef);
                mainPart.Document.Body.Append(sectPr);
                mainPart.Document.Save();
            }
            sourceStream.Position = 0;

            // Create target document without a footer.
            using (WordprocessingDocument targetDoc = WordprocessingDocument.Create(targetStream, WordprocessingDocumentType.Document, true))
            {
                MainDocumentPart targetMainPart = targetDoc.AddMainDocumentPart();
                targetMainPart.Document = new Document(new Body(new Paragraph(new Run(new Text("Target Body")))));
                targetMainPart.Document.Save();

                // Perform footer merge from source to target.
                using (WordprocessingDocument sourceDoc = WordprocessingDocument.Open(sourceStream, false))
                {
                    _docxService.MergeFooters(sourceDoc, targetDoc);
                }
                targetMainPart.Document.Save();

                // Verify that target document now has a footer.
                Body body = targetMainPart.Document.Body;
                var sectPr = body.Elements<SectionProperties>().FirstOrDefault();
                Assert.NotNull(sectPr);
                var footerRefs = sectPr.Elements<FooterReference>().ToList();
                Assert.Single(footerRefs);
                Assert.Equal(HeaderFooterValues.Default, footerRefs.First().Type);
            }
        }

        [Fact]
        public void MergeStyles_AddsNewStylesAndRenamesConflicts()
        {
            // Create a target document with a simple style and a source document with a conflicting style.
            MemoryStream targetStream = new MemoryStream();
            MemoryStream sourceStream = new MemoryStream();

            // Create target document with one style.
            using (WordprocessingDocument targetDoc = WordprocessingDocument.Create(targetStream, WordprocessingDocumentType.Document, true))
            {
                MainDocumentPart targetMainPart = targetDoc.AddMainDocumentPart();
                targetMainPart.Document = new Document(new Body(new Paragraph(new Run(new Text("Target Body")))));
                // Add StyleDefinitionsPart with a style "TestStyle"
                StyleDefinitionsPart targetStylesPart = targetMainPart.AddNewPart<StyleDefinitionsPart>();
                Styles targetStyles = new Styles();
                Style targetStyle = new Style() { Type = StyleValues.Paragraph, StyleId = "TestStyle" };
                targetStyle.Append(new Name() { Val = "Test Style" });
                targetStyles.Append(targetStyle);
                targetStylesPart.Styles = targetStyles;
                targetStylesPart.Styles.Save();
                targetMainPart.Document.Save();
            }
            targetStream.Position = 0;

            // Create source document with a style "TestStyle" but different definition.
            using (WordprocessingDocument sourceDoc = WordprocessingDocument.Create(sourceStream, WordprocessingDocumentType.Document, true))
            {
                MainDocumentPart sourceMainPart = sourceDoc.AddMainDocumentPart();
                sourceMainPart.Document = new Document(new Body(new Paragraph(new Run(new Text("Source Body")))));
                // Add StyleDefinitionsPart with a conflicting style "TestStyle"
                StyleDefinitionsPart sourceStylesPart = sourceMainPart.AddNewPart<StyleDefinitionsPart>();
                Styles sourceStyles = new Styles();
                Style sourceStyle = new Style() { Type = StyleValues.Paragraph, StyleId = "TestStyle" };
                sourceStyle.Append(new Name() { Val = "Conflicting Test Style" });
                sourceStyles.Append(sourceStyle);
                sourceStylesPart.Styles = sourceStyles;
                sourceStylesPart.Styles.Save();
                sourceMainPart.Document.Save();
            }
            sourceStream.Position = 0;

            // Open target document for merging styles.
            using (WordprocessingDocument targetDoc = WordprocessingDocument.Open(targetStream, true))
            {
                using (WordprocessingDocument sourceDoc = WordprocessingDocument.Open(sourceStream, false))
                {
                    _docxService.MergeStyles(targetDoc, new System.Collections.Generic.List<WordprocessingDocument> { sourceDoc });
                }
                targetDoc.MainDocumentPart.Document.Save();

                // Verify that the target styles part now contains two styles: the original and the renamed one.
                StyleDefinitionsPart targetStylesPart = targetDoc.MainDocumentPart.StyleDefinitionsPart;
                var stylesList = targetStylesPart.Styles.Elements<Style>().ToList();
                // Expecting both "TestStyle" and "TestStyle_merged"
                Assert.Contains(stylesList, s => s.StyleId.Value == "TestStyle");
                Assert.Contains(stylesList, s => s.StyleId.Value == "TestStyle_merged");
            }
        }
    }
}
