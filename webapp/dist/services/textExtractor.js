"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractTextFromFile = extractTextFromFile;
/**
 * @file services/textExtractor.ts
 * @description
 * This module provides utility functions to extract plain text from uploaded files.
 * It supports extraction from the following file types:
 * - DOCX: Uses the mammoth library to extract text from DOCX files.
 * - TXT: Reads the file buffer and converts it to a UTF-8 string.
 * - ODT/ODF: Uses adm-zip to extract the content.xml file and then strips XML tags to obtain plain text.
 * - DOC: Legacy .doc files are currently not supported.
 *
 * @dependencies
 * - mammoth: For DOCX file text extraction.
 * - adm-zip: For extracting text from ODT/ODF files.
 *
 * @notes
 * - Ensure that the necessary libraries are installed (mammoth, adm-zip).
 * - Edge cases:
 *   - Unsupported file types will result in an error.
 *   - If extraction fails due to file corruption or unexpected format, an error is thrown.
 */
const mammoth_1 = __importDefault(require("mammoth"));
const adm_zip_1 = __importDefault(require("adm-zip"));
/**
 * Extracts plain text from an uploaded file buffer based on its file type.
 *
 * @param fileBuffer - The Buffer containing the file data.
 * @param fileType - The file extension/type (without the leading dot).
 * @returns A promise that resolves to the extracted plain text.
 *
 * @throws Error if the file type is unsupported or if extraction fails.
 */
async function extractTextFromFile(fileBuffer, fileType) {
    const lowerFileType = fileType.toLowerCase();
    if (lowerFileType === 'docx') {
        // Use mammoth to extract text from DOCX files.
        try {
            const result = await mammoth_1.default.extractRawText({ buffer: fileBuffer });
            return result.value;
        }
        catch (error) {
            throw new Error(`Error extracting text from DOCX file: ${error.message}`);
        }
    }
    else if (lowerFileType === 'txt') {
        // Directly convert buffer to a UTF-8 string.
        return fileBuffer.toString('utf8');
    }
    else if (lowerFileType === 'odt' || lowerFileType === 'odf') {
        // Use adm-zip to extract the content.xml file from ODT/ODF and strip XML tags.
        try {
            const zip = new adm_zip_1.default(fileBuffer);
            const contentXmlEntry = zip.getEntry('content.xml');
            if (!contentXmlEntry) {
                throw new Error('content.xml not found in ODT/ODF file.');
            }
            const contentXml = contentXmlEntry.getData().toString('utf8');
            // Remove XML tags and extra whitespace to extract plain text.
            const plainText = contentXml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
            return plainText;
        }
        catch (error) {
            throw new Error(`Error extracting text from ODT/ODF file: ${error.message}`);
        }
    }
    else if (lowerFileType === 'doc') {
        // Extraction for legacy .doc files is not supported yet.
        throw new Error('Extraction for .doc files is not supported yet.');
    }
    else {
        throw new Error(`Unsupported file type: ${fileType}`);
    }
}
