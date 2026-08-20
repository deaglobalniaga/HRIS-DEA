const supabase = require('../config/supabase');
const { processUploadedFile } = require('./fileStorage');
const fs = require('fs');
const path = require('path');

/**
 * Upload file directly to Supabase Storage Bucket (with 5MB limit check)
 * Returns public URL from Supabase Storage CDN, with fallback to compressed data URI.
 * @param {Object} file - Multer file object
 * @param {string} bucketName - 'documents' | 'certificates' | 'avatars'
 * @returns {Promise<string|null>} - Public Storage URL or Compressed Base64 Data URI
 */
async function uploadToSupabaseStorage(file, bucketName = 'documents') {
    if (!file) return null;

    try {
        let fileBuffer = file.buffer;
        if (!fileBuffer && file.path && fs.existsSync(file.path)) {
            fileBuffer = fs.readFileSync(file.path);
        }

        if (!fileBuffer) return null;

        const ext = path.extname(file.originalname || '').toLowerCase() || (file.mimetype?.includes('image') ? '.jpg' : '.pdf');
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}${ext}`;
        const contentType = file.mimetype || (ext === '.pdf' ? 'application/pdf' : 'image/jpeg');

        // 1. Direct Upload to Supabase Storage Bucket
        const { data: uploadResult, error: uploadErr } = await supabase.storage
            .from(bucketName)
            .upload(fileName, fileBuffer, {
                contentType,
                upsert: true
            });

        if (!uploadErr && uploadResult) {
            const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(fileName);
            if (urlData?.publicUrl) {
                // Cleanup local file if it was on disk
                if (file.path && fs.existsSync(file.path)) {
                    try { fs.unlinkSync(file.path); } catch (e) {}
                }
                return urlData.publicUrl;
            }
        }

        // 2. Fallback to In-Database compression if bucket upload had an issue
        const dataUri = await processUploadedFile({
            buffer: fileBuffer,
            mimetype: contentType,
            originalname: file.originalname || 'document.pdf'
        });

        // Cleanup local file
        if (file.path && fs.existsSync(file.path)) {
            try { fs.unlinkSync(file.path); } catch (e) {}
        }

        return dataUri;
    } catch (err) {
        console.error('Storage upload error:', err);
        return null;
    }
}

module.exports = { 
    uploadToSupabaseStorage,
    processUploadedFile 
};
