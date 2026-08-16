const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * DEPARTMENTS — Master data departemen/divisi perusahaan
 * PK: _id
 * Direferensikan oleh: users.department_id
 */
const departmentSchema = new Schema({
    name:        { type: String, required: true, unique: true, trim: true },
    code:        { type: String, trim: true },         // e.g. HRGA, HSE, OPS
    description: { type: String },
    parent_id:   { type: Schema.Types.ObjectId, ref: 'Department', default: null },
    position_x:  { type: Number, default: 0 },
    position_y:  { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Department', departmentSchema);
