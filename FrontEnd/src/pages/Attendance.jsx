import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, MapPin, CheckCircle, Fingerprint, AlertCircle, RefreshCw, XCircle, Clock } from 'lucide-react';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';
import { MapContainer, TileLayer, Marker, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import * as faceapi from 'face-api.js';

// Fix leaflet icon missing issues
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});
const Attendance = () => {
  const { user } = useAuth();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const [streamActive, setStreamActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' });

  // Attendance state
  const [attType, setAttType] = useState('check-in'); // 'check-in', 'check-out', 'sick', 'leave'
  const [location, setLocation] = useState({ lat: null, lng: null, text: 'Mendeteksi lokasi...' });

  // Timer state
  const detectionInterval = useRef(null);

  // Right panel state (daily list)
  const [roster, setRoster] = useState({ present: [], missing: [], sakit: [], izin: [], cuti: [], off: [] });
  const [fetchingRecords, setFetchingRecords] = useState(true);
  const [activeRosterTab, setActiveRosterTab] = useState('Belum Absen');
  const ROSTER_TABS = ['Belum Absen', 'Sudah Absen', 'Tidak Hadir'];

  const [modelsLoaded, setModelsLoaded] = useState(false);

  // Load face-api models
  useEffect(() => {
    const loadModels = async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models')
        ]);
        setModelsLoaded(true);
      } catch (err) {
        console.error('Error loading face models:', err);
      }
    };
    loadModels();
  }, []);

  // Wait before allowing capture (simulating loading readiness)
  useEffect(() => {
    setStatusMsg({ text: 'Kamera siap digunakan!', type: 'success' });
  }, []);

  // Initialize camera
  const startCamera = async () => {
    if (attType === 'sick' || attType === 'leave') return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setStreamActive(true);
      }
    } catch (err) {
      console.error("Camera error:", err);
      setStatusMsg({ text: 'Akses kamera ditolak atau tidak ditemukan.', type: 'error' });
    }
  };

  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setStreamActive(false);
    }
    if (detectionInterval.current) clearInterval(detectionInterval.current);
  }, []);

  // Real-time UI Update Loop for Timestamp
  useEffect(() => {
    if (!streamActive || !videoRef.current) return;

    if (detectionInterval.current) clearInterval(detectionInterval.current);

    detectionInterval.current = setInterval(() => {
      if (videoRef.current && streamActive) {
        // --- LIVE DRAWING ON OVERLAY ---
        if (overlayCanvasRef.current && videoRef.current) {
          const canvas = overlayCanvasRef.current;
          const video = videoRef.current;
          if (video.videoWidth > 0) {
            // Ensure canvas matches video resolution
            if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
            }
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw Live Watermark — positioned relative to canvas size
            const fontSize = Math.max(10, Math.round(canvas.width * 0.025));
            const lineH = Math.round(fontSize * 1.6);
            const padX = Math.round(canvas.width * 0.02);
            const padY = Math.round(canvas.height * 0.02);
            const boxH = lineH * 3 + padY * 2;
            const boxW = Math.min(Math.round(canvas.width * 0.6), canvas.width - padX * 2);
            const boxX = padX;
            const boxY = canvas.height - boxH - padY;

            ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
            ctx.shadowBlur = 4;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${fontSize + 2}px Arial`;
            ctx.fillText('HRIS - Presensi', boxX + padX, boxY + padY + fontSize);
            ctx.font = `${fontSize}px Arial`;
            ctx.fillText(`Waktu: ${new Date().toLocaleString('id-ID')}`, boxX + padX, boxY + padY + fontSize + lineH);
            ctx.fillText(`GPS: ${location.text}`, boxX + padX, boxY + padY + fontSize + lineH * 2);

            // Draw Face Detections if models are loaded
            if (modelsLoaded) {
              faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).then(detections => {
                if (detections && detections.length > 0) {
                  const resizedDetections = faceapi.resizeResults(detections, { width: video.videoWidth, height: video.videoHeight });
                  faceapi.draw.drawDetections(canvas, resizedDetections);
                }
              }).catch(e => console.error("Face detection error:", e));
            }
          }
        }
        // -------------------------------
      }
    }, 500); // scan every 500ms

    return () => clearInterval(detectionInterval.current);
  }, [streamActive, location.text]);

  // Fetch location
  const fetchLocation = useCallback(() => {
    setLocation({ lat: null, lng: null, text: 'Mendeteksi lokasi & Alamat (GPS)...' });
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          let address = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
            const data = await res.json();
            if (data && data.display_name) {
              // Use a shorter version of the address if possible, or just the full name
              address = data.display_name;
            }
          } catch (e) {
            console.error("Geocoding failed", e);
          }

          setLocation({
            lat: lat,
            lng: lng,
            text: address
          });
        },
        (error) => {
          console.error(error);
          setLocation({ lat: null, lng: null, text: 'Gagal mendeteksi lokasi GPS.' });
        }
      );
    } else {
      setLocation({ lat: null, lng: null, text: 'GPS tidak didukung oleh browser Anda.' });
    }
  }, []);

  // Fetch real daily records from backend
  const fetchDailyRecords = async () => {
    setFetchingRecords(true);
    try {
      const res = await api.get('/hris/attendance/today');
      setRoster(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setFetchingRecords(false);
    }
  };

  useEffect(() => {
    fetchLocation();
    fetchDailyRecords();

    if (attType === 'check-in' || attType === 'check-out') {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [attType, fetchLocation, stopCamera]);


  const handleSubmit = async () => {
    if (!location.lat && !location.lng) {
      setStatusMsg({ text: 'Mohon tunggu sampai lokasi GPS terdeteksi!', type: 'error' });
      return;
    }



    let photoBase64 = null;
    if ((attType === 'check-in' || attType === 'check-out') && videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      // Clean capture without boxes (with Aggressive Compression)
      // Resize to a maximum width of 640px to save massive bucket space
      const MAX_WIDTH = 640;
      let width = video.videoWidth;
      let height = video.videoHeight;

      if (width > MAX_WIDTH) {
        height = Math.round(height * (MAX_WIDTH / width));
        width = MAX_WIDTH;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      // Draw video frame scaled down
      ctx.drawImage(video, 0, 0, width, height);

      // Compress aggressively to JPEG with 0.5 quality
      const capturedDataUrl = canvas.toDataURL('image/jpeg', 0.5);
      photoBase64 = capturedDataUrl;
    }

    setLoading(true);
    setStatusMsg({ text: 'Mengirim data dan foto...', type: 'info' });

    try {
      let endpoint = '/hris/attendance';
      let payload = {};

      if (attType === 'check-in' || attType === 'check-out') {
        payload = {
          type: attType === 'check-in' ? 'Check In' : 'Check Out',
          ipAddress: location.text,
          lat: location.lat,
          lng: location.lng,
          timestamp: new Date().toISOString(),
          hasPhoto: true,
          photoBase64: photoBase64
        };
      } else {
        payload = {
          type: attType === 'sick' ? 'Sick' : 'Leave',
          ipAddress: location.text,
          timestamp: new Date().toISOString(),
          hasPhoto: false
        };
      }

      await api.post(endpoint, payload);
      setStatusMsg({ text: `Berhasil mencatat ${attType} pada sistem!`, type: 'success' });
      fetchDailyRecords(); // Refresh list
    } catch (err) {
      const serverMsg = err.response?.data?.error || 'Terjadi kesalahan sistem saat mengirim data';
      setStatusMsg({ text: serverMsg, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col w-full h-full pb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-black text-slate-800 tracking-tight">Presensi AI & GPS</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">Sistem presensi dengan Ai face detection & Geolocation.</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">

        {/* Left Side: Attendance Form — full width for users, fixed width for admin */}
        <div className={`bg-white p-3 sm:p-5 rounded-3xl shadow-sm border border-slate-200 flex flex-col h-fit relative pb-32 lg:pb-5 ${(user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'hr')
          ? 'w-full lg:w-[400px] xl:w-[450px] shrink-0'
          : 'w-full max-w-2xl mx-auto'
          }`}>
          <h2 className="text-sm sm:text-base font-bold text-slate-800 mb-3">Pilih Tipe Absensi</h2>

          <div className="grid grid-cols-4 gap-1.5 sm:gap-2 mb-4">
            {[
              { id: 'check-in', label: 'Check In', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', active: 'ring-2 ring-green-500 bg-green-50' },
              { id: 'check-out', label: 'Check Out', icon: RefreshCw, color: 'text-amber-600', bg: 'bg-amber-50', active: 'ring-2 ring-amber-500 bg-amber-50' },
              { id: 'sick', label: 'Sakit', icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', active: 'ring-2 ring-red-500 bg-red-50' },
              { id: 'leave', label: 'Izin', icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50', active: 'ring-2 ring-blue-500 bg-blue-50' },
            ].map(type => (
              <button
                key={type.id}
                onClick={() => setAttType(type.id)}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border border-slate-100 transition-all ${attType === type.id ? type.active : 'hover:bg-slate-50 opacity-60 hover:opacity-100'
                  }`}
              >
                <type.icon size={20} className={`${type.color} mb-1.5`} />
                <span className="text-xs font-bold text-slate-700">{type.label}</span>
              </button>
            ))}
          </div>

          {(attType === 'check-in' || attType === 'check-out') && (
            <div className="w-full h-[300px] sm:h-[400px] bg-slate-900 rounded-xl overflow-hidden relative mb-4 flex items-center justify-center border-4 border-slate-800 shadow-inner">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${!streamActive ? 'hidden' : ''}`}
              />
              {!streamActive && (
                <div className="flex flex-col items-center justify-center text-slate-500">
                  <Camera size={48} className="mb-2 opacity-50" />
                  <p className="text-sm font-bold">Kamera dinonaktifkan</p>
                </div>
              )}
              {/* Live Overlay Canvas */}
              <canvas
                ref={overlayCanvasRef}
                className={`absolute inset-0 w-full h-full object-cover pointer-events-none z-20 ${!streamActive ? 'hidden' : ''}`}
              />


              {/* Hidden canvas for snapshot */}
              <canvas ref={canvasRef} className="hidden" />
            </div>
          )}

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 mb-4 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                <MapPin size={20} />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-800">Koordinat GPS Anda</span>
                <span className="text-xs text-slate-500">{location.text}</span>
              </div>
              <button onClick={fetchLocation} className="ml-auto text-xs text-blue-600 font-bold hover:underline">Perbarui</button>
            </div>

            {location.lat && location.lng && (
              <div className="w-full h-48 rounded-lg overflow-hidden border border-slate-200 relative z-0">
                <MapContainer key={`${location.lat}-${location.lng}`} center={[location.lat, location.lng]} zoom={18} style={{ height: '100%', width: '100%' }} zoomControl={false} dragging={false} scrollWheelZoom={false}>
                  <TileLayer
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    attribution="Tiles &copy; Esri"
                  />
                  <Circle center={[location.lat, location.lng]} pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.3 }} radius={20} />
                  <Marker position={[location.lat, location.lng]} />
                </MapContainer>
              </div>
            )}
          </div>

          {statusMsg.text && (
            <div className={`p-3 rounded-xl mb-4 text-xs font-bold flex items-center gap-2 ${statusMsg.type === 'error' ? 'bg-red-50 text-red-700 border border-red-100' :
              statusMsg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' :
                'bg-blue-50 text-blue-700 border border-blue-100'
              }`}>
              {statusMsg.type === 'error' ? <XCircle size={16} /> : statusMsg.type === 'success' ? <CheckCircle size={16} /> : <RefreshCw size={16} className="animate-spin" />}
              {statusMsg.text}
            </div>
          )}

          {/* Submit Button Floating on Mobile */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-xl border-t border-slate-200 z-50 lg:relative lg:p-0 lg:bg-transparent lg:border-none lg:mt-4">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className={`w-full py-4 rounded-2xl text-white font-black text-sm sm:text-base tracking-wide shadow-xl transition-all flex items-center justify-center gap-3 ${loading
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                : 'bg-red-900 hover:bg-red-800 shadow-red-900/30 hover:-translate-y-1 active:translate-y-0 active:shadow-md'
                }`}
            >
              {loading ? (
                <> <RefreshCw size={22} className="animate-spin" /> Memproses... </>
              ) : (
                <> <Fingerprint size={24} /> {
                  attType === 'check-in' ? 'Kirim Check In Sekarang'
                    : attType === 'check-out' ? 'Kirim Check Out Sekarang'
                      : attType === 'sick' ? 'Kirim Laporan Sakit' : 'Kirim Laporan Izin'
                } </>
              )}
            </button>
            {/* Safe area spacing for mobile swipe indicator */}
            <div className="h-6 lg:hidden w-full"></div>
          </div>
        </div>

        {/* Right Side: Daily Roster (Only for Admin/HR) */}
        {(user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'hr') && (
          <div className="w-full xl:w-2/3 bg-transparent flex flex-col h-auto lg:h-[calc(100vh-180px)] lg:max-h-[600px]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-slate-800 text-lg">Daftar Kehadiran Harian</h3>
              <button onClick={fetchDailyRecords} className="p-2 bg-white text-slate-500 hover:text-slate-800 rounded-lg shadow-sm transition-colors flex items-center gap-2 font-bold text-xs">
                <RefreshCw size={14} className={fetchingRecords ? 'animate-spin' : ''} /> Refresh Data
              </button>
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 overflow-y-auto pb-4 scrollbar-hide">
              {fetchingRecords ? (
                <div className="col-span-1 md:col-span-3 flex justify-center items-center h-full text-slate-400 font-bold text-sm bg-white rounded-2xl shadow-sm border border-slate-200 min-h-[200px]">
                  Memuat data server...
                </div>
              ) : (
                <>
                  {/* Column 1: Belum Absen */}
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                    <div className="p-3 border-b border-slate-100 bg-red-900 text-white font-black text-sm text-center">
                      Belum Absen
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 scrollbar-hide max-h-[400px]">
                      {roster.missing && roster.missing.length > 0 ? roster.missing.map(p => (
                        <div key={p.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-xl transition-colors border-b border-slate-50 last:border-0">
                          <img src={p.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}`} alt={p.name} className="w-8 h-8 rounded-full border border-slate-200" />
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-slate-800 truncate">{p.name}</span>
                            <span className="text-[10px] text-slate-400 uppercase tracking-wide">{p.division}</span>
                          </div>
                        </div>
                      )) : <div className="text-center p-4 text-xs font-bold text-slate-400">Semua sudah absen</div>}
                    </div>
                  </div>

                  {/* Column 2: Sudah Absen (Present) */}
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                    <div className="p-3 border-b border-slate-100 bg-green-600 text-white font-black text-sm text-center">
                      Sudah Absen
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 scrollbar-hide max-h-[400px]">
                      {roster.present && roster.present.length > 0 ? roster.present.map(p => (
                        <div key={p.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl transition-colors border-b border-slate-50 last:border-0">
                          <div className="flex items-center gap-3">
                            <img src={p.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}`} alt={p.name} className="w-8 h-8 rounded-full border border-green-200" />
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-bold text-slate-800 truncate">{p.name}</span>
                              <span className="text-[10px] text-green-600 font-bold uppercase tracking-wide">Hadir</span>
                            </div>
                          </div>
                          {p.checkIn && <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-1 rounded">{new Date(p.checkIn).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>}
                        </div>
                      )) : <div className="text-center p-4 text-xs font-bold text-slate-400">Belum ada yang absen</div>}
                    </div>
                  </div>

                  {/* Column 3: Tidak Hadir (Izin/Sakit/Off) */}
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                    <div className="p-3 border-b border-slate-100 bg-amber-500 text-white font-black text-sm text-center">
                      Tidak Hadir
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 scrollbar-hide max-h-[400px]">
                      {(!roster.izin?.length && !roster.sakit?.length && !roster.off?.length && !roster.cuti?.length) && (
                        <div className="text-center p-4 text-xs font-bold text-slate-400">Tidak ada data</div>
                      )}
                      {[...(roster.sakit || []).map(p => ({ ...p, type: 'Sakit', c: 'text-red-600' })),
                      ...(roster.izin || []).map(p => ({ ...p, type: 'Izin', c: 'text-blue-600' })),
                      ...(roster.cuti || []).map(p => ({ ...p, type: 'Cuti', c: 'text-amber-600' })),
                      ...(roster.off || []).map(p => ({ ...p, type: 'Off', c: 'text-slate-600' }))].map(p => (
                        <div key={p.id + p.type} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl transition-colors border-b border-slate-50 last:border-0">
                          <div className="flex items-center gap-3">
                            <img src={p.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}`} alt={p.name} className="w-8 h-8 rounded-full border border-slate-200" />
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-bold text-slate-800 truncate">{p.name}</span>
                              <span className={`text-[10px] font-black uppercase tracking-wide ${p.c}`}>{p.type}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

      </div>
      <style>{`
        @keyframes scan {
            0% { top: 0%; }
            50% { top: 100%; }
            100% { top: 0%; }
        }
      `}</style>
    </div>
  );
};

export default Attendance;
