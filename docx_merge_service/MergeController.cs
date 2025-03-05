using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System;
using System.IO;
using System.Threading.Tasks;

namespace DocxMergeService.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class MergeController : ControllerBase
    {
        private readonly ILogger<MergeController> _logger;

        public MergeController(ILogger<MergeController> logger)
        {
            _logger = logger;
        }

        /// <summary>
        /// Merges the corrected text into the original DOCX file.
        /// </summary>
        /// <param name="file">The original DOCX file uploaded as form-data.</param>
        /// <param name="correctedText">The corrected text to be merged into the DOCX file.</param>
        /// <returns>A merged DOCX file as a downloadable response.</returns>
        [HttpPost("merge")]
        public async Task<IActionResult> Merge([FromForm] IFormFile file, [FromForm] string correctedText)
        {
            if (file == null || string.IsNullOrWhiteSpace(correctedText))
            {
                _logger.LogError("File or correctedText is missing in the request.");
                return BadRequest(new { error = "Both 'file' and 'correctedText' are required." });
            }

            try
            {
                // Copy the uploaded file into a memory stream
                using var memoryStream = new MemoryStream();
                await file.CopyToAsync(memoryStream);
                memoryStream.Position = 0;

                // Open the DOCX file using Open XML SDK
                using (var wordDoc = WordprocessingDocument.Open(memoryStream, true))
                {
                    var body = wordDoc.MainDocumentPart?.Document?.Body;
                    if (body == null)
                    {
                        _logger.LogError("The DOCX file does not contain a valid body.");
                        return StatusCode(StatusCodes.Status500InternalServerError, new { error = "Invalid DOCX file structure." });
                    }

                    // Remove all existing paragraphs in the document body
                    body.RemoveAllChildren<Paragraph>();

                    // Create a new paragraph with the corrected text
                    var newParagraph = new Paragraph(new Run(new Text(correctedText)));
                    body.Append(newParagraph);

                    // Save changes to the document
                    wordDoc.MainDocumentPart.Document.Save();
                }

                // Reset the memory stream for reading
                memoryStream.Position = 0;
                var mergedDoc = memoryStream.ToArray();

                // Return the merged DOCX file with appropriate headers
                return File(mergedDoc, "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "merged.docx");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while merging the DOCX file.");
                return StatusCode(StatusCodes.Status500InternalServerError, new { error = "An internal error occurred during merging." });
            }
        }
    }
}
