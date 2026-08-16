const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * EMPLOYEE_DETAILS — Data pribadi karyawan
 * PK: _id
 * FK: user_id → users._id  (UNIQUE — relasi 1:1)
 */
const employeeDetailSchema = new Schema({
    // ── Foreign Key ───────────────────────────────────────
    user_id:                { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },  // FK → users._id

    // ── Data Pribadi ──────────────────────────────────────
    tempat_lahir:           { type: String },
    tanggal_lahir:          { type: Date },
    jenis_kelamin:          { type: String, enum: ['Laki-laki', 'Perempuan'] },
    agama:                  { type: String },
    status_perkawinan:      { type: String },
    alamat:                 { type: String },

    // ── Pendidikan ────────────────────────────────────────
    pendidikan:             { type: String },
    jurusan:                { type: String },

    // ── Kontak ────────────────────────────────────────────
    no_handphone:           { type: String },
    email:                  { type: String }, // Dari excel: EMAIL (pribadi)

    // ── Kontak Darurat ────────────────────────────────────
    kontak_darurat:         { type: String }, // Dari excel: KONTAK DARURAT
    hubungan:               { type: String }  // Dari excel: HUBUNGAN
}, { timestamps: true });

module.exports = mongoose.model('EmployeeDetail', employeeDetailSchema);
