const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * NOTIFICATIONS — Notifikasi in-app per karyawan
 * PK: _id
 * FK: user_id → users._id         (penerima notifikasi)
 * FK: triggered_by_id → users._id (siapa yang memicu — optional)
 * INDEX: user_id + is_read (untuk badge notif)
 */
const notificationSchema = new Schema({
    // ── Foreign Keys ──────────────────────────────────────
    user_id:          { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true }, // FK → users._id
    triggered_by_id:  { type: Schema.Types.ObjectId, ref: 'User' },                              // FK → users._id (opsional)

    // ── Konten ────────────────────────────────────────────
    title:            { type: String, required: true },
    message:          { type: String, required: true },
    type:             { type: String, enum: ['info', 'success', 'warning', 'error', 'approval', 'reminder'], default: 'info', index: true },
    link:             { type: String },                       // URL halaman terkait

    // ── Status ────────────────────────────────────────────
    is_read:          { type: Boolean, default: false, index: true },
    read_at:          { type: Date }
}, { timestamps: true });

notificationSchema.index({ user_id: 1, is_read: 1 });        // Untuk hitung badge unread
notificationSchema.index({ createdAt: -1 });                  // Tampilkan notif terbaru dulu

module.exports = mongoose.model('Notification', notificationSchema);
