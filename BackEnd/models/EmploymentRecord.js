const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * EMPLOYMENT_RECORDS — Data kepegawaian & roster tambang
 * PK: _id
 * FK: user_id → users._id     (UNIQUE — relasi 1:1)
 * FK: department_id → departments._id
 */
const employmentRecordSchema = new Schema({
    // ── Foreign Keys ──────────────────────────────────────
    user_id:          { type: Schema.Types.ObjectId, ref: 'User',       required: true, unique: true, index: true }, // FK → users._id
    department_id:    { type: Schema.Types.ObjectId, ref: 'Department', index: true },                               // FK → departments._id

    // ── Identitas Kepegawaian ─────────────────────────────
    nik:              { type: String, index: true },          // Nomor Induk Karyawan — dipakai sebagai default password
    nomor_pkwt:       { type: String },

    // ── Penempatan ────────────────────────────────────────
    perusahaan:       { type: String },
    penempatan:       { type: String },                       // Lokasi kerja (site/kantor)
    cost_center:      { type: String },
    jabatan:          { type: String },
    level:            { type: String },                       // Staff / Senior / Supervisor / Manager

    // ── Status Karyawan ───────────────────────────────────
    status_karyawan:  { type: String },
    join_date:        { type: Date },
    efektif_resign:   { type: Date },

    // ── Roster Pertambangan ───────────────────────────────
    roster_type:       { type: String, enum: ['8/2', '6/2'], default: '8/2' }, // 8/6 minggu kerja, 2 minggu cuti
    roster_start_date: { type: Date }                         // Anchor date untuk kalkulasi siklus otomatis
}, { timestamps: true });

module.exports = mongoose.model('EmploymentRecord', employmentRecordSchema);
