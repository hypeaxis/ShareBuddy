/**
 * Text extraction from documents (PDF, DOCX, PPTX)
 */

const fs = require('fs').promises;
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const logger = require('../utils/logger');

async function extractText(filePath, fileType) {
  try {
    const fileExtension = fileType.toLowerCase();

    switch (fileExtension) {
      case 'pdf':
        return await extractFromPDF(filePath);
      
      case 'doc':
      case 'docx':
        return await extractFromDOCX(filePath);
      
      case 'txt':
        return await extractFromTXT(filePath);
      
      default:
        logger.warn(`Unsupported file type: ${fileExtension}, returning empty text`);
        return '';
    }
  } catch (error) {
    logger.error(`Text extraction failed for ${filePath}:`, error);
    return ''; // Return empty string on failure
  }
}

async function extractFromPDF(filePath) {
  try {
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text || '';
  } catch (error) {
    logger.error('PDF extraction failed:', error);
    throw new Error(`PDF extraction failed: ${error.message}`);
  }
}

async function extractFromDOCX(filePath) {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value || '';
  } catch (error) {
    logger.error('DOCX extraction failed:', error);
    throw new Error(`DOCX extraction failed: ${error.message}`);
  }
}

async function extractFromTXT(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return content;
  } catch (error) {
    logger.error('TXT extraction failed:', error);
    throw new Error(`TXT extraction failed: ${error.message}`);
  }
}

module.exports = {
  extractText
};
