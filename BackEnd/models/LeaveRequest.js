const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * LEAVE_REQUESTS — Pengajuan cuti, izin, & sakit
 * PK: _id
 * FK: user_id → users._id
 * FK: approved_by_id → users._id  (nullable)
 */
const leaveRequestSchema = new Schema({
    // ── Foreign Keys ──────────────────────────────────────
    user_id:         { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true }, // FK → users._id
    approved_by_id:  { type: Schema.Types.ObjectId, ref: 'User' },                              // FK → users._id (admin/atasan)

    // ── Data Pengajuan ────────────────────────────────────
    leave_type:      { type: String, required: true, enum: ['Cuti Tahunan', 'Cuti Bersama', 'Sakit', 'Izin', 'Cuti Melahirkan', 'Cuti Penting'] },
    start_date:      { type: Date, required: true, index: true },
    end_date:        { type: Date, required: true },
    total_hari:      { type: Number },                        // Otomatis dihitung dari start_date - end_date
    reason:          { type: String },
    attachment_url:  { type: String },                        // Surat dokter / bukti pendukung

    // ── Status Persetujuan ────────────────────────────────
    status:          { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending', index: true },
    catatan_admin:   { type: String },                        // Keterangan dari admin saat approve/reject
    approved_at:     { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);
