import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft, Camera, MapPin, CheckCircle, Fingerprint,
  AlertCircle, RefreshCw, XCircle, Clock, UserCheck, ShieldCheck,
  Sparkles, ChevronDown, User, Lock, Timer
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import * as faceapi from 'face-api.js';

// Calculate distance in meters between two GPS coordinates
const calculateDistanceMeters = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 999999;
  const R = 6371e3; // metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const Attendance = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const [streamActive, setStreamActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recognizing, setRecognizing] = useState(false);

  // Live Time
  const [currentTime, setCurrentTime] = useState(new Date());

  // Company Settings & Geofence Locations
  const [companySettings, setCompanySettings] = useState(null);
  const [attendanceMode, setAttendanceMode] = useState('locked'); // 'in' | 'out' | 'locked'
  const [scheduleStatusMessage, setScheduleStatusMessage] = useState('');
  const [countdown, setCountdown] = useState(null);
  const [autoTriggered, setAutoTriggered] = useState(false);

  // Location & Geofencing
  const [location, setLocation] = useState({ lat: null, lng: null, accuracy: null, text: 'Mendeteksi lokasi GPS...' });
  const [siteLocationName, setSiteLocationName] = useState('Memuat lokasi site...');
  const [isInsideGeofence, setIsInsideGeofence] = useState(false);

  // Face Recognition State
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [recognizedEmployee, setRecognizedEmployee] = useState(null);
  const [matchScore, setMatchScore] = useState(null);
  const [faceMismatchError, setFaceMismatchError] = useState(null);
  const isRecognizingRef = useRef(false);
  const noFaceCountRef = useRef(0);

  // Fetch Company Settings from Superadmin
  const fetchSettings = async () => {
    try {
      const res = await api.get('/settings');
      if (res.data) {
        setCompanySettings(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Calculate WITA Schedule Window & Determine Auto Check-In vs Check-Out
  useEffect(() => {
    if (!companySettings) return;

    // Convert currentTime to WITA (Asia/Makassar)
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Makassar',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    const parts = formatter.formatToParts(currentTime);
    const h = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
    const m = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
    const currentTotalMins = h * 60 + m;

    const parseMin = (timeStr, def) => {
      const [th, tm] = (timeStr || def).split(':').map(Number);
      return (th || 0) * 60 + (tm || 0);
    };

    const inStart = parseMin(companySettings.checkInStart, '06:00');
    const inEnd = parseMin(companySettings.checkInEnd, '08:00');
    const maxLate = Number(companySettings.maxLateMinutes) || 15;
    const inLateLimit = inEnd + maxLate;

    const outStart = parseMin(companySettings.checkOutStart, '17:00');
    const outEnd = parseMin(companySettings.checkOutEnd, '22:00');

    if (currentTotalMins >= inStart && currentTotalMins <= inLateLimit) {
      setAttendanceMode('in');
      if (currentTotalMins > inEnd) {
        setScheduleStatusMessage(`Jadwal Masuk (Terlambat) • Batas ${companySettings.checkInEnd || '08:00'} (+${maxLate}m toleransi)`);
      } else {
        setScheduleStatusMessage(`Jadwal Masuk Tepat Waktu • ${companySettings.checkInStart || '06:00'} - ${companySettings.checkInEnd || '08:00'} WITA`);
      }
    } else if (currentTotalMins >= outStart && currentTotalMins <= outEnd) {
      setAttendanceMode('out');
      setScheduleStatusMessage(`Jadwal Presensi Pulang • ${companySettings.checkOutStart || '17:00'} - ${companySettings.checkOutEnd || '22:00'} WITA`);
    } else {
      setAttendanceMode('locked');
      setScheduleStatusMessage(`Di Luar Jam Presensi (${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} WITA) • Masuk: ${companySettings.checkInStart || '06:00'}-${companySettings.checkInEnd || '08:00'} | Pulang: ${companySettings.checkOutStart || '17:00'}-${companySettings.checkOutEnd || '22:00'} WITA`);
    }
  }, [currentTime, companySettings]);

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
        console.error('Error loading face models:', err);
      }
    };
    loadModels();
  }, []);

  // Camera initialization (High quality user facing camera)
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setStreamActive(true);
      }
    } catch (err) {
      console.error("Camera error:", err);
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false
        });
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
          setStreamActive(true);
        }
      } catch (fallbackErr) {
        addToast('Akses kamera ditolak atau tidak ditemukan.', 'error');
      }
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

  // Geolocation & Dynamic Superadmin Site Geofence Matching
  const fetchLocation = useCallback(() => {
    setLocation({ lat: null, lng: null, accuracy: null, text: 'Mendeteksi sinyal GPS...' });
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude: lat, longitude: lng, accuracy } = position.coords;
          let address = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

          // Find nearest location configured in Super Admin Settings
          const activeLocations = (companySettings?.locations && Array.isArray(companySettings.locations) && companySettings.locations.length > 0)
            ? companySettings.locations
            : [
                { id: 1, name: 'Head Office Banjarbaru', lat: -3.42436, lng: 115.99267, radius: 50 },
                { id: 2, name: 'DEA Site Angsana', lat: -3.70968, lng: 115.60683, radius: 50 }
              ];

          let nearest = activeLocations[0];
          let minDistance = 999999;

          activeLocations.forEach(loc => {
            const dist = calculateDistanceMeters(lat, lng, loc.lat, loc.lng);
            if (dist < minDistance) {
              minDistance = dist;
              nearest = loc;
            }
          });

          const allowedRadius = (nearest.radius || 50) + 50;
          const inside = minDistance <= allowedRadius;
          setIsInsideGeofence(inside);
          setSiteLocationName(`${nearest.name} (${Math.round(minDistance)}m)`);

          setLocation({ lat, lng, accuracy, text: address });
        },
        (error) => {
          console.error(error);
          setLocation({ lat: null, lng: null, accuracy: null, text: 'Gagal mendeteksi sinyal GPS.' });
        },
        { enableHighAccuracy: true, timeout: 15000 }
      );
    }
  }, [companySettings]);

  const isCameraDisabled = user?.camera_access === false;
  const isGpsDisabled = user?.gps_access === false;

  useEffect(() => {
    fetchLocation();
    if (!isCameraDisabled) {
      startCamera();
    }
    return () => stopCamera();
  }, [fetchLocation, stopCamera, isCameraDisabled]);

  // Real-time Face AI Scanning Loop (Continuous face-lock)
  useEffect(() => {
    if (isCameraDisabled || !streamActive || !videoRef.current || !modelsLoaded) return;

    const interval = setInterval(async () => {
      if (videoRef.current && videoRef.current.readyState === 4) {
        const video = videoRef.current;
        const canvas = overlayCanvasRef.current;

        if (canvas) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          // Fast & accurate 416px detector
          const detection = await faceapi
            .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.30 }))
            .withFaceLandmarks()
            .withFaceDescriptor();

          if (detection) {
            noFaceCountRef.current = 0;
            const resized = faceapi.resizeResults(detection, { width: video.videoWidth, height: video.videoHeight });
            
            // Draw clean bounding frame with futuristic corners
            const { x, y, width, height } = resized.detection.box;
            ctx.strokeStyle = recognizedEmployee ? '#10b981' : '#ef4444';
            ctx.lineWidth = 3;
            ctx.strokeRect(x, y, width, height);

            // Optional subtle landmark dot overlay for visual verification
            if (resized.landmarks) {
              ctx.fillStyle = recognizedEmployee ? 'rgba(16, 185, 129, 0.7)' : 'rgba(239, 68, 68, 0.7)';
              const positions = resized.landmarks.positions;
              // Draw select anchor points (eyes, nose, jaw contour)
              [36, 39, 42, 45, 30, 33, 8].forEach(ptIdx => {
                if (positions[ptIdx]) {
                  ctx.beginPath();
                  ctx.arc(positions[ptIdx].x, positions[ptIdx].y, 2.5, 0, 2 * Math.PI);
                  ctx.fill();
                }
              });
            }

            // Auto recognize if descriptor available and not already in flight
            if (detection.descriptor && !isRecognizingRef.current) {
              isRecognizingRef.current = true;
              setRecognizing(true);
              try {
                const descriptorArray = Array.from(detection.descriptor);
                const res = await api.post('/hris/attendance/recognize-face', {
                  face_descriptor: descriptorArray
                });

                if (res.data && res.data.recognized) {
                  setRecognizedEmployee(res.data.employee);
                  setMatchScore(res.data.confidence);
                  setFaceMismatchError(null);
                } else {
                  setRecognizedEmployee(null);
                  setMatchScore(null);
                  setCountdown(null);
                  if (res.data?.message) {
                    setFaceMismatchError(res.data.message);
                  }
                }
              } catch (e) {
                // Ignore transient network errors
              } finally {
                isRecognizingRef.current = false;
                setRecognizing(false);
              }
            }
          } else {
            noFaceCountRef.current += 1;
            // Only clear state after 3 consecutive frames with no face to avoid flicker
            if (noFaceCountRef.current >= 3) {
              setRecognizedEmployee(null);
              setMatchScore(null);
              setCountdown(null);
              setFaceMismatchError(null);
            }
          }
        }
      }
    }, 350);

    return () => clearInterval(interval);
  }, [isCameraDisabled, streamActive, modelsLoaded]);

  // Execute Clock In / Out (Strict Continuous Face Verification & Live Descriptor Snapshot - NO PHOTO SAVED)
  const handleClockAction = async (forcedType) => {
    const actionType = forcedType || attendanceMode;

    if (actionType === 'locked') {
      addToast(scheduleStatusMessage || 'Presensi ditolak: Saat ini di luar batas jadwal jam presensi kantor.', 'error');
      return;
    }

    let liveFaceDescriptor = null;

    if (!isCameraDisabled) {
      if (!videoRef.current || videoRef.current.readyState !== 4) {
        addToast('Kamera belum siap. Harap tunggu sebentar.', 'error');
        return;
      }

      // Instant real-time frame snapshot verification at the exact millisecond of click
      const instantDetection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.35 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!instantDetection || !instantDetection.descriptor) {
        setRecognizedEmployee(null);
        setMatchScore(null);
        setCountdown(null);
        addToast('Wajah tidak terdeteksi di depan kamera saat presensi! Harap tatap kamera lurus.', 'error');
        return;
      }

      liveFaceDescriptor = Array.from(instantDetection.descriptor);

      if (!recognizedEmployee) {
        addToast('Wajah Anda belum terverifikasi atau tidak cocok dengan database karyawan. Presensi terkunci.', 'error');
        return;
      }
    }

    if (!isGpsDisabled && (!location.lat || !location.lng)) {
      addToast('Menunggu deteksi sinyal lokasi GPS yang valid...', 'error');
      return;
    }

    const empId = recognizedEmployee?.id || user?.id;
    if (!empId) {
      addToast('Identitas akun karyawan belum terverifikasi untuk presensi!', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/hris/attendance/clock', {
        employee_id: empId,
        type: actionType,
        action: actionType === 'in' ? 'Clock In' : 'Clock Out',
        face_descriptor: liveFaceDescriptor,
        latitude: location.lat || -3.42436,
        longitude: location.lng || 115.99267,
        accuracy: location.accuracy || 10,
        is_mock: false,
        device_info: navigator.userAgent,
        notes: isCameraDisabled 
          ? `Presensi Mandiri Tanpa Kamera (${actionType === 'in' ? 'Clock In' : 'Clock Out'})` 
          : `Presensi Mobile AI Face Recognition (${actionType === 'in' ? 'Clock In' : 'Clock Out'} - Match Score: ${Math.round((matchScore || 0.95) * 100)}%)`
      });

      if (res.data) {
        addToast(res.data.message || `Berhasil melakukan ${actionType === 'in' ? 'Masuk' : 'Pulang'}!`, 'success');
        setTimeout(() => navigate('/dashboard'), 1600);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Gagal memproses presensi';
      addToast(msg, 'error');
      setAutoTriggered(false);
    } finally {
      setLoading(false);
      setCountdown(null);
    }
  };

  // Hands-Free Auto Attendance Countdown (3... 2... 1... Auto Submit!)
  useEffect(() => {
    if (isCameraDisabled || loading || autoTriggered || attendanceMode === 'locked') {
      setCountdown(null);
      return;
    }

    if (!recognizedEmployee) {
      setCountdown(null);
      return;
    }

    // Face verified & schedule valid! Start 3-second countdown
    let remaining = 3;
    setCountdown(3);

    const interval = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(interval);
        setCountdown(0);
        setAutoTriggered(true);
        handleClockAction(attendanceMode);
      } else {
        setCountdown(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [recognizedEmployee?.id, attendanceMode, isCameraDisabled, loading, autoTriggered]);

  const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const formattedDateBadge = `${currentTime.getDate()} ${monthNames[currentTime.getMonth()]} ${currentTime.getFullYear()}`;
  const formattedTimeBadge = currentTime.toTimeString().split(' ')[0];

  return (
    <div className="relative w-full max-w-md mx-auto h-[100dvh] min-h-[640px] bg-slate-950 overflow-hidden flex flex-col justify-between font-sans select-none pb-24">
      {/* 1. FULL SCREEN CAMERA BACKGROUND VIEWPORT */}
      {!isCameraDisabled ? (
        <div className="absolute inset-0 w-full h-full z-0 overflow-hidden bg-slate-950">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${!streamActive ? 'hidden' : ''}`}
          />
          <canvas
            ref={overlayCanvasRef}
            className={`absolute inset-0 w-full h-full object-cover pointer-events-none z-10 ${!streamActive ? 'hidden' : ''}`}
          />
          {/* Subtle Dark Gradient Vignette for UI Readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/85 pointer-events-none z-10" />
        </div>
      ) : (
        <div className="absolute inset-0 w-full h-full z-0 bg-gradient-to-br from-slate-900 via-slate-950 to-red-950 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-lg mb-3">
            <ShieldCheck size={32} />
          </div>
          <span className="text-sm font-black text-white">Mode Presensi Cepat (Bypass Kamera)</span>
          <span className="text-xs text-slate-300 max-w-xs mt-1">
            Izin kamera dimatikan oleh Super Admin. Anda dapat langsung menekan tombol presensi di bawah.
          </span>
        </div>
      )}

      {/* 2. FLOATING TOP HEADER & STATUS (Z-20) */}
      <div className="relative z-20 p-4 pt-3 space-y-2.5 pointer-events-auto">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-black/60 transition-all cursor-pointer shadow-lg active:scale-95"
          >
            <ChevronLeft size={22} />
          </button>

          {/* Date & Time Badges */}
          <div className="flex items-center gap-2">
            <div className="bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full text-[11px] font-bold text-white shadow-md border border-white/15">
              {formattedDateBadge}
            </div>
            <div className="bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full text-[11px] font-mono font-black text-emerald-300 shadow-md border border-white/15">
              {formattedTimeBadge}
            </div>
          </div>
        </div>

        {/* Logged in User Account Pill */}
        <div className="bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-2xl text-[11px] font-bold text-slate-200 border border-white/15 flex items-center justify-between shadow-md">
          <span className="flex items-center gap-1.5 truncate">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
            Akun Login: <strong className="text-white truncate">{user?.nama_lengkap || user?.nama || user?.username}</strong>
          </span>
          <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-lg bg-white/10 text-emerald-300 font-black shrink-0 border border-white/10">{user?.role || 'Karyawan'}</span>
        </div>

        {/* Schedule Mode Warning Banner */}
        <div className={`p-2.5 rounded-2xl flex items-center gap-2 text-[11px] font-bold shadow-lg backdrop-blur-md border transition-all ${
          attendanceMode === 'in'
            ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-200'
            : attendanceMode === 'out'
            ? 'bg-blue-950/70 border-blue-500/40 text-blue-200'
            : 'bg-red-950/80 border-red-500/40 text-red-200'
        }`}>
          {attendanceMode === 'locked' ? (
            <Lock size={15} className="text-red-400 shrink-0" />
          ) : (
            <Timer size={15} className={attendanceMode === 'in' ? 'text-emerald-400 shrink-0' : 'text-blue-400 shrink-0'} />
          )}
          <span className="truncate">{scheduleStatusMessage}</span>
        </div>
      </div>

      {/* 3. CENTER VIEWPORT: FACE ID BIOMETRIC RETICLE & HANDS-FREE COUNTDOWN (Z-20) */}
      {!isCameraDisabled && (
        <div className="relative z-20 flex flex-col items-center justify-center pointer-events-none my-auto">
          {/* Face ID Viewfinder Reticle */}
          <div className={`w-52 h-68 sm:w-60 sm:h-76 rounded-[48px] border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center relative ${
            recognizedEmployee 
              ? 'border-emerald-400 bg-emerald-500/10 shadow-[0_0_35px_rgba(16,185,129,0.45)]' 
              : 'border-white/35 bg-black/15'
          }`}>
            {/* Four Corner Framing Brackets */}
            <div className={`absolute -top-1.5 -left-1.5 w-6 h-6 border-t-4 border-l-4 rounded-tl-2xl transition-colors ${recognizedEmployee ? 'border-emerald-400' : 'border-red-500'}`} />
            <div className={`absolute -top-1.5 -right-1.5 w-6 h-6 border-t-4 border-r-4 rounded-tr-2xl transition-colors ${recognizedEmployee ? 'border-emerald-400' : 'border-red-500'}`} />
            <div className={`absolute -bottom-1.5 -left-1.5 w-6 h-6 border-b-4 border-l-4 rounded-bl-2xl transition-colors ${recognizedEmployee ? 'border-emerald-400' : 'border-red-500'}`} />
            <div className={`absolute -bottom-1.5 -right-1.5 w-6 h-6 border-b-4 border-r-4 rounded-br-2xl transition-colors ${recognizedEmployee ? 'border-emerald-400' : 'border-red-500'}`} />

            {/* Scanning Status Badge or Mismatch Warning */}
            {faceMismatchError && !recognizedEmployee && (
              <div className="absolute -bottom-16 left-0 right-0 mx-auto w-[92%] bg-red-950/95 backdrop-blur-md px-3 py-2 rounded-xl text-[10px] font-bold text-red-200 border border-red-500/60 shadow-2xl text-center leading-snug animate-in fade-in">
                ⚠️ {faceMismatchError}
              </div>
            )}
            {!recognizedEmployee && !faceMismatchError && (
              <div className="absolute bottom-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-white/90 border border-white/20 animate-pulse">
                Posisikan Wajah Anda
              </div>
            )}

            {/* Hands-Free Automated Countdown Overlay with Circular Ring & Instant Buttons */}
            {countdown !== null && (
              <div className="absolute inset-0 z-30 rounded-[46px] flex flex-col items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in">
                {/* Circular Progress Ring */}
                <div className="relative w-24 h-24 flex items-center justify-center mb-2">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      className="text-white/10"
                      strokeWidth="7"
                      stroke="currentColor"
                      fill="transparent"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      className="text-emerald-400 transition-all duration-1000 ease-linear"
                      strokeWidth="7"
                      strokeDasharray={264}
                      strokeDashoffset={264 - (264 * (3 - countdown)) / 3}
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="transparent"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-3xl font-black text-emerald-300 font-mono leading-none">{countdown}</span>
                    <span className="text-[8px] uppercase tracking-wider font-bold text-emerald-400 mt-0.5">Detik</span>
                  </div>
                </div>

                <p className="text-xs font-black text-white text-center drop-shadow-md">
                  {attendanceMode === 'in' ? 'Otomatis Presensi Masuk...' : 'Otomatis Presensi Pulang...'}
                </p>
                <p className="text-[10px] text-emerald-300 font-bold mt-0.5">
                  {recognizedEmployee?.nama_lengkap} ({Math.round((matchScore || 0.95) * 100)}%)
                </p>

                {/* Instant Skip or Cancel Controls */}
                <div className="flex items-center gap-2 mt-4 pointer-events-auto">
                  <button
                    type="button"
                    onClick={() => handleClockAction(attendanceMode)}
                    className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[11px] rounded-xl shadow-lg transition active:scale-95 flex items-center gap-1"
                  >
                    <Sparkles size={13} /> Presensi Langsung
                  </button>
                  <button
                    type="button"
                    onClick={() => setCountdown(null)}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white font-bold text-[11px] rounded-xl transition"
                  >
                    Batal
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. FLOATING BOTTOM CONTROLS & ACTION BUTTONS (Z-20) */}
      <div className="relative z-20 p-4 space-y-2.5 pointer-events-auto">
        {/* Dynamic Superadmin Geofence Site Name Pill */}
        <div className="bg-black/60 backdrop-blur-md text-white px-3.5 py-2 rounded-2xl flex items-center justify-between text-xs font-bold border border-white/15 shadow-lg">
          <span className="flex items-center gap-1.5 truncate">
            <MapPin size={14} className={isGpsDisabled ? 'text-emerald-400' : isInsideGeofence ? 'text-emerald-400' : 'text-amber-400'} />
            {isGpsDisabled ? 'Validasi GPS Dilewati (Dispensasi)' : siteLocationName}
          </span>
          <span className={`text-[10px] px-2 py-0.5 rounded-lg font-black ${
            isInsideGeofence ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/25 text-amber-300 border border-amber-500/30'
          }`}>
            {isInsideGeofence ? 'Di Lokasi Site' : 'Di Luar Radius'}
          </span>
        </div>

        {/* Recognized Employee Verification Pill */}
        {isCameraDisabled ? (
          <div className="bg-emerald-950/70 border border-emerald-500/30 p-2.5 rounded-2xl flex items-center justify-between text-xs text-white font-bold backdrop-blur-md shadow-lg">
            <span className="flex items-center gap-1.5">
              <UserCheck size={16} className="text-emerald-400" />
              {user?.nama_lengkap || user?.username || 'Karyawan PT DGN'}
            </span>
            <span className="text-[10px] bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-full font-black">
              Bypass Kamera
            </span>
          </div>
        ) : recognizedEmployee ? (
          <div className="bg-emerald-950/75 border border-emerald-500/40 p-2.5 rounded-2xl flex items-center justify-between text-xs text-white font-bold backdrop-blur-md shadow-lg animate-in fade-in">
            <span className="flex items-center gap-1.5 truncate">
              <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
              <span className="truncate">{recognizedEmployee.nama_lengkap} ({recognizedEmployee.department || 'Staff'})</span>
            </span>
            <span className="text-[10px] bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-full font-black shrink-0 ml-1">
              {Math.round((matchScore || 0.95) * 100)}% Terverifikasi
            </span>
          </div>
        ) : (
          <div className="bg-red-950/75 border border-red-500/40 p-2.5 rounded-2xl flex items-center justify-between text-xs text-red-200 font-bold backdrop-blur-md shadow-lg">
            <span className="flex items-center gap-1.5">
              <AlertCircle size={15} className="text-red-400 shrink-0" />
              Wajah Belum Terverifikasi
            </span>
            <span className="text-[10px] text-red-300">
              Tatap kamera lurus
            </span>
          </div>
        )}

        {/* Action Buttons: Seamless Glassmorphism Buttons */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            disabled={loading || attendanceMode !== 'in' || (!isCameraDisabled && !recognizedEmployee)}
            onClick={() => handleClockAction('in')}
            className={`flex items-center justify-center gap-2 py-3 px-3 rounded-2xl font-black text-xs shadow-xl transition-all cursor-pointer active:scale-95 disabled:opacity-35 disabled:cursor-not-allowed disabled:grayscale ${
              attendanceMode === 'in'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white ring-2 ring-emerald-400 shadow-emerald-500/40 animate-pulse'
                : 'bg-white/10 backdrop-blur-md text-white/50 border border-white/10'
            }`}
          >
            <Clock size={15} />
            {loading && attendanceMode === 'in' ? 'Menyimpan...' : 'Absen Masuk'}
          </button>

          <button
            type="button"
            disabled={loading || attendanceMode !== 'out' || (!isCameraDisabled && !recognizedEmployee)}
            onClick={() => handleClockAction('out')}
            className={`flex items-center justify-center gap-2 py-3 px-3 rounded-2xl font-black text-xs shadow-xl transition-all cursor-pointer active:scale-95 disabled:opacity-35 disabled:cursor-not-allowed disabled:grayscale ${
              attendanceMode === 'out'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white ring-2 ring-blue-400 shadow-blue-500/40 animate-pulse'
                : 'bg-white/10 backdrop-blur-md text-white/50 border border-white/10'
            }`}
          >
            <Clock size={15} />
            {loading && attendanceMode === 'out' ? 'Menyimpan...' : 'Absen Pulang'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Attendance;
