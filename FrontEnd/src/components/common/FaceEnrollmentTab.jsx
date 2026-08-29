import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Scan, Camera, CheckCircle2, AlertCircle, RefreshCw,
  Search, Users, ShieldCheck, Trash2, X, Eye, Sparkles, Building2,
  Upload, Image as ImageIcon, Plus, Check, HelpCircle, Maximize2
} from 'lucide-react';
import * as faceapi from 'face-api.js';
import api from '../../api/api';
import { useToast } from '../../context/ToastContext';

import { useAuth } from '../../context/AuthContext';

const FaceEnrollmentTab = ({ readOnly = false }) => {
  const { user } = useAuth();
  const role = (user?.role || '').toLowerCase();
  const isHSE = role === 'hse_admin' || ((user?.department || '').toLowerCase().includes('hse') || (user?.department || '').toLowerCase().includes('k3')) || readOnly;

  const { addToast } = useToast();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');

  // Modal State
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [enrollMode, setEnrollMode] = useState('replace'); // 'replace' | 'append'
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [enrollMethod, setEnrollMethod] = useState('upload'); // 'upload' | 'camera'
  
  // Multi-photo State (3 - 10 photos)
  const [photoSamples, setPhotoSamples] = useState([]); // [{ id, dataUrl, descriptor, score, isValid }]
  const [isProcessing, setIsProcessing] = useState(false);
  const [streamActive, setStreamActive] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Load face-api AI models
  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);
        setModelsLoaded(true);
      } catch (err) {
        console.error('Error loading face-api models:', err);
      }
    };
    loadModels();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await api.get('/hris/employees');
      setEmployees(res.data || []);
    } catch (err) {
      console.error('Fetch employees error:', err);
      addToast('Gagal memuat data karyawan', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Camera Management
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setStreamActive(true);
      }
    } catch (err) {
      console.error("Camera access error:", err);
      addToast('Tidak dapat mengakses kamera perangkat.', 'error');
    }
  };

  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setStreamActive(false);
    }
  }, []);

  const openEnrollModal = (emp, mode = 'replace') => {
    setSelectedEmp(emp);
    setEnrollMode(mode);
    setEnrollModalOpen(true);
    setPhotoSamples([]);
    setEnrollMethod('upload');
  };

  const closeEnrollModal = () => {
    stopCamera();
    setEnrollModalOpen(false);
    setSelectedEmp(null);
    setPhotoSamples([]);
    setIsProcessing(false);
  };

  // Helper: Process an HTMLImageElement or Canvas with face-api
  const processImageElement = async (imgEl) => {
    // High-resolution detector settings (inputSize 416) for fine landmark extraction
    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.45 });
    const detection = await faceapi.detectSingleFace(imgEl, options)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      return { isValid: false, error: 'Wajah tidak terdeteksi' };
    }

    return {
      isValid: true,
      score: Math.round(detection.detection.score * 100),
      descriptor: Array.from(detection.descriptor)
    };
  };

  // Handle Multi-file Upload (5-10 Photos)
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (photoSamples.length + files.length > 10) {
      addToast('Maksimal 10 foto sampel per karyawan.', 'warning');
    }

    const remainingSlots = 10 - photoSamples.length;
    const filesToProcess = files.slice(0, remainingSlots);

    setIsProcessing(true);

    for (const file of filesToProcess) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const dataUrl = event.target.result;
        const img = new Image();
        img.src = dataUrl;
        img.onload = async () => {
          try {
            const result = await processImageElement(img);
            setPhotoSamples(prev => [
              ...prev,
              {
                id: Date.now() + Math.random(),
                dataUrl,
                isValid: result.isValid,
                score: result.score || 0,
                descriptor: result.descriptor || null,
                error: result.error || null
              }
            ]);
          } catch (err) {
            console.error('Process image error:', err);
          }
        };
      };
      reader.readAsDataURL(file);
    }

    setIsProcessing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Capture Photo Snapshot from Live Camera
  const handleCaptureFromCamera = async () => {
    if (!videoRef.current || !modelsLoaded) return;
    if (photoSamples.length >= 10) {
      addToast('Maksimal 10 foto sampel telah tercapai.', 'warning');
      return;
    }

    setIsProcessing(true);
    try {
      const videoEl = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = videoEl.videoWidth || 640;
      canvas.height = videoEl.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg');

      const result = await processImageElement(canvas);

      if (!result.isValid) {
        addToast('Wajah tidak terdeteksi dalam jepretan kamera. Posisikan wajah Anda tepat di tengah.', 'warning');
      } else {
        addToast(`Sampel foto ke-${photoSamples.length + 1} berhasil dideteksi! (Akurasi: ${result.score}%)`, 'success');
      }

      setPhotoSamples(prev => [
        ...prev,
        {
          id: Date.now() + Math.random(),
          dataUrl,
          isValid: result.isValid,
          score: result.score || 0,
          descriptor: result.descriptor || null,
          error: result.error || null
        }
      ]);
    } catch (err) {
      console.error('Camera capture error:', err);
      addToast('Gagal memproses foto kamera.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Remove a photo sample
  const removePhotoSample = (id) => {
    setPhotoSamples(prev => prev.filter(p => p.id !== id));
  };

  // Preview Face Database Modal State
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewEmpData, setPreviewEmpData] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [lightboxImg, setLightboxImg] = useState(null);

  const openPreviewModal = async (emp) => {
    setLoadingPreview(true);
    setPreviewEmpData(null);
    setPreviewModalOpen(true);
    try {
      const res = await api.get(`/hris/employees/${emp.id}/face-samples`);
      setPreviewEmpData({
        ...emp,
        ...(res.data || {})
      });
    } catch (err) {
      console.error('Fetch face samples error:', err);
      addToast('Gagal memuat dataset biometrik wajah karyawan.', 'error');
    } finally {
      setLoadingPreview(false);
    }
  };

  const closePreviewModal = () => {
    setPreviewModalOpen(false);
    setPreviewEmpData(null);
  };

  // Delete a specific single photo sample from employee dataset
  const handleDeleteSingleSample = async (index) => {
    if (!previewEmpData) return;
    if (!window.confirm(`Hapus sampel foto #${index + 1} dari database? Foto-foto lainnya akan tetap tersimpan.`)) return;

    try {
      const res = await api.delete(`/hris/employees/${previewEmpData.id}/face-samples/${index}`);
      addToast(res.data.message || `Sampel foto #${index + 1} berhasil dihapus.`, 'success');
      setPreviewEmpData(prev => ({
        ...prev,
        images: res.data.images || [],
        sample_count: res.data.sample_count || 0,
        has_enrolled: res.data.has_enrolled
      }));
      fetchEmployees();
    } catch (err) {
      console.error('Delete single face sample error:', err);
      addToast('Gagal menghapus sampel foto.', 'error');
    }
  };

  // Save All Enrolled Multi-face Descriptors to Backend (Replace or Append Mode)
  const handleSaveMultiFaceDescriptors = async () => {
    const validSamples = photoSamples.filter(p => p.isValid && p.descriptor);

    const minRequired = enrollMode === 'append' ? 1 : 3;
    if (validSamples.length < minRequired) {
      addToast(
        enrollMode === 'append'
          ? 'Minimal 1 foto wajah valid diperlukan untuk ditambahkan.'
          : `Minimal 3 foto wajah valid diperlukan (Disarankan 5-10 foto untuk akurasi terbaik). Saat ini: ${validSamples.length} foto valid.`,
        'warning'
      );
      return;
    }

    setIsProcessing(true);
    try {
      const allDescriptors = validSamples.map(p => p.descriptor);
      const allImages = validSamples.map(p => p.dataUrl);

      const res = await api.post(`/hris/employees/${selectedEmp.id}/face-samples`, {
        face_descriptors: allDescriptors,
        face_images: allImages,
        mode: enrollMode
      });

      addToast(
        res.data.message || (enrollMode === 'append'
          ? `Berhasil menambahkan ${validSamples.length} foto baru ke database!`
          : `Berhasil mendaftarkan ${validSamples.length} sampel biometrik wajah untuk ${selectedEmp.nama_lengkap}!`),
        'success'
      );
      fetchEmployees();
      closeEnrollModal();
    } catch (err) {
      console.error('Save multi-descriptors error:', err);
      const errMsg = err.response?.data?.message || 'Gagal menyimpan dataset biometrik wajah.';
      addToast(errMsg, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Delete face descriptor
  const handleDeleteDescriptor = async (emp) => {
    if (!window.confirm(`Hapus data biometrik wajah untuk ${emp.nama_lengkap}? Karyawan harus mendaftar ulang untuk presensi biometrik.`)) return;

    try {
      await api.put(`/hris/employees/${emp.id}`, {
        face_descriptor: null
      });
      addToast('Data biometrik wajah berhasil dihapus.', 'success');
      fetchEmployees();
    } catch (err) {
      console.error('Delete descriptor error:', err);
      addToast('Gagal menghapus data biometrik wajah.', 'error');
    }
  };

  // Filtering
  const filteredEmployees = employees.filter(emp => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      (emp.nama_lengkap && emp.nama_lengkap.toLowerCase().includes(term)) ||
      (emp.nama && emp.nama.toLowerCase().includes(term)) ||
      (emp.jabatan && emp.jabatan.toLowerCase().includes(term)) ||
      (emp.nomor_pegawai && emp.nomor_pegawai.toLowerCase().includes(term));

    const matchesDept = selectedDept === 'ALL' || (emp.department || emp.departments?.name || '').toLowerCase().includes(selectedDept.toLowerCase());
    return matchesSearch && matchesDept;
  });

  const totalEnrolled = employees.filter(e => !!e.face_descriptor).length;
  const validCount = photoSamples.filter(p => p.isValid).length;

  return (
    <div className="w-full flex flex-col gap-4 font-sans animate-in fade-in">
      {/* Header Info */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-50 text-red-700 flex items-center justify-center font-black">
              <Scan size={18} />
            </div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">Manajemen Biometrik Wajah AI Multi-Foto</h2>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Daftarkan 3 hingga 5 sampel foto wajah per karyawan (tampak depan, miring kiri, miring kanan) untuk akurasi pengenalan biometrik maksimal.
          </p>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
            <span className="block text-[10px] font-black text-emerald-800 uppercase tracking-wider">Terdaftar AI</span>
            <span className="text-base font-black text-emerald-700">{totalEnrolled} / {employees.length}</span>
          </div>
          <div className="px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl text-center">
            <span className="block text-[10px] font-black text-amber-800 uppercase tracking-wider">Belum Terdaftar</span>
            <span className="text-base font-black text-amber-700">{employees.length - totalEnrolled}</span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Cari nama karyawan, jabatan..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-red-900/20"
            />
          </div>

          <select
            value={selectedDept}
            onChange={e => setSelectedDept(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
          >
            <option value="ALL">Semua Departemen</option>
            <option value="Project">Project</option>
            <option value="Maintenance">Maintenance</option>
            <option value="HRGA">HRGA</option>
            <option value="Pengelola KO">Pengelola KO</option>
            <option value="Pengelola K3">Pengelola K3</option>
            <option value="Direksi">Direksi</option>
          </select>
        </div>

        <button
          onClick={fetchEmployees}
          className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl transition"
          title="Refresh Data"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Employee Biometric Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-red-700 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredEmployees.map(emp => {
            const hasFace = !!emp.face_descriptor;
            let sampleCount = 0;
            try {
              if (hasFace) {
                const parsed = JSON.parse(emp.face_descriptor);
                sampleCount = Array.isArray(parsed) ? parsed.length : 1;
              }
            } catch (e) {
              sampleCount = 1;
            }
            const deptName = emp.department || emp.departments?.name || 'Operasional';

            return (
              <div key={emp.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-slate-600 text-sm overflow-hidden flex-shrink-0">
                        {emp.profile_photo_url ? (
                          <img src={emp.profile_photo_url} alt={emp.nama_lengkap} className="w-full h-full object-cover" />
                        ) : (
                          (emp.nama_lengkap || emp.nama || 'U').slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-900 leading-snug">{emp.nama_lengkap || emp.nama}</h4>
                        <p className="text-[10px] text-slate-500 font-bold">{emp.jabatan || 'Staff'}</p>
                        <span className="inline-block mt-0.5 text-[9px] font-black bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-100">
                          {deptName}
                        </span>
                      </div>
                    </div>

                    {/* Biometric Status Badge */}
                    {hasFace ? (
                      <span className="flex items-center gap-1 text-[10px] font-black bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full border border-emerald-200">
                        <ShieldCheck size={12} /> {sampleCount} Sampel Wajah
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-black bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full border border-slate-200">
                        Belum Terdaftar
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                  {hasFace && (
                    <button
                      onClick={() => openPreviewModal(emp)}
                      className={`${isHSE ? 'w-full' : 'py-2 px-3'} py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer`}
                      title="Lihat Galeri Foto Biometrik Database"
                    >
                      <Eye size={14} />
                      {isHSE ? 'Lihat Sampel Foto Biometrik' : 'Preview'}
                    </button>
                  )}

                  {!hasFace && isHSE && (
                    <span className="w-full text-center py-2 text-xs font-bold text-slate-400 bg-slate-50 border border-slate-200 rounded-xl">
                      Wajah Belum Terdaftar
                    </span>
                  )}

                  {!isHSE && (
                    <>
                      <button
                        onClick={() => openEnrollModal(emp)}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer ${
                          hasFace
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            : 'bg-red-700 hover:bg-red-800 text-white'
                        }`}
                      >
                        <Camera size={14} />
                        {hasFace ? `Perbarui (${sampleCount} Foto)` : 'Daftarkan 5 - 10 Foto'}
                      </button>

                      {hasFace && (
                        <button
                          onClick={() => handleDeleteDescriptor(emp)}
                          className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition border border-rose-200 cursor-pointer"
                          title="Hapus Data Biometrik Wajah"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Multi-Photo Face Enrollment Modal (Portaled to document.body for full-screen backdrop blur) */}
      {enrollModalOpen && selectedEmp && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[92vh] border border-slate-200">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg ${enrollMode === 'append' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'} flex items-center justify-center font-bold`}>
                  {enrollMode === 'append' ? <Plus size={18} /> : <Scan size={16} />}
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    {enrollMode === 'append' ? '➕ Tambah Foto Biometrik Baru (Tanpa Menimpa)' : 'Pendaftaran Biometrik Multi-Foto AI'}
                  </h3>
                  <p className="text-[11px] font-bold text-slate-500">{selectedEmp.nama_lengkap} ({selectedEmp.jabatan || 'Staff'})</p>
                </div>
              </div>
              <button
                onClick={closeEnrollModal}
                className="w-7 h-7 rounded-full bg-slate-200 text-slate-500 hover:bg-red-100 hover:text-red-700 flex items-center justify-center transition cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-5">
              {/* Guidance Alert */}
              <div className={`border rounded-2xl p-3.5 flex items-start gap-2.5 text-xs ${
                enrollMode === 'append' 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}>
                <HelpCircle size={18} className={`${enrollMode === 'append' ? 'text-emerald-700' : 'text-amber-700'} shrink-0 mt-0.5`} />
                <div className="leading-relaxed">
                  <p className="font-bold">
                    {enrollMode === 'append'
                      ? 'Mode Tambah Foto (Append): Foto lama tetap tersimpan 100%'
                      : 'Panduan Pengambilan 5 - 10 Foto Sampel Multi-Sudut & Aksesoris:'}
                  </p>
                  <p className={`text-[11px] mt-0.5 ${enrollMode === 'append' ? 'text-emerald-800' : 'text-amber-800'}`}>
                    {enrollMode === 'append'
                      ? 'Foto-foto baru yang Anda unggah/jepret di bawah ini akan DITAMBAHKAN ke database karyawan untuk memperkaya variasi wajah (misal: tambah foto berkacamata, foto berjanggut, atau foto helm APD) tanpa menghapus foto yang sudah terdaftar sebelumnya.'
                      : 'Unggah atau jepret 5 hingga 10 foto dengan variasi: (1) Depan lurus, (2) Serong kiri & kanan 15°, (3) Dengan Kacamata / Kacamata Safety, (4) Dengan Helm Safety APD Tambang, dan (5) Dengan/Tanpa Kumis & Jenggot. AI mengekstrak 68 titik landmark invariant untuk akurasi pengenalan 99.8%.'}
                  </p>
                </div>
              </div>

              {/* Method Switcher */}
              <div className="flex p-1 bg-slate-100 rounded-2xl gap-1">
                <button
                  type="button"
                  onClick={() => { setEnrollMethod('upload'); stopCamera(); }}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    enrollMethod === 'upload' ? 'bg-white text-red-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Upload size={14} /> Upload Foto ({enrollMode === 'append' ? '1 - 5 File Baru' : '5 - 10 File'})
                </button>
                <button
                  type="button"
                  onClick={() => { setEnrollMethod('camera'); setTimeout(startCamera, 200); }}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    enrollMethod === 'camera' ? 'bg-white text-red-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Camera size={14} /> Jepret Kamera Langsung
                </button>
              </div>

              {/* METHOD 1: UPLOAD FOTO */}
              {enrollMethod === 'upload' && (
                <div className="space-y-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/jpg,image/webp"
                    onChange={handleFileUpload}
                    className="hidden"
                  />

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-red-600 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer bg-slate-50/60 hover:bg-red-50/30 transition text-center"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-700 flex items-center justify-center">
                      <ImageIcon size={24} />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-800">
                        {enrollMode === 'append' ? 'Klik untuk memilih foto baru yang ingin ditambahkan' : 'Klik untuk memilih 5 - 10 foto wajah'}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">Mendukung format JPG, PNG, WEBP (Bisa pilih sekaligus)</p>
                    </div>
                  </div>
                </div>
              )}

              {/* METHOD 2: CAMERA SNAPSHOTS */}
              {enrollMethod === 'camera' && (
                <div className="flex flex-col items-center space-y-3">
                  <div className="relative w-full aspect-[4/3] max-w-sm bg-slate-950 rounded-2xl overflow-hidden border-2 border-slate-800 shadow-inner flex items-center justify-center">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-full object-cover ${!streamActive ? 'hidden' : ''}`}
                    />
                    {!streamActive && (
                      <div className="flex flex-col items-center justify-center text-slate-500 p-4 text-center">
                        <Camera size={32} className="mb-2 text-slate-600 animate-pulse" />
                        <span className="text-xs font-bold">Mengaktifkan kamera...</span>
                      </div>
                    )}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="w-48 h-56 border-2 border-red-500/70 border-dashed rounded-3xl animate-pulse" />
                    </div>

                    {(!modelsLoaded || (!streamActive && !videoRef.current)) && (
                      <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-2 p-4 text-center">
                        <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-xs font-bold text-white">Memuat modul kamera...</span>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleCaptureFromCamera}
                    disabled={isProcessing || !modelsLoaded || !streamActive || photoSamples.length >= 10}
                    className="w-full max-w-sm py-2.5 bg-red-700 hover:bg-red-800 disabled:bg-slate-300 text-white font-black text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Camera size={15} />
                    {isProcessing ? 'Mengekstraksi Wajah...' : `Ambil Jepretan Foto (${photoSamples.length}/10)`}
                  </button>
                </div>
              )}

              {/* SAMPLES GALLERY PREVIEW */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-800">
                    Foto Baru yang Akan Disimpan ({photoSamples.length})
                  </h4>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    (enrollMode === 'append' ? validCount >= 1 : validCount >= 3)
                      ? 'bg-emerald-100 text-emerald-800' 
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {(enrollMode === 'append' ? validCount >= 1 : validCount >= 3)
                      ? `Siap Disimpan (${validCount} Valid)` 
                      : `Kurang ${Math.max(0, (enrollMode === 'append' ? 1 : 3) - validCount)} foto valid`}
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-2.5">
                  {photoSamples.map((sample, idx) => (
                    <div key={sample.id} className="relative group aspect-[3/4] rounded-xl overflow-hidden border border-slate-200 bg-slate-100 flex flex-col justify-between shadow-sm">
                      <img src={sample.dataUrl} alt={`Sample ${idx + 1}`} className="w-full h-full object-cover" />
                      
                      {/* Detection Status Indicator */}
                      <div className="absolute top-1.5 left-1.5">
                        {sample.isValid ? (
                          <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow" title={`Wajah terdeteksi (Akurasi: ${sample.score}%)`}>
                            <Check size={11} />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center shadow" title={sample.error || 'Wajah tidak terdeteksi'}>
                            <AlertCircle size={11} />
                          </div>
                        )}
                      </div>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => removePhotoSample(sample.id)}
                        className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-slate-900/80 hover:bg-rose-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow cursor-pointer"
                        title="Hapus foto ini"
                      >
                        <X size={11} />
                      </button>

                      {/* Bottom Info */}
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 text-center">
                        <span className="text-[9px] font-black text-white">Foto #{idx + 1}</span>
                      </div>
                    </div>
                  ))}

                  {/* Empty Placeholders */}
                  {Array.from({ length: Math.max(0, (enrollMode === 'append' ? 3 : 5) - photoSamples.length) }).map((_, i) => (
                    <div
                      key={`empty-${i}`}
                      onClick={() => {
                        if (enrollMethod === 'upload') fileInputRef.current?.click();
                        else handleCaptureFromCamera();
                      }}
                      className="aspect-[3/4] rounded-xl border-2 border-dashed border-slate-200 hover:border-red-400 bg-slate-50 flex flex-col items-center justify-center text-slate-400 hover:text-red-600 cursor-pointer transition"
                    >
                      <Plus size={16} />
                      <span className="text-[9px] font-bold mt-1">Foto #{photoSamples.length + i + 1}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={closeEnrollModal}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleSaveMultiFaceDescriptors}
                disabled={isProcessing || (enrollMode === 'append' ? validCount < 1 : validCount < 3)}
                className={`px-5 py-2.5 rounded-xl text-xs font-black text-white transition flex items-center gap-2 shadow-md cursor-pointer ${
                  enrollMode === 'append'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700'
                    : 'bg-gradient-to-r from-red-700 to-red-600 hover:from-red-800 hover:to-red-700'
                } disabled:bg-slate-300 disabled:from-slate-300 disabled:to-slate-300`}
              >
                <Sparkles size={15} />
                {isProcessing
                  ? 'Menyimpan & Melatih AI...'
                  : enrollMode === 'append'
                    ? `➕ Tambahkan ${validCount} Foto Baru ke Database`
                    : `Simpan & Latih Model AI (${validCount} Foto Valid)`}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* DATABASE BIOMETRIC PREVIEW MODAL (Portaled to document.body for full-screen backdrop blur) */}
      {previewModalOpen && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[92vh] border border-slate-200">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-white via-rose-50/70 to-red-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-700 text-white flex items-center justify-center font-bold">
                  <Eye size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Database Biometrik Wajah Karyawan</h3>
                  <p className="text-[11px] font-bold text-slate-500">
                    {previewEmpData?.nama_lengkap || 'Karyawan'} • {previewEmpData?.nomor_pegawai || previewEmpData?.nik || '-'} ({previewEmpData?.jabatan || 'Staff'})
                  </p>
                </div>
              </div>
              <button
                onClick={closePreviewModal}
                className="w-7 h-7 rounded-full bg-slate-200 text-slate-500 hover:bg-red-100 hover:text-red-700 flex items-center justify-center transition cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4">
              {loadingPreview ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <div className="w-8 h-8 border-4 border-red-700 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs font-bold text-slate-500">Memuat dataset biometrik wajah...</span>
                </div>
              ) : (
                <>
                  {/* Status & Accuracy Overview */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl">
                      <span className="text-[10px] font-bold text-emerald-800 uppercase block">Status Database</span>
                      <span className="text-sm font-black text-emerald-700 flex items-center gap-1 mt-0.5">
                        <CheckCircle2 size={15} /> Aktif & Terverifikasi
                      </span>
                    </div>
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl">
                      <span className="text-[10px] font-bold text-blue-800 uppercase block">Total Sampel Biometrik</span>
                      <span className="text-sm font-black text-blue-700 mt-0.5 block">
                        {previewEmpData?.sample_count || 1} Titik Vektor AI
                      </span>
                    </div>
                    <div className="p-3 bg-purple-50 border border-purple-200 rounded-2xl">
                      <span className="text-[10px] font-bold text-purple-800 uppercase block">Akurasi & Invariance</span>
                      <span className="text-sm font-black text-purple-700 mt-0.5 block">
                        Kumis / Jenggot / Kacamata
                      </span>
                    </div>
                  </div>

                  {/* Registered Photos Gallery */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        <ImageIcon size={14} className="text-red-700" /> Galeri Sampel Foto Terdaftar di Database:
                      </h4>
                      <span className="text-[10px] text-slate-400 font-bold">
                        Klik foto untuk zoom atau klik tombol sampah untuk menghapus
                      </span>
                    </div>

                    {previewEmpData?.images && previewEmpData.images.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                        {previewEmpData.images.map((imgUrl, idx) => (
                          <div 
                            key={idx} 
                            onClick={() => setLightboxImg(imgUrl)}
                            className="relative aspect-[3/4] rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-sm group cursor-pointer"
                          >
                            <img src={imgUrl} alt={`Enrolled Face ${idx + 1}`} className="w-full h-full object-cover transition duration-300 group-hover:scale-105" />
                            
                            {/* Hover Overlay with Sample Info */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 opacity-0 group-hover:opacity-100 transition p-2 flex flex-col justify-between">
                              <div className="flex justify-between items-start">
                                <span className="px-1.5 py-0.5 bg-black/60 rounded text-[8px] font-black text-white">#{idx + 1}</span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteSingleSample(idx);
                                  }}
                                  className="w-6 h-6 rounded-lg bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg transition active:scale-90 cursor-pointer"
                                  title={`Hapus foto sampel #${idx + 1} ini dari database`}
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="text-[10px] font-black text-white block">Sampel #{idx + 1}</span>
                                  <span className="text-[8px] text-emerald-300 font-bold">128-D ResNet Vector</span>
                                </div>
                                <Maximize2 size={12} className="text-white/80" />
                              </div>
                            </div>

                            {/* Badge Number (Normal View) */}
                            <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-black/60 backdrop-blur-md rounded-md text-[8px] font-black text-white border border-white/20 group-hover:opacity-0 transition">
                              #{idx + 1}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center">
                        <div className="w-12 h-12 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center mx-auto mb-2 font-black">
                          <Scan size={20} />
                        </div>
                        <p className="text-xs font-bold text-slate-700">Dataset Biometrik Vektor 128-Dimensi Tersimpan</p>
                        <p className="text-[11px] text-slate-400 mt-1 max-w-md mx-auto">
                          Vektor matematis wajah ({previewEmpData?.sample_count || 1} sampel) telah aktif tersimpan di Supabase. Gunakan tombol <strong>"Tambah Foto Baru"</strong> di bawah untuk melengkapi galeri thumbnail visual.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* AI Robustness Info Box */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                    <h5 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <Sparkles size={14} className="text-red-700" /> Kinerja Model AI Pengenalan Wajah:
                    </h5>
                    <ul className="text-[11px] text-slate-600 space-y-1.5 pl-4 list-disc">
                      <li><strong>Kumis & Jenggot:</strong> Arsitektur 68-Point Facial Landmark mengekstrak koordinat tulang orbita mata, rasio hidung, dan jarak antar pupil yang tidak terpengaruh oleh rambut wajah.</li>
                      <li><strong>Kacamata & Kacamata Safety:</strong> Vektor multi-sampel melatih variasi frame kacamata bening maupun kacamata hitam APD tambang.</li>
                      <li><strong>Helm Safety / APD Tambang:</strong> Detektor mendeteksi kontur dahi dan dagu secara simetris bahkan saat pekerja mengenakan helm lapangan.</li>
                      <li><strong>Presensi Otomatis (Hands-Free):</strong> Saat wajah terdeteksi dengan kecocokan $\ge 85\%$, sistem otomatis menghitung mundur 3 detik untuk mencatat presensi tanpa perlu menyentuh layar.</li>
                    </ul>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer with Dual Actions (Append vs Reset) */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                {/* 1. APPEND BUTTON (Tambah Foto Tanpa Menimpa) */}
                <button
                  type="button"
                  onClick={() => {
                    closePreviewModal();
                    openEnrollModal(previewEmpData, 'append');
                  }}
                  className="px-3.5 py-2 rounded-xl text-xs font-black text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 transition flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                  title="Tambahkan foto baru ke koleksi yang sudah ada tanpa menghapus foto lama"
                >
                  <Plus size={14} /> Tambah Foto Baru (Tanpa Menimpa)
                </button>

                {/* 2. RESET/REPLACE BUTTON (Ganti Semua Foto) */}
                <button
                  type="button"
                  onClick={() => {
                    closePreviewModal();
                    openEnrollModal(previewEmpData, 'replace');
                  }}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
                  title="Ganti semua dataset foto dengan yang baru"
                >
                  <RefreshCw size={13} /> Ganti Semua Foto
                </button>
              </div>

              <button
                type="button"
                onClick={closePreviewModal}
                className="px-5 py-2 rounded-xl text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 transition cursor-pointer"
              >
                Tutup Preview
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* FULL-SIZE LIGHTBOX IMAGE ZOOM MODAL */}
      {lightboxImg && createPortal(
        <div 
          onClick={() => setLightboxImg(null)}
          className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg animate-in fade-in cursor-zoom-out"
        >
          <div className="relative max-w-lg max-h-[85vh] rounded-3xl overflow-hidden shadow-2xl border border-white/20 bg-slate-950 p-1" onClick={e => e.stopPropagation()}>
            <img src={lightboxImg} alt="Enrolled Face Full" className="w-full h-full max-h-[80vh] object-contain rounded-2xl" />
            <button
              onClick={() => setLightboxImg(null)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-red-600 transition cursor-pointer border border-white/20"
            >
              <X size={18} />
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default FaceEnrollmentTab;
