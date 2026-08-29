const supabase = require('../config/supabase');
const { processUploadedFile } = require('./fileStorage');

/**
 * Upload file to Supabase Storage Bucket, or fallback to Data URI
 * @param {Object} file - Multer file object ({ buffer, mimetype, originalname })
 * @param {string} bucketName - 'documents' | 'certificates'
 * @returns {Promise<string>} File URL or compressed Data URI
 */
async function uploadToSupabaseStorage(file, bucketName = 'documents') {
    if (!file || !file.buffer) return null;

    try {
        const fileExt = file.originalname ? file.originalname.split('.').pop() : 'png';
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
        const filePath = `${fileName}`;

        // Attempt Supabase bucket upload
        const { data, error } = await supabase.storage
            .from(bucketName)
            .upload(filePath, file.buffer, {
                contentType: file.mimetype || 'application/octet-stream',
                upsert: true
            });

        if (!error && data) {
            const { data: publicUrlData } = supabase.storage
                .from(bucketName)
                .getPublicUrl(filePath);

            if (publicUrlData && publicUrlData.publicUrl) {
                return publicUrlData.publicUrl;
            }
        }
    } catch (e) {
        console.warn(`Supabase bucket upload (${bucketName}) fallback to data URI:`, e.message);
    }

    // Fallback: In-Database compressed Data URI
    return await processUploadedFile(file);
}

module.exports = {
    uploadToSupabaseStorage
};
