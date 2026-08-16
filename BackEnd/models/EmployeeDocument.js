const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * EMPLOYEE_DOCUMENTS — Dokumen resmi & data keuangan karyawan
 * PK: _id
 * FK: user_id → users._id  (UNIQUE — relasi 1:1)
 */
const employeeDocumentSchema = new Schema({
    // ── Foreign Key ───────────────────────────────────────
    user_id:                    { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true }, // FK → users._id

    // ── Dokumen Identitas ─────────────────────────────────
    no_ktp:                     { type: String },
    ktp_file_url:               { type: String }, // Dari excel: KTP (paste link)
    kartu_keluarga:             { type: String }, // Dari excel: Kartu Keluarga (paste link)
    kk_file_url:                { type: String },

    // ── Data Pajak ────────────────────────────────────────
    npwp:                       { type: String }, // Dari excel: NPWP
    kartu_npwp:                 { type: String }, // Dari excel: Kartu NPWP (paste link)
    npwp_file_url:              { type: String },
    status_pajak:               { type: String },             // TK/0, K/0, K/1, K/2, K/3

    // ── BPJS ──────────────────────────────────────────────
    nomor_kpj:                  { type: String },             // BPJS Ketenagakerjaan
    nomor_jkn:                  { type: String },             // BPJS Kesehatan

    // ── Ijazah ────────────────────────────────────────────
    ijazah_transkrip:           { type: String }, // Dari excel: Ijazah dan Transkrip Nilai (paste link)
    ijazah_file_url:            { type: String },

    // ── Rekening Bank ─────────────────────────────────────
    nama_bank:                  { type: String },
    nama_rekening:              { type: String },
    nomor_rekening:             { type: String },

    // ── Dokumen Tambahan ──────────────────────────────────
    cv_file_url:                { type: String },
    foto_karyawan_url:          { type: String }
}, { timestamps: true });

module.exports = mongoose.model('EmployeeDocument', employeeDocumentSchema);
