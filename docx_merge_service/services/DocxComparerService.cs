/**
 * @file docx_merge_service/Services/DocxComparerService.cs
 * @description
 * This service provides functionality to compare two DOCX documents using OpenXmlPowerTools' WmlComparer.
 * It generates a merged document that includes Word Track Changes (insertions and deletions) while preserving
 * the original document's formatting and styles.
 *
 * Key features:
 * - Accepts the original DOCX and a corrected DOCX as MemoryStreams.
 * - Uses the WmlComparer to perform a detailed comparison between the two documents.
 * - Produces a merged DOCX as a MemoryStream with revisions tracked.
 *
 * @dependencies
 * - OpenXmlPowerTools: Provides the WmlComparer and WmlDocument classes for DOCX manipulation.
 * - System.IO: For MemoryStream operations.
 *
 * @notes
 * - This service uses default WmlComparerSettings. These settings can be further customized if needed.
 * - It assumes that both input MemoryStreams contain valid DOCX content.
 * - Proper error handling is implemented to check for null inputs.
 */

using System;
using System.IO;
using OpenXmlPowerTools;

namespace DocxMergeService.Services
{
    public class DocxComparerService
    {
        /// <summary>
        /// Compares the original DOCX document with the corrected DOCX document and returns a merged DOCX with track changes.
        /// </summary>
        /// <param name="originalStream">A MemoryStream containing the original DOCX file.</param>
        /// <param name="correctedStream">A MemoryStream containing the corrected DOCX file.</param>
        /// <returns>A MemoryStream containing the merged DOCX file with tracked changes.</returns>
        /// <exception cref="ArgumentNullException">
        /// Thrown if either the originalStream or correctedStream is null.
        /// </exception>
        public static MemoryStream CompareDocuments(MemoryStream originalStream, MemoryStream correctedStream)
        {
            if (originalStream == null)
                throw new ArgumentNullException(nameof(originalStream), "Original document stream cannot be null.");
            if (correctedStream == null)
                throw new ArgumentNullException(nameof(correctedStream), "Corrected document stream cannot be null.");

            // Convert the input MemoryStreams to byte arrays.
            byte[] originalBytes = originalStream.ToArray();
            byte[] correctedBytes = correctedStream.ToArray();

            // Create WmlDocument instances for both the original and corrected documents.
            WmlDocument originalWmlDoc = new WmlDocument("original.docx", originalBytes);
            WmlDocument correctedWmlDoc = new WmlDocument("corrected.docx", correctedBytes);

            // Initialize default settings for the comparison.
            WmlComparerSettings settings = new WmlComparerSettings();
            // Customize settings here if necessary.

            // Perform the comparison to generate a merged document with tracked changes.
            WmlDocument comparedDoc = WmlComparer.Compare(originalWmlDoc, correctedWmlDoc, settings);

            // Convert the merged document byte array into a MemoryStream.
            MemoryStream mergedStream = new MemoryStream(comparedDoc.DocumentByteArray)
            {
                Position = 0
            };

            return mergedStream;
        }
    }
}
