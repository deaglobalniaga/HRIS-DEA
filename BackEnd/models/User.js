const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * USERS — Tabel utama autentikasi & identitas
 * PK: _id
 * FK: department_id → departments._id
 * VIRTUAL FK (1:1): employee_details, employment_records, employee_documents
 */
const userSchema = new Schema({
    // ── Identitas Login ──────────────────────────────────
    username:       { type: String, required: true, unique: true, trim: true, index: true },
    password:       { type: String, required: true },
    nama:           { type: String, required: true, trim: true, index: true },
    email_office:   { type: String, trim: true, lowercase: true },
    nomor_pegawai:  { type: String, trim: true },
    foto_url:       { type: String },

    // ── Role & Departemen ─────────────────────────────────
    role:           { type: String, enum: ['user', 'admin', 'superadmin'], default: 'user', index: true },
    department:     { type: Schema.Types.ObjectId, ref: 'Department', index: true },
    department_id:  { type: Schema.Types.ObjectId, ref: 'Department', index: true },  // FK → departments._id

    // ── Keamanan Login ────────────────────────────────────
    is_first_login: { type: Boolean, default: true },
    mfa_enabled:    { type: Boolean, default: false },
    mfa_secret:     { type: String },
    recovery_email: { type: String },

    // ── Akses Absensi ─────────────────────────────────────
    attendance_camera_access: { type: Boolean, default: true },
    attendance_gps_access:    { type: Boolean, default: true },

    // ── Metadata ──────────────────────────────────────────
    last_active:    { type: Date },
    is_active:      { type: Boolean, default: true }
}, {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual FK (1:1) — lazy populate saat profil dibuka
userSchema.virtual('employee_detail', {
    ref: 'EmployeeDetail', localField: '_id', foreignField: 'user_id', justOne: true
});
userSchema.virtual('employment_record', {
    ref: 'EmploymentRecord', localField: '_id', foreignField: 'user_id', justOne: true
});
userSchema.virtual('employee_document', {
    ref: 'EmployeeDocument', localField: '_id', foreignField: 'user_id', justOne: true
});

module.exports = mongoose.model('User', userSchema);
