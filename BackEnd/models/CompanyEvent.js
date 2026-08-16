const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * COMPANY_EVENTS — Agenda & event resmi perusahaan pada kalender
 * PK: _id
 * FK: created_by_id → users._id  (admin yang membuat)
 * INDEX: event_date (diquery per bulan untuk kalender)
 */
const companyEventSchema = new Schema({
    // ── Foreign Key ───────────────────────────────────────
    created_by_id:  { type: Schema.Types.ObjectId, ref: 'User' }, // FK → users._id

    // ── Data Event ────────────────────────────────────────
    title:          { type: String, required: true },
    description:    { type: String },
    event_type:     { type: String, enum: ['Libur Nasional', 'Rapat', 'Training', 'Acara Perusahaan', 'Lainnya'], default: 'Lainnya' },
    lokasi:         { type: String },

    // ── Waktu ─────────────────────────────────────────────
    event_date:     { type: Date, required: true, index: true },
    event_end_date: { type: Date },
    is_all_day:     { type: Boolean, default: true },

    // ── Visibilitas ───────────────────────────────────────
    visible_to:     { type: String, enum: ['semua', 'admin', 'specific_dept'], default: 'semua' }
}, { timestamps: true });

module.exports = mongoose.model('CompanyEvent', companyEventSchema);
