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

  // My Attendance Today State
  const [myToday, setMyToday] = useState(null);

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

  // Fetch Logged-in User's Attendance Today
  const fetchMyToday = async () => {
    try {
      const res = await api.get('/hris/attendance/my-today');
      if (res.data) {
        setMyToday(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch my attendance today:', err);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchMyToday();
  }, []);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Format Time Helper
  const formatTimeStr = (isoStr) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Makassar' });
    } catch (e) {
      return '';
    }
  };

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

    if (myToday?.has_checked_in && myToday?.has_checked_out) {
      setAttendanceMode('completed');
      setScheduleStatusMessage(`Presensi Selesai • Masuk: ${formatTimeStr(myToday.check_in_time)} | Pulang: ${formatTimeStr(myToday.check_out_time)} WITA`);
    } else if (myToday?.has_checked_in && !myToday?.has_checked_out) {
      if (currentTotalMins >= outStart && currentTotalMins <= outEnd) {
        setAttendanceMode('out');
        setScheduleStatusMessage(`Jadwal Presensi Pulang • ${companySettings.checkOutStart || '17:00'} - ${companySettings.checkOutEnd || '22:00'} WITA`);
      } else {
        setAttendanceMode('already_in');
        setScheduleStatusMessage(`Sudah Absen Masuk (${formatTimeStr(myToday.check_in_time)} WITA) • Jadwal Pulang: ${companySettings.checkOutStart || '17:00'} WITA`);
      }
    } else if (currentTotalMins >= inStart && currentTotalMins <= inLateLimit) {
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
  }, [currentTime, companySettings, myToday]);

  // Load face-api AI models (Fast local models from /models with fallback to CDN)
  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = '/models';
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);
        setModelsLoaded(true);
      } catch (err) {
        console.warn('Local models failed, loading from CDN:', err);
        try {
          const FALLBACK_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
          await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(FALLBACK_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(FALLBACK_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(FALLBACK_URL)
          ]);
          setModelsLoaded(true);
        } catch (fallbackErr) {
          console.error('Error loading face models:', fallbackErr);
        }
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

    // 1. Background Asynchronous AI Detection Loop (Ultra-fast 320px responsive tracking)
    const aiInterval = setInterval(async () => {
      if (isAiScanningRef.current || !videoRef.current || videoRef.current.readyState !== 4) return;
      isAiScanningRef.current = true;
      try {
        const detection = await faceapi
          .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.2 }))
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
    }, 100);

    // 2. Continuous 60 FPS Render Loop (Ultra-Responsive Real-Time Dynamic Face Tracking)
    const render = () => {
      const video = videoRef.current;
      const canvas = overlayCanvasRef.current;

      if (video && canvas && video.readyState === 4) {
        const parent = canvas.parentElement;
        const cWidth = parent ? parent.clientWidth : video.videoWidth;
        const cHeight = parent ? parent.clientHeight : video.videoHeight;
        if (canvas.width !== cWidth || canvas.height !== cHeight) {
          canvas.width = cWidth;
          canvas.height = cHeight;
        }

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const vWidth = video.videoWidth;
        const vHeight = video.videoHeight;
        const detection = lastDetectionRef.current;
        const isFresh = detection && (Date.now() - lastDetectionTimeRef.current < 900);

        if (isFresh && vWidth > 0 && vHeight > 0) {
          // Exact CSS object-cover aspect-ratio scale & offset calculation
          const vAspect = vWidth / vHeight;
          const cAspect = cWidth / cHeight;
          let scale, offsetX = 0, offsetY = 0;
          if (cAspect > vAspect) {
            scale = cWidth / vWidth;
            offsetY = (cHeight - vHeight * scale) / 2;
          } else {
            scale = cHeight / vHeight;
            offsetX = (cWidth - vWidth * scale) / 2;
          }

          const rawBox = detection.detection.box;
          const targetBox = {
            x: rawBox.x * scale + offsetX,
            y: rawBox.y * scale + offsetY,
            width: rawBox.width * scale,
            height: rawBox.height * scale
          };

          // Smooth interpolation (lerp) for seamless fluid motion tracking
          if (!smoothedBoxRef.current) {
            smoothedBoxRef.current = { ...targetBox };
          } else {
            const s = smoothedBoxRef.current;
            s.x += (targetBox.x - s.x) * 0.65;
            s.y += (targetBox.y - s.y) * 0.65;
            s.width += (targetBox.width - s.width) * 0.65;
            s.height += (targetBox.height - s.height) * 0.65;
          }

          const { x, y, width, height } = smoothedBoxRef.current;
          const isMatched = !!recognizedEmployee;
          const isMismatch = !!faceMismatchError;

          // Scanning: Glowing Cyan / Electric Blue (#00e5ff) | Matched: Emerald (#10b981) | Mismatch: Red (#ef4444)
          const primaryColor = isMatched ? '#10b981' : isMismatch ? '#ef4444' : '#00e5ff';
          const glowColor = isMatched ? 'rgba(16, 185, 129, 0.6)' : isMismatch ? 'rgba(239, 68, 68, 0.6)' : 'rgba(0, 229, 255, 0.65)';
          const dotColor = isMatched ? 'rgba(16, 185, 129, 0.95)' : isMismatch ? 'rgba(239, 68, 68, 0.95)' : 'rgba(0, 229, 255, 0.95)';
          const boxBgColor = isMatched ? 'rgba(16, 185, 129, 0.08)' : isMismatch ? 'rgba(239, 68, 68, 0.08)' : 'rgba(0, 229, 255, 0.08)';

          // 1. Draw Full Translucent Face Detection Box
          ctx.beginPath();
          ctx.roundRect(x, y, width, height, 16);
          ctx.fillStyle = boxBgColor;
          ctx.fill();
          ctx.strokeStyle = isMatched ? 'rgba(16, 185, 129, 0.5)' : isMismatch ? 'rgba(239, 68, 68, 0.5)' : 'rgba(0, 229, 255, 0.55)';
          ctx.lineWidth = 2;
          ctx.stroke();

          // 2. Draw 4 Prominent Glowing Apple Face ID Corner Brackets
          const bracketLen = Math.min(width, height) * 0.24;
          const r = 14; // rounded corner radius
          ctx.strokeStyle = primaryColor;
          ctx.lineWidth = 4;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.shadowColor = glowColor;
          ctx.shadowBlur = 12;

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

          // 3. Smooth 60 FPS Biometric Laser Scan Beam
          const scanCycle = (Date.now() % 1400) / 1400;
          const scanY = y + height * scanCycle;
          const grad = ctx.createLinearGradient(x, scanY, x + width, scanY);
          grad.addColorStop(0, 'rgba(0,0,0,0)');
          grad.addColorStop(0.5, isMatched ? 'rgba(16, 185, 129, 0.85)' : 'rgba(0, 229, 255, 0.85)');
          grad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = grad;
          ctx.fillRect(x + 4, scanY - 1.5, width - 8, 3);

          // 4. Apple Face ID Biometric Mesh Overlay (Full 68 Landmark Contours)
          if (detection.landmarks && detection.landmarks.positions) {
            const pts = detection.landmarks.positions.map(p => ({
              x: p.x * scale + offsetX,
              y: p.y * scale + offsetY
            }));

            const drawContour = (indices, isClosed = false) => {
              ctx.beginPath();
              ctx.strokeStyle = isMatched ? 'rgba(16, 185, 129, 0.6)' : isMismatch ? 'rgba(239, 68, 68, 0.5)' : 'rgba(0, 229, 255, 0.55)';
              ctx.lineWidth = 1.8;
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

            // Draw Glowing Landmark Dots around key feature points
            ctx.fillStyle = dotColor;
            pts.forEach((p, idx) => {
              if (idx % 2 === 0 || [30, 36, 39, 42, 45, 48, 54, 8].includes(idx)) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, 2.4, 0, 2 * Math.PI);
                ctx.fill();
              }
            });
          }

          // 5. Floating Face ID Label Pill Above the Face Box
          const labelText = isMatched
            ? `✓ ${recognizedEmployee.nama_lengkap} (${Math.round((matchScore || 0.95) * 100)}%)`
            : isMismatch
            ? `⚠️ Wajah Tidak Sesuai Akun`
            : `🔍 Memindai Titik Biometrik...`;

          ctx.font = 'bold 12px Inter, system-ui, sans-serif';
          const textMetrics = ctx.measureText(labelText);
          const pillW = textMetrics.width + 24;
          const pillH = 26;
          const pillX = Math.max(10, Math.min(canvas.width - pillW - 10, x + width / 2 - pillW / 2));
          const pillY = Math.max(28, y - pillH - 10);

          ctx.fillStyle = isMatched ? 'rgba(6, 78, 59, 0.94)' : isMismatch ? 'rgba(136, 19, 55, 0.94)' : 'rgba(8, 47, 73, 0.94)';
          ctx.strokeStyle = primaryColor;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(pillX, pillY, pillW, pillH, 13);
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
    if (isCameraDisabled || loading || autoTriggered || attendanceMode === 'locked' || attendanceMode === 'already_in' || attendanceMode === 'completed') {
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
    <div className="fixed lg:relative inset-0 lg:inset-auto w-full h-[100dvh] lg:h-[calc(100vh-5.5rem)] lg:max-w-5xl lg:mx-auto lg:my-2 lg:rounded-3xl lg:border lg:border-slate-800 lg:shadow-2xl flex flex-col justify-between overflow-hidden bg-slate-950 font-sans select-none">
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
            className={`absolute inset-0 w-full h-full pointer-events-none z-20 ${!streamActive ? 'hidden' : ''}`}
          />
          {/* Subtle Dark Gradient Vignette for UI Readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-transparent to-black/90 pointer-events-none z-10" />
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

      {/* 2. RESPONSIVE AUTO-SCALE TOP HEADER (Z-20) */}
      <div className="relative z-20 p-3 sm:p-4 lg:p-5 space-y-2 max-w-xl mx-auto w-full pointer-events-auto shrink-0">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-black/70 transition-all cursor-pointer shadow-lg active:scale-95"
            title="Kembali ke Dashboard"
          >
            <ChevronLeft size={20} />
          </button>

          {/* Date & Time Badges */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full text-xs sm:text-sm font-bold text-white shadow-md border border-white/15">
              {formattedDateBadge}
            </div>
            <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full text-xs sm:text-sm font-mono font-black text-emerald-300 shadow-md border border-white/15">
              {formattedTimeBadge}
            </div>
          </div>
        </div>

        {/* User Account & Schedule Mode Row */}
        <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm font-bold">
          <div className="bg-black/60 backdrop-blur-md px-3 py-2 rounded-2xl text-slate-200 border border-white/15 flex items-center justify-between shadow-md truncate">
            <span className="flex items-center gap-1.5 truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
              <span className="truncate text-white font-bold">{user?.nama_lengkap || user?.nama || user?.username}</span>
            </span>
            <span className="text-[9px] sm:text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-lg bg-white/10 text-emerald-300 font-black shrink-0 border border-white/10">{user?.role || 'Karyawan'}</span>
          </div>

          <div className={`px-3 py-2 rounded-2xl flex items-center gap-2 shadow-md backdrop-blur-md border truncate ${
            attendanceMode === 'in' || attendanceMode === 'already_in' || attendanceMode === 'completed'
              ? 'bg-emerald-950/85 border-emerald-500/40 text-emerald-200'
              : attendanceMode === 'out'
              ? 'bg-blue-950/85 border-blue-500/40 text-blue-200'
              : 'bg-red-950/90 border-red-500/40 text-red-200'
          }`}>
            {attendanceMode === 'locked' ? (
              <Lock size={14} className="text-red-400 shrink-0" />
            ) : (
              <Timer size={14} className={attendanceMode === 'out' ? 'text-blue-400 shrink-0' : 'text-emerald-400 shrink-0'} />
            )}
            <span className="truncate text-xs sm:text-sm">{scheduleStatusMessage}</span>
          </div>
        </div>

        {/* Mismatch Warning Alert if any */}
        {faceMismatchError && (
          <div className="bg-red-950/95 border border-red-500/60 px-3.5 py-2 rounded-2xl text-xs font-bold text-red-200 shadow-xl backdrop-blur-md text-center animate-in fade-in leading-tight">
            ⚠️ {faceMismatchError}
          </div>
        )}
      </div>

      {/* 3. CENTER VIEWPORT: FLOATING COUNTDOWN HUD LIQUID GLASS MODAL */}
      <div className="relative z-20 flex-1 flex flex-col items-center justify-center pointer-events-none w-full px-4">
        {countdown !== null && (
          <div className="relative max-w-sm w-full bg-[#131d24]/80 backdrop-blur-3xl border border-white/20 p-6 rounded-3xl shadow-[0_24px_60px_rgba(0,0,0,0.7),inset_0_1px_2px_rgba(255,255,255,0.4)] overflow-hidden text-center animate-in zoom-in-95 pointer-events-auto">
            {/* Liquid Glass Iridescent Gloss Top Highlight */}
            <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 via-white/5 to-transparent pointer-events-none rounded-t-3xl" />
            
            {/* Glowing Iridescent Circular Countdown Ring */}
            <div className="relative w-24 h-24 mx-auto flex items-center justify-center mb-3">
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
                  style={{ filter: 'drop-shadow(0 0 8px rgba(52, 211, 153, 0.8))' }}
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-emerald-300 font-mono leading-none drop-shadow-[0_0_10px_rgba(110,231,183,0.7)]">{countdown}</span>
                <span className="text-[8px] uppercase tracking-wider font-extrabold text-emerald-400 mt-0.5">Detik</span>
              </div>
            </div>

            <p className="text-sm font-black text-white relative z-10">
              {attendanceMode === 'in' ? 'Otomatis Presensi Masuk' : 'Otomatis Presensi Pulang'}
            </p>
            <p className="text-xs text-emerald-300 font-bold mt-1 relative z-10 flex items-center justify-center gap-1">
              <Sparkles size={13} className="text-emerald-400 shrink-0" />
              <span className="truncate">{recognizedEmployee?.nama_lengkap} ({Math.round((matchScore || 0.95) * 100)}%)</span>
            </p>

            {/* Liquid Glass Action Buttons */}
            <div className="flex items-center gap-2.5 mt-4 w-full relative z-10">
              <button
                type="button"
                onClick={() => handleClockAction(attendanceMode)}
                className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs rounded-2xl shadow-[0_4px_16px_rgba(16,185,129,0.4),inset_0_1px_1px_rgba(255,255,255,0.6)] transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Sparkles size={14} /> Presensi Sekarang
              </button>
              <button
                type="button"
                onClick={() => setCountdown(null)}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 text-white font-bold text-xs rounded-2xl transition active:scale-95 cursor-pointer shadow-md"
              >
                Batal
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. FLOATING BOTTOM CONTROLS & ACTION BUTTONS */}
      <div className="relative z-20 p-3 sm:p-4 lg:p-6 pb-28 lg:pb-6 space-y-2.5 max-w-xl mx-auto w-full pointer-events-auto shrink-0">
        {/* Dynamic Superadmin Geofence Site Name Pill */}
        <div className="bg-black/60 backdrop-blur-md text-white px-3.5 py-2 rounded-2xl flex items-center justify-between text-xs sm:text-sm font-bold border border-white/15 shadow-lg">
          <span className="flex items-center gap-2 truncate">
            <MapPin size={15} className={isGpsDisabled ? 'text-emerald-400' : isInsideGeofence ? 'text-emerald-400' : 'text-amber-400'} />
            <span className="truncate">{isGpsDisabled ? 'Validasi GPS Dilewati (Dispensasi)' : siteLocationName}</span>
          </span>
          <span className={`text-[10px] sm:text-xs px-2.5 py-1 rounded-xl font-black shrink-0 ${
            isInsideGeofence ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/25 text-amber-300 border border-amber-500/30'
          }`}>
            {isInsideGeofence ? 'Di Lokasi Site' : 'Di Luar Radius'}
          </span>
        </div>

        {/* Recognized Employee Verification Pill */}
        {isCameraDisabled ? (
          <div className="bg-emerald-950/75 border border-emerald-500/30 p-2.5 rounded-2xl flex items-center justify-between text-xs sm:text-sm text-white font-bold backdrop-blur-md shadow-lg">
            <span className="flex items-center gap-2 truncate">
              <UserCheck size={16} className="text-emerald-400 shrink-0" />
              <span className="truncate">{user?.nama_lengkap || user?.username || 'Karyawan PT DGN'}</span>
            </span>
            <span className="text-[10px] bg-emerald-500 text-slate-950 px-2.5 py-0.5 rounded-full font-black shrink-0">
              Bypass Kamera
            </span>
          </div>
        ) : recognizedEmployee ? (
          <div className="bg-emerald-950/80 border border-emerald-500/40 p-2.5 rounded-2xl flex items-center justify-between text-xs sm:text-sm text-white font-bold backdrop-blur-md shadow-lg animate-in fade-in">
            <span className="flex items-center gap-2 truncate">
              <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
              <span className="truncate">{recognizedEmployee.nama_lengkap} ({recognizedEmployee.department || 'Staff'})</span>
            </span>
            <span className="text-[10px] bg-emerald-500 text-slate-950 px-2.5 py-0.5 rounded-full font-black shrink-0 ml-1">
              {Math.round((matchScore || 0.95) * 100)}% Terverifikasi
            </span>
          </div>
        ) : (
          <div className="bg-red-950/80 border border-red-500/40 p-2.5 rounded-2xl flex items-center justify-between text-xs sm:text-sm text-red-200 font-bold backdrop-blur-md shadow-lg">
            <span className="flex items-center gap-2">
              <AlertCircle size={15} className="text-red-400 shrink-0" />
              Wajah Belum Terverifikasi
            </span>
            <span className="text-[10px] text-red-300">
              Tatap kamera lurus
            </span>
          </div>
        )}

        {/* Action Buttons: Seamless Glassmorphism Buttons */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
          <button
            type="button"
            disabled={loading || myToday?.has_checked_in || (!isCameraDisabled && !recognizedEmployee)}
            onClick={() => handleClockAction('in')}
            className={`flex items-center justify-center gap-2 py-3 sm:py-3.5 px-4 rounded-2xl font-black text-xs sm:text-sm shadow-xl transition-all cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
              myToday?.has_checked_in
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                : attendanceMode === 'in'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white ring-2 ring-emerald-400 shadow-emerald-500/40 animate-pulse'
                : 'bg-white/10 backdrop-blur-md text-white/50 border border-white/10'
            }`}
          >
            {myToday?.has_checked_in ? (
              <>
                <CheckCircle size={16} className="text-emerald-400" />
                <span>Sudah Masuk ({formatTimeStr(myToday.check_in_time)})</span>
              </>
            ) : (
              <>
                <Clock size={16} />
                <span>{loading && attendanceMode === 'in' ? 'Menyimpan...' : 'Absen Masuk'}</span>
              </>
            )}
          </button>

          <button
            type="button"
            disabled={loading || myToday?.has_checked_out || !myToday?.has_checked_in || (!isCameraDisabled && !recognizedEmployee)}
            onClick={() => handleClockAction('out')}
            className={`flex items-center justify-center gap-2 py-3 sm:py-3.5 px-4 rounded-2xl font-black text-xs sm:text-sm shadow-xl transition-all cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
              myToday?.has_checked_out
                ? 'bg-blue-950/80 text-blue-300 border border-blue-500/40'
                : myToday?.has_checked_in && attendanceMode === 'out'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white ring-2 ring-blue-400 shadow-blue-500/40 animate-pulse'
                : 'bg-white/10 backdrop-blur-md text-white/50 border border-white/10'
            }`}
          >
            {myToday?.has_checked_out ? (
              <>
                <CheckCircle size={16} className="text-blue-400" />
                <span>Sudah Pulang ({formatTimeStr(myToday.check_out_time)})</span>
              </>
            ) : (
              <>
                <Clock size={16} />
                <span>{loading && attendanceMode === 'out' ? 'Menyimpan...' : 'Absen Pulang'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Attendance;
