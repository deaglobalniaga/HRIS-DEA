/**
 * makeSuperadmin.js
 * ─────────────────────────────────────────────────────────────
 * Script untuk membuat atau upgrade akun menjadi SUPERADMIN
 * 
 * CARA PAKAI:
 *   node makeSuperadmin.js                          → upgrade akun "aryatony" (default)
 *   node makeSuperadmin.js username_kamu            → upgrade username tertentu
 *   node makeSuperadmin.js username_baru newpass123 → buat akun superadmin baru
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../BackEnd/.env') });

const targetUsername = process.argv[2] || 'aryatony';
const targetPassword = process.argv[3] || null; // null = keep existing password

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hris_db').then(async () => {
    const User = require('../BackEnd/models/User');
    
    // Cek apakah user sudah ada
    const existing = await User.findOne({ username: targetUsername });
    
    if (existing) {
        // ── UPGRADE AKUN YANG SUDAH ADA ──────────────────────
        const updateData = {
            role: 'superadmin',
            is_first_login: false,
        };
        if (targetPassword) {
            updateData.password = await bcrypt.hash(targetPassword, 10);
        }
        await User.findByIdAndUpdate(existing._id, { $set: updateData });
        console.log('');
        console.log('[OK] Akun berhasil diupgrade ke SUPERADMIN!');
        console.log('──────────────────────────────────────────');
        console.log('  Username  :', existing.username);
        console.log('  Nama      :', existing.nama);
        console.log('  Role Baru :', 'superadmin');
        if (targetPassword) console.log('  Password  :', targetPassword, '(sudah diubah)');
        else console.log('  Password  :', '(tidak berubah)');
        console.log('──────────────────────────────────────────');
        console.log('');
    } else {
        // ── BUAT AKUN SUPERADMIN BARU ─────────────────────────
        const rawPassword = targetPassword || targetUsername + '123';
        const hashedPassword = await bcrypt.hash(rawPassword, 10);
        
        const newUser = new User({
            username: targetUsername,
            nama: targetUsername,
            password: hashedPassword,
            role: 'superadmin',
            is_first_login: false,
            email_office: `${targetUsername}@dea.co.id`,
        });
        await newUser.save();
        
        console.log('');
        console.log('[OK] Akun SUPERADMIN baru berhasil dibuat!');
        console.log('──────────────────────────────────────────');
        console.log('  Username :', targetUsername);
        console.log('  Password :', rawPassword);
        console.log('  Role     :', 'superadmin');
        console.log('──────────────────────────────────────────');
        console.log('');
    }
    
    mongoose.disconnect();
}).catch(err => {
    console.error('[ERROR]', err.message);
    process.exit(1);
});
