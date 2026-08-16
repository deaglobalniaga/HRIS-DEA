const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * ATTENDANCES — Rekap absensi harian karyawan
 * PK: _id
 * FK: user_id → users._id
 * INDEX COMPOUND: user_id + tanggal (query paling sering)
 */
const attendanceSchema = new Schema({
    // ── Foreign Key ───────────────────────────────────────
    user_id:          { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true }, // FK → users._id

    // ── Data Kehadiran ────────────────────────────────────
    tanggal:          { type: Date, required: true, index: true },
    status_kehadiran: { type: String, enum: ['Hadir', 'Alpha', 'Cuti', 'Sakit', 'Izin'], default: 'Hadir', index: true },

    // ── Check-In ─────────────────────────────────────────
    check_in:         { type: Date },
    location_in:      { type: String },                       // Koordinat GPS check-in
    photo_in_url:     { type: String },                       // Selfie check-in

    // ── Check-Out ─────────────────────────────────────────
    check_out:        { type: Date },
    location_out:     { type: String },                       // Koordinat GPS check-out
    photo_out_url:    { type: String },                       // Selfie check-out

    // ── Kalkulasi ─────────────────────────────────────────
    total_jam_kerja:  { type: Number },                       // Dalam jam (check_out - check_in)
    keterlambatan:    { type: Number, default: 0 },           // Dalam menit
    keterangan:       { type: String }
}, { timestamps: true });

attendanceSchema.index({ user_id: 1, tanggal: -1 });         // Compound index untuk query per user per bulan

module.exports = mongoose.model('Attendance', attendanceSchema);
