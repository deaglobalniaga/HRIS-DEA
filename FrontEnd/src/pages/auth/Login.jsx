import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Check, Eye, EyeOff, ShieldAlert, Timer } from 'lucide-react';
import api from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import AuthTransitionOverlay from '../../components/common/AuthTransitionOverlay';
import { getClientDeviceInfo } from '../../utils/deviceDetector';

const Login = () => {
    const [credentials, setCredentials] = useState({ nama: '', password: '' });
    const [mfaToken, setMfaToken] = useState('');
    const [requireMfa, setRequireMfa] = useState(false);
    const [mfaEmailMasked, setMfaEmailMasked] = useState('');
    const [sendingEmailOtp, setSendingEmailOtp] = useState(false);
    const [emailOtpCooldown, setEmailOtpCooldown] = useState(0);
    const [requireSetupPassword, setRequireSetupPassword] = useState(false);
    const [tempToken, setTempToken] = useState(null);
    const [tempUser, setTempUser] = useState(null);
    const [newPassword, setNewPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [focusedField, setFocusedField] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [isMorphing, setIsMorphing] = useState(false);
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    // Interactive 3D Card Tilt & Specular Physics
    const [cardTilt, setCardTilt] = useState({ x: 0, y: 0, glareX: 50, glareY: 50 });
    const [isHovered, setIsHovered] = useState(false);

    const handleCardMouseMove = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const rotateX = -((mouseY - centerY) / centerY) * 10; // max 10 deg tilt
        const rotateY = ((mouseX - centerX) / centerX) * 10;

        const glareX = (mouseX / rect.width) * 100;
        const glareY = (mouseY / rect.height) * 100;

        setCardTilt({ x: rotateX, y: rotateY, glareX, glareY });
        setIsHovered(true);
    };

    const handleCardMouseLeave = () => {
        setIsHovered(false);
        setCardTilt({ x: 0, y: 0, glareX: 50, glareY: 50 });
    };

    const navigate = useNavigate();
    const { login } = useAuth();
    const { addToast } = useToast();

    // Email OTP Cooldown Timer
    useEffect(() => {
        if (emailOtpCooldown <= 0) return;
        const timer = setInterval(() => {
            setEmailOtpCooldown(prev => prev - 1);
        }, 1000);
        return () => clearInterval(timer);
    }, [emailOtpCooldown]);

    const handleSendEmailOtp = async () => {
        if (emailOtpCooldown > 0 || sendingEmailOtp) return;
        setSendingEmailOtp(true);
        try {
            const res = await api.post('/auth/mfa/send-email-otp', {
                username: credentials.nama,
                email: credentials.nama
            });
            if (res.data?.emailMasked) {
                setMfaEmailMasked(res.data.emailMasked);
            }
            setEmailOtpCooldown(60);
            addToast(res.data?.message || 'Kode verifikasi telah dikirim ke email Anda!', 'success');
        } catch (err) {
            const msg = err.response?.data?.message || 'Gagal mengirim kode ke email. Pastikan akun memiliki email terdaftar.';
            addToast(msg, 'error');
        } finally {
            setSendingEmailOtp(false);
        }
    };

    const handleToSignup = (e) => {
        e.preventDefault();
        setIsMorphing(true);
        setTimeout(() => {
            navigate('/signup');
        }, 420);
    };

    // =========================================================================
    // PROGRESSIVE COOLDOWN / EXPONENTIAL BACKOFF LOCKOUT (SUPERADMIN SETTING)
    // =========================================================================
    const [maxAttempts, setMaxAttempts] = useState(5);
    const [failedAttempts, setFailedAttempts] = useState(() => Number(localStorage.getItem('hris_failed_attempts') || 0));
    const [lockoutLevel, setLockoutLevel] = useState(() => Number(localStorage.getItem('hris_lockout_level') || 0));
    const [lockoutUntil, setLockoutUntil] = useState(() => Number(localStorage.getItem('hris_lockout_until') || 0));
    const [remainingSeconds, setRemainingSeconds] = useState(0);

    const getLockoutDurationSeconds = (level) => {
        switch (level) {
            case 1: return 60;        
            case 2: return 180;       
            case 3: return 300;       
            case 4: return 600;       
            case 5: return 900;       
            default: return 1800;     
        }
    };

    useEffect(() => {
        const loadMaxAttempts = async () => {
            try {
                const res = await api.get('/settings/public');
                if (res.data && res.data.max_login_attempts) {
                    setMaxAttempts(Number(res.data.max_login_attempts));
                }
            } catch (e) {}
        };
        loadMaxAttempts();
    }, []);

    useEffect(() => {
        const updateRemaining = () => {
            const now = Date.now();
            const diff = Math.max(0, Math.ceil((lockoutUntil - now) / 1000));
            setRemainingSeconds(diff);
            if (diff === 0 && lockoutUntil > 0) {
                localStorage.removeItem('hris_lockout_until');
                setLockoutUntil(0);
            }
        };

        updateRemaining();
        const interval = setInterval(updateRemaining, 1000);
        return () => clearInterval(interval);
    }, [lockoutUntil]);

    const handleFailedAttempt = () => {
        const newCount = failedAttempts + 1;
        setFailedAttempts(newCount);
        localStorage.setItem('hris_failed_attempts', newCount.toString());

        if (newCount >= maxAttempts) {
            const nextLevel = lockoutLevel + 1;
            setLockoutLevel(nextLevel);
            localStorage.setItem('hris_lockout_level', nextLevel.toString());

            const cooldownSeconds = getLockoutDurationSeconds(nextLevel);
            const until = Date.now() + cooldownSeconds * 1000;
            setLockoutUntil(until);
            localStorage.setItem('hris_lockout_until', until.toString());
            setRemainingSeconds(cooldownSeconds);

            const minutes = Math.ceil(cooldownSeconds / 60);
            addToast(`Batas kesalahan login (${maxAttempts}x) tercapai. Akun dikunci sementara selama ${minutes} menit demi keamanan.`, 'error');
        }
    };

    const handleChange = (e) => {
        setCredentials({ ...credentials, [e.target.name]: e.target.value });
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        if (remainingSeconds > 0) {
            addToast(`Akun terkunci sementara. Silakan tunggu ${Math.ceil(remainingSeconds / 60)} menit lagi.`, 'error');
            return;
        }

        setLoading(true);
        try {
            const devInfo = await getClientDeviceInfo();
            const payload = {
                ...credentials,
                mfaToken: mfaToken ? String(mfaToken).trim() : undefined,
                deviceId: devInfo.deviceId,
                deviceInfo: devInfo
            };
            const response = await api.post('/auth/login', payload);
            
            if (response.data?.requireMfa) {
                setRequireMfa(true);
                setMfaEmailMasked(response.data?.emailMasked || '');
                addToast('Akun ini dilindungi Verifikasi 2-Langkah (MFA). Masukkan kode verifikasi.', 'info');
                return;
            }

            if (response.data?.requireSetupPassword) {
                setRequireSetupPassword(true);
                setTempToken(response.data.token);
                setTempUser(response.data.user);
                addToast('Silakan atur password baru Anda terlebih dahulu.', 'warning');
                return;
            }

            localStorage.removeItem('hris_failed_attempts');
            localStorage.removeItem('hris_lockout_level');
            localStorage.removeItem('hris_lockout_until');
            setFailedAttempts(0);
            setLockoutLevel(0);
            setLockoutUntil(0);

            // Trigger Smooth Login Transition Overlay
            setIsLoggingIn(true);
            addToast(`Selamat datang kembali, ${response.data.user?.nama || 'User'}!`, 'success');
            setTimeout(() => {
                login(response.data.token, response.data.user);
                navigate('/dashboard');
            }, 650);
        } catch (error) {
            console.error('Login error:', error);
            handleFailedAttempt();

            if (error.response?.data?.requireMfa) {
                setRequireMfa(true);
                setMfaEmailMasked(error.response.data?.emailMasked || '');
                addToast('Verifikasi 2-Langkah diperlukan.', 'info');
                return;
            }

            if (error.response?.status === 401) {
                addToast(error.response?.data?.message || 'Kredensial tidak valid. Silakan periksa username/email dan password.', 'error');
            } else if (error.response?.status === 403) {
                addToast(error.response?.data?.message || 'Akun dinonaktifkan atau belum disetujui.', 'error');
            } else {
                if (error.code === "ERR_NETWORK") {
                    addToast('Tidak dapat terhubung ke server. Periksa koneksi internet Anda.', 'error');
                    return;
                }
                const msg = error.response?.data?.error || error.response?.data?.message || error.message || 'Gagal login, periksa kembali email & password Anda.';
                addToast(msg, 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSetupPassword = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/auth/setup-password', { newPassword }, {
                headers: { Authorization: `Bearer ${tempToken}` }
            });
            login(tempToken, tempUser);
            addToast('Password berhasil diperbarui! Selamat datang.', 'success');
            navigate('/dashboard');
        } catch (error) {
            addToast(error.response?.data?.message || 'Gagal mengubah password', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full relative overflow-hidden flex items-center justify-center lg:justify-end lg:pr-28 xl:pr-40 2xl:pr-52 bg-black select-none font-sans">
            {/* Clean White Orbiting Auth Transition Overlay on Login */}
            {isLoggingIn && <AuthTransitionOverlay />}

            {/* Fullscreen Interactive 3D Spline Robot Scene */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-auto">
                <iframe
                    src='https://my.spline.design/nexbotrobotcharacterconcept-Od5WflpjroNUX6I1cGMg9fvj/'
                    frameBorder='0'
                    className="absolute w-[130%] h-[calc(100%+140px)] -left-[15%] lg:-left-[18%] -top-[15px] pointer-events-auto opacity-100"
                    title="Interactive 3D Robot Scene"
                    allow="autoplay; fullscreen; vr"
                ></iframe>
            </div>

            {/* Left Floating Typography (Enlarged slightly with bold presence) */}
            <div className="absolute top-20 sm:top-24 lg:top-32 xl:top-36 left-6 sm:left-8 lg:left-14 xl:left-18 z-20 flex flex-col pointer-events-none select-none max-w-lg animate-in fade-in slide-in-from-top-4 duration-700">
                <div className="flex items-center gap-3 mb-3">
                    <img src="/dea.png" alt="DEA Logo" className="h-8 w-auto object-contain drop-shadow-lg" onError={(e) => { e.target.style.display = 'none' }} />
                    <span className="text-xs sm:text-sm font-black tracking-[0.22em] text-red-500 uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                        PT DEA GLOBAL NIAGA
                    </span>
                </div>
                <h1 className="text-4xl sm:text-5xl xl:text-6xl font-black text-white tracking-tight leading-none drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)]">
                    Smart <span className="text-red-500">HRIS</span> Portal
                </h1>
                <p className="text-slate-100/90 text-sm sm:text-base font-semibold mt-3 leading-relaxed drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] max-w-md">
                    Integrated Employee Attendance & Workforce Management System
                </p>
            </div>

            {/* Interactive 3D Tilt Login Card Container (Enlarged max-w-md, Shifted Left, High-Fidelity Depth) */}
            <div 
                style={{ perspective: '1400px' }}
                className={`relative z-20 w-full max-w-[430px] pointer-events-none flex flex-col items-center px-4 transition-all duration-500 ease-out ${
                    isMorphing 
                        ? 'scale-90 -rotate-y-90 opacity-0 blur-xs' 
                        : 'scale-100 rotate-y-0 opacity-100'
                }`}
            >
                {/* Dynamic Ambient Glow Halo */}
                <div 
                    className="absolute -inset-3 bg-gradient-to-b from-white/30 via-red-500/20 to-black/60 rounded-t-[4.5rem] rounded-b-[3rem] blur-2xl opacity-75 pointer-events-none transition-all duration-300" 
                    style={{
                        transform: isHovered ? `scale(1.06) translate(${cardTilt.y * 2}px, ${-cardTilt.x * 2}px)` : 'scale(1)'
                    }}
                />

                {/* Sculpted 3D Vault Glass Card */}
                <div 
                    onMouseMove={handleCardMouseMove}
                    onMouseLeave={handleCardMouseLeave}
                    style={{ 
                        transformStyle: 'preserve-3d',
                        transform: isHovered 
                            ? `perspective(1200px) rotateX(${cardTilt.x}deg) rotateY(${cardTilt.y}deg) scale3d(1.025, 1.025, 1.025)` 
                            : 'perspective(1200px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
                        transition: isHovered ? 'transform 0.08s ease-out' : 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)'
                    }}
                    className="relative w-full bg-white/94 backdrop-blur-2xl rounded-t-[4rem] rounded-b-[2.5rem] shadow-[0_30px_70px_rgba(0,0,0,0.65)] p-7 sm:p-8 pt-6 border border-white/85 pointer-events-auto transition-shadow duration-300 hover:shadow-[0_35px_80px_rgba(0,0,0,0.85)] overflow-hidden cursor-default"
                >
                    {/* Interactive Dynamic Glare Spotlight */}
                    <div 
                        className="absolute inset-0 pointer-events-none transition-opacity duration-300"
                        style={{
                            background: isHovered 
                                ? `radial-gradient(circle 400px at ${cardTilt.glareX}% ${cardTilt.glareY}%, rgba(255,255,255,0.6), transparent 70%)` 
                                : 'none',
                            opacity: isHovered ? 1 : 0
                        }}
                    />

                    {/* Top Notch Decorative Arc */}
                    <div className="w-14 h-1.5 bg-slate-300/80 rounded-full mx-auto mb-3" />

                    {/* Header with 3D Depth Floating Logo Badge */}
                    <div 
                        className="text-center mb-6 relative"
                        style={{
                            transform: isHovered ? 'translateZ(35px)' : 'translateZ(0px)',
                            transition: 'transform 0.2s ease-out'
                        }}
                    >
                        <div className="relative inline-block mx-auto mb-2.5 group">
                            <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-3xl bg-white p-3 shadow-xl shadow-slate-300/70 border border-slate-100 flex items-center justify-center mx-auto transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-2xl">
                                <img src="/dea.png" alt="DEA Logo" className="w-full h-full object-contain filter drop-shadow-sm select-none" onError={(e) => { e.target.style.display = 'none' }} />
                            </div>
                        </div>
                        <h2 className="text-2xl sm:text-[1.7rem] font-black text-slate-900 tracking-tight">Welcome Back</h2>
                        <p className="text-slate-500 text-[11px] mt-0.5 font-black uppercase tracking-widest">
                            DEA GLOBAL NIAGA HRIS
                        </p>
                    </div>

                    {/* Progressive Lockout Cooldown Banner */}
                    {remainingSeconds > 0 && (
                        <div className="mb-4 p-4 bg-gradient-to-br from-red-50 to-rose-100/80 border border-red-200 rounded-2xl text-center space-y-1 shadow-sm animate-in fade-in">
                            <div className="flex items-center justify-center gap-1.5 text-red-700 font-bold text-xs">
                                <ShieldAlert size={16} className="animate-pulse" />
                                <span>Akun Terkunci Sementara</span>
                            </div>
                            <div className="text-2xl sm:text-3xl font-black font-mono text-red-900 tracking-widest my-0.5">
                                {String(Math.floor(remainingSeconds / 60)).padStart(2, '0')}:{String(remainingSeconds % 60).padStart(2, '0')}
                            </div>
                            <p className="text-[11px] text-slate-600 font-medium">
                                Batas percobaan salah ({failedAttempts}x). Harap tunggu hingga timer selesai.
                            </p>
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-4 relative z-10">
                        {requireMfa ? (
                            <div className="group relative animate-in fade-in slide-in-from-bottom-2 space-y-3.5">
                                <div className="p-3.5 bg-red-50/90 border border-red-200 rounded-2xl text-center">
                                    <h4 className="text-xs font-black text-red-900 flex items-center justify-center gap-1">
                                        🛡️ Verifikasi 2-Langkah (MFA)
                                    </h4>
                                    <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                                        Masukkan kode 6-digit dari <strong>Google Authenticator</strong> atau gunakan <strong>Kode OTP Email</strong>.
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase">
                                        Kode Verifikasi 6 Digit
                                    </label>
                                    <div className="relative">
                                        <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                                        <input 
                                            type="text" 
                                            value={mfaToken} 
                                            required 
                                            disabled={remainingSeconds > 0}
                                            onChange={(e) => setMfaToken(e.target.value)} 
                                            className="w-full pl-9 pr-4 py-3 text-base bg-white/70 border border-slate-200 rounded-xl focus:ring-4 focus:ring-red-900/15 focus:border-red-900 outline-none transition-all font-bold backdrop-blur-sm text-center tracking-widest font-mono text-slate-900" 
                                            placeholder="000000" 
                                            maxLength="6"
                                        />
                                    </div>
                                </div>

                                <div className="pt-1 space-y-2">
                                    <button
                                        type="button"
                                        disabled={emailOtpCooldown > 0 || sendingEmailOtp}
                                        onClick={handleSendEmailOtp}
                                        className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition flex items-center justify-center gap-1.5 disabled:opacity-60 cursor-pointer shadow-2xs"
                                    >
                                        <Mail size={15} className="text-red-700" />
                                        {sendingEmailOtp ? 'Mengirim Kode OTP...' : emailOtpCooldown > 0 ? `Kirim Ulang (${emailOtpCooldown}s)` : 'Kirim Kode OTP ke Email'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setRequireMfa(false);
                                            setMfaToken('');
                                        }}
                                        className="w-full text-center text-[11px] font-bold text-slate-500 hover:text-slate-800 transition py-1 cursor-pointer"
                                    >
                                        ← Kembali & Ganti Akun
                                    </button>
                                </div>
                            </div>
                        ) : requireSetupPassword ? (
                            <div className="group relative animate-in fade-in slide-in-from-bottom-2 space-y-4">
                                <div className="p-3.5 bg-red-50 border border-red-100 rounded-xl text-xs font-bold text-red-800 text-center">
                                    Login pertama. Silakan atur password baru.
                                </div>
                                <div className="relative">
                                    <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                                    <input 
                                        type={showPassword ? "text" : "password"} 
                                        value={newPassword} 
                                        required 
                                        onChange={(e) => setNewPassword(e.target.value)} 
                                        className="w-full pl-9 pr-10 py-3 text-sm bg-white/70 border border-slate-200 rounded-xl focus:ring-4 focus:ring-red-900/15 outline-none transition-all font-medium backdrop-blur-sm" 
                                        placeholder="Password Baru (min 6 karakter)" 
                                    />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Username Input */}
                                <div 
                                    className="group relative"
                                    style={{
                                        transform: isHovered ? 'translateZ(25px)' : 'translateZ(0px)',
                                        transition: 'transform 0.2s ease-out'
                                    }}
                                >
                                    <label className="block text-[11px] font-black text-slate-500 mb-1.5 uppercase tracking-wider">Username / Nama Lengkap</label>
                                    <div className="relative">
                                        <Mail size={18} className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200 z-10 pointer-events-none ${focusedField === 'nama' ? 'text-red-700' : 'text-slate-500'}`} />
                                        <input 
                                            type="text" 
                                            name="nama" 
                                            required 
                                            disabled={remainingSeconds > 0}
                                            onChange={handleChange} 
                                            onFocus={() => setFocusedField('nama')} 
                                            onBlur={() => setFocusedField(null)} 
                                            className={`w-full pl-10 pr-4 py-3 text-sm bg-white/70 border rounded-2xl outline-none transition-all font-semibold backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 placeholder:text-slate-400 ${
                                                focusedField === 'nama' 
                                                    ? 'border-red-800 ring-4 ring-red-900/15 bg-white shadow-md' 
                                                    : 'border-slate-200/90 hover:border-slate-300'
                                            }`} 
                                            placeholder="Masukkan Username atau Nama Lengkap" 
                                        />
                                    </div>
                                </div>

                                {/* Password Input */}
                                <div 
                                    className="group relative"
                                    style={{
                                        transform: isHovered ? 'translateZ(25px)' : 'translateZ(0px)',
                                        transition: 'transform 0.2s ease-out'
                                    }}
                                >
                                    <label className="block text-[11px] font-black text-slate-500 mb-1.5 uppercase tracking-wider">Password</label>
                                    <div className="relative">
                                        <Lock size={18} className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200 z-10 pointer-events-none ${focusedField === 'password' ? 'text-red-700' : 'text-slate-500'}`} />
                                        <input 
                                            type={showPassword ? "text" : "password"} 
                                            name="password" 
                                            required 
                                            disabled={remainingSeconds > 0}
                                            onChange={handleChange} 
                                            onFocus={() => setFocusedField('password')} 
                                            onBlur={() => setFocusedField(null)} 
                                            className={`w-full pl-10 pr-11 py-3 text-sm bg-white/70 border rounded-2xl outline-none transition-all font-semibold backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 placeholder:text-slate-400 ${
                                                focusedField === 'password' 
                                                    ? 'border-red-800 ring-4 ring-red-900/15 bg-white shadow-md' 
                                                    : 'border-slate-200/90 hover:border-slate-300'
                                            }`} 
                                            placeholder="••••••••" 
                                        />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)} disabled={remainingSeconds > 0} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 focus:outline-none disabled:opacity-40 transition p-1 rounded-lg hover:bg-slate-100 cursor-pointer">
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex justify-end -mt-1">
                                    <Link to="/forgot-password" className="text-[11px] text-slate-500 hover:text-red-900 font-bold transition-colors">
                                        Lupa Password?
                                    </Link>
                                </div>
                            </>
                        )}

                        {/* Submit Button with 3D Depth & Hover Pulse */}
                        <div 
                            style={{
                                transform: isHovered ? 'translateZ(35px)' : 'translateZ(0px)',
                                transition: 'transform 0.2s ease-out'
                            }}
                        >
                            <button 
                                type="submit" 
                                disabled={loading || remainingSeconds > 0} 
                                onClick={requireSetupPassword ? handleSetupPassword : null}
                                className="mt-2 w-full bg-gradient-to-r from-red-900 via-red-800 to-red-950 hover:from-red-800 hover:to-red-900 hover:shadow-xl hover:shadow-red-900/40 hover:scale-[1.015] active:scale-[0.98] disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-black py-3.5 rounded-2xl transition-all shadow-lg shadow-red-950/25 text-xs sm:text-sm uppercase tracking-widest cursor-pointer border border-red-700/40 flex items-center justify-center gap-2">
                                {remainingSeconds > 0 ? `Terkunci (${Math.ceil(remainingSeconds / 60)}m)` : (loading ? 'Memproses...' : (requireSetupPassword ? 'Simpan Password Baru' : (requireMfa ? 'Verifikasi MFA' : 'Login')))}
                            </button>
                        </div>
                    </form>

                    <div className="mt-5 pt-3.5 border-t border-slate-200/70 text-center text-[11px] font-bold uppercase text-slate-500 relative z-10">
                        Don't have an account?{' '}
                        <button 
                            type="button" 
                            onClick={handleToSignup} 
                            className="text-red-900 font-black hover:text-red-700 transition-colors ml-1 cursor-pointer underline underline-offset-2"
                        >
                            Sign Up
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
