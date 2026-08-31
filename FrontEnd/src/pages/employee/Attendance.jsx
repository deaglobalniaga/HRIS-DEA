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
  const lastVerifiedDescriptorRef = useRef(null);
  const lastDetectionRef = useRef(null);
  const lastDetectionTimeRef = useRef(0);
  const smoothedBoxRef = useRef(null);
  const isAiScanningRef = useRef(false);

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

  // Real-time Face AI Scanning & 60 FPS Flicker-Free Render Loop
  useEffect(() => {
    if (isCameraDisabled || !streamActive || !modelsLoaded) return;

    let animId;

    // 1. Background Asynchronous AI Detection Loop
    const aiInterval = setInterval(async () => {
      if (isAiScanningRef.current || !videoRef.current || videoRef.current.readyState !== 4) return;
      isAiScanningRef.current = true;
      try {
        const detection = await faceapi
          .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.30 }))
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (detection) {
          lastDetectionRef.current = detection;
          lastDetectionTimeRef.current = Date.now();
          noFaceCountRef.current = 0;

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
                lastVerifiedDescriptorRef.current = descriptorArray;
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
          // Clear state if no face seen for 5 consecutive loops
          if (noFaceCountRef.current >= 5) {
            lastDetectionRef.current = null;
            setRecognizedEmployee(null);
            setMatchScore(null);
            setCountdown(null);
            setFaceMismatchError(null);
          }
        }
      } catch (err) {
        console.error('Face AI Error:', err);
      } finally {
        isAiScanningRef.current = false;
      }
    }, 180);

    // 2. Continuous 60 FPS Render Loop (Zero-Flicker Synchronous Draw)
    const render = () => {
      const video = videoRef.current;
      const canvas = overlayCanvasRef.current;

      if (video && canvas && video.readyState === 4) {
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const detection = lastDetectionRef.current;
        const isFresh = detection && (Date.now() - lastDetectionTimeRef.current < 900);

        if (isFresh && video.videoWidth > 0) {
          const resized = faceapi.resizeResults(detection, { width: video.videoWidth, height: video.videoHeight });
          const targetBox = resized.detection.box;

          // Smooth interpolation (lerp) for seamless fluid motion
          if (!smoothedBoxRef.current) {
            smoothedBoxRef.current = { ...targetBox };
          } else {
            const s = smoothedBoxRef.current;
            s.x += (targetBox.x - s.x) * 0.45;
            s.y += (targetBox.y - s.y) * 0.45;
            s.width += (targetBox.width - s.width) * 0.45;
            s.height += (targetBox.height - s.height) * 0.45;
          }

          const { x, y, width, height } = smoothedBoxRef.current;
          const isMatched = !!recognizedEmployee;
          const isMismatch = !!faceMismatchError;
          const primaryColor = isMatched ? '#10b981' : isMismatch ? '#ef4444' : '#38bdf8';
          const glowColor = isMatched ? 'rgba(16, 185, 129, 0.45)' : isMismatch ? 'rgba(239, 68, 68, 0.45)' : 'rgba(56, 189, 248, 0.45)';
          const dotColor = isMatched ? 'rgba(16, 185, 129, 0.9)' : isMismatch ? 'rgba(239, 68, 68, 0.9)' : 'rgba(56, 189, 248, 0.9)';

          // 1. Draw Apple Face ID Dynamic Corner Framing Brackets
          const bracketLen = Math.min(width, height) * 0.22;
          const r = 12; // rounded corner radius
          ctx.strokeStyle = primaryColor;
          ctx.lineWidth = 3.5;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.shadowColor = glowColor;
          ctx.shadowBlur = 10;

          // Top-Left
          ctx.beginPath();
          ctx.moveTo(x, y + bracketLen);
          ctx.lineTo(x, y + r);
          ctx.arcTo(x, y, x + r, y, r);
          ctx.lineTo(x + bracketLen, y);
          ctx.stroke();

          // Top-Right
          ctx.beginPath();
          ctx.moveTo(x + width - bracketLen, y);
          ctx.lineTo(x + width - r, y);
          ctx.arcTo(x + width, y, x + width, y + r, r);
          ctx.lineTo(x + width, y + bracketLen);
          ctx.stroke();

          // Bottom-Left
          ctx.beginPath();
          ctx.moveTo(x, y + height - bracketLen);
          ctx.lineTo(x, y + height - r);
          ctx.arcTo(x, y + height, x + r, y + height, r);
          ctx.lineTo(x + bracketLen, y + height);
          ctx.stroke();

          // Bottom-Right
          ctx.beginPath();
          ctx.moveTo(x + width - bracketLen, y + height);
          ctx.lineTo(x + width - r, y + height);
          ctx.arcTo(x + width, y + height, x + width, y + height - r, r);
          ctx.lineTo(x + width, y + height - bracketLen);
          ctx.stroke();

          ctx.shadowBlur = 0; // Reset shadow

          // 2. Smooth 60 FPS Laser Scan Beam
          const scanCycle = (Date.now() % 1600) / 1600;
          const scanY = y + height * scanCycle;
          const grad = ctx.createLinearGradient(x, scanY, x + width, scanY);
          grad.addColorStop(0, 'rgba(0,0,0,0)');
          grad.addColorStop(0.5, isMatched ? 'rgba(16, 185, 129, 0.75)' : 'rgba(56, 189, 248, 0.75)');
          grad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = grad;
          ctx.fillRect(x + 6, scanY - 1.5, width - 12, 3);

          // 3. Apple Face ID Biometric Mesh Overlay (Full 68 Landmark Contours)
          if (resized.landmarks && resized.landmarks.positions) {
            const pts = resized.landmarks.positions;

            const drawContour = (indices, isClosed = false) => {
              ctx.beginPath();
              ctx.strokeStyle = isMatched ? 'rgba(16, 185, 129, 0.5)' : isMismatch ? 'rgba(239, 68, 68, 0.45)' : 'rgba(56, 189, 248, 0.4)';
              ctx.lineWidth = 1.6;
              indices.forEach((idx, i) => {
                if (pts[idx]) {
                  if (i === 0) ctx.moveTo(pts[idx].x, pts[idx].y);
                  else ctx.lineTo(pts[idx].x, pts[idx].y);
                }
              });
              if (isClosed) ctx.closePath();
              ctx.stroke();
            };

            // Jawline contour (points 0-16)
            drawContour([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]);
            // Eyebrows
            drawContour([17,18,19,20,21]);
            drawContour([22,23,24,25,26]);
            // Nose Bridge & Base
            drawContour([27,28,29,30]);
            drawContour([31,32,33,34,35], true);
            // Eyes
            drawContour([36,37,38,39,40,41], true);
            drawContour([42,43,44,45,46,47], true);
            // Lips
            drawContour([48,49,50,51,52,53,54,55,56,57,58,59], true);

            // Draw Glowing Landmark Dots around face perimeter and key features
            ctx.fillStyle = dotColor;
            pts.forEach((p, idx) => {
              if (idx % 2 === 0 || [30, 36, 39, 42, 45, 48, 54, 8].includes(idx)) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, 2.2, 0, 2 * Math.PI);
                ctx.fill();
              }
            });
          }

          // 4. Floating Face ID Label Pill Above the Face Box
          const labelText = isMatched
            ? `✓ ${recognizedEmployee.nama_lengkap} (${Math.round((matchScore || 0.95) * 100)}%)`
            : isMismatch
            ? `⚠️ Wajah Tidak Cocok`
            : `🔍 Memindai Wajah...`;

          ctx.font = 'bold 11px Inter, system-ui, sans-serif';
          const textMetrics = ctx.measureText(labelText);
          const pillW = textMetrics.width + 20;
          const pillH = 22;
          const pillX = Math.max(10, Math.min(canvas.width - pillW - 10, x + width / 2 - pillW / 2));
          const pillY = Math.max(28, y - pillH - 8);

          ctx.fillStyle = isMatched ? 'rgba(6, 78, 59, 0.92)' : isMismatch ? 'rgba(136, 19, 55, 0.92)' : 'rgba(15, 23, 42, 0.92)';
          ctx.strokeStyle = primaryColor;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.roundRect(pillX, pillY, pillW, pillH, 11);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(labelText, pillX + pillW / 2, pillY + pillH / 2);
        } else {
          smoothedBoxRef.current = null;
        }
      }
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      clearInterval(aiInterval);
      if (animId) cancelAnimationFrame(animId);
    };
  }, [isCameraDisabled, streamActive, modelsLoaded, recognizedEmployee, faceMismatchError, matchScore]);

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
      let instantDetection = null;
      try {
        instantDetection = await faceapi
          .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.25 }))
          .withFaceLandmarks()
          .withFaceDescriptor();
      } catch (e) {}

      if (instantDetection && instantDetection.descriptor) {
        liveFaceDescriptor = Array.from(instantDetection.descriptor);
      } else if (lastVerifiedDescriptorRef.current && recognizedEmployee) {
        liveFaceDescriptor = lastVerifiedDescriptorRef.current;
      } else {
        setRecognizedEmployee(null);
        setMatchScore(null);
        setCountdown(null);
        addToast('Wajah tidak terdeteksi di depan kamera saat presensi! Harap tatap kamera lurus.', 'error');
        return;
      }

      if (!recognizedEmployee) {
        addToast('Wajah Anda belum terverifikasi atau tidak cocok dengan database karyawan. Presensi terkunci.', 'error');
        return;
      }
    }

    if (!isGpsDisabled && (!location.lat || !location.lng)) {
      addToast('Menunggu deteksi sinyal lokasi GPS yang valid...', 'error');
      return;
    }

    const empId = recognizedEmployee?.id || user?.employee_id || user?.id;
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
    <div className="fixed inset-0 w-full h-[100dvh] flex flex-col justify-between overflow-hidden bg-slate-950 font-sans select-none">
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
          <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-transparent to-black/85 pointer-events-none z-10" />
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

      {/* 2. COMPACT AUTO-SCALE TOP HEADER (Z-20) */}
      <div className="relative z-20 p-3 sm:p-4 space-y-1.5 max-w-md mx-auto w-full pointer-events-auto shrink-0">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-black/70 transition-all cursor-pointer shadow-lg active:scale-95"
            title="Kembali ke Dashboard"
          >
            <ChevronLeft size={20} />
          </button>

          {/* Date & Time Badges */}
          <div className="flex items-center gap-1.5">
            <div className="bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-bold text-white shadow-md border border-white/15">
              {formattedDateBadge}
            </div>
            <div className="bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-mono font-black text-emerald-300 shadow-md border border-white/15">
              {formattedTimeBadge}
            </div>
          </div>
        </div>

        {/* User Account & Schedule Mode Row */}
        <div className="grid grid-cols-2 gap-1.5 text-[10px] font-bold">
          <div className="bg-black/60 backdrop-blur-md px-2.5 py-1.5 rounded-xl text-slate-200 border border-white/15 flex items-center justify-between shadow-md truncate">
            <span className="flex items-center gap-1.5 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              <span className="truncate text-white font-bold">{user?.nama_lengkap || user?.nama || user?.username}</span>
            </span>
            <span className="text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-emerald-300 font-black shrink-0 border border-white/10">{user?.role || 'Karyawan'}</span>
          </div>

          <div className={`px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-md backdrop-blur-md border truncate ${
            attendanceMode === 'in'
              ? 'bg-emerald-950/85 border-emerald-500/40 text-emerald-200'
              : attendanceMode === 'out'
              ? 'bg-blue-950/85 border-blue-500/40 text-blue-200'
              : 'bg-red-950/90 border-red-500/40 text-red-200'
          }`}>
            {attendanceMode === 'locked' ? (
              <Lock size={12} className="text-red-400 shrink-0" />
            ) : (
              <Timer size={12} className={attendanceMode === 'in' ? 'text-emerald-400 shrink-0' : 'text-blue-400 shrink-0'} />
            )}
            <span className="truncate text-[10px]">{scheduleStatusMessage}</span>
          </div>
        </div>

        {/* Mismatch Warning Alert if any */}
        {faceMismatchError && (
          <div className="bg-red-950/95 border border-red-500/60 px-3 py-1.5 rounded-xl text-[10px] font-bold text-red-200 shadow-xl backdrop-blur-md text-center animate-in fade-in leading-tight">
            ⚠️ {faceMismatchError}
          </div>
        )}
      </div>

      {/* 3. CENTER VIEWPORT: FLOATING COUNTDOWN HUD OVERLAY (NO STATIC RETICLE BOX) */}
      <div className="relative z-20 flex-1 flex flex-col items-center justify-center pointer-events-none w-full px-4">
        {countdown !== null && (
          <div className="bg-slate-950/90 backdrop-blur-md border border-emerald-500/50 p-4 rounded-3xl shadow-2xl flex flex-col items-center justify-center text-center animate-in zoom-in-95 max-w-xs w-full pointer-events-auto">
            {/* Circular Progress Ring */}
            <div className="relative w-20 h-20 flex items-center justify-center mb-2">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  className="text-white/10"
                  strokeWidth="6"
                  stroke="currentColor"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  className="text-emerald-400 transition-all duration-1000 ease-linear"
                  strokeWidth="6"
                  strokeDasharray={251}
                  strokeDashoffset={251 - (251 * (3 - countdown)) / 3}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="transparent"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-emerald-300 font-mono leading-none">{countdown}</span>
                <span className="text-[7px] uppercase tracking-wider font-bold text-emerald-400 mt-0.5">Detik</span>
              </div>
            </div>

            <p className="text-xs font-black text-white">
              {attendanceMode === 'in' ? 'Otomatis Presensi Masuk' : 'Otomatis Presensi Pulang'}
            </p>
            <p className="text-[10px] text-emerald-300 font-bold mt-0.5">
              {recognizedEmployee?.nama_lengkap} ({Math.round((matchScore || 0.95) * 100)}%)
            </p>

            <div className="flex items-center gap-2 mt-3 w-full">
              <button
                type="button"
                onClick={() => handleClockAction(attendanceMode)}
                className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[10px] rounded-xl shadow-lg transition active:scale-95 flex items-center justify-center gap-1 cursor-pointer"
              >
                <Sparkles size={12} /> Presensi Sekarang
              </button>
              <button
                type="button"
                onClick={() => setCountdown(null)}
                className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-[10px] rounded-xl transition cursor-pointer"
              >
                Batal
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. FLOATING BOTTOM CONTROLS & ACTION BUTTONS (Z-20 with Clearance for MobileBottomNav) */}
      <div className="relative z-20 p-3 sm:p-4 pb-28 sm:pb-6 space-y-2 max-w-md mx-auto w-full pointer-events-auto shrink-0">
        {/* Dynamic Superadmin Geofence Site Name Pill */}
        <div className="bg-black/60 backdrop-blur-md text-white px-3 py-1.5 rounded-xl flex items-center justify-between text-[11px] font-bold border border-white/15 shadow-lg">
          <span className="flex items-center gap-1.5 truncate">
            <MapPin size={13} className={isGpsDisabled ? 'text-emerald-400' : isInsideGeofence ? 'text-emerald-400' : 'text-amber-400'} />
            <span className="truncate">{isGpsDisabled ? 'Validasi GPS Dilewati (Dispensasi)' : siteLocationName}</span>
          </span>
          <span className={`text-[9px] px-2 py-0.5 rounded-lg font-black shrink-0 ${
            isInsideGeofence ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/25 text-amber-300 border border-amber-500/30'
          }`}>
            {isInsideGeofence ? 'Di Lokasi Site' : 'Di Luar Radius'}
          </span>
        </div>

        {/* Recognized Employee Verification Pill */}
        {isCameraDisabled ? (
          <div className="bg-emerald-950/75 border border-emerald-500/30 p-2 rounded-xl flex items-center justify-between text-[11px] text-white font-bold backdrop-blur-md shadow-lg">
            <span className="flex items-center gap-1.5 truncate">
              <UserCheck size={14} className="text-emerald-400 shrink-0" />
              <span className="truncate">{user?.nama_lengkap || user?.username || 'Karyawan PT DGN'}</span>
            </span>
            <span className="text-[9px] bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-full font-black shrink-0">
              Bypass Kamera
            </span>
          </div>
        ) : recognizedEmployee ? (
          <div className="bg-emerald-950/80 border border-emerald-500/40 p-2 rounded-xl flex items-center justify-between text-[11px] text-white font-bold backdrop-blur-md shadow-lg animate-in fade-in">
            <span className="flex items-center gap-1.5 truncate">
              <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
              <span className="truncate">{recognizedEmployee.nama_lengkap} ({recognizedEmployee.department || 'Staff'})</span>
            </span>
            <span className="text-[9px] bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-full font-black shrink-0 ml-1">
              {Math.round((matchScore || 0.95) * 100)}% Terverifikasi
            </span>
          </div>
        ) : (
          <div className="bg-red-950/80 border border-red-500/40 p-2 rounded-xl flex items-center justify-between text-[11px] text-red-200 font-bold backdrop-blur-md shadow-lg">
            <span className="flex items-center gap-1.5">
              <AlertCircle size={14} className="text-red-400 shrink-0" />
              Wajah Belum Terverifikasi
            </span>
            <span className="text-[9px] text-red-300">
              Tatap kamera lurus
            </span>
          </div>
        )}

        {/* Action Buttons: Seamless Glassmorphism Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={loading || attendanceMode !== 'in' || (!isCameraDisabled && !recognizedEmployee)}
            onClick={() => handleClockAction('in')}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-black text-xs shadow-xl transition-all cursor-pointer active:scale-95 disabled:opacity-35 disabled:cursor-not-allowed disabled:grayscale ${
              attendanceMode === 'in'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white ring-2 ring-emerald-400 shadow-emerald-500/40 animate-pulse'
                : 'bg-white/10 backdrop-blur-md text-white/50 border border-white/10'
            }`}
          >
            <Clock size={14} />
            {loading && attendanceMode === 'in' ? 'Menyimpan...' : 'Absen Masuk'}
          </button>

          <button
            type="button"
            disabled={loading || attendanceMode !== 'out' || (!isCameraDisabled && !recognizedEmployee)}
            onClick={() => handleClockAction('out')}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-black text-xs shadow-xl transition-all cursor-pointer active:scale-95 disabled:opacity-35 disabled:cursor-not-allowed disabled:grayscale ${
              attendanceMode === 'out'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white ring-2 ring-blue-400 shadow-blue-500/40 animate-pulse'
                : 'bg-white/10 backdrop-blur-md text-white/50 border border-white/10'
            }`}
          >
            <Clock size={14} />
            {loading && attendanceMode === 'out' ? 'Menyimpan...' : 'Absen Pulang'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Attendance;
