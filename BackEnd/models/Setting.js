const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * SETTINGS — Konfigurasi global sistem HRIS
 * PK: _id
 * INDEX: key (UNIQUE — satu key, satu value)
 * Tidak memiliki FK karena ini adalah tabel konfigurasi global
 */
const settingSchema = new Schema({
    // ── Data Setting ──────────────────────────────────────
    key:         { type: String, required: true, unique: true, trim: true, index: true }, // e.g. company_name, logo_url
    value:       { type: Schema.Types.Mixed, required: true },
    label:       { type: String },                            // Label tampilan di UI settings
    description: { type: String },                            // Penjelasan fungsi setting
    category:    { type: String, enum: ['perusahaan', 'sistem', 'kehadiran', 'cuti', 'notifikasi'], default: 'sistem' },
    is_public:   { type: Boolean, default: false }            // Apakah bisa diakses tanpa login
}, { timestamps: true });

module.exports = mongoose.model('Setting', settingSchema);
