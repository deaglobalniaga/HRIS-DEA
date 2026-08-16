require('dotenv').config();
const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hris_db')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error(err));

const User = require('./models/User');
const EmployeeDetail = require('./models/EmployeeDetail');
const EmploymentRecord = require('./models/EmploymentRecord');
const EmployeeDocument = require('./models/EmployeeDocument');

async function migrate() {
    try {
        console.log("Starting Migration...");
        // Fetch raw documents with lean()
        const users = await User.find({}).lean();
        console.log(`Found ${users.length} users to migrate.`);

        for (const userRaw of users) {
            console.log(`Migrating user: ${userRaw.nama} (${userRaw._id})`);
            
            // 1. Employee Detail
            const detail = new EmployeeDetail({
                user: userRaw._id,
                tempat_lahir: userRaw.tempat_lahir,
                tanggal_lahir: userRaw.tanggal_lahir,
                alamat: userRaw.alamat,
                agama: userRaw.agama,
                status_perkawinan: userRaw.status_perkawinan,
                no_handphone: userRaw.no_handphone,
                email: userRaw.email, // personal email
                kontak_darurat: userRaw.kontak_darurat,
                hubungan: userRaw.hubungan
            });
            await detail.save();

            // 2. Employment Record
            const record = new EmploymentRecord({
                user: userRaw._id,
                no: userRaw.no,
                perusahaan: userRaw.perusahaan,
                penempatan: userRaw.penempatan,
                department: userRaw.department,
                cost_center: userRaw.cost_center,
                jabatan: userRaw.jabatan,
                level: userRaw.level,
                status_karyawan: userRaw.status_karyawan,
                nomor_pkwt: userRaw.nomor_pkwt,
                nik: userRaw.nik,
                nomor_pegawai: userRaw.nomor_pegawai,
                pendidikan: userRaw.pendidikan,
                jurusan: userRaw.jurusan,
                join_date: userRaw.join_date,
                efektif_resign: userRaw.efektif_resign
            });
            await record.save();

            // 3. Employee Document
            const doc = new EmployeeDocument({
                user: userRaw._id,
                status_pajak: userRaw.status_pajak,
                npwp: userRaw.npwp,
                nomor_kpj: userRaw.nomor_kpj,
                nomor_jkn: userRaw.nomor_jkn,
                nama_rekening: userRaw.nama_rekening,
                nomor_rekening: userRaw.nomor_rekening,
                ktp: userRaw.ktp,
                kartu_keluarga: userRaw.kartu_keluarga,
                kartu_npwp: userRaw.kartu_npwp,
                ijazah_transkrip: userRaw.ijazah_transkrip
            });
            await doc.save();

            // 4. Update User References and Clean up old fields
            // Mongoose unset removes the old fields
            await User.collection.updateOne({ _id: userRaw._id }, {
                $set: {
                    employeeDetail: detail._id,
                    employmentRecord: record._id,
                    employeeDocument: doc._id
                },
                $unset: {
                    no: "", nomor_pkwt: "", perusahaan: "", penempatan: "", cost_center: "",
                    level: "", status_karyawan: "", nik: "", tempat_lahir: "",
                    tanggal_lahir: "", alamat: "", pendidikan: "", jurusan: "",
                    status_perkawinan: "", agama: "", no_handphone: "", status_pajak: "",
                    kontak_darurat: "", hubungan: "", email: "", join_date: "",
                    npwp: "", nomor_kpj: "", nomor_jkn: "", ktp: "", kartu_keluarga: "",
                    kartu_npwp: "", ijazah_transkrip: "", nama_rekening: "", nomor_rekening: "",
                    efektif_resign: ""
                }
            });
            console.log(`- Migrated ${userRaw.nama}`);
        }
        
        console.log("Migration Complete!");
        process.exit(0);
    } catch (err) {
        console.error("Migration Failed:", err);
        process.exit(1);
    }
}

migrate();
