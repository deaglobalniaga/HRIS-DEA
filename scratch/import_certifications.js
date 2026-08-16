const XLSX = require('xlsx');
const mongoose = require('mongoose');

// ==========================================
// KONFIGURASI DATABASE
// ==========================================
const MONGO_URI = 'mongodb://127.0.0.1:27017/hris_db';
const MAINTENANCE_FILE = './DATA SERTIFIKASI TIM MAINTENANCE.xlsx';
const PROJECT_FILE = './DATA SERTIFIKASI TIM PROJECT.xlsx';


async function importCertifications() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Terhubung ke database MongoDB');
    const db = mongoose.connection.db;

    // Ambil semua user untuk pencocokan nama
    const users = await db.collection('users').find({}).toArray();
    console.log(`Berhasil memuat ${users.length} pengguna dari database.`);

    const userMap = {};
    users.forEach(u => {
        if(u.nama) {
            userMap[u.nama.trim().toLowerCase()] = u._id;
        }
    });

    let totalImported = 0;

    // ==========================================
    // 1. IMPORT DATA MAINTENANCE
    // ==========================================
    console.log('\n🔄 Membaca file Sertifikasi Maintenance...');
    const wbMaint = XLSX.readFile(MAINTENANCE_FILE);
    const wsMaint = wbMaint.Sheets[wbMaint.SheetNames[0]];
    const dataMaint = XLSX.utils.sheet_to_json(wsMaint, { header: 1 });
    
    // Header baris ke-1
    const headerMaint = dataMaint[0]; 
    // Data mulai baris ke-2
    for (let i = 1; i < dataMaint.length; i++) {
        const row = dataMaint[i];
        if (!row || row.length === 0) continue;

        const namaLengkap = row[2]; // Index 2: Nama Lengkap
        const sertifikasiDimiliki = row[3]; // Index 3: Sertifikasi yang dimiliki (comma separated)

        if (!namaLengkap || !sertifikasiDimiliki) continue;

        const userId = userMap[namaLengkap.trim().toLowerCase()];
        if (!userId) {
            // Uncomment if you want to see missing users
            // console.log(`[SKIPPED] Karyawan tidak ditemukan: ${namaLengkap}`);
            continue;
        }

        // Parsing sertifikat yang dimiliki dari kolom D
        const certList = sertifikasiDimiliki.split(',').map(c => c.trim());
        
        for (const certName of certList) {
            if(!certName || certName === '-') continue;

            const existing = await db.collection('certifications').findOne({ 
                user_id: userId, 
                nama_sertifikat: certName 
            });

            if (!existing) {
                await db.collection('certifications').insertOne({
                    user_id: userId,
                    nama_sertifikat: certName,
                    institusi_penerbit: 'Imported dari Excel',
                    jenis_sertifikat: 'Lainnya',
                    status_sertifikat: 'Aktif',
                    tanggal_diterbitkan: new Date(),
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
                totalImported++;
            }
        }
    }

    // ==========================================
    // 2. IMPORT DATA PROJECT
    // ==========================================
    console.log('\n🔄 Membaca file Sertifikasi Project...');
    const wbProj = XLSX.readFile(PROJECT_FILE);
    const wsProj = wbProj.Sheets[wbProj.SheetNames[0]];
    const dataProj = XLSX.utils.sheet_to_json(wsProj, { header: 1 });
    
    // Header baris ke-2
    for (let i = 2; i < dataProj.length; i++) {
        const row = dataProj[i];
        if (!row || row.length === 0) continue;

        const namaLengkap = row[2]; // Index 2: Nama Lengkap
        const sertifikasiDimiliki = row[3]; // Index 3: Sertifikasi yang dimiliki 

        if (!namaLengkap || !sertifikasiDimiliki) continue;

        const userId = userMap[namaLengkap.trim().toLowerCase()];
        if (!userId) continue;

        const certList = sertifikasiDimiliki.split(',').map(c => c.trim());
        
        for (const certName of certList) {
            if(!certName || certName === '-') continue;

            const existing = await db.collection('certifications').findOne({ 
                user_id: userId, 
                nama_sertifikat: certName 
            });

            if (!existing) {
                await db.collection('certifications').insertOne({
                    user_id: userId,
                    nama_sertifikat: certName,
                    institusi_penerbit: 'Imported dari Excel',
                    jenis_sertifikat: 'Lainnya',
                    status_sertifikat: 'Aktif',
                    tanggal_diterbitkan: new Date(),
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
                totalImported++;
            }
        }
    }

    console.log('\n=============================================');
    console.log(`✅ SELESAI! Berhasil mengimport ${totalImported} sertifikat baru.`);
    console.log('=============================================');

  } catch (error) {
    console.error('❌ Gagal melakukan import:', error);
  } finally {
    mongoose.disconnect();
  }
}

importCertifications();
