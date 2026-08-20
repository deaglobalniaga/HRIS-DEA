import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Scan, Camera, CheckCircle2, AlertCircle, RefreshCw,
  Search, Users, ShieldCheck, Trash2, X, Eye, Sparkles, Building2,
  Upload, Image as ImageIcon, Plus, Check, HelpCircle
} from 'lucide-react';
import * as faceapi from 'face-api.js';
import api from '../../api/api';
import { useToast } from '../../context/ToastContext';

const FaceEnrollmentTab = () => {
  const { addToast } = useToast();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');

  // Modal State
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [enrollMethod, setEnrollMethod] = useState('upload'); // 'upload' | 'camera'
  
  // Multi-photo State (3 - 5 photos)
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

  const openEnrollModal = (emp) => {
    setSelectedEmp(emp);
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
    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });
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

  // Handle Multi-file Upload (3-5 Photos)
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (photoSamples.length + files.length > 5) {
      addToast('Maksimal 5 foto per karyawan.', 'warning');
    }

    const remainingSlots = 5 - photoSamples.length;
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
    if (photoSamples.length >= 5) {
      addToast('Maksimal 5 foto sampel telah tercapai.', 'warning');
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

  // Save All Enrolled Multi-face Descriptors to Backend
  const handleSaveMultiFaceDescriptors = async () => {
    const validSamples = photoSamples.filter(p => p.isValid && p.descriptor);

    if (validSamples.length < 3) {
      addToast(`Minimal 3 foto wajah yang valid diperlukan (Saat ini: ${validSamples.length} foto valid).`, 'warning');
      return;
    }

    setIsProcessing(true);
    try {
      const allDescriptors = validSamples.map(p => p.descriptor);

      await api.post(`/hris/employees/${selectedEmp.id}/face-samples`, {
        face_descriptors: allDescriptors
      });

      addToast(`Berhasil mendaftarkan ${validSamples.length} sampel biometrik wajah untuk ${selectedEmp.nama_lengkap}!`, 'success');
      fetchEmployees();
      closeEnrollModal();
    } catch (err) {
      console.error('Save multi-descriptors error:', err);
      addToast('Gagal menyimpan dataset biometrik wajah.', 'error');
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
                  <button
                    onClick={() => openEnrollModal(emp)}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition shadow-sm ${
                      hasFace
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        : 'bg-red-700 hover:bg-red-800 text-white'
                    }`}
                  >
                    <Camera size={14} />
                    {hasFace ? 'Perbarui Sampel (3-5 Foto)' : 'Daftarkan 3-5 Foto'}
                  </button>

                  {hasFace && (
                    <button
                      onClick={() => handleDeleteDescriptor(emp)}
                      className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition border border-rose-200"
                      title="Hapus Data Biometrik Wajah"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Multi-Photo Face Enrollment Modal */}
      {enrollModalOpen && selectedEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center font-bold">
                  <Scan size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Pendaftaran Biometrik Multi-Foto AI</h3>
                  <p className="text-[11px] font-bold text-slate-500">{selectedEmp.nama_lengkap} ({selectedEmp.jabatan || 'Staff'})</p>
                </div>
              </div>
              <button
                onClick={closeEnrollModal}
                className="w-7 h-7 rounded-full bg-slate-200 text-slate-500 hover:bg-red-100 hover:text-red-700 flex items-center justify-center transition"
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-5">
              {/* Guidance Alert */}
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-amber-900">
                <HelpCircle size={18} className="text-amber-700 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <p className="font-bold">Panduan Pengambilan 3 - 5 Foto Sampel:</p>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Unggah atau ambil <strong>3 hingga 5 foto</strong> dengan berbagai variasi sudut: <strong>(1) Depan lurus</strong>, <strong>(2) Miring kiri 15°</strong>, <strong>(3) Miring kanan 15°</strong>, dan <strong>(4) Ekspresi senyum/kacamata</strong>. AI akan mengekstrak vektor descriptor dari setiap foto.
                  </p>
                </div>
              </div>

              {/* Method Switcher */}
              <div className="flex p-1 bg-slate-100 rounded-2xl gap-1">
                <button
                  type="button"
                  onClick={() => { setEnrollMethod('upload'); stopCamera(); }}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition ${
                    enrollMethod === 'upload' ? 'bg-white text-red-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Upload size={14} /> Upload Foto (3 - 5 File)
                </button>
                <button
                  type="button"
                  onClick={() => { setEnrollMethod('camera'); setTimeout(startCamera, 200); }}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition ${
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
                      <p className="text-xs font-black text-slate-800">Klik untuk memilih 3 - 5 foto wajah</p>
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
                      className="w-full h-full object-cover transform -scale-x-100"
                    />
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="w-48 h-56 border-2 border-red-500/70 border-dashed rounded-3xl animate-pulse" />
                    </div>

                    {(!modelsLoaded || !streamActive) && (
                      <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-2 p-4 text-center">
                        <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-xs font-bold text-white">Memuat modul kamera...</span>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleCaptureFromCamera}
                    disabled={isProcessing || !modelsLoaded || !streamActive || photoSamples.length >= 5}
                    className="w-full max-w-sm py-2.5 bg-red-700 hover:bg-red-800 disabled:bg-slate-300 text-white font-black text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2"
                  >
                    <Camera size={15} />
                    {isProcessing ? 'Mengekstraksi Wajah...' : `Ambil Jepretan Foto (${photoSamples.length}/5)`}
                  </button>
                </div>
              )}

              {/* SAMPLES GALLERY PREVIEW (3 - 5 Photos) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-800">
                    Koleksi Sampel Foto Wajah ({photoSamples.length}/5)
                  </h4>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    validCount >= 3 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {validCount >= 3 ? `Siap Dilatih (${validCount} Valid)` : `Kurang ${Math.max(0, 3 - validCount)} foto valid`}
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
                        className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-slate-900/80 hover:bg-rose-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow"
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

                  {/* Empty Placeholders up to 5 */}
                  {Array.from({ length: Math.max(0, 5 - photoSamples.length) }).map((_, i) => (
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
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 transition"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleSaveMultiFaceDescriptors}
                disabled={isProcessing || validCount < 3}
                className="px-5 py-2.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-red-700 to-red-600 hover:from-red-800 hover:to-red-700 disabled:bg-slate-300 disabled:from-slate-300 disabled:to-slate-300 transition flex items-center gap-2 shadow-md"
              >
                <Sparkles size={15} />
                {isProcessing ? 'Menyimpan & Melatih AI...' : `Simpan & Latih Model AI (${validCount} Foto Valid)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FaceEnrollmentTab;
