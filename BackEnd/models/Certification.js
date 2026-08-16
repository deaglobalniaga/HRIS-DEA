const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * CERTIFICATIONS — Sertifikat HSE & profesional karyawan
 * PK: _id
 * FK: user_id → users._id
 * FK: created_by_id → users._id  (HSE admin yang menginput)
 * INDEX: tanggal_kadaluarsa (untuk monitoring sertifikat hampir expired)
 */
const certificationSchema = new Schema({
    // ── Foreign Keys ──────────────────────────────────────
    user_id:              { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true }, // FK → users._id
    created_by_id:        { type: Schema.Types.ObjectId, ref: 'User' },                              // FK → users._id (HSE admin)

    // ── Data Sertifikat ───────────────────────────────────
    nama_sertifikat:      { type: String, required: true },
    kode_sertifikat:      { type: String },
    jenis_sertifikat:     { type: String, enum: ['K3', 'Kompetensi', 'Profesi', 'Keahlian', 'Lainnya'] },
    institusi_penerbit:   { type: String },
    nomor_sertifikat:     { type: String },

    // ── Periode Berlaku ───────────────────────────────────
    tanggal_diterbitkan:  { type: Date },
    tanggal_kadaluarsa:   { type: Date, index: true },        // INDEX — untuk alert expired monitoring
    durasi_berlaku_bulan: { type: Number },                   // Otomatis dihitung dari tanggal

    // ── Status & Dokumen ──────────────────────────────────
    status_sertifikat:    { type: String, enum: ['Aktif', 'Expired', 'Pending Renewal'], default: 'Aktif', index: true },
    attachment_url:       { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Certification', certificationSchema);
