/**
 * HRIS MongoDB Database Initialization Script
 * DEA GLOBAL NIAGA
 * Run: mongosh mongodb://localhost:27017/hris_db "c:\Users\KRAVEN\Documents\DGN\project\HRIS - Copy\BackEnd\init_db.js"
 */

const db = db.getSiblingDB('hris_db');
print('='.repeat(60));
print('  HRIS - DEA GLOBAL NIAGA | Database Initialization');
print('='.repeat(60));

function setupCollection(name, validator, indexes) {
  const existingCols = db.getCollectionNames();
  if (!existingCols.includes(name)) {
    db.createCollection(name, {
      validator: { '': validator },
      validationLevel: 'moderate',
      validationAction: 'warn'
    });
    print('  [CREATED] ' + name);
  } else {
    db.runCommand({ collMod: name, validator: { '': validator }, validationLevel: 'moderate', validationAction: 'warn' });
    print('  [UPDATED] ' + name);
  }
  indexes.forEach(function(idx) {
    try { db[name].createIndex(idx.key, idx.options || {}); } catch(e) { print('    [WARN] ' + e.message); }
  });
}

// departments
setupCollection('departments', {bsonType:'object',required:['name'],properties:{name:{bsonType:'string'},description:{bsonType:'string'}}}, [{key:{name:1},options:{unique:true,name:'idx_dept_name'}}]);

// users
setupCollection('users', {bsonType:'object',required:['username','password','nama','role'],properties:{username:{bsonType:'string'},password:{bsonType:'string'},nama:{bsonType:'string'},email_office:{bsonType:'string'},nomor_pegawai:{bsonType:'string'},role:{bsonType:'string',enum:['user','admin','superadmin']},department:{bsonType:'objectId'},is_first_login:{bsonType:'bool'},mfa_enabled:{bsonType:'bool'},mfa_secret:{bsonType:'string'},recovery_email:{bsonType:'string'},last_active:{bsonType:'date'}}}, [{key:{username:1},options:{unique:true,name:'idx_users_username'}},{key:{nama:1},options:{name:'idx_users_nama'}},{key:{department:1},options:{name:'idx_users_dept'}},{key:{role:1},options:{name:'idx_users_role'}}]);

// employeedetails
setupCollection('employeedetails', {bsonType:'object',required:['user'],properties:{user:{bsonType:'objectId'},tempat_lahir:{bsonType:'string'},tanggal_lahir:{bsonType:'date'},alamat:{bsonType:'string'},agama:{bsonType:'string'},pendidikan:{bsonType:'string'},jurusan:{bsonType:'string'},status_perkawinan:{bsonType:'string'},no_handphone:{bsonType:'string'},kontak_darurat_nama:{bsonType:'string'},kontak_darurat_relasi:{bsonType:'string'},email_pribadi:{bsonType:'string'}}}, [{key:{user:1},options:{unique:true,name:'idx_empdet_user'}}]);

// employmentrecords
setupCollection('employmentrecords', {bsonType:'object',required:['user'],properties:{user:{bsonType:'objectId'},perusahaan:{bsonType:'string'},penempatan:{bsonType:'string'},cost_center:{bsonType:'string'},jabatan:{bsonType:'string'},level:{bsonType:'string'},status_karyawan:{bsonType:'string'},nomor_pkwt:{bsonType:'string'},nik:{bsonType:'string'},join_date:{bsonType:'date'},efektif_resign:{bsonType:'date'},roster_type:{bsonType:'string'},roster_start_date:{bsonType:'date'}}}, [{key:{user:1},options:{unique:true,name:'idx_emprec_user'}},{key:{nik:1},options:{name:'idx_emprec_nik'}}]);

// employeedocuments
setupCollection('employeedocuments', {bsonType:'object',required:['user'],properties:{user:{bsonType:'objectId'},ktp_file_url:{bsonType:'string'},kk_file_url:{bsonType:'string'},npwp_file_url:{bsonType:'string'},ijazah_file_url:{bsonType:'string'},npwp:{bsonType:'string'},status_pajak:{bsonType:'string'},nomor_kpj:{bsonType:'string'},nomor_jkn:{bsonType:'string'},nama_rekening:{bsonType:'string'},nomor_rekening:{bsonType:'string'}}}, [{key:{user:1},options:{unique:true,name:'idx_empdoc_user'}}]);

// attendances
setupCollection('attendances', {bsonType:'object',required:['user','tanggal'],properties:{user:{bsonType:'objectId'},tanggal:{bsonType:'date'},check_in:{bsonType:'date'},check_out:{bsonType:'date'},location_in:{bsonType:'string'},location_out:{bsonType:'string'},photo_in_url:{bsonType:'string'},photo_out_url:{bsonType:'string'},status_kehadiran:{bsonType:'string',enum:['Hadir','Alpha','Cuti','Sakit','Izin']}}}, [{key:{user:1,tanggal:-1},options:{name:'idx_att_user_date'}},{key:{tanggal:-1},options:{name:'idx_att_date'}}]);

// leaverequests
setupCollection('leaverequests', {bsonType:'object',required:['user','start_date','end_date','leave_type'],properties:{user:{bsonType:'objectId'},start_date:{bsonType:'date'},end_date:{bsonType:'date'},leave_type:{bsonType:'string'},reason:{bsonType:'string'},attachment_url:{bsonType:'string'},status:{bsonType:'string',enum:['Pending','Approved','Rejected']}}}, [{key:{user:1,status:1},options:{name:'idx_leave_user_status'}},{key:{start_date:1,end_date:1},options:{name:'idx_leave_dates'}}]);

// leavebalances
setupCollection('leavebalances', {bsonType:'object',required:['user','tahun'],properties:{user:{bsonType:'objectId'},tahun:{bsonType:'int'},kuota_cuti_tahunan:{bsonType:'int'},sisa_cuti_tahunan:{bsonType:'int'},cuti_diambil:{bsonType:'int'}}}, [{key:{user:1,tahun:1},options:{unique:true,name:'idx_leavebal_user_tahun'}}]);

// certifications
setupCollection('certifications', {bsonType:'object',required:['user','nama_sertifikat'],properties:{user:{bsonType:'objectId'},nama_sertifikat:{bsonType:'string'},institusi_penerbit:{bsonType:'string'},tanggal_diterbitkan:{bsonType:'date'},tanggal_kadaluarsa:{bsonType:'date'},attachment_url:{bsonType:'string'}}}, [{key:{user:1},options:{name:'idx_cert_user'}},{key:{tanggal_kadaluarsa:1},options:{name:'idx_cert_expiry'}}]);

// trainingrecords
setupCollection('trainingrecords', {bsonType:'object',required:['user','training_name'],properties:{user:{bsonType:'objectId'},training_name:{bsonType:'string'},provider:{bsonType:'string'},start_date:{bsonType:'date'},end_date:{bsonType:'date'},status:{bsonType:'string',enum:['Registered','In Progress','Completed','Failed']},certificate_url:{bsonType:'string'}}}, [{key:{user:1,status:1},options:{name:'idx_training_user_status'}}]);

// kpiappraisals
setupCollection('kpiappraisals', {bsonType:'object',required:['user'],properties:{user:{bsonType:'objectId'},evaluator:{bsonType:'objectId'},periode:{bsonType:'string'},month:{bsonType:'int'},year:{bsonType:'int'},skor_target:{bsonType:'double'},skor_aktual:{bsonType:'double'},grade:{bsonType:'string'},feedback_manager:{bsonType:'string'},evaluation_date:{bsonType:'date'}}}, [{key:{user:1,year:-1,month:-1},options:{name:'idx_kpi_user_period'}},{key:{evaluator:1},options:{name:'idx_kpi_evaluator'}}]);

// timesheets
setupCollection('timesheets', {bsonType:'object',required:['user','tanggal','task_description','hours_worked'],properties:{user:{bsonType:'objectId'},tanggal:{bsonType:'date'},project_name:{bsonType:'string'},task_description:{bsonType:'string'},hours_worked:{bsonType:'double'},status:{bsonType:'string',enum:['Draft','Submitted','Approved','Rejected']}}}, [{key:{user:1,tanggal:-1},options:{name:'idx_timesheet_user_date'}}]);

// warningletters
setupCollection('warningletters', {bsonType:'object',required:['user','tingkat_sp','alasan_pelanggaran','tanggal_terbit'],properties:{user:{bsonType:'objectId'},issued_by:{bsonType:'objectId'},tingkat_sp:{bsonType:'string',enum:['SP1','SP2','SP3']},alasan_pelanggaran:{bsonType:'string'},tanggal_terbit:{bsonType:'date'},tanggal_berakhir:{bsonType:'date'},dokumen_sp_url:{bsonType:'string'}}}, [{key:{user:1,tanggal_terbit:-1},options:{name:'idx_sp_user_date'}}]);

// assethandovers
setupCollection('assethandovers', {bsonType:'object',required:['user','asset_name'],properties:{user:{bsonType:'objectId'},asset_name:{bsonType:'string'},kategori:{bsonType:'string'},serial_number:{bsonType:'string'},tanggal_pinjam:{bsonType:'date'},tanggal_kembali:{bsonType:'date'},dokumen_serah_terima_url:{bsonType:'string'},status:{bsonType:'string',enum:['Dipinjam','Dikembalikan','Hilang']}}}, [{key:{user:1,status:1},options:{name:'idx_asset_user_status'}}]);

// companyevents
setupCollection('companyevents', {bsonType:'object',required:['title','event_date'],properties:{title:{bsonType:'string'},description:{bsonType:'string'},event_date:{bsonType:'date'},event_end_date:{bsonType:'date'}}}, [{key:{event_date:1},options:{name:'idx_event_date'}}]);

// notifications
setupCollection('notifications', {bsonType:'object',required:['user','title','message'],properties:{user:{bsonType:'objectId'},title:{bsonType:'string'},message:{bsonType:'string'},link:{bsonType:'string'},type:{bsonType:'string'},is_read:{bsonType:'bool'}}}, [{key:{user:1,is_read:1},options:{name:'idx_notif_user_read'}},{key:{createdAt:-1},options:{name:'idx_notif_created'}}]);

// settings
setupCollection('settings', {bsonType:'object',required:['key','value'],properties:{key:{bsonType:'string'},value:{bsonType:'string'}}}, [{key:{key:1},options:{unique:true,name:'idx_settings_key'}}]);

print('\n' + '='.repeat(60));
print('  SELESAI! Total collections: ' + db.getCollectionNames().length);
print('='.repeat(60) + '\n');
