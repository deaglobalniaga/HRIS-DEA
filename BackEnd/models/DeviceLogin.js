const mongoose = require('mongoose');

const deviceLoginSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    device_id: { type: String, required: true },
    browser: { type: String },
    ip: { type: String },
    last_active: { type: Date, default: Date.now }
}, {
    timestamps: true
});

module.exports = mongoose.model('DeviceLogin', deviceLoginSchema);
