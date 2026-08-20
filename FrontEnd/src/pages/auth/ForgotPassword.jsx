import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, KeyRound, Lock, ArrowLeft, CheckCircle2, ShieldAlert, Timer, RefreshCw, Eye, EyeOff, Check, ArrowRight } from 'lucide-react';
import api from '../../api/api';

const ForgotPassword = () => {
    const navigate = useNavigate();
    
    // Step 1: Input Email/Username
    // Step 2: Verifikasi 6-Digit OTP
    // Step 3: Atur Kata Sandi Baru
    const [step, setStep] = useState(1);
    
    const [email, setEmail] = useState('');
    const [maskedEmail, setMaskedEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // 10-Minute Cooldown Timer (in seconds)
    const [cooldown, setCooldown] = useState(0);

    const [status, setStatus] = useState({ loading: false, success: false, error: null, message: '' });

    // Cooldown countdown effect
    useEffect(() => {
        if (cooldown <= 0) return;
        const timer = setInterval(() => {
            setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(timer);
    }, [cooldown]);

    const formatTimer = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    // 1. Step 1: Request 6-Digit OTP Email
    const handleRequestOtp = async (e) => {
        if (e) e.preventDefault();
        setStatus({ loading: true, success: false, error: null, message: '' });

        try {
            const res = await api.post('/auth/forgot-password', { email: email.trim() });
            setMaskedEmail(res.data.recipientEmail || email);
            setCooldown(res.data.cooldownSeconds || 600);
            setStep(2);
            setStatus({
                loading: false,
                success: true,
                error: null,
                message: res.data.message
            });
        } catch (err) {
            const remaining = err.response?.data?.cooldownRemainingSeconds;
            if (remaining) {
                setCooldown(remaining);
                setStep(2);
            }
            setStatus({
                loading: false,
                success: false,
                error: err.response?.data?.message || 'Terjadi kesalahan saat memproses permintaan.'
            });
        }
    };

    // 2. Step 2: Verify 6-Digit OTP & Advance to Step 3
    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        const cleanOtp = String(otp || '').replace(/\D/g, '').trim();

        if (cleanOtp.length !== 6) {
            setStatus({ loading: false, success: false, error: 'Kode verifikasi harus 6 digit angka.' });
            return;
        }

        setStatus({ loading: true, success: false, error: null, message: '' });

        try {
            const res = await api.post('/auth/verify-reset-otp', {
                email: email.trim(),
                otp: cleanOtp
            });

            setStatus({
                loading: false,
                success: true,
                error: null,
                message: res.data.message || 'Kode OTP valid! Silakan buat kata sandi baru Anda.'
            });
            setStep(3); // Go to Step 3 (Set New Password page)
        } catch (err) {
            setStatus({
                loading: false,
                success: false,
                error: err.response?.data?.message || 'Kode OTP tidak valid atau telah kedaluwarsa.'
            });
        }
    };

    // 3. Step 3: Submit New Password
    const handleSetNewPassword = async (e) => {
        e.preventDefault();
        const cleanOtp = String(otp || '').replace(/\D/g, '').trim();

        if (newPassword.length < 6) {
            setStatus({ loading: false, success: false, error: 'Kata sandi baru minimal 6 karakter.' });
            return;
        }

        if (newPassword !== confirmPassword) {
            setStatus({ loading: false, success: false, error: 'Konfirmasi kata sandi tidak cocok.' });
            return;
        }

        setStatus({ loading: true, success: false, error: null, message: '' });

        try {
            const res = await api.post('/auth/reset-password', {
                email: email.trim(),
                otp: cleanOtp,
                newPassword
            });

            setStatus({
                loading: false,
                success: true,
                error: null,
                message: res.data.message
            });

            setTimeout(() => {
                navigate('/login');
            }, 2500);

        } catch (err) {
            setStatus({
                loading: false,
                success: false,
                error: err.response?.data?.message || 'Gagal mereset kata sandi. Silakan coba lagi.'
            });
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-red-950 flex items-center justify-center p-4 font-sans">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-100/50 overflow-hidden">
                <div className="p-8 sm:p-10">
                    
                    {/* Header Top Link */}
                    <Link to="/login" className="inline-flex items-center text-xs font-bold text-slate-500 hover:text-red-900 transition-colors mb-5">
                        <ArrowLeft size={14} className="mr-1.5" /> KEMBALI KE HALAMAN LOGIN
                    </Link>

                    {/* Stepper Progress Bar */}
                    <div className="flex items-center justify-between mb-6 px-2">
                        <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                                step === 1 ? 'bg-red-800 text-white shadow-md shadow-red-900/30 ring-4 ring-red-100' :
                                step > 1 ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'
                            }`}>
                                {step > 1 ? <Check size={14} /> : '1'}
                            </div>
                            <span className={`text-[11px] font-bold ${step === 1 ? 'text-red-900' : 'text-slate-400'}`}>Email</span>
                        </div>

                        <div className={`flex-1 h-0.5 mx-2 ${step >= 2 ? 'bg-emerald-500' : 'bg-slate-200'}`} />

                        <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                                step === 2 ? 'bg-red-800 text-white shadow-md shadow-red-900/30 ring-4 ring-red-100' :
                                step > 2 ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'
                            }`}>
                                {step > 2 ? <Check size={14} /> : '2'}
                            </div>
                            <span className={`text-[11px] font-bold ${step === 2 ? 'text-red-900' : 'text-slate-400'}`}>OTP</span>
                        </div>

                        <div className={`flex-1 h-0.5 mx-2 ${step >= 3 ? 'bg-emerald-500' : 'bg-slate-200'}`} />

                        <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                                step === 3 ? 'bg-red-800 text-white shadow-md shadow-red-900/30 ring-4 ring-red-100' : 'bg-slate-100 text-slate-400'
                            }`}>
                                3
                            </div>
                            <span className={`text-[11px] font-bold ${step === 3 ? 'text-red-900' : 'text-slate-400'}`}>Sandi Baru</span>
                        </div>
                    </div>

                    {/* Step Title & Icon */}
                    <div className="text-center mb-6">
                        <div className="w-12 h-12 bg-red-50 text-red-700 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
                            {step === 1 && <Mail size={22} />}
                            {step === 2 && <KeyRound size={22} />}
                            {step === 3 && <Lock size={22} />}
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                            {step === 1 && 'Lupa Kata Sandi?'}
                            {step === 2 && 'Verifikasi Kode 6 Digit'}
                            {step === 3 && 'Buat Kata Sandi Baru'}
                        </h2>
                        <p className="text-slate-500 text-xs mt-1.5 font-medium leading-relaxed">
                            {step === 1 && 'Masukkan email atau username Anda untuk menerima kode OTP verifikasi.'}
                            {step === 2 && `Masukkan 6 digit kode yang telah dikirim ke email ${maskedEmail || email}.`}
                            {step === 3 && 'Masukkan kata sandi baru Anda yang aman untuk akun HRIS ini.'}
                        </p>
                    </div>

                    {/* Success Alert */}
                    {status.success && (
                        <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-800 animate-in fade-in">
                            <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-bold">{status.message}</p>
                                {step === 3 && (
                                    <p className="text-[10px] text-emerald-600 mt-1">Mengarahkan ke halaman login...</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Error Alert */}
                    {status.error && (
                        <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2.5 text-xs text-red-800 animate-in fade-in">
                            <ShieldAlert size={16} className="text-red-600 shrink-0 mt-0.5" />
                            <p className="font-medium">{status.error}</p>
                        </div>
                    )}

                    {/* STEP 1: EMAIL / USERNAME */}
                    {step === 1 && (
                        <form onSubmit={handleRequestOtp} className="space-y-4">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                                    Email atau Username Akun
                                </label>
                                <div className="relative">
                                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    <input 
                                        type="text" 
                                        required 
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        disabled={status.loading}
                                        className="w-full pl-10 pr-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-red-900/20 focus:border-red-800 outline-none transition-all font-medium text-slate-900" 
                                        placeholder="nama@deaglobalniaga.com" 
                                    />
                                </div>
                            </div>

                            <button 
                                type="submit" 
                                disabled={status.loading || !email.trim()} 
                                className="w-full bg-red-800 hover:bg-red-900 text-white font-black py-3 rounded-2xl transition-all shadow-lg shadow-red-900/20 text-xs uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {status.loading ? 'Mengirim Kode...' : 'Kirim Kode 6 Digit'}
                            </button>
                        </form>
                    )}

                    {/* STEP 2: 6-DIGIT OTP */}
                    {step === 2 && (
                        <form onSubmit={handleVerifyOtp} className="space-y-5 animate-in fade-in">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                                        Kode Verifikasi (6 Digit)
                                    </label>
                                    <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                                        Berlaku 10 Menit
                                    </span>
                                </div>
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        required 
                                        maxLength={6}
                                        autoFocus
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                                        className="w-full text-center tracking-[12px] text-3xl font-black font-mono py-3 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:ring-2 focus:ring-red-900/20 focus:border-red-800 outline-none transition-all text-slate-900" 
                                        placeholder="••••••" 
                                    />
                                </div>
                            </div>

                            <button 
                                type="submit" 
                                disabled={status.loading || otp.replace(/\D/g, '').length !== 6} 
                                className="w-full bg-red-800 hover:bg-red-900 text-white font-black py-3 rounded-2xl transition-all shadow-lg shadow-red-900/20 text-xs uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {status.loading ? 'Memverifikasi...' : 'Verifikasi Kode & Lanjut'}
                                <ArrowRight size={14} />
                            </button>

                            {/* Resend OTP Cooldown Timer */}
                            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                                <button
                                    type="button"
                                    onClick={() => { setStep(1); setStatus({ loading: false, success: false, error: null, message: '' }); }}
                                    className="text-slate-400 hover:text-slate-700 font-bold"
                                >
                                    Ganti Email
                                </button>

                                {cooldown > 0 ? (
                                    <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl font-bold">
                                        <Timer size={13} className="text-red-700 animate-spin" /> Kirim Ulang ({formatTimer(cooldown)})
                                    </span>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handleRequestOtp}
                                        disabled={status.loading}
                                        className="inline-flex items-center gap-1 text-[11px] font-black text-red-700 hover:text-red-900 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-xl transition-all"
                                    >
                                        <RefreshCw size={12} /> Kirim Ulang Kode
                                    </button>
                                )}
                            </div>
                        </form>
                    )}

                    {/* STEP 3: SET NEW PASSWORD */}
                    {step === 3 && (
                        <form onSubmit={handleSetNewPassword} className="space-y-4 animate-in fade-in">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                                    Kata Sandi Baru
                                </label>
                                <div className="relative">
                                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    <input 
                                        type={showPassword ? 'text' : 'password'} 
                                        required 
                                        minLength={6}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full pl-10 pr-10 py-3 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-red-900/20 focus:border-red-800 outline-none transition-all font-medium text-slate-900" 
                                        placeholder="Minimal 6 karakter" 
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
                                <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                                    Konfirmasi Kata Sandi Baru
                                </label>
                                <div className="relative">
                                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    <input 
                                        type={showConfirmPassword ? 'text' : 'password'} 
                                        required 
                                        minLength={6}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full pl-10 pr-10 py-3 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-red-900/20 focus:border-red-800 outline-none transition-all font-medium text-slate-900" 
                                        placeholder="Ulangi kata sandi baru" 
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            <button 
                                type="submit" 
                                disabled={status.loading || !newPassword || newPassword.length < 6 || newPassword !== confirmPassword} 
                                className="w-full bg-red-800 hover:bg-red-900 text-white font-black py-3.5 rounded-2xl transition-all shadow-lg shadow-red-900/20 text-xs uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {status.loading ? 'Menyimpan Kata Sandi...' : 'Simpan Kata Sandi Baru'}
                            </button>

                            <div className="pt-2 text-center">
                                <button
                                    type="button"
                                    onClick={() => setStep(2)}
                                    className="text-xs text-slate-400 hover:text-slate-600 font-bold"
                                >
                                    &larr; Kembali ke Verifikasi OTP
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
