using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using DocumentFormat.OpenXml.Packaging;
using DocxMergeService.Services;

namespace DocxMergeService.Controllers
{
    [ApiController]
    [Route("merge")]
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
        /// Riceve un file DOCX e il testo corretto (tutto in un’unica stringa, suddiviso in paragrafi con \n)
        /// e restituisce un DOCX con le sole modifiche (a livello di parola) evidenziate in Track Changes.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> Merge([FromForm] IFormFile file, [FromForm] string correctedText)
        {
            if (file == null || string.IsNullOrWhiteSpace(correctedText))
            {
                _logger.LogError("Missing file or correctedText.");
                return BadRequest(new { error = "Both file and correctedText are required." });
            }

            // Verifica che il file sia un DOCX
            if (!file.ContentType.Equals("application/vnd.openxmlformats-officedocument.wordprocessingml.document", StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogError($"Invalid file type: {file.ContentType}");
                return BadRequest(new { error = "Only DOCX files are supported." });
            }

            try
            {
                using var memoryStream = new MemoryStream();
                await file.CopyToAsync(memoryStream);
                memoryStream.Position = 0;

                // Verifica struttura del DOCX
                try
                {
                    using (WordprocessingDocument.Open(memoryStream, false)) { }
                    memoryStream.Position = 0;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Invalid DOCX structure.");
                    return BadRequest(new { error = "Invalid DOCX file structure." });
                }

                // Esegui il merge parziale in revisione
                var mergedDocStream = _docxService.MergeDocumentPartial(memoryStream, correctedText);

                return File(mergedDocStream.ToArray(),
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    "proofread-merged.docx");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error merging partial revisions.");
                return StatusCode(500, new { error = "Internal server error during partial merge." });
            }
        }
    }
}
