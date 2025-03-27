using System;
using System.IO;
using Microsoft.AspNetCore.Mvc;
using DocxMergeService.Services;

namespace DocxMergeService.Controllers
{
    [ApiController]
    [Route("merge")]
    public class MergeController : ControllerBase
    {
        private readonly DocxService _docxService;

        public MergeController(DocxService docxService)
        {
            _docxService = docxService;
        }

        [HttpPost("merge-docx")]
        public IActionResult Merge([FromForm] IFormFile file, [FromForm] string correctedText)
        {
            if (file == null || string.IsNullOrWhiteSpace(correctedText))
            {
                return BadRequest(new { error = "Entrambi i campi (file e correctedText) sono obbligatori." });
            }

            try
            {
                using (var memoryStream = new MemoryStream())
                {
                    file.CopyTo(memoryStream);
                    // Utilizza il nuovo metodo che usa WmlComparer per il merge
                    MemoryStream mergedStream = _docxService.MergeDocumentUsingWmlComparer(memoryStream, correctedText);
                    byte[] mergedBytes = mergedStream.ToArray();
                    return File(mergedBytes,
                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                        "proofread-merged.docx");
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Errore durante il merge: " + ex.Message });
            }
        }
    }
}
