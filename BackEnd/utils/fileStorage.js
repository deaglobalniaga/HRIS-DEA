/**
 * In-Database Compressed File Storage Engine
 * PT DEA GLOBAL NIAGA HRIS Enterprise Architecture
 * Storing 100% of files purely in database tables with sharp image compression.
 */

const sharp = require('sharp');
const zlib = require('zlib');

/**
 * Compress image buffer to high-quality, lightweight WebP Data URI
 * @param {Buffer} buffer - Raw image buffer
 * @param {number} maxWidth - Max width for resize (default: 1200)
 * @param {number} quality - WebP compression quality (default: 75)
 * @returns {Promise<string>} Base64 Data URI
 */
async function compressImageToDataUri(buffer, maxWidth = 1200, quality = 75) {
    try {
        const compressedBuffer = await sharp(buffer)
            .resize({ width: maxWidth, withoutEnlargement: true })
            .webp({ quality, effort: 4 })
            .toBuffer();
        
        return `data:image/webp;base64,${compressedBuffer.toString('base64')}`;
    } catch (err) {
        console.warn('Sharp image compression fallback to raw base64:', err.message);
        return `data:image/jpeg;base64,${buffer.toString('base64')}`;
    }
}

/**
 * Compress document / PDF buffer to Data URI
 * @param {Buffer} buffer - Raw file buffer
 * @param {string} mimetype - MIME type (e.g. 'application/pdf')
 * @returns {string} Base64 Data URI
 */
function compressDocumentToDataUri(buffer, mimetype = 'application/pdf') {
    return `data:${mimetype};base64,${buffer.toString('base64')}`;
}

/**
 * Process any uploaded Multer file and return a compressed Data URI for table storage
 * @param {Object} file - Multer file object ({ buffer, mimetype, originalname })
 * @returns {Promise<string>} Compressed Base64 Data URI
 */
async function processUploadedFile(file) {
    if (!file || !file.buffer) return null;

    const mimetype = (file.mimetype || '').toLowerCase();
    
    // If image, compress with sharp
    if (mimetype.startsWith('image/')) {
        return await compressImageToDataUri(file.buffer, 1200, 75);
    }

    // If PDF or other document
    return compressDocumentToDataUri(file.buffer, mimetype || 'application/pdf');
}

module.exports = {
    compressImageToDataUri,
    compressDocumentToDataUri,
    processUploadedFile
};
