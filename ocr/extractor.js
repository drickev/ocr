const axios = require('axios').default;
const FormData = require('form-data');
const sharp = require('sharp');
const config = require('../config.json');

async function getOCRResult(id) {
  const resultUrl = `https://api.edenai.run/v2/ocr/ocr_async/${id}`;

  try {
    console.log('Polling for OCR result...');
    const response = await axios.get(resultUrl, {
      headers: {
        Authorization: `Bearer ${config.eden_ai_api_key}`
      }
    });

    console.log('Received OCR result status:', response.data.status);

    if (response.data.status === 'finished') {
      return response.data.results.amazon;
    }

    await new Promise(resolve => setTimeout(resolve, 5000));
    return getOCRResult(id);

  } catch (error) {
    console.error('Error fetching OCR result:', error);
    return 'Error fetching OCR result.';
  }
}

function formatOCRResult(result) {
  console.log('Formatting OCR result:', result);

  if (!result || typeof result !== 'object') {
    return 'No result found or result is not in the expected format.';
  }

  const text = result.raw_text || 'No text found.';
  
  const governorName = extractGovernorName(text);
  if (governorName) {
    console.log('Extracted Governor Name:', governorName);
  } else {
    console.log('No Governor Name found in the text.');
  }

  const extractedId = extractIdFromText(text);
  if (extractedId) {
    console.log('Extracted ID:', extractedId);
  } else {
    console.log('No ID found in the text.');
  }

  return { text, governorName, extractedId };
}

function extractIdFromText(text) {
  const idPattern = /ID\s*[:]*\s*(\d{9,})/;
  const match = text.match(idPattern);

  if (match && match[1]) {
    return match[1];
  }

  return null;
}

function extractGovernorName(text) {
  const lines = text.split('\n');
  const civilizationIndex = lines.findIndex(line => line.includes('Civilization'));
  
  if (civilizationIndex !== -1 && civilizationIndex + 1 < lines.length) {
    return lines[civilizationIndex + 1].trim();
  }

  return null;
}

async function convertImageToTiff(imageBuffer) {
  console.log('Converting image to TIFF...');
  const tiffBuffer = await sharp(imageBuffer).tiff().toBuffer();
  console.log('Image converted to TIFF.');
  return tiffBuffer;
}

async function sendOCRRequest(tiffBuffer) {
  console.log('Sending OCR request...');
  const form = new FormData();
  form.append('providers', 'amazon');
  form.append('file', tiffBuffer, {
    filename: 'image.tiff',
    contentType: 'image/tiff'
  });

  const options = {
    method: 'POST',
    url: 'https://api.edenai.run/v2/ocr/ocr_async',
    headers: {
      Authorization: `Bearer ${config.eden_ai_api_key}`,
      ...form.getHeaders()
    },
    data: form
  };

  try {
    const ocrResponse = await axios.request(options);
    const resultId = ocrResponse.data.public_id;
    console.log('OCR request sent. Result ID:', resultId);
    return resultId;
  } catch (error) {
    console.error('Error sending OCR request:', error);
    throw error;
  }
}

module.exports = {
  getOCRResult,
  formatOCRResult,
  convertImageToTiff,
  sendOCRRequest
};