const mongoose = require('mongoose');

async function main() {
  await mongoose.connect('mongodb://127.0.0.1:27017/hris_db');
  const db = mongoose.connection.db;
  console.log('='.repeat(60));
  console.log(' HRIS DB — Apply JSON Schema Validators');
  console.log('='.repeat(60));

  async function applyValidator(collName, schema) {
    try {
      const cmd = { collMod: collName, validationLevel: 'off', validationAction: 'warn' };
      cmd['validator'] = {};
      cmd['validator']['$jsonSchema'] = schema;
      await db.command(cmd);
      console.log('[OK] ' + collName);
    } catch(e) { console.log('[ERR] ' + collName + ': ' + e.message); }
  }


  await applyValidator('departments', {
    bsonType:'object', title:'departments',
    properties:{
      _id:{ bsonType:'objectId', description:'PK — Primary Key'},
      name:{ bsonType:'string', description:'UNIQUE — Nama departemen: HRGA, HSE, Operasional, Finance...'},
      code:{ bsonType:'string', description:'Kode singkat departemen'},
      description:{ bsonType:'string'},
      createdAt:{ bsonType:'date'}, updatedAt:{ bsonType:'date'}
    }
  });

  await applyValidator('users', {
    bsonType:'object', title:'users', required:['username','password','nama','role'],
    properties:{
      _id:{ bsonType:'objectId', description:'PK — Primary Key'},
      username:{ bsonType:'string', description:'UNIQUE + INDEX — Login key'},
      password:{ bsonType:'string', description:'Bcrypt hashed password'},
      nama:{ bsonType:'string', description:'INDEX — Nama lengkap karyawan'},
      email_office:{ bsonType:'string', description:'Email resmi kantor'},
      nomor_pegawai:{ bsonType:'string'},
      foto_url:{ bsonType:'string', description:'URL foto profil karyawan'},
      role:{ bsonType:'string', enum:['user','admin','superadmin'], description:'INDEX — Peran dalam sistem'},
      department_id:{ bsonType:'objectId', description:'FK → departments._id | INDEX'},
      is_first_login:{ bsonType:'bool', description:'Default true — paksa ganti password login pertama'},
      mfa_enabled:{ bsonType:'bool', description:'Status Multi-Factor Authentication'},
      mfa_secret:{ bsonType:'string'},
      recovery_email:{ bsonType:'string'},
      attendance_camera_access:{ bsonType:'bool'},
      attendance_gps_access:{ bsonType:'bool'},
      last_active:{ bsonType:'date'},
      is_active:{ bsonType:'bool', description:'Status akun aktif/nonaktif'},
      createdAt:{ bsonType:'date'}, updatedAt:{ bsonType:'date'}
    }
  });

  await applyValidator('employeedetails', {
    bsonType:'object', title:'employee_details', required:['user_id'],
    properties:{
      _id:{ bsonType:'objectId', description:'PK'},
      user_id:{ bsonType:'objectId', description:'FK → users._id | UNIQUE INDEX 1:1'},
      tempat_lahir:{ bsonType:'string'},
      tanggal_lahir:{ bsonType:'date'},
      jenis_kelamin:{ bsonType:'string', enum:['Laki-laki','Perempuan']},
      agama:{ bsonType:'string'},
      status_perkawinan:{ bsonType:'string', enum:['Belum Menikah','Menikah','Cerai']},
      alamat:{ bsonType:'string'},
      pendidikan_terakhir:{ bsonType:'string', enum:['SD','SMP','SMA/SMK','D3','S1','S2','S3']},
      jurusan:{ bsonType:'string'},
      nama_institusi:{ bsonType:'string'},
      no_handphone:{ bsonType:'string'},
      email_pribadi:{ bsonType:'string'},
      kontak_darurat_nama:{ bsonType:'string'},
      kontak_darurat_no:{ bsonType:'string'},
      kontak_darurat_relasi:{ bsonType:'string'},
      createdAt:{ bsonType:'date'}, updatedAt:{ bsonType:'date'}
    }
  });

  await applyValidator('employmentrecords', {
    bsonType:'object', title:'employment_records', required:['user_id'],
    properties:{
      _id:{ bsonType:'objectId', description:'PK'},
      user_id:{ bsonType:'objectId', description:'FK → users._id | UNIQUE INDEX 1:1'},
      department_id:{ bsonType:'objectId', description:'FK → departments._id'},
      nik:{ bsonType:'string', description:'INDEX — Nomor Induk Karyawan, dipakai sebagai default password'},
      nomor_pegawai:{ bsonType:'string'},
      nomor_pkwt:{ bsonType:'string', description:'Nomor kontrak PKWT'},
      perusahaan:{ bsonType:'string'},
      penempatan:{ bsonType:'string', description:'Lokasi kerja (site/kantor)'},
      cost_center:{ bsonType:'string'},
      jabatan:{ bsonType:'string'},
      level:{ bsonType:'string', description:'Staff / Senior / Supervisor / Manager'},
      status_karyawan:{ bsonType:'string', enum:['Tetap','PKWT','Magang','Kontrak']},
      join_date:{ bsonType:'date'},
      efektif_resign:{ bsonType:'date'},
      roster_type:{ bsonType:'string', enum:['8/2','6/2'], description:'8 atau 6 minggu kerja / 2 minggu cuti'},
      roster_start_date:{ bsonType:'date', description:'Anchor date untuk kalkulasi siklus roster otomatis'},
      createdAt:{ bsonType:'date'}, updatedAt:{ bsonType:'date'}
    }
  });

  await applyValidator('employeedocuments', {
    bsonType:'object', title:'employee_documents', required:['user_id'],
    properties:{
      _id:{ bsonType:'objectId', description:'PK'},
      user_id:{ bsonType:'objectId', description:'FK → users._id | UNIQUE INDEX 1:1'},
      no_ktp:{ bsonType:'string'},
      ktp_file_url:{ bsonType:'string', description:'URL scan KTP'},
      kk_file_url:{ bsonType:'string', description:'URL scan Kartu Keluarga'},
      npwp:{ bsonType:'string'},
      npwp_file_url:{ bsonType:'string'},
      status_pajak:{ bsonType:'string', description:'TK/0, K/0, K/1, K/2, K/3'},
      nomor_kpj:{ bsonType:'string', description:'BPJS Ketenagakerjaan'},
      nomor_jkn:{ bsonType:'string', description:'BPJS Kesehatan'},
      ijazah_file_url:{ bsonType:'string'},
      transkrip_file_url:{ bsonType:'string'},
      nama_bank:{ bsonType:'string'},
      nama_rekening:{ bsonType:'string'},
      nomor_rekening:{ bsonType:'string'},
      cv_file_url:{ bsonType:'string'},
      foto_karyawan_url:{ bsonType:'string'},
      createdAt:{ bsonType:'date'}, updatedAt:{ bsonType:'date'}
    }
  });

  await applyValidator('attendances', {
    bsonType:'object', title:'attendances', required:['user_id','tanggal'],
    properties:{
      _id:{ bsonType:'objectId', description:'PK'},
      user_id:{ bsonType:'objectId', description:'FK → users._id | COMPOUND INDEX user_id+tanggal'},
      tanggal:{ bsonType:'date', description:'INDEX — tanggal kehadiran'},
      status_kehadiran:{ bsonType:'string', enum:['Hadir','Alpha','Cuti','Sakit','Izin']},
      check_in:{ bsonType:'date'},
      location_in:{ bsonType:'string', description:'Koordinat GPS check-in'},
      photo_in_url:{ bsonType:'string', description:'Selfie saat check-in'},
      check_out:{ bsonType:'date'},
      location_out:{ bsonType:'string', description:'Koordinat GPS check-out'},
      photo_out_url:{ bsonType:'string'},
      total_jam_kerja:{ bsonType:'double', description:'Dalam jam (checkout - checkin)'},
      keterlambatan:{ bsonType:'double', description:'Dalam menit'},
      keterangan:{ bsonType:'string'},
      createdAt:{ bsonType:'date'}, updatedAt:{ bsonType:'date'}
    }
  });

  await applyValidator('leaverequests', {
    bsonType:'object', title:'leave_requests', required:['user_id','leave_type','start_date','end_date'],
    properties:{
      _id:{ bsonType:'objectId', description:'PK'},
      user_id:{ bsonType:'objectId', description:'FK → users._id'},
      approved_by_id:{ bsonType:'objectId', description:'FK → users._id (admin/atasan approver)'},
      leave_type:{ bsonType:'string', enum:['Cuti Tahunan','Cuti Bersama','Sakit','Izin','Cuti Melahirkan','Cuti Penting']},
      start_date:{ bsonType:'date', description:'INDEX'},
      end_date:{ bsonType:'date'},
      total_hari:{ bsonType:'double', description:'Otomatis dihitung dari start-end date'},
      reason:{ bsonType:'string'},
      attachment_url:{ bsonType:'string', description:'Bukti surat dokter / dokumen pendukung'},
      status:{ bsonType:'string', enum:['Pending','Approved','Rejected'], description:'INDEX'},
      catatan_admin:{ bsonType:'string'},
      approved_at:{ bsonType:'date'},
      createdAt:{ bsonType:'date'}, updatedAt:{ bsonType:'date'}
    }
  });

  await applyValidator('leavebalances', {
    bsonType:'object', title:'leave_balances', required:['user_id','tahun'],
    properties:{
      _id:{ bsonType:'objectId', description:'PK'},
      user_id:{ bsonType:'objectId', description:'FK → users._id | UNIQUE COMPOUND user_id+tahun'},
      tahun:{ bsonType:'int', description:'INDEX — tahun berlaku saldo cuti'},
      kuota_cuti_tahunan:{ bsonType:'int', description:'Total jatah per tahun (default 12 hari)'},
      cuti_diambil:{ bsonType:'int'},
      cuti_pending:{ bsonType:'int', description:'Masih menunggu approval'},
      sisa_cuti_tahunan:{ bsonType:'int', description:'kuota - diambil - pending'},
      cuti_kadaluarsa:{ bsonType:'int', description:'Saldo yang hangus akhir tahun'},
      createdAt:{ bsonType:'date'}, updatedAt:{ bsonType:'date'}
    }
  });

  await applyValidator('certifications', {
    bsonType:'object', title:'certifications', required:['user_id','nama_sertifikat'],
    properties:{
      _id:{ bsonType:'objectId', description:'PK'},
      user_id:{ bsonType:'objectId', description:'FK → users._id | dikelola HSE Admin'},
      created_by_id:{ bsonType:'objectId', description:'FK → users._id (HSE Admin yang input)'},
      nama_sertifikat:{ bsonType:'string'},
      kode_sertifikat:{ bsonType:'string'},
      jenis_sertifikat:{ bsonType:'string', enum:['K3','Kompetensi','Profesi','Keahlian','Lainnya']},
      institusi_penerbit:{ bsonType:'string'},
      nomor_sertifikat:{ bsonType:'string'},
      tanggal_diterbitkan:{ bsonType:'date'},
      tanggal_kadaluarsa:{ bsonType:'date', description:'INDEX — monitoring expired sertifikat'},
      durasi_berlaku_bulan:{ bsonType:'double'},
      status_sertifikat:{ bsonType:'string', enum:['Aktif','Expired','Pending Renewal']},
      attachment_url:{ bsonType:'string'},
      createdAt:{ bsonType:'date'}, updatedAt:{ bsonType:'date'}
    }
  });

  await applyValidator('trainingrecords', {
    bsonType:'object', title:'training_records', required:['user_id','training_name'],
    properties:{
      _id:{ bsonType:'objectId', description:'PK'},
      user_id:{ bsonType:'objectId', description:'FK → users._id'},
      created_by_id:{ bsonType:'objectId', description:'FK → users._id (admin pendaftar)'},
      training_name:{ bsonType:'string'},
      jenis_training:{ bsonType:'string', enum:['Internal','Eksternal','Online','On The Job Training']},
      provider:{ bsonType:'string'},
      lokasi:{ bsonType:'string'},
      start_date:{ bsonType:'date', description:'INDEX'},
      end_date:{ bsonType:'date'},
      total_jam:{ bsonType:'double'},
      status:{ bsonType:'string', enum:['Terdaftar','Sedang Berjalan','Selesai','Gagal','Dibatalkan']},
      nilai:{ bsonType:'double'},
      keterangan:{ bsonType:'string'},
      certificate_url:{ bsonType:'string'},
      createdAt:{ bsonType:'date'}, updatedAt:{ bsonType:'date'}
    }
  });

  await applyValidator('kpiappraisals', {
    bsonType:'object', title:'kpi_appraisals', required:['user_id'],
    properties:{
      _id:{ bsonType:'objectId', description:'PK'},
      user_id:{ bsonType:'objectId', description:'FK → users._id (karyawan yang dinilai)'},
      evaluator_id:{ bsonType:'objectId', description:'FK → users._id (SELF REF — manager penilai)'},
      periode:{ bsonType:'string', description:'Label periode, contoh: Januari 2025'},
      bulan:{ bsonType:'int', description:'INDEX — 1-12'},
      tahun:{ bsonType:'int', description:'INDEX — tahun penilaian'},
      evaluation_date:{ bsonType:'date'},
      skor_target:{ bsonType:'double'},
      skor_aktual:{ bsonType:'double'},
      persentase:{ bsonType:'double', description:'(skor_aktual / skor_target) * 100'},
      grade:{ bsonType:'string', enum:['A','B','C','D','E']},
      rating:{ bsonType:'int', description:'Rating 1-5 dari manager'},
      feedback_manager:{ bsonType:'string'},
      catatan_karyawan:{ bsonType:'string'},
      createdAt:{ bsonType:'date'}, updatedAt:{ bsonType:'date'}
    }
  });

  await applyValidator('timesheets', {
    bsonType:'object', title:'timesheets', required:['user_id','tanggal','task_description','hours_worked'],
    properties:{
      _id:{ bsonType:'objectId', description:'PK'},
      user_id:{ bsonType:'objectId', description:'FK → users._id'},
      approved_by_id:{ bsonType:'objectId', description:'FK → users._id (manager approver)'},
      tanggal:{ bsonType:'date', description:'INDEX'},
      project_name:{ bsonType:'string'},
      activity_type:{ bsonType:'string', enum:['Development','Meeting','Analysis','Support','Training','Lainnya']},
      task_description:{ bsonType:'string'},
      hours_worked:{ bsonType:'double', description:'Min 0.5, Max 24 jam'},
      overtime_hours:{ bsonType:'double', description:'Jam lembur'},
      status:{ bsonType:'string', enum:['Draft','Submitted','Approved','Rejected']},
      catatan_approver:{ bsonType:'string'},
      approved_at:{ bsonType:'date'},
      createdAt:{ bsonType:'date'}, updatedAt:{ bsonType:'date'}
    }
  });

  await applyValidator('warningletters', {
    bsonType:'object', title:'warning_letters', required:['user_id','issued_by_id','tingkat_sp','alasan_pelanggaran','tanggal_terbit'],
    properties:{
      _id:{ bsonType:'objectId', description:'PK'},
      user_id:{ bsonType:'objectId', description:'FK → users._id (karyawan penerima SP)'},
      issued_by_id:{ bsonType:'objectId', description:'FK → users._id (atasan penerbit — SELF REF)'},
      nomor_sp:{ bsonType:'string'},
      tingkat_sp:{ bsonType:'string', enum:['SP1','SP2','SP3'], description:'INDEX'},
      alasan_pelanggaran:{ bsonType:'string'},
      pasal_yang_dilanggar:{ bsonType:'string'},
      tanggal_terbit:{ bsonType:'date', description:'INDEX'},
      tanggal_berakhir:{ bsonType:'date'},
      dokumen_sp_url:{ bsonType:'string'},
      tanda_tangan_terima:{ bsonType:'bool'},
      createdAt:{ bsonType:'date'}, updatedAt:{ bsonType:'date'}
    }
  });

  await applyValidator('assethandovers', {
    bsonType:'object', title:'asset_handovers', required:['user_id','nama_aset'],
    properties:{
      _id:{ bsonType:'objectId', description:'PK'},
      user_id:{ bsonType:'objectId', description:'FK → users._id (karyawan pemegang aset)'},
      handed_by_id:{ bsonType:'objectId', description:'FK → users._id (admin logistik)'},
      kode_aset:{ bsonType:'string'},
      nama_aset:{ bsonType:'string'},
      kategori:{ bsonType:'string', enum:['Elektronik','Kendaraan','Peralatan','Pakaian Kerja','APD','Lainnya']},
      merk:{ bsonType:'string'},
      model:{ bsonType:'string'},
      serial_number:{ bsonType:'string'},
      kondisi_pinjam:{ bsonType:'string', enum:['Baru','Baik','Rusak Ringan']},
      tanggal_pinjam:{ bsonType:'date', description:'INDEX'},
      tanggal_kembali_rencana:{ bsonType:'date'},
      tanggal_kembali_aktual:{ bsonType:'date'},
      kondisi_kembali:{ bsonType:'string', enum:['Baik','Rusak Ringan','Rusak Berat','Hilang']},
      status:{ bsonType:'string', enum:['Dipinjam','Dikembalikan','Hilang','Rusak']},
      dokumen_url:{ bsonType:'string'},
      keterangan:{ bsonType:'string'},
      createdAt:{ bsonType:'date'}, updatedAt:{ bsonType:'date'}
    }
  });

  await applyValidator('companyevents', {
    bsonType:'object', title:'company_events', required:['title','event_date'],
    properties:{
      _id:{ bsonType:'objectId', description:'PK'},
      created_by_id:{ bsonType:'objectId', description:'FK → users._id (admin pembuat)'},
      title:{ bsonType:'string'},
      description:{ bsonType:'string'},
      event_type:{ bsonType:'string', enum:['Libur Nasional','Rapat','Training','Acara Perusahaan','Lainnya']},
      lokasi:{ bsonType:'string'},
      event_date:{ bsonType:'date', description:'INDEX — diquery per bulan untuk kalender'},
      event_end_date:{ bsonType:'date'},
      is_all_day:{ bsonType:'bool'},
      visible_to:{ bsonType:'string', enum:['semua','admin','specific_dept']},
      createdAt:{ bsonType:'date'}, updatedAt:{ bsonType:'date'}
    }
  });

  await applyValidator('notifications', {
    bsonType:'object', title:'notifications', required:['user_id','title','message'],
    properties:{
      _id:{ bsonType:'objectId', description:'PK'},
      user_id:{ bsonType:'objectId', description:'FK → users._id (penerima) | COMPOUND INDEX user_id+is_read'},
      triggered_by_id:{ bsonType:'objectId', description:'FK → users._id (pemicu notifikasi — opsional)'},
      title:{ bsonType:'string'},
      message:{ bsonType:'string'},
      type:{ bsonType:'string', enum:['info','success','warning','error','approval','reminder']},
      link:{ bsonType:'string', description:'URL halaman terkait notifikasi'},
      is_read:{ bsonType:'bool', description:'INDEX — untuk hitung badge unread'},
      read_at:{ bsonType:'date'},
      createdAt:{ bsonType:'date'}, updatedAt:{ bsonType:'date'}
    }
  });

  await applyValidator('settings', {
    bsonType:'object', title:'settings', required:['key','value'],
    properties:{
      _id:{ bsonType:'objectId', description:'PK'},
      key:{ bsonType:'string', description:'UNIQUE INDEX — config key (company_name, logo_url, working_hours...)'},
      value:{ description:'Nilai konfigurasi (string/number/bool)'},
      label:{ bsonType:'string', description:'Label tampilan di UI settings page'},
      description:{ bsonType:'string', description:'Penjelasan fungsi setting'},
      category:{ bsonType:'string', enum:['perusahaan','sistem','kehadiran','cuti','notifikasi']},
      is_public:{ bsonType:'bool', description:'Bisa diakses tanpa login'},
      updatedAt:{ bsonType:'date'}
    }
  });

  console.log('\n' + '='.repeat(60));
  console.log(' SELESAI! Semua 17 validator berhasil di-apply.');
  console.log(' Buka MongoDB Compass > Data Modeling');
  console.log(' > Generate diagram > hris_db');
  console.log('='.repeat(60));
  await mongoose.disconnect();
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
