const sharp = require('sharp');
const FormData = require('form-data');
const axios = require('axios').default;
const config = require('../config.json');

function extractGovernorName(text) {
  const lines = text.split('\n');
  const civilizationIndex = lines.findIndex(line => line.includes('Civilization'));

  if (civilizationIndex !== -1 && civilizationIndex + 1 < lines.length) {
    return lines[civilizationIndex + 1].trim();
  }

  return null;
}

function extractIdFromText(text) {
  const idPattern = /ID\s?:?\s?(\d+)/;
  const match = text.match(idPattern);

  if (match && match[1]) {
    return match[1];
  }

  return null;
}

function extractAllianceName(text, allianceList) {
  const allianceNames = Object.values(allianceList).flat().map(entry => entry.alliance_name);
  const match = allianceNames.find(alliance => text.includes(alliance));
  
  if (match) {
    return { name: match };
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

module.exports = {
  getOCRResult,
  convertImageToTiff,
  sendOCRRequest,
  extractGovernorName,
  extractIdFromText,
  extractAllianceName
};