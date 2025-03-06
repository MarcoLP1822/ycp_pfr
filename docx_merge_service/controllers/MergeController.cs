/**
 * @file MergeController.cs
 * @description
 * This controller exposes an endpoint to merge corrected text into a DOCX file.
 * In this refactored version, the merging logic is delegated to the DocxService.
 * This separation of concerns makes the code more maintainable and testable.
 *
 * Key features:
 * - Injects DocxService via dependency injection.
 * - Validates input and handles errors.
 * - Uses DocxService.MergeDocument to perform the DOCX merge.
 *
 * @dependencies
 * - Microsoft.AspNetCore.Mvc: For controller functionality.
 * - Microsoft.Extensions.Logging: For logging.
 * - DocxMergeService.Services.DocxService: Encapsulates DOCX operations.
 *
 * @notes
 * - Ensure that DocxService is registered in the DI container in Program.cs.
 * - Returns the merged DOCX file with appropriate HTTP headers.
 */

using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using DocxMergeService.Services;

namespace DocxMergeService.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class MergeController : ControllerBase
    {
        private readonly ILogger<MergeController> _logger;
        private readonly DocxService _docxService;

        public MergeController(ILogger<MergeController> logger, DocxService docxService)
        {
            _logger = logger;
            _docxService = docxService;
        }

        /// <summary>
        /// Merges the corrected text into the uploaded DOCX file.
        /// This method delegates the merging operation to the DocxService.
        /// </summary>
        /// <param name="file">The DOCX file uploaded by the client.</param>
        /// <param name="correctedText">The corrected text to merge into the DOCX.</param>
        /// <returns>The merged DOCX file as a downloadable response.</returns>
        [HttpPost("merge")]
        public async Task<IActionResult> Merge([FromForm] IFormFile file, [FromForm] string correctedText)
        {
            if (file == null || string.IsNullOrWhiteSpace(correctedText))
            {
                _logger.LogError("Missing file or correctedText in the request.");
                return BadRequest(new { error = "Both file and correctedText are required." });
            }

            try
            {
                using (var memoryStream = new MemoryStream())
                {
                    await file.CopyToAsync(memoryStream);
                    memoryStream.Position = 0;

                    // Delegate merging to DocxService
                    var mergedStream = _docxService.MergeDocument(memoryStream, correctedText);

                    // Return the merged DOCX file with proper headers
                    return File(mergedStream.ToArray(),
                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                        "merged.docx");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during DOCX merge.");
                return StatusCode(500, new { error = "Internal server error during merge." });
            }
        }
    }
}
