import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  User, Lock, Mail, Check, X, CreditCard, Building, Briefcase,
  Eye, EyeOff, ArrowRight, ArrowLeft, Upload, FileText, CheckCircle2, ShieldCheck, Phone, MapPin, Award
} from 'lucide-react';
import api from '../../api/api';

const Signup = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isMorphingBack, setIsMorphingBack] = useState(false);

  const handleToLogin = (e) => {
    e.preventDefault();
    setIsMorphingBack(true);
    setTimeout(() => {
      navigate('/login');
    }, 420);
  };

  // Initial comprehensive employee registration form - ALL MANDATORY
  const [formData, setFormData] = useState({
    // Step 1: Data Pribadi
    nama: '',
    nik: '',
    tempat_lahir: '',
    tanggal_lahir: '',
    jenis_kelamin: 'Laki-laki',
    agama: 'Islam',
    pendidikan: 'S1',
    jurusan: '',
    status_perkawinan: 'Belum Menikah',
    alamat: '',
    no_handphone: '',
    kontak_darurat: '',
    hubungan: '',
    kontak_darurat_nomor: '',

    // Step 2: Data Pekerjaan & Akun
    username: '',
    password: '',
    perusahaan: 'PT DEA GLOBAL NIAGA',
    penempatan: 'Site BIB',
    department: 'HRGA',
    cost_center: 'SITE BIB',
    jabatan: 'Staff',
    level: 'LEVEL 7 (OPERATOR/STAFF)',
    status_karyawan: 'PKWT',
    nomor_pegawai: '',
    nomor_pkwt: '',
    roster_type: '8/2',
    join_date: new Date().toISOString().split('T')[0],
    email: '',
    email_office: '',

    // Step 3: Pajak, BPJS & Rekening
    status_pajak: 'TK/0',
    npwp: '',
    nomor_kpj: '',
    nomor_jkn: '',
    nama_bank: 'BCA',
    nama_rekening: '',
    nomor_rekening: '',

    // File attachments
    ktp_file: null,
    kk_file: null,
    npwp_file: null,
    ijazah_file: null
  });

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (files) {
      setFormData(prev => ({ ...prev, [name]: files[0] }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const validateStep1 = () => {
    if (!formData.nama || formData.nama.trim().length < 3) {
      return 'Nama lengkap wajib diisi minimal 3 karakter.';
    }
    const rawNik = String(formData.nik || '').replace(/\D/g, '');
    if (!rawNik || rawNik.length !== 16) {
      return 'Nomor Induk Kependudukan (NIK) wajib tepat 16 digit angka.';
    }
    if (!formData.tempat_lahir || formData.tempat_lahir.trim().length < 2) {
      return 'Tempat lahir wajib diisi.';
    }
    if (!formData.tanggal_lahir) {
      return 'Tanggal lahir wajib diisi.';
    }
    const rawHp = String(formData.no_handphone || '').replace(/\D/g, '');
    if (!rawHp || rawHp.length < 10) {
      return 'Nomor handphone / WhatsApp aktif wajib diisi minimal 10 digit.';
    }
    if (!formData.agama) {
      return 'Agama wajib dipilih.';
    }
    if (!formData.alamat || formData.alamat.trim().length < 5) {
      return 'Alamat domisili lengkap wajib diisi (minimal 5 karakter).';
    }
    if (!formData.status_perkawinan) {
      return 'Status perkawinan wajib dipilih.';
    }
    if (!formData.pendidikan) {
      return 'Pendidikan terakhir wajib dipilih.';
    }
    if (!formData.jurusan || formData.jurusan.trim().length < 2) {
      return 'Jurusan pendidikan wajib diisi.';
    }
    if (!formData.kontak_darurat || formData.kontak_darurat.trim().length < 2) {
      return 'Nama kontak darurat wajib diisi.';
    }
    if (!formData.hubungan || formData.hubungan.trim().length < 2) {
      return 'Hubungan kontak darurat wajib diisi.';
    }
    const rawKdHp = String(formData.kontak_darurat_nomor || '').replace(/\D/g, '');
    if (!rawKdHp || rawKdHp.length < 10) {
      return 'Nomor telepon kontak darurat wajib diisi minimal 10 digit.';
    }
    return null;
  };

  const validateStep2 = () => {
    const cleanUsername = String(formData.username || '').trim();
    if (!cleanUsername || cleanUsername.length < 4) {
      return 'Username wajib diisi minimal 4 karakter.';
    }
    if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
      return 'Username hanya boleh berisi huruf, angka, dan garis bawah (_).';
    }
    if (!formData.password || formData.password.length < 6) {
      return 'Password akun minimal 6 karakter.';
    }
    if (!formData.perusahaan) {
      return 'Perusahaan wajib dipilih.';
    }
    if (!formData.penempatan || formData.penempatan.trim().length < 2) {
      return 'Lokasi penempatan kerja wajib diisi.';
    }
    if (!formData.department || formData.department.trim().length < 2) {
      return 'Departemen kerja wajib diisi.';
    }
    if (!formData.cost_center || formData.cost_center.trim().length < 2) {
      return 'Cost center wajib diisi.';
    }
    if (!formData.jabatan || formData.jabatan.trim().length < 2) {
      return 'Jabatan karyawan wajib diisi.';
    }
    if (!formData.level) {
      return 'Level posisi wajib dipilih.';
    }
    if (!formData.status_karyawan) {
      return 'Status karyawan wajib dipilih.';
    }
    if (!formData.nomor_pegawai || formData.nomor_pegawai.trim().length < 2) {
      return 'Nomor pegawai / ID internal wajib diisi.';
    }
    if (!formData.nomor_pkwt || formData.nomor_pkwt.trim().length < 2) {
      return 'Nomor PKWT / Kontrak kerja wajib diisi.';
    }
    if (!formData.join_date) {
      return 'Tanggal bergabung (join date) wajib diisi.';
    }
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      return 'Format email pribadi tidak valid.';
    }
    if (!formData.email_office || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email_office)) {
      return 'Format email kantor tidak valid.';
    }
    if (!formData.roster_type) {
      return 'Tipe roster pertambangan wajib dipilih.';
    }
    return null;
  };

  const validateStep3 = () => {
    if (!formData.status_pajak) {
      return 'Status pajak (PTKP) wajib dipilih.';
    }
    if (!formData.npwp || formData.npwp.trim().length < 5) {
      return 'Nomor NPWP wajib diisi.';
    }
    if (!formData.nomor_kpj || formData.nomor_kpj.trim().length < 5) {
      return 'Nomor BPJS Ketenagakerjaan (KPJ) wajib diisi.';
    }
    if (!formData.nomor_jkn || formData.nomor_jkn.trim().length < 5) {
      return 'Nomor BPJS Kesehatan (JKN) wajib diisi.';
    }
    if (!formData.nama_bank) {
      return 'Nama bank wajib dipilih / diisi.';
    }
    if (!formData.nama_rekening || formData.nama_rekening.trim().length < 2) {
      return 'Nama pemilik rekening bank wajib diisi.';
    }
    if (!formData.nomor_rekening || formData.nomor_rekening.trim().length < 5) {
      return 'Nomor rekening bank wajib diisi.';
    }
    return null;
  };

  const handleNext = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (step === 1) {
      const err = validateStep1();
      if (err) return setErrorMsg(err);
      setStep(2);
    } else if (step === 2) {
      const err = validateStep2();
      if (err) return setErrorMsg(err);
      setStep(3);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const err1 = validateStep1();
    if (err1) { setStep(1); return setErrorMsg(err1); }
    const err2 = validateStep2();
    if (err2) { setStep(2); return setErrorMsg(err2); }
    const err3 = validateStep3();
    if (err3) { setStep(3); return setErrorMsg(err3); }

    setLoading(true);

    try {
      const postData = new FormData();
      postData.append('username', (formData.username || '').trim());
      postData.append('password', (formData.password || '').trim());
      postData.append('nama', (formData.nama || '').trim());
      postData.append('nama_lengkap', (formData.nama || '').trim());

      Object.keys(formData).forEach(key => {
        if (!['username', 'password', 'nama', 'nama_lengkap'].includes(key) && formData[key] !== null && formData[key] !== undefined) {
          postData.append(key, formData[key]);
        }
      });

      await api.post('/auth/signup', postData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setSuccessMsg('Pendaftaran Karyawan Baru Berhasil! Akun Anda sedang menunggu verifikasi dari Super Admin. Mengalihkan ke login...');
      setTimeout(() => {
        navigate('/login');
      }, 2500);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || err.response?.data?.error || 'Gagal mendaftarkan akun. Silakan periksa kelengkapan data.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center bg-slate-950 py-10 px-4 font-sans select-none">
      {/* Background Decor */}
      <div className="absolute inset-0 z-0 overflow-hidden bg-radial from-slate-900 via-slate-950 to-black">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-red-600/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl"></div>
      </div>

      {/* Main Registration Card Container with 3D Perspective */}
      <div 
        style={{ perspective: '1200px' }}
        className="relative z-10 w-full max-w-4xl flex items-center justify-center"
      >
        <div 
          style={{ transformStyle: 'preserve-3d' }}
          className={`w-full bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl p-6 sm:p-10 border border-white/60 transition-all duration-500 ease-out ${
            isMorphingBack 
              ? 'scale-90 rotate-y-90 opacity-0 blur-xs' 
              : 'scale-100 rotate-y-0 opacity-100 animate-in fade-in zoom-in-95 duration-500'
          }`}
        >
        {/* Company Header */}
        <div className="text-center mb-6">
          <img src="/dea.png" alt="DEA Logo" className="h-14 w-auto mx-auto mb-2 object-contain" onError={(e) => { e.target.style.display = 'none' }} />
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Formulir Pendaftaran Karyawan Baru</h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-0.5">PT DEA GLOBAL NIAGA - HRIS PORTAL</p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full text-[11px] font-bold text-amber-800 mt-2">
            <span>* Semua kolom data bertanda bintang merah wajib diisi lengkap</span>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-between max-w-md mx-auto mb-8 relative">
          <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-200 -translate-y-1/2 z-0" />
          <div className="absolute top-1/2 left-0 h-1 bg-red-600 -translate-y-1/2 z-0 transition-all duration-300" style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }} />

          {[
            { s: 1, title: 'Data Pribadi' },
            { s: 2, title: 'Kepegawaian & Akun' },
            { s: 3, title: 'Legalitas, Bank & Berkas' }
          ].map(({ s, title }) => (
            <div key={s} className="relative z-10 flex flex-col items-center">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs transition-all ${
                step >= s ? 'bg-red-600 text-white ring-4 ring-red-100 shadow-md' : 'bg-white text-slate-400 border-2 border-slate-300'
              }`}>
                {step > s ? <Check size={16} /> : s}
              </div>
              <span className={`text-[10px] font-bold mt-1.5 ${step >= s ? 'text-red-700 font-black' : 'text-slate-400'}`}>
                {title}
              </span>
            </div>
          ))}
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-2xl mb-5 flex items-center gap-2.5 animate-in slide-in-from-top-2">
            <X size={18} className="shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-4 bg-green-50 border border-green-200 text-green-700 text-xs font-bold rounded-2xl mb-5 flex items-center gap-2.5 animate-in slide-in-from-top-2">
            <CheckCircle2 size={18} className="shrink-0 text-green-600" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={step === 3 ? handleSubmit : handleNext} className="space-y-4 text-xs font-medium text-slate-700">
          {/* STEP 1: DATA PRIBADI */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="font-black text-slate-400 uppercase tracking-widest text-[11px]">Langkah 1: Identitas & Data Pribadi</span>
                <span className="text-[11px] font-bold text-red-600">Semua Wajib Diisi</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-800 block mb-1">Nama Lengkap <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="nama"
                    value={formData.nama}
                    onChange={handleChange}
                    placeholder="Contoh: Arya Pratama"
                    required
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-red-600/20"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">NIK (16 Digit KTP) <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    maxLength={16}
                    name="nik"
                    value={formData.nik}
                    onChange={e => setFormData({ ...formData, nik: e.target.value.replace(/\D/g, '') })}
                    placeholder="16 digit NIK KTP"
                    required
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-red-600/20"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">Tempat Lahir <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="tempat_lahir"
                    value={formData.tempat_lahir}
                    onChange={handleChange}
                    placeholder="Kota Lahir"
                    required
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 outline-none focus:ring-2 focus:ring-red-600/20"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">Tanggal Lahir <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    name="tanggal_lahir"
                    value={formData.tanggal_lahir}
                    onChange={handleChange}
                    required
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 outline-none focus:ring-2 focus:ring-red-600/20"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">No. Handphone / WhatsApp <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="no_handphone"
                    value={formData.no_handphone}
                    onChange={handleChange}
                    placeholder="08xxxxxxxxxx"
                    required
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 outline-none focus:ring-2 focus:ring-red-600/20"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">Agama <span className="text-red-500">*</span></label>
                  <select
                    name="agama"
                    value={formData.agama}
                    onChange={handleChange}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-red-600/20"
                  >
                    <option value="Islam">Islam</option>
                    <option value="Kristen Protestan">Kristen Protestan</option>
                    <option value="Katolik">Katolik</option>
                    <option value="Hindu">Hindu</option>
                    <option value="Buddha">Buddha</option>
                    <option value="Konghucu">Konghucu</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-800 block mb-1">Alamat Domisili Lengkap <span className="text-red-500">*</span></label>
                  <textarea
                    rows={2}
                    name="alamat"
                    value={formData.alamat}
                    onChange={handleChange}
                    placeholder="Alamat lengkap tempat tinggal saat ini..."
                    required
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 outline-none focus:ring-2 focus:ring-red-600/20"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">Status Perkawinan <span className="text-red-500">*</span></label>
                  <select
                    name="status_perkawinan"
                    value={formData.status_perkawinan}
                    onChange={handleChange}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-red-600/20"
                  >
                    <option value="Belum Menikah">Belum Menikah</option>
                    <option value="Menikah">Menikah</option>
                    <option value="Cerai">Cerai</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">Pendidikan Terakhir <span className="text-red-500">*</span></label>
                  <select
                    name="pendidikan"
                    value={formData.pendidikan}
                    onChange={handleChange}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-red-600/20"
                  >
                    <option value="SMA/SMK">SMA / SMK</option>
                    <option value="D3">Diploma 3 (D3)</option>
                    <option value="D4">Diploma 4 (D4)</option>
                    <option value="S1">Strata 1 (S1)</option>
                    <option value="S2">Strata 2 (S2)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">Jurusan Pendidikan <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="jurusan"
                    value={formData.jurusan}
                    onChange={handleChange}
                    placeholder="Contoh: Teknik Mesin / Manajemen"
                    required
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 outline-none focus:ring-2 focus:ring-red-600/20"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">Kontak Darurat (Nama) <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="kontak_darurat"
                    value={formData.kontak_darurat}
                    onChange={handleChange}
                    placeholder="Nama kerabat darurat"
                    required
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 outline-none focus:ring-2 focus:ring-red-600/20"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">Hubungan Kontak Darurat <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="hubungan"
                    value={formData.hubungan}
                    onChange={handleChange}
                    placeholder="Contoh: Istri / Orang Tua / Saudara"
                    required
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 outline-none focus:ring-2 focus:ring-red-600/20"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">Nomor Telepon Kontak Darurat <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="kontak_darurat_nomor"
                    value={formData.kontak_darurat_nomor}
                    onChange={handleChange}
                    placeholder="08xxxxxxxxxx"
                    required
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 outline-none focus:ring-2 focus:ring-red-600/20"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: PEKERJAAN & AKUN */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="font-black text-slate-400 uppercase tracking-widest text-[11px]">Langkah 2: Data Kepegawaian & Akun</span>
                <span className="text-[11px] font-bold text-red-600">Semua Wajib Diisi</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-800 block mb-1">Username Login <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="Username tanpa spasi"
                    required
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-red-600/20"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">Password Akun <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Minimal 6 karakter"
                      required
                      className="w-full p-3 pr-10 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-red-600/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">Perusahaan <span className="text-red-500">*</span></label>
                  <select
                    name="perusahaan"
                    value={formData.perusahaan}
                    onChange={handleChange}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-red-600/20"
                  >
                    <option value="PT DEA GLOBAL NIAGA">PT DEA GLOBAL NIAGA</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">Lokasi Penempatan <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="penempatan"
                    value={formData.penempatan}
                    onChange={handleChange}
                    placeholder="Contoh: Site BIB / Head Office"
                    required
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-red-600/20"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">Departemen / Divisi <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    placeholder="Contoh: HRGA / Plant / Produksi / HSE"
                    required
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-red-600/20"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">Cost Center <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="cost_center"
                    value={formData.cost_center}
                    onChange={handleChange}
                    placeholder="Contoh: SITE BIB / HO"
                    required
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-red-600/20"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">Jabatan <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="jabatan"
                    value={formData.jabatan}
                    onChange={handleChange}
                    placeholder="Contoh: Operator / Mechanic / HRGA Officer"
                    required
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 outline-none focus:ring-2 focus:ring-red-600/20"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">Level Posisi <span className="text-red-500">*</span></label>
                  <select
                    name="level"
                    value={formData.level}
                    onChange={handleChange}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-red-600/20"
                  >
                    <option value="LEVEL 1 (DIRECTOR)">LEVEL 1 (DIRECTOR)</option>
                    <option value="LEVEL 2 (GENERAL MANAGER)">LEVEL 2 (GENERAL MANAGER)</option>
                    <option value="LEVEL 3 (MANAGER)">LEVEL 3 (MANAGER)</option>
                    <option value="LEVEL 4 (SUPERVISOR)">LEVEL 4 (SUPERVISOR)</option>
                    <option value="LEVEL 5 (OFFICER/LEADER)">LEVEL 5 (OFFICER/LEADER)</option>
                    <option value="LEVEL 6 (ENGINEER/TEKNISI)">LEVEL 6 (ENGINEER/TEKNISI)</option>
                    <option value="LEVEL 7 (OPERATOR/STAFF)">LEVEL 7 (OPERATOR/STAFF)</option>
                    <option value="STAFF">Staff</option>
                    <option value="OFFICER">Officer</option>
                    <option value="SUPERVISOR">Supervisor</option>
                    <option value="MANAGER">Manager</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">Status Karyawan <span className="text-red-500">*</span></label>
                  <select
                    name="status_karyawan"
                    value={formData.status_karyawan}
                    onChange={handleChange}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-red-600/20"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="PKWT">PKWT</option>
                    <option value="Magang">Magang</option>
                    <option value="Probation">Probation</option>
                    <option value="Harian">Harian</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">Nomor Pegawai / NIK Internal <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="nomor_pegawai"
                    value={formData.nomor_pegawai}
                    onChange={handleChange}
                    placeholder="Contoh: DGN-001"
                    required
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 outline-none focus:ring-2 focus:ring-red-600/20"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">Nomor PKWT / Kontrak Kerja <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="nomor_pkwt"
                    value={formData.nomor_pkwt}
                    onChange={handleChange}
                    placeholder="Nomor PKWT"
                    required
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 outline-none focus:ring-2 focus:ring-red-600/20"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">Tanggal Bergabung (Join Date) <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    name="join_date"
                    value={formData.join_date}
                    onChange={handleChange}
                    required
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 outline-none focus:ring-2 focus:ring-red-600/20"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">Email Pribadi <span className="text-red-500">*</span></label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="email.pribadi@gmail.com"
                    required
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 outline-none focus:ring-2 focus:ring-red-600/20"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">Email Kantor / Office <span className="text-red-500">*</span></label>
                  <input
                    type="email"
                    name="email_office"
                    value={formData.email_office}
                    onChange={handleChange}
                    placeholder="nama@deaglobalniaga.com"
                    required
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 outline-none focus:ring-2 focus:ring-red-600/20"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-800 block mb-1">Tipe Roster Pertambangan <span className="text-red-500">*</span></label>
                  <select
                    name="roster_type"
                    value={formData.roster_type}
                    onChange={handleChange}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-red-600/20"
                  >
                    <option value="8/2">Roster 8 Minggu Kerja / 2 Minggu Cuti (8/2)</option>
                    <option value="6/2">Roster 6 Minggu Kerja / 2 Minggu Cuti (6/2)</option>
                    <option value="Non-Roster">Non-Roster (Regular HO 5/2)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: PAJAK, BANK & BERKAS */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="font-black text-slate-400 uppercase tracking-widest text-[11px]">Langkah 3: Pajak, BPJS, Rekening & Berkas</span>
                <span className="text-[11px] font-bold text-red-600">Semua Wajib Diisi</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-800 block mb-1">Status Pajak (PTKP) <span className="text-red-500">*</span></label>
                  <select
                    name="status_pajak"
                    value={formData.status_pajak}
                    onChange={handleChange}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-red-600/20"
                  >
                    <option value="TK/0">TK/0 (Tidak Kawin, 0 Tanggungan)</option>
                    <option value="TK/1">TK/1 (Tidak Kawin, 1 Tanggungan)</option>
                    <option value="TK/2">TK/2 (Tidak Kawin, 2 Tanggungan)</option>
                    <option value="TK/3">TK/3 (Tidak Kawin, 3 Tanggungan)</option>
                    <option value="K/0">K/0 (Kawin, 0 Tanggungan)</option>
                    <option value="K/1">K/1 (Kawin, 1 Tanggungan)</option>
                    <option value="K/2">K/2 (Kawin, 2 Tanggungan)</option>
                    <option value="K/3">K/3 (Kawin, 3 Tanggungan)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">Nomor NPWP <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="npwp"
                    value={formData.npwp}
                    onChange={handleChange}
                    placeholder="Nomor Pokok Wajib Pajak"
                    required
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 outline-none focus:ring-2 focus:ring-red-600/20"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">Nomor BPJS Ketenagakerjaan (KPJ) <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="nomor_kpj"
                    value={formData.nomor_kpj}
                    onChange={handleChange}
                    placeholder="Nomor KPJ BPJS Ketenagakerjaan"
                    required
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 outline-none focus:ring-2 focus:ring-red-600/20"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">Nomor BPJS Kesehatan (JKN) <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="nomor_jkn"
                    value={formData.nomor_jkn}
                    onChange={handleChange}
                    placeholder="Nomor JKN BPJS Kesehatan"
                    required
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 outline-none focus:ring-2 focus:ring-red-600/20"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">Nama Bank <span className="text-red-500">*</span></label>
                  <select
                    name="nama_bank"
                    value={formData.nama_bank}
                    onChange={handleChange}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-red-600/20"
                  >
                    <option value="BCA">BCA</option>
                    <option value="Mandiri">Mandiri</option>
                    <option value="BRI">BRI</option>
                    <option value="BNI">BNI</option>
                    <option value="BSI">BSI</option>
                    <option value="CIMB Niaga">CIMB Niaga</option>
                    <option value="Permata">Permata</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">Nama Pemilik Rekening <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="nama_rekening"
                    value={formData.nama_rekening}
                    onChange={handleChange}
                    placeholder="Sesuai buku tabungan"
                    required
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 outline-none focus:ring-2 focus:ring-red-600/20"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-800 block mb-1">Nomor Rekening Bank <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="nomor_rekening"
                    value={formData.nomor_rekening}
                    onChange={handleChange}
                    placeholder="Nomor rekening bank"
                    required
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 outline-none focus:ring-2 focus:ring-red-600/20"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">Upload Berkas KTP (PDF / JPG)</label>
                  <input
                    type="file"
                    name="ktp_file"
                    accept="application/pdf,image/*"
                    onChange={handleChange}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">Upload Berkas KK (PDF / JPG)</label>
                  <input
                    type="file"
                    name="kk_file"
                    accept="application/pdf,image/*"
                    onChange={handleChange}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">Upload Berkas NPWP (PDF / JPG)</label>
                  <input
                    type="file"
                    name="npwp_file"
                    accept="application/pdf,image/*"
                    onChange={handleChange}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">Upload Berkas Ijazah (PDF / JPG)</label>
                  <input
                    type="file"
                    name="ijazah_file"
                    accept="application/pdf,image/*"
                    onChange={handleChange}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-5 border-t border-slate-200">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="flex items-center gap-1.5 px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all cursor-pointer"
              >
                <ArrowLeft size={16} /> Sebelumnya
              </button>
            ) : (
              <button
                type="button"
                onClick={handleToLogin}
                className="text-slate-500 hover:text-slate-800 font-bold text-xs cursor-pointer"
              >
                Sudah punya akun? <span className="text-red-600 font-black underline underline-offset-2">Login</span>
              </button>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-8 py-3.5 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-xl shadow-lg shadow-red-200 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                'Memproses...'
              ) : step < 3 ? (
                <>Lanjut <ArrowRight size={16} /></>
              ) : (
                <>Selesaikan Pendaftaran <Check size={16} /></>
              )}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
};

export default Signup;
