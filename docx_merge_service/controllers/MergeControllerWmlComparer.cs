using Codeuctivity.OpenXmlPowerTools;
using Codeuctivity.OpenXmlPowerTools.WmlComparer;
using DocumentFormat.OpenXml.Packaging;
using Microsoft.AspNetCore.Mvc;
using System.IO;

namespace DocxMergeService.Controllers
{
    [ApiController]
    [Route("merge/wmlcompare-test")]
    public class MergeControllerWmlComparer : ControllerBase
    {
        [HttpPost]
        public IActionResult MergeUsingWmlComparer([FromForm] IFormFile original, [FromForm] IFormFile corrected)
        {
            if (original == null || corrected == null)
            {
                return BadRequest(new { error = "Entrambi i file (originale e corretto) sono richiesti." });
            }

            // Salva i file temporaneamente
            string originalTempPath = Path.GetTempFileName();
            using (var fileStream = new FileStream(originalTempPath, FileMode.Create))
            {
                original.CopyTo(fileStream);
            }

            string correctedTempPath = Path.GetTempFileName();
            using (var fileStream = new FileStream(correctedTempPath, FileMode.Create))
            {
                corrected.CopyTo(fileStream);
            }

            // Carica i file come WmlDocument
            var wmlOriginal = new WmlDocument(originalTempPath);
            var wmlCorrected = new WmlDocument(correctedTempPath);

            // Imposta le impostazioni per il confronto
            var comparerSettings = new WmlComparerSettings
            {
                AuthorForRevisions = "WmlComparer Integration",
                DetailThreshold = 0
            };

            // Esegui il confronto tramite WmlComparer che genera un documento con track changes
            var comparedDocument = WmlComparer.Compare(wmlOriginal, wmlCorrected, comparerSettings);

            // Pulizia dei file temporanei
            System.IO.File.Delete(originalTempPath);
            System.IO.File.Delete(correctedTempPath);

            // Restituisce il documento DOCX risultante come file da scaricare
            return File(comparedDocument.DocumentByteArray,
                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                        "merged-with-revisions.docx");
        }
    }
}
