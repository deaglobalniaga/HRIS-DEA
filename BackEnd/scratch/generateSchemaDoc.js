const {
    Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun,
    HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
    TableHeader, VerticalAlign, convertInchesToTwip, ImageRun
} = require('docx');
const fs = require('fs');
const path = require('path');

const COLORS = {
    primary:    '8B1A1A', // Merah tua
    secondary:  'C0392B', // Merah terang
    accent:     'F5F5F5', // Abu-abu latar
    header:     '2C2C2C', // Hitam gelap
    subheader:  '444444',
    white:      'FFFFFF',
    border:     'CCCCCC',
    blue:       '2E5FA3',
    green:      '27AE60',
    purple:     '8E44AD',
};

function heading1(text) {
    return new Paragraph({
        text,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
        children: [new TextRun({ text, bold: true, size: 36, color: COLORS.primary })]
    });
}

function heading2(text) {
    return new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 150 },
        children: [new TextRun({ text, bold: true, size: 28, color: COLORS.blue })]
    });
}

function heading3(text) {
    return new Paragraph({
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 200, after: 100 },
        children: [new TextRun({ text, bold: true, size: 24, color: COLORS.purple })]
    });
}

function para(text, opts = {}) {
    return new Paragraph({
        spacing: { before: 80, after: 80 },
        children: [new TextRun({ text, size: opts.size || 22, color: opts.color || COLORS.header, bold: opts.bold || false, italics: opts.italic || false })]
    });
}

function bullet(text) {
    return new Paragraph({
        bullet: { level: 0 },
        spacing: { before: 60, after: 60 },
        children: [new TextRun({ text, size: 22, color: COLORS.subheader })]
    });
}

function divider() {
    return new Paragraph({ text: '', border: { bottom: { color: COLORS.border, space: 1, style: BorderStyle.SINGLE, size: 6 } }, spacing: { before: 100, after: 100 } });
}

function makeTableHeaderCell(text, color = COLORS.primary) {
    return new TableCell({
        shading: { type: ShadingType.CLEAR, fill: color, color },
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 80 }, children: [new TextRun({ text, bold: true, color: COLORS.white, size: 18 })] })]
    });
}

function makeTableCell(text, shade = false) {
    return new TableCell({
        shading: shade ? { type: ShadingType.CLEAR, fill: 'F9F9F9', color: 'F9F9F9' } : undefined,
        verticalAlign: VerticalAlign.CENTER,
        margins: { top: 60, bottom: 60, left: 100, right: 100 },
        children: [new Paragraph({ spacing: { before: 40, after: 40 }, children: [new TextRun({ text: text || '-', size: 18, color: COLORS.subheader })] })]
    });
}

function makeSchemaTable(title, color, columns, rows) {
    const tableRows = [
        new TableRow({
            tableHeader: true,
            children: columns.map(c => makeTableHeaderCell(c, color))
        }),
        ...rows.map((row, idx) =>
            new TableRow({
                children: row.map(cell => makeTableCell(cell, idx % 2 === 1))
            })
        )
    ];

    return [
        heading3(title),
        new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: tableRows,
        }),
        new Paragraph({ text: '', spacing: { after: 200 } })
    ];
}

async function generateDoc() {
    const sections = [];

    // ─── COVER ───────────────────────────────────────────────────────────────
    sections.push(
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 1200, after: 400 },
            children: [new TextRun({ text: 'HRIS DEA', bold: true, size: 72, color: COLORS.primary })]
        }),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 200 },
            children: [new TextRun({ text: 'Desain Skema Database Terbaru', bold: true, size: 40, color: COLORS.blue })]
        }),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 600 },
            children: [new TextRun({ text: 'Human Resource Information System – DEA Global Niaga', size: 24, color: COLORS.subheader, italics: true })]
        }),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 1200 },
            children: [new TextRun({ text: `Versi 3.0 | ${new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}`, size: 22, color: COLORS.border })]
        }),
        divider(),
    );

    const diagramPath = 'C:\\\\Users\\\\KRAVEN\\\\.gemini\\\\antigravity-ide\\\\brain\\\\f72ca294-9fe4-4042-b33b-b85c1e18538b\\\\hris_er_diagram_1786500329802.png';
    const diagramBuffer = fs.readFileSync(diagramPath);

    // ─── 1. PENGANTAR ────────────────────────────────────────────────────────
    sections.push(
        heading1('1. Pengantar & Arsitektur Umum'),
        para('Sistem HRIS DEA menggunakan MongoDB sebagai basis data NoSQL. Skema dirancang untuk bersifat lean, performan, dan sepenuhnya relasional secara logis menggunakan Foreign Key berbasis ObjectId.'),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
                new ImageRun({
                    data: diagramBuffer,
                    transformation: {
                        width: 600,
                        height: 400
                    }
                })
            ]
        }),
        para('Arsitektur database dibagi menjadi dua bagian utama:', { bold: true }),
        bullet('Pemecahan Tabel User (4 Koleksi Berelasi 1:1) — untuk mencakup seluruh 36 kolom dari file Tabel User.xlsx tanpa membebani satu koleksi.'),
        bullet('Tabel Fitur Pendukung (1 Koleksi per Fitur) — Absensi, Cuti, Sertifikasi, Timesheet, KPI, dll.'),
        new Paragraph({ text: '', spacing: { after: 200 } }),
    );

    // ─── 2. STRUKTUR UTAMA USER ──────────────────────────────────────────────
    sections.push(
        heading1('2. Pemecahan Struktur Tabel User'),
        para('Data karyawan dipecah menjadi 4 koleksi ringan yang berelasi 1:1 menggunakan foreign key user_id → users._id.'),
        divider(),
    );

    // 2.1 users
    sections.push(...makeSchemaTable(
        '2.1 Koleksi: users (Autentikasi & Identitas Utama)',
        COLORS.primary,
        ['Atribut', 'Tipe Data', 'Keterangan'],
        [
            ['_id', 'ObjectId', 'Primary Key — Auto Generated'],
            ['username', 'String', 'UNIQUE Index (default: email/NIK)'],
            ['password', 'String', 'Hashed bcrypt (default: NIK karyawan)'],
            ['nama', 'String', 'NAMA LENGKAP (Kolom Excel)'],
            ['email_office', 'String', 'EMAIL OFFICE (Kolom Excel)'],
            ['nomor_pegawai', 'String', 'NOMOR PEGAWAI (Kolom Excel)'],
            ['role', 'String', 'Enum: user | admin | superadmin'],
            ['department', 'ObjectId', 'FK → departments._id'],
            ['is_first_login', 'Boolean', 'Wajib ganti password di login pertama'],
            ['mfa_enabled', 'Boolean', 'Status 2FA Authenticator'],
            ['foto_url', 'String', 'URL Foto Profil'],
            ['createdAt', 'Date', 'Auto Timestamp'],
            ['updatedAt', 'Date', 'Auto Timestamp'],
        ]
    ));

    // 2.2 employeedetails
    sections.push(...makeSchemaTable(
        '2.2 Koleksi: employeedetails (Data Pribadi)',
        COLORS.blue,
        ['Atribut', 'Tipe Data', 'Keterangan / Kolom Excel'],
        [
            ['_id', 'ObjectId', 'Primary Key'],
            ['user_id', 'ObjectId', 'FK → users._id (Unique Index)'],
            ['tempat_lahir', 'String', 'TEMPAT LAHIR'],
            ['tanggal_lahir', 'Date', 'TANGGAL LAHIR'],
            ['alamat', 'String', 'ALAMAT'],
            ['no_handphone', 'String', 'NO HANDPHONE'],
            ['pendidikan', 'String', 'PENDIDIKAN'],
            ['jurusan', 'String', 'JURUSAN'],
            ['status_perkawinan', 'String', 'STATUS PERKAWINAN'],
            ['agama', 'String', 'AGAMA'],
            ['kontak_darurat', 'String', 'KONTAK DARURAT'],
            ['hubungan', 'String', 'HUBUNGAN (Relasi Kontak Darurat)'],
        ]
    ));

    // 2.3 employmentrecords
    sections.push(...makeSchemaTable(
        '2.3 Koleksi: employmentrecords (Data Kepegawaian)',
        COLORS.green,
        ['Atribut', 'Tipe Data', 'Keterangan / Kolom Excel'],
        [
            ['_id', 'ObjectId', 'Primary Key'],
            ['user_id', 'ObjectId', 'FK → users._id (Unique Index)'],
            ['nomor_pkwt', 'String', 'NOMOR PKWT'],
            ['perusahaan', 'String', 'PERUSAHAAN'],
            ['penempatan', 'String', 'PENEMPATAN'],
            ['cost_center', 'String', 'COST CENTER'],
            ['jabatan', 'String', 'JABATAN'],
            ['level', 'String', 'LEVEL'],
            ['status_karyawan', 'String', 'STATUS KARYAWAN'],
            ['nik', 'String', 'NIK (KTP)'],
            ['join_date', 'Date', 'Join Date'],
            ['efektif_resign', 'Date', 'EFEKTIF RESIGN'],
            ['roster_type', 'String', 'Jenis Roster: "8/2" atau "6/2"'],
        ]
    ));

    // 2.4 employeedocuments
    sections.push(...makeSchemaTable(
        '2.4 Koleksi: employeedocuments (Dokumen Legalitas & Rekening)',
        COLORS.purple,
        ['Atribut', 'Tipe Data', 'Keterangan / Kolom Excel'],
        [
            ['_id', 'ObjectId', 'Primary Key'],
            ['user_id', 'ObjectId', 'FK → users._id (Unique Index)'],
            ['status_pajak', 'String', 'STATUS PAJAK'],
            ['npwp', 'String', 'NPWP (Nomor)'],
            ['nomor_kpj', 'String', 'Nomor KPJ (BPJS TK)'],
            ['nomor_jkn', 'String', 'Nomor JKN (BPJS Kesehatan)'],
            ['nama_rekening', 'String', 'NAMA REKENING'],
            ['nomor_rekening', 'String', 'NOMOR REKENING'],
            ['ktp_file_url', 'String', 'Path/URL PDF KTP'],
            ['kk_file_url', 'String', 'Path/URL PDF Kartu Keluarga'],
            ['npwp_file_url', 'String', 'Path/URL PDF Kartu NPWP'],
            ['ijazah_file_url', 'String', 'Path/URL PDF Ijazah & Transkrip'],
        ]
    ));

    // ─── 3. KOLEKSI FITUR PENDUKUNG ──────────────────────────────────────────
    sections.push(
        heading1('3. Koleksi Fitur Pendukung'),
        para('Setiap fitur utama pada aplikasi HRIS menggunakan 1 koleksi tersendiri untuk memastikan query yang bersih dan tidak redundan.'),
        divider(),
    );

    sections.push(...makeSchemaTable(
        '3.1 Koleksi: departments (Divisi/Departemen)',
        COLORS.primary,
        ['Atribut', 'Tipe Data', 'Keterangan'],
        [
            ['_id', 'ObjectId', 'Primary Key'],
            ['name', 'String', 'Nama Divisi (HRGA, Project, Maintenance, HSE, dll) — UNIQUE'],
            ['description', 'String', 'Deskripsi Divisi'],
        ]
    ));

    sections.push(...makeSchemaTable(
        '3.2 Koleksi: attendances (Absensi Harian)',
        COLORS.blue,
        ['Atribut', 'Tipe Data', 'Keterangan'],
        [
            ['_id', 'ObjectId', 'Primary Key'],
            ['user_id', 'ObjectId', 'FK → users._id'],
            ['date', 'Date', 'Tanggal Absensi'],
            ['clock_in', 'String', 'Jam Clock-In (HH:mm)'],
            ['clock_out', 'String', 'Jam Clock-Out'],
            ['status', 'String', 'Hadir | Terlambat | Izin | Sakit | Alpha'],
            ['location_in', 'String', 'Koordinat GPS atau nama lokasi'],
            ['foto_selfie_url', 'String', 'URL Foto Selfie Absensi'],
            ['device_id', 'String', 'ID Perangkat yang digunakan'],
        ]
    ));

    sections.push(...makeSchemaTable(
        '3.3 Koleksi: leaverequests (Pengajuan Cuti)',
        COLORS.green,
        ['Atribut', 'Tipe Data', 'Keterangan'],
        [
            ['_id', 'ObjectId', 'Primary Key'],
            ['user_id', 'ObjectId', 'FK → users._id'],
            ['leave_type', 'String', 'Tahunan | Melahirkan | Sakit | Khusus | Dll'],
            ['start_date', 'Date', 'Tanggal Mulai Cuti'],
            ['end_date', 'Date', 'Tanggal Selesai Cuti'],
            ['status', 'String', 'Pending | Approved | Rejected'],
            ['approved_by', 'ObjectId', 'FK → users._id (Penyetuju)'],
            ['reason', 'String', 'Alasan Pengajuan Cuti'],
        ]
    ));

    sections.push(...makeSchemaTable(
        '3.4 Koleksi: leavebalances (Saldo/Jatah Cuti)',
        COLORS.purple,
        ['Atribut', 'Tipe Data', 'Keterangan'],
        [
            ['_id', 'ObjectId', 'Primary Key'],
            ['user_id', 'ObjectId', 'FK → users._id (Unique Index)'],
            ['year', 'Number', 'Tahun berlaku saldo cuti'],
            ['total_days', 'Number', 'Total jatah cuti (berdasarkan roster 8/2 atau 6/2)'],
            ['used_days', 'Number', 'Jumlah hari cuti yang sudah dipakai'],
            ['remaining_days', 'Number', 'Sisa jatah cuti'],
        ]
    ));

    sections.push(...makeSchemaTable(
        '3.5 Koleksi: certifications (Sertifikat K3 & Teknis)',
        COLORS.primary,
        ['Atribut', 'Tipe Data', 'Keterangan'],
        [
            ['_id', 'ObjectId', 'Primary Key'],
            ['user_id', 'ObjectId', 'FK → users._id'],
            ['nama_sertifikat', 'String', 'Nama Sertifikat (WAH, POP, AK3, TKPK, dll)'],
            ['institusi_penerbit', 'String', 'Nama Lembaga Penerbit'],
            ['jenis_sertifikat', 'String', 'Kategori (K3, Teknis, Manajerial)'],
            ['tanggal_diterbitkan', 'Date', 'Tanggal Terbit Sertifikat'],
            ['tanggal_kadaluarsa', 'Date', 'Tanggal Kadaluarsa (opsional)'],
            ['attachment_url', 'String', 'URL/Path File PDF Sertifikat'],
        ]
    ));

    sections.push(...makeSchemaTable(
        '3.6 Koleksi: timesheets (Lembur & Jam Kerja)',
        COLORS.blue,
        ['Atribut', 'Tipe Data', 'Keterangan'],
        [
            ['_id', 'ObjectId', 'Primary Key'],
            ['user_id', 'ObjectId', 'FK → users._id'],
            ['date', 'Date', 'Tanggal Timesheet'],
            ['overtime_hours', 'Number', 'Jumlah jam lembur'],
            ['project_code', 'String', 'Kode Proyek (opsional)'],
            ['description', 'String', 'Keterangan pekerjaan'],
            ['approved_by', 'ObjectId', 'FK → users._id'],
        ]
    ));

    sections.push(...makeSchemaTable(
        '3.7 Koleksi: kpiappraisals (Penilaian Kinerja / KPI)',
        COLORS.green,
        ['Atribut', 'Tipe Data', 'Keterangan'],
        [
            ['_id', 'ObjectId', 'Primary Key'],
            ['user_id', 'ObjectId', 'FK → users._id'],
            ['period', 'String', 'Periode Penilaian (misal: Q1 2026)'],
            ['score', 'Number', 'Nilai KPI (0–100)'],
            ['grade', 'String', 'Grade Penilaian (A, B, C, dll)'],
            ['appraiser_id', 'ObjectId', 'FK → users._id (Penilai)'],
            ['notes', 'String', 'Catatan Penilaian'],
        ]
    ));

    sections.push(...makeSchemaTable(
        '3.8 Koleksi: warningletters (Surat Peringatan)',
        COLORS.secondary,
        ['Atribut', 'Tipe Data', 'Keterangan'],
        [
            ['_id', 'ObjectId', 'Primary Key'],
            ['user_id', 'ObjectId', 'FK → users._id'],
            ['sp_type', 'String', 'SP1 | SP2 | SP3'],
            ['issue_date', 'Date', 'Tanggal Terbit SP'],
            ['reason', 'String', 'Alasan Pemberian SP'],
            ['issued_by', 'ObjectId', 'FK → users._id'],
            ['attachment_url', 'String', 'URL Dokumen SP (PDF)'],
        ]
    ));

    sections.push(...makeSchemaTable(
        '3.9 Koleksi: notifications (Notifikasi Sistem)',
        COLORS.primary,
        ['Atribut', 'Tipe Data', 'Keterangan'],
        [
            ['_id', 'ObjectId', 'Primary Key'],
            ['user_id', 'ObjectId', 'FK → users._id (Penerima Notifikasi)'],
            ['title', 'String', 'Judul Notifikasi'],
            ['message', 'String', 'Isi Pesan Notifikasi'],
            ['is_read', 'Boolean', 'Status Sudah Dibaca atau Belum'],
            ['link', 'String', 'URL Tujuan saat diklik'],
            ['createdAt', 'Date', 'Auto Timestamp'],
        ]
    ));

    // ─── 4. RELASI ANTAR KOLEKSI ─────────────────────────────────────────────
    sections.push(
        heading1('4. Ringkasan Relasi Antar Koleksi'),
        para('Tabel berikut merangkum semua relasi Foreign Key yang ada dalam sistem HRIS:'),
        new Paragraph({ text: '', spacing: { after: 100 } }),
        ...makeSchemaTable(
            'Peta Relasi Foreign Key',
            COLORS.header,
            ['Koleksi (Anak)', 'Atribut FK', 'Koleksi (Induk)', 'Tipe Relasi'],
            [
                ['users', 'department', 'departments', '1:N (Banyak User, 1 Dept)'],
                ['employeedetails', 'user_id', 'users', '1:1'],
                ['employmentrecords', 'user_id', 'users', '1:1'],
                ['employeedocuments', 'user_id', 'users', '1:1'],
                ['attendances', 'user_id', 'users', '1:N'],
                ['leaverequests', 'user_id', 'users', '1:N'],
                ['leavebalances', 'user_id', 'users', '1:1'],
                ['certifications', 'user_id', 'users', '1:N'],
                ['timesheets', 'user_id', 'users', '1:N'],
                ['kpiappraisals', 'user_id', 'users', '1:N'],
                ['warningletters', 'user_id', 'users', '1:N'],
                ['notifications', 'user_id', 'users', '1:N'],
            ]
        )
    );

    // ─── FOOTER ──────────────────────────────────────────────────────────────
    sections.push(
        divider(),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 300 },
            children: [new TextRun({ text: 'Dokumen ini dibuat otomatis oleh HRIS DEA System — Rahasia & Tidak untuk Disebarluaskan', size: 18, color: COLORS.border, italics: true })]
        })
    );

    // Build document
    const doc = new Document({
        creator: 'HRIS DEA System',
        title: 'Desain Skema Database HRIS DEA',
        description: 'Dokumen resmi desain database MongoDB untuk sistem HRIS DEA Global Niaga',
        sections: [{
            properties: {},
            children: sections
        }]
    });

    const outPath = path.join(__dirname, '..', 'HRIS_Database_Schema.docx');
    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(outPath, buffer);
    console.log('✅ Dokumen berhasil dibuat:', outPath);
}

generateDoc().catch(err => {
    console.error('❌ Gagal membuat dokumen:', err.message);
    process.exit(1);
});
