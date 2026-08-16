import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Check, Eye, EyeOff } from 'lucide-react';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

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
    const navigate = useNavigate();
    const { login } = useAuth();
    const { addToast } = useToast();

    const handleChange = (e) => {
        setCredentials({ ...credentials, [e.target.name]: e.target.value });
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            let deviceId = localStorage.getItem('hris_device_id');
            if (!deviceId) {
                deviceId = 'dev_' + Math.random().toString(36).substr(2, 9);
                localStorage.setItem('hris_device_id', deviceId);
            }
            
            const payload = { ...credentials, deviceId };
            if (requireMfa) {
                payload.mfaToken = mfaToken;
            }
            
            const res = await api.post('/auth/login', payload);
            
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
            <div className="absolute inset-0 z-0">
                <iframe
                    src='https://my.spline.design/nexbotrobotcharacterconcept-Od5WflpjroNUX6I1cGMg9fvj/'
                    frameBorder='0'
                    className="absolute w-[110%] h-[110%] -left-[5%] -top-[5%] pointer-events-auto opacity-100"
                    title="Interactive 3D Scene"
                    allow="autoplay; fullscreen; vr"
                ></iframe>
            </div>

            <div className="relative z-10 w-full max-w-sm pointer-events-none flex flex-col items-center px-4">
                <div className="bg-white/85 backdrop-blur-xl rounded-[2rem] shadow-2xl w-full p-6 border border-white/40 pointer-events-auto">
                    <div className="text-center mb-5">
                        <img src="/dea.png" alt="DEA Logo" className="h-24 w-auto mx-auto mb-2 object-contain" onError={(e) => { e.target.style.display = 'none' }} />
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Welcome Back</h2>
                        <p className="text-gray-500 text-[10px] mt-1 font-bold uppercase tracking-wider">DEA GLOBAL NIAGA HRIS</p>
                    </div>

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
                                        onChange={(e) => setMfaToken(e.target.value)} 
                                        className="w-full pl-8 pr-4 py-2.5 text-sm bg-white/50 border border-slate-200/50 rounded-xl focus:ring-2 focus:ring-red-900/20 focus:border-red-900 outline-none transition-all font-medium backdrop-blur-sm text-center tracking-widest" 
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
                                            onChange={handleChange} 
                                            onFocus={() => setFocusedField('nama')} 
                                            onBlur={() => setFocusedField(null)} 
                                            className="w-full pl-8 pr-4 py-2.5 text-sm bg-white/50 border border-slate-200/50 rounded-xl focus:ring-2 focus:ring-red-900/20 focus:border-red-900 outline-none transition-all font-medium backdrop-blur-sm" 
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
                                            onChange={handleChange} 
                                            className="w-full pl-8 pr-10 py-2.5 text-sm bg-white/50 border border-slate-200/50 rounded-xl focus:ring-2 focus:ring-red-900/20 focus:border-red-900 outline-none transition-all font-medium backdrop-blur-sm" 
                                            placeholder="••••••••" 
                                        />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none">
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
                            disabled={loading} 
                            onClick={requireSetupPassword ? handleSetupPassword : null}
                            className="mt-4 w-full bg-red-900/90 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl transition-all shadow-lg backdrop-blur-sm text-xs uppercase tracking-widest">
                            {loading ? 'Authenticating...' : (requireSetupPassword ? 'Simpan Password Baru' : (requireMfa ? 'Verifikasi MFA' : 'Sign In'))}
                        </button>
                    </form>

                    <div className="mt-4 pt-3 border-t border-gray-200/30 text-center text-[10px] font-bold uppercase text-slate-500">
                        Don't have an account? <Link to="/signup" className="text-red-900 font-black hover:text-red-700 transition-colors ml-1">Sign Up</Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
