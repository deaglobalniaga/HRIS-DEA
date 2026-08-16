const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * KPI_APPRAISALS — Penilaian kinerja KPI bulanan
 * PK: _id
 * FK: user_id → users._id        (karyawan yang dinilai)
 * FK: evaluator_id → users._id   (manager/atasan penilai — self-reference ke users)
 * INDEX COMPOUND: user_id + tahun + bulan
 */
const kpiAppraisalSchema = new Schema({
    // ── Foreign Keys ──────────────────────────────────────
    user_id:            { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true }, // FK → users._id (dinilai)
    evaluator_id:       { type: Schema.Types.ObjectId, ref: 'User' },                              // FK → users._id (penilai)

    // ── Periode ───────────────────────────────────────────
    periode:            { type: String },                     // e.g. "Januari 2025"
    bulan:              { type: Number, min: 1, max: 12, index: true },
    tahun:              { type: Number, index: true },
    evaluation_date:    { type: Date },

    // ── Skor KPI ──────────────────────────────────────────
    skor_target:        { type: Number },                     // Target performa
    skor_aktual:        { type: Number },                     // Skor aktual yang dicapai
    persentase:         { type: Number },                     // (skor_aktual / skor_target) * 100

    // ── Penilaian ─────────────────────────────────────────
    grade:              { type: String, enum: ['A', 'B', 'C', 'D', 'E'] },
    rating:             { type: Number, min: 1, max: 5 },    // Rating 1-5
    feedback_manager:   { type: String },
    catatan_karyawan:   { type: String },

    // ── Metrics Detail ────────────────────────────────────
    metrics:            { type: Schema.Types.Mixed }          // Data KPI detail (fleksibel per jabatan)
}, { timestamps: true });

kpiAppraisalSchema.index({ user_id: 1, tahun: -1, bulan: -1 });    // Query laporan per periode
kpiAppraisalSchema.index({ evaluator_id: 1 });

module.exports = mongoose.model('KPIAppraisal', kpiAppraisalSchema);
