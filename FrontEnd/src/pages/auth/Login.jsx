import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Check, Eye, EyeOff, ShieldAlert, Timer } from 'lucide-react';
import api from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const Login = () => {
    const [credentials, setCredentials] = useState({ nama: '', password: '' });
    const [mfaToken, setMfaToken] = useState('');
    const [requireMfa, setRequireMfa] = useState(false);
    const [requireSetupPassword, setRequireSetupPassword] = useState(false);
    const [tempToken, setTempToken] = useState(null);
    const [tempUser, setTempUser] = useState(null);
    const [newPassword, setNewPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [, setFocusedField] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [isMorphing, setIsMorphing] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuth();
    const { addToast } = useToast();

    const handleToSignup = (e) => {
        e.preventDefault();
        setIsMorphing(true);
        setTimeout(() => {
            navigate('/signup');
        }, 420);
    };

    // =========================================================================
    // PROGRESSIVE COOLDOWN / EXPONENTIAL BACKOFF LOCKOUT (SUPERADMIN SETTING)
    // 5x salah -> 1 menit, selanjutnya salah -> 3 menit, 5 menit ... max 30 menit
    // =========================================================================
    const [maxAttempts, setMaxAttempts] = useState(5);
    const [failedAttempts, setFailedAttempts] = useState(() => Number(localStorage.getItem('hris_failed_attempts') || 0));
    const [lockoutLevel, setLockoutLevel] = useState(() => Number(localStorage.getItem('hris_lockout_level') || 0));
    const [lockoutUntil, setLockoutUntil] = useState(() => Number(localStorage.getItem('hris_lockout_until') || 0));
    const [remainingSeconds, setRemainingSeconds] = useState(0);

    // Progressive cooldown schedule in seconds (1 min -> 3 min -> 5 min -> 10 min -> 15 min -> 30 min max)
    const getLockoutDurationSeconds = (level) => {
        switch (level) {
            case 1: return 60;        // 1 Menit
            case 2: return 180;       // 3 Menit
            case 3: return 300;       // 5 Menit
            case 4: return 600;       // 10 Menit
            case 5: return 900;       // 15 Menit
            default: return 1800;     // 30 Menit (Maksimal)
        }
    };

    // Load max attempts configured in Super Admin settings if available
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

    // Live countdown interval
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
            // Stable deterministic hardware & browser fingerprinting
            let deviceId = localStorage.getItem('hris_device_id');
            if (!deviceId) {
                const rawFp = `${navigator.userAgent}_${window.screen?.width}x${window.screen?.height}_${navigator.language}_${navigator.platform || ''}`;
                let hash = 0;
                for (let i = 0; i < rawFp.length; i++) {
                    hash = ((hash << 5) - hash) + rawFp.charCodeAt(i);
                    hash |= 0;
                }
                deviceId = 'dev_' + Math.abs(hash).toString(36);
                localStorage.setItem('hris_device_id', deviceId);
            }
            
            const payload = { ...credentials, deviceId };
            if (requireMfa) {
                payload.mfaToken = mfaToken;
            }
            
            const res = await api.post('/auth/login', payload);
            
            // Successful Login: Reset all failure tracking
            localStorage.removeItem('hris_failed_attempts');
            localStorage.removeItem('hris_lockout_level');
            localStorage.removeItem('hris_lockout_until');
            setFailedAttempts(0);
            setLockoutLevel(0);
            setLockoutUntil(0);

            if (res.data.requirePasswordChange) {
                setTempToken(res.data.token);
                setTempUser(res.data.user);
                setRequireSetupPassword(true);
                addToast('Login awal berhasil. Anda diwajibkan mengubah password Anda.', 'warning');
            } else {
                login(res.data.token, res.data.user);
                addToast('Login Berhasil!', 'success');
                navigate('/dashboard');
            }
        } catch (error) {
            if (error.response?.status === 403 && error.response?.data?.requireMfa) {
                setRequireMfa(true);
                addToast('MFA Diperlukan. Silakan masukkan kode Authenticator Anda.', 'error');
            } else {
                // Only count as failed attempt on 400 or 401 (Wrong credentials), NOT on 500 server error
                if (error.response?.status === 400 || error.response?.status === 401) {
                    handleFailedAttempt();
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
        <div className="h-screen w-full relative overflow-hidden flex items-center justify-center bg-black">
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-auto">
                <iframe
                    src='https://my.spline.design/nexbotrobotcharacterconcept-Od5WflpjroNUX6I1cGMg9fvj/'
                    frameBorder='0'
                    className="absolute w-[120%] h-[calc(100%+140px)] -left-[10%] -top-[20px] pointer-events-auto opacity-100"
                    title="Interactive 3D Scene"
                    allow="autoplay; fullscreen; vr"
                ></iframe>
            </div>

            <div 
                style={{ perspective: '1200px' }}
                className={`relative z-10 w-full max-w-sm pointer-events-none flex flex-col items-center px-4 transition-all duration-500 ease-out ${
                    isMorphing 
                        ? 'scale-90 -rotate-y-90 opacity-0 blur-xs' 
                        : 'scale-100 rotate-y-0 opacity-100'
                }`}
            >
                <div 
                    style={{ transformStyle: 'preserve-3d' }}
                    className="bg-white/85 backdrop-blur-xl rounded-[2rem] shadow-2xl w-full p-6 border border-white/40 pointer-events-auto transition-transform duration-300"
                >
                    <div className="text-center mb-5">
                        <img src="/dea.png" alt="DEA Logo" className="h-24 w-auto mx-auto mb-2 object-contain" onError={(e) => { e.target.style.display = 'none' }} />
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Welcome Back</h2>
                        <p className="text-gray-500 text-[10px] mt-1 font-bold uppercase tracking-wider">DEA GLOBAL NIAGA HRIS</p>
                    </div>

                    {/* Progressive Lockout Cooldown Banner */}
                    {remainingSeconds > 0 && (
                        <div className="mb-4 p-3.5 bg-gradient-to-br from-red-50 to-rose-100/70 border border-red-200 rounded-2xl text-center space-y-1 shadow-sm animate-in fade-in">
                            <div className="flex items-center justify-center gap-1.5 text-red-700 font-bold text-xs">
                                <ShieldAlert size={15} className="animate-pulse" />
                                <span>Akun Terkunci Sementara (Tingkat {lockoutLevel})</span>
                            </div>
                            <div className="text-2xl font-black font-mono text-red-900 tracking-widest my-0.5">
                                {String(Math.floor(remainingSeconds / 60)).padStart(2, '0')}:{String(remainingSeconds % 60).padStart(2, '0')}
                            </div>
                            <p className="text-[10px] text-slate-600 font-medium">
                                Batas percobaan salah ({failedAttempts}x). Harap tunggu hingga timer selesai.
                            </p>
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-3.5">
                        {requireMfa ? (
                            <div className="group relative animate-in fade-in slide-in-from-bottom-2">
                                <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase">Kode MFA</label>
                                <div className="relative">
                                    <Lock size={16} color="black" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-black z-10 pointer-events-none" />
                                    <input 
                                        type="text" 
                                        value={mfaToken} 
                                        required 
                                        disabled={remainingSeconds > 0}
                                        onChange={(e) => setMfaToken(e.target.value)} 
                                        className="w-full pl-8 pr-4 py-2.5 text-sm bg-white/50 border border-slate-200/50 rounded-xl focus:ring-2 focus:ring-red-900/20 focus:border-red-900 outline-none transition-all font-medium backdrop-blur-sm text-center tracking-widest disabled:opacity-50 disabled:cursor-not-allowed" 
                                        placeholder="000000" 
                                        maxLength="6"
                                    />
                                </div>
                                <button type="button" onClick={() => setRequireMfa(false)} className="mt-2 text-[10px] font-bold text-red-600 w-full text-center hover:underline">Batal / Kembali</button>
                            </div>
                        ) : requireSetupPassword ? (
                            <div className="group relative animate-in fade-in slide-in-from-bottom-2 space-y-4">
                                <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-xs font-bold text-red-800 text-center">
                                    Ini adalah login pertama Anda. Untuk alasan keamanan, silakan atur password baru Anda.
                                </div>
                                <div className="relative">
                                    <Lock size={16} color="black" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-black z-10 pointer-events-none" />
                                    <input 
                                        type={showPassword ? "text" : "password"} 
                                        value={newPassword} 
                                        required 
                                        onChange={(e) => setNewPassword(e.target.value)} 
                                        className="w-full pl-8 pr-10 py-2.5 text-sm bg-white/50 border border-slate-200/50 rounded-xl focus:ring-2 focus:ring-red-900/20 focus:border-red-900 outline-none transition-all font-medium backdrop-blur-sm" 
                                        placeholder="Password Baru (min 6 karakter)" 
                                    />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none">
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                                <button type="button" onClick={() => setRequireSetupPassword(false)} className="text-[10px] font-bold text-red-600 w-full text-center hover:underline">Batal Login</button>
                            </div>
                        ) : (
                            <>
                                <div className="group relative">
                                    <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase">Username / Nama Lengkap</label>
                                    <div className="relative">
                                        <Mail size={16} color="black" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-black z-10 pointer-events-none" />
                                        <input 
                                            type="text" 
                                            name="nama" 
                                            required 
                                            disabled={remainingSeconds > 0}
                                            onChange={handleChange} 
                                            onFocus={() => setFocusedField('nama')} 
                                            onBlur={() => setFocusedField(null)} 
                                            className="w-full pl-8 pr-4 py-2.5 text-sm bg-white/50 border border-slate-200/50 rounded-xl focus:ring-2 focus:ring-red-900/20 focus:border-red-900 outline-none transition-all font-medium backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed" 
                                            placeholder="Masukkan Username atau Nama Lengkap" 
                                        />
                                    </div>
                                </div>

                                <div className="group relative">
                                    <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase">Password</label>
                                    <div className="relative">
                                        <Lock size={16} color="black" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-black z-10 pointer-events-none" />
                                        <input 
                                            type={showPassword ? "text" : "password"} 
                                            name="password" 
                                            required 
                                            disabled={remainingSeconds > 0}
                                            onChange={handleChange} 
                                            className="w-full pl-8 pr-10 py-2.5 text-sm bg-white/50 border border-slate-200/50 rounded-xl focus:ring-2 focus:ring-red-900/20 focus:border-red-900 outline-none transition-all font-medium backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed" 
                                            placeholder="••••••••" 
                                        />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)} disabled={remainingSeconds > 0} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none disabled:opacity-40">
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex justify-end -mt-1">
                                    <Link to="/forgot-password" className="text-[10px] text-slate-500 hover:text-red-900 font-bold transition-colors">
                                        Lupa Password?
                                    </Link>
                                </div>
                            </>
                        )}

                        <button 
                            type="submit" 
                            disabled={loading || remainingSeconds > 0} 
                            onClick={requireSetupPassword ? handleSetupPassword : null}
                            className="mt-4 w-full bg-red-900/90 hover:bg-red-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-xl transition-all shadow-lg backdrop-blur-sm text-xs uppercase tracking-widest cursor-pointer">
                            {remainingSeconds > 0 ? `Terkunci (${Math.ceil(remainingSeconds / 60)}m)` : (loading ? 'Memproses...' : (requireSetupPassword ? 'Simpan Password Baru' : (requireMfa ? 'Verifikasi MFA' : 'Login')))}
                        </button>
                    </form>

                    <div className="mt-4 pt-3 border-t border-gray-200/30 text-center text-[10px] font-bold uppercase text-slate-500">
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
