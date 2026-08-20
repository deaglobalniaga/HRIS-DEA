import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../api/api';

/**
 * Universal Error Page (400+) - "Big Boom Explosion Effect"
 * Exactly matches the user's reference design with interactive animations and zero sensitive information leaks.
 */
const UniversalErrorPage = ({ 
  code = null, 
  customTitle = null, 
  customMessage = null,
  onRetry = null 
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const queryCode = queryParams.get('code');
  const statusCode = Number(code || queryCode || (location.pathname.includes('404') ? 404 : (location.pathname.includes('server-down') ? 503 : 404)));

  const [retrying, setRetrying] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleGoHome = () => {
    navigate('/dashboard');
  };

  const handleRetry = async () => {
    setRetrying(true);
    if (onRetry) {
      try { await onRetry(); } catch (e) {}
    } else {
      try {
        await api.get('/settings/system-health', { timeout: 3500 });
        navigate('/dashboard', { replace: true });
      } catch (e) {}
    }
    setTimeout(() => setRetrying(false), 800);
  };

  // Status configuration catalog (All 400+ codes)
  const getStatusDetails = () => {
    if (!isOnline) {
      return {
        heading: 'ERROR. NETWORK OFFLINE',
        description: 'Perangkat Anda tidak terhubung ke jaringan internet. Silakan periksa kembali koneksi Wi-Fi atau paket data seluler Anda.',
        btnText: 'GO HOME'
      };
    }

    switch (statusCode) {
      case 400:
        return {
          heading: 'ERROR 400. BAD REQUEST',
          description: 'Format permintaan yang dikirimkan tidak valid atau data formulir tidak lengkap. Silakan kembali dan periksa isian Anda.',
          btnText: 'GO HOME'
        };

      case 401:
        return {
          heading: 'ERROR 401. UNAUTHORIZED SESSION',
          description: 'Sesi login Anda telah berakhir demi keamanan data perusahaan. Silakan masuk kembali ke akun Anda.',
          btnText: 'LOGIN ULANG',
          onAction: () => navigate('/login')
        };

      case 403:
        return {
          heading: 'ERROR 403. FORBIDDEN ACCESS',
          description: 'Anda tidak memiliki hak akses untuk membuka halaman ini. Hubungi Super Admin jika Anda memerlukan otorisasi fitur ini.',
          btnText: 'GO HOME'
        };

      case 404:
        return {
          heading: 'ERROR 404. THE PAGE DOES NOT EXIST',
          description: 'Sorry! The page you are looking for can not be found. Perhaps the page you requested was moved or deleted. It is also possible that you made a small typo when entering the address. Go to the main page.',
          btnText: 'GO HOME'
        };

      case 429:
        return {
          heading: 'ERROR 429. RATE LIMIT REACHED',
          description: 'Terlalu banyak percobaan dalam waktu singkat. Sistem mengamankan akun sementara waktu demi pencegahan serangan siber.',
          btnText: 'GO HOME'
        };

      case 500:
        return {
          heading: 'ERROR 500. INTERNAL SERVER ERROR',
          description: 'Terjadi kendala teknis saat memproses permintaan Anda. Data telah diamankan otomatis oleh sistem keamanan HRIS.',
          btnText: 'GO HOME'
        };

      case 502:
      case 503:
      case 504:
      default:
        return {
          heading: `ERROR ${statusCode || 503}. SERVICE UNAVAILABLE`,
          description: 'Layanan HRIS PT DEA GLOBAL NIAGA saat ini sedang dalam proses pemeliharaan berkala atau peningkatan performa server.',
          btnText: 'GO HOME'
        };
    }
  };

  const details = getStatusDetails();
  const titleText = customTitle || details.heading;
  const messageText = customMessage || details.description;

  return (
    <div className="min-h-screen w-full bg-[#181f33] text-slate-100 flex flex-col items-center justify-center px-4 py-8 font-sans selection:bg-[#ff5500] selection:text-black relative overflow-hidden">
      
      {/* Background Subtle Radial Lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-600/10 rounded-full blur-[160px] pointer-events-none" />

      {/* Main Centered Container */}
      <div className="relative z-10 w-full max-w-2xl flex flex-col items-center text-center space-y-4 animate-in fade-in zoom-in-95 duration-500">
        
        {/* Top Error Heading */}
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-wider uppercase text-white font-sans">
          {titleText}
        </h1>

        {/* Subtitle Message */}
        <p className="text-xs sm:text-sm text-slate-300/90 max-w-xl font-normal leading-relaxed tracking-wide px-4">
          {messageText}
        </p>

        {/* Center Big Boom Explosion Artwork (Exact Cartoon Blast Style) */}
        <div 
          className="relative w-72 h-64 sm:w-96 sm:h-80 flex items-center justify-center my-2 cursor-pointer select-none transition-transform duration-300 hover:scale-105"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={handleRetry}
          title="Klik ledakan untuk refresh status"
        >
          {/* Ambient Glow */}
          <div className="absolute w-64 h-64 rounded-full bg-orange-500/20 blur-3xl animate-pulse" />

          {/* Detailed Cartoon Explosion SVG */}
          <svg 
            viewBox="0 0 500 420" 
            className="w-full h-full drop-shadow-[0_20px_40px_rgba(0,0,0,0.6)]"
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Outer White / Slate Smoke Cloud Puffs */}
            <g className="transition-transform duration-500" style={{ transformOrigin: 'center' }}>
              <path d="M120,240 Q90,200 120,160 Q100,110 160,110 Q190,70 250,80 Q310,70 340,110 Q400,110 380,160 Q410,200 380,240 Q400,290 350,300 Q310,320 250,310 Q190,320 150,300 Q100,290 120,240 Z" fill="#E2E8F0" />
              <path d="M135,230 Q110,195 135,165 Q120,125 170,125 Q195,90 250,100 Q305,90 330,125 Q380,125 365,165 Q390,195 365,230 Q380,275 340,285 Q305,300 250,295 Q195,300 160,285 Q120,275 135,230 Z" fill="#F8FAFC" />
            </g>

            {/* Dark Orange / Red Inner Fire Layer */}
            <path d="M160,230 Q140,190 165,165 Q150,135 195,135 Q215,105 250,115 Q285,105 305,135 Q350,135 335,165 Q360,190 340,230 Q350,265 315,270 Q285,280 250,275 Q215,280 185,270 Q150,265 160,230 Z" fill="#DC2626" />
            <path d="M175,220 Q155,185 180,165 Q170,145 205,145 Q225,120 250,130 Q275,120 295,145 Q330,145 320,165 Q345,185 325,220 Q335,250 305,255 Q275,265 250,260 Q225,265 195,255 Q165,250 175,220 Z" fill="#EA580C" />

            {/* Bright Orange & Yellow Fire Core */}
            <path d="M190,210 Q175,180 195,165 Q190,150 215,150 Q230,135 250,140 Q270,135 285,150 Q310,150 305,165 Q325,180 310,210 Q318,235 295,240 Q270,248 250,245 Q230,248 205,240 Q182,235 190,210 Z" fill="#F97316" />
            <ellipse cx="250" cy="190" rx="45" ry="30" fill="#FDE047" />

            {/* Exploding Spikes & Fire Trails at the Base */}
            <polygon points="250,380 240,290 260,290" fill="#F59E0B" />
            <polygon points="215,360 205,280 225,285" fill="#EA580C" />
            <polygon points="285,360 275,285 295,280" fill="#EA580C" />
            <polygon points="180,330 175,265 195,275" fill="#EF4444" />
            <polygon points="320,330 305,275 325,265" fill="#EF4444" />

            {/* Flying Sparks & Particles */}
            <circle cx="110" cy="120" r="5" fill="#F59E0B" className="animate-ping" />
            <circle cx="390" cy="110" r="6" fill="#EA580C" />
            <circle cx="140" cy="80" r="4" fill="#FDE047" />
            <circle cx="360" cy="80" r="5" fill="#FDE047" />
            <circle cx="250" cy="50" r="6" fill="#EF4444" />
            <circle cx="220" cy="400" r="4" fill="#F59E0B" />
            <circle cx="280" cy="400" r="4" fill="#EA580C" />
          </svg>

          {/* 3D Comic Block Typography For Error Code (e.g. 404) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span 
              className="text-6xl sm:text-7xl md:text-8xl font-black tracking-tight font-sans select-none transform transition-transform duration-300"
              style={{
                color: '#ef4444',
                textShadow: `
                  3px 3px 0 #991b1b,
                  5px 5px 0 #7f1d1d,
                  7px 7px 0 #450a0a,
                  0 0 20px rgba(239, 68, 68, 0.6)
                `
              }}
            >
              {statusCode}
            </span>
          </div>
        </div>

        {/* Action Button: Bright Orange Pill "GO HOME" (Matching Image) */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
          <button
            onClick={details.onAction || handleGoHome}
            disabled={retrying}
            className="w-56 sm:w-64 py-3 sm:py-3.5 px-8 rounded-full bg-[#f95700] hover:bg-[#ff6600] active:scale-95 text-black font-black text-sm sm:text-base tracking-wider uppercase shadow-xl shadow-orange-600/30 hover:shadow-orange-600/50 transition-all duration-200 cursor-pointer"
          >
            {retrying ? 'LOADING...' : details.btnText}
          </button>
        </div>

      </div>
    </div>
  );
};

export default UniversalErrorPage;
