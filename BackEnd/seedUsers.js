const mongoose = require('mongoose');
const xlsx = require('xlsx');
const path = require('path');
const User = require('./models/User');

const dotenv = require('dotenv');
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hris_db';

async function seedData() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        // Path to Excel file
        const excelPath = path.join(__dirname, '../tabel user.xlsx');
        const workbook = xlsx.readFile(excelPath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON
        const rawData = xlsx.utils.sheet_to_json(worksheet);
        
        console.log(`Found ${rawData.length} rows in Excel.`);
        
        // Clear existing data (optional, but good for a fresh start)
        await User.deleteMany({});
        console.log('Cleared existing users');

        const usersToInsert = rawData.map((row, index) => {
            // Helper to handle dates correctly from Excel
            const parseDate = (excelDate) => {
                if (!excelDate) return undefined;
                let date;
                if (typeof excelDate === 'number') {
                    // Excel dates are number of days since Jan 1, 1900
                    date = new Date(Math.round((excelDate - 25569) * 86400 * 1000));
                } else {
                    date = new Date(excelDate);
                }
                return isNaN(date.valueOf()) ? undefined : date;
            };

            return {
                no: row['NO'],
                nomor_pkwt: row['NOMOR PKWT'],
                nama: row['NAMA'] || `Unknown Name ${index}`,
                perusahaan: row['PERUSAHAAN'],
                penempatan: row['PENEMPATAN'],
                department: row['DEPARTMENT'],
                cost_center: row['COST CENTER'],
                jabatan: row['JABATAN'],
                level: row['LEVEL'],
                status_karyawan: row['STATUS KARYAWAN'],
                nomor_pegawai: row['NOMOR PEGAWAI'] ? String(row['NOMOR PEGAWAI']) : undefined,
                nik: row['NIK'] ? String(row['NIK']) : undefined,
                tempat_lahir: row['TEMPAT LAHIR'],
                tanggal_lahir: parseDate(row['TANGGAL LAHIR']),
                alamat: row['ALAMAT'],
                pendidikan: row['PENDIDIKAN'],
                jurusan: row['JURUSAN'],
                status_perkawinan: row['STATUS PERKAWINAN'],
                agama: row['AGAMA'],
                no_handphone: row['NO HANDPHONE'] ? String(row['NO HANDPHONE']) : undefined,
                status_pajak: row['STATUS PAJAK'],
                kontak_darurat: row['KONTAK DARURAT'] ? String(row['KONTAK DARURAT']) : undefined,
                hubungan: row['HUBUNGAN'],
                email: row['EMAIL'],
                email_office: row['EMAIL OFFICE'],
                join_date: parseDate(row['Join Date']),
                npwp: row['NPWP'] ? String(row['NPWP']) : undefined,
                nomor_kpj: row['Nomor KPJ'] ? String(row['Nomor KPJ']) : undefined,
                nomor_jkn: row['Nomor JKN'] ? String(row['Nomor JKN']) : undefined,
                ktp: row['KTP'],
                kartu_keluarga: row['Kartu Keluarga'],
                kartu_npwp: row['Kartu NPWP'],
                ijazah_transkrip: row['Ijazah dan Transkrip Nilai'],
                nama_rekening: row['NAMA REKENING'],
                nomor_rekening: row['NOMOR REKENING'] ? String(row['NOMOR REKENING']) : undefined,
                efektif_resign: parseDate(row['EFEKTIF RESIGN']),
                
                // Set default system fields if available
                username: row['EMAIL OFFICE'] ? row['EMAIL OFFICE'].split('@')[0] : `user${index}`,
                password: 'password123', // Default password for everyone
                role: 'employee'
            };
        });

        await User.insertMany(usersToInsert);
        console.log(`Successfully seeded ${usersToInsert.length} users into MongoDB!`);
        
    } catch (error) {
        console.error('Error seeding data:', error);
    } finally {
        mongoose.disconnect();
    }
}

seedData();
