const supabase = require('../config/supabase');

const cities = [
    'Tanah Bumbu', 'Batulicin', 'Banjarmasin', 'Banjarbaru', 'Kotabaru', 
    'Angsana', 'Kusan Hilir', 'Satui', 'Pelaihari', 'Palangka Raya', 
    'Balikpapan', 'Samarinda'
];

const educations = [
    { pend: 'S1', jur: 'Teknik Elektro' },
    { pend: 'S1', jur: 'Teknik Informatika' },
    { pend: 'S1', jur: 'Teknik Telekomunikasi' },
    { pend: 'S1', jur: 'Sistem Informasi' },
    { pend: 'S1', jur: 'Teknik Mesin' },
    { pend: 'D3', jur: 'Teknik Komputer & Jaringan' },
    { pend: 'D3', jur: 'Teknik Listrik' },
    { pend: 'SMA/SMK', jur: 'Teknik Instalasi Tenaga Listrik' },
    { pend: 'SMA/SMK', jur: 'Rekayasa Perangkat Lunak' },
    { pend: 'S1', jur: 'Manajemen' }
];

async function updateAllEmployees() {
    const { data: emps, error } = await supabase.from('employees').select('id, nama_lengkap, nomor_pegawai, department_id, jabatan, penempatan, level').order('nomor_pegawai');
    if (error) {
        console.error('Error fetching employees:', error);
        return;
    }

    console.log('Populating data for ' + emps.length + ' employees...');

    for (let i = 0; i < emps.length; i++) {
        const emp = emps[i];
        const numIdx = i + 1;
        const padIdx = String(numIdx).padStart(3, '0');
        const year = 1988 + (i % 12);
        const month = String(1 + (i % 12)).padStart(2, '0');
        const day = String(1 + ((i * 3) % 28)).padStart(2, '0');
        const birthDate = `${year}-${month}-${day}`;
        const city = cities[i % cities.length];
        const edu = educations[i % educations.length];
        const nik = `6308${month}${day}${String(year).slice(-2)}${padIdx}1`;
        const pkwt = `${padIdx}/DEA/PKWT-1/VI/2026`;
        const alamat = `Jl. Raya Batulicin - Angsana KM ${(i % 30) + 1}, RT 0${(i % 5) + 1}/RW 01, ${city}, Kalimantan Selatan`;
        const phone = `081250${String(100000 + i * 137).slice(-6)}`;
        const npwp = `${String(1234567890123450 + i * 791)}`;
        const kpj = `${String(12345678901 + i * 111)}`;
        const jkn = `${String(3201234567890 + i * 313)}`;
        const rekening = `${String(1391013283000 + i * 417)}`;

        // Update employees table
        await supabase.from('employees').update({
            nomor_pkwt: pkwt,
            nik: nik,
            tempat_lahir: city,
            tanggal_lahir: birthDate,
            alamat: alamat,
            pendidikan: edu.pend,
            jurusan: edu.jur,
            status_perkawinan: (i % 3 === 0) ? 'Belum Menikah' : 'Menikah',
            agama: (i % 7 === 0) ? 'Kristen' : 'Islam',
            no_handphone: phone,
            perusahaan: 'PT DEA GLOBAL NIAGA',
            penempatan: emp.penempatan || 'Site BIB',
            level: emp.level || 'LEVEL 6 (ENGINEER/TEKNISI)',
            status_karyawan: 'Aktif',
            join_date: '2026-01-01'
        }).eq('id', emp.id);

        // Check / Update employee_details table
        const { data: existingDetail } = await supabase.from('employee_details').select('id').eq('employee_id', emp.id).maybeSingle();
        if (existingDetail) {
            await supabase.from('employee_details').update({
                email_office: emp.nama_lengkap.toLowerCase().replace(/[^a-z0-9]/g, '_') + '@deaglobalniaga.com',
                status_pajak: (i % 3 === 0) ? 'TK/0' : 'K/1',
                npwp: npwp,
                nomor_kpj: kpj,
                nomor_jkn: jkn,
                kontak_darurat_nama: 'Keluarga (' + emp.nama_lengkap.split(' ')[0] + ')',
                kontak_darurat_nomor: '0812' + String(55500000 + i * 97).slice(-8),
                kontak_darurat_hubungan: (i % 3 === 0) ? 'Orang Tua' : 'Pasangan/Istri',
                nama_rekening: emp.nama_lengkap.toUpperCase(),
                nomor_rekening: rekening
            }).eq('id', existingDetail.id);
        } else {
            await supabase.from('employee_details').insert({
                employee_id: emp.id,
                email_office: emp.nama_lengkap.toLowerCase().replace(/[^a-z0-9]/g, '_') + '@deaglobalniaga.com',
                status_pajak: (i % 3 === 0) ? 'TK/0' : 'K/1',
                npwp: npwp,
                nomor_kpj: kpj,
                nomor_jkn: jkn,
                kontak_darurat_nama: 'Keluarga (' + emp.nama_lengkap.split(' ')[0] + ')',
                kontak_darurat_nomor: '0812' + String(55500000 + i * 97).slice(-8),
                kontak_darurat_hubungan: (i % 3 === 0) ? 'Orang Tua' : 'Pasangan/Istri',
                nama_rekening: emp.nama_lengkap.toUpperCase(),
                nomor_rekening: rekening
            });
        }
    }

    console.log('Successfully updated ALL employees with complete corporate data!');
}

updateAllEmployees();
