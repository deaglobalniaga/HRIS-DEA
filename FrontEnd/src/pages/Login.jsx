import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Check } from 'lucide-react';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';

const Login = () => {
    const [credentials, setCredentials] = useState({ identifier: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [, setFocusedField] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleChange = (e) => {
        setCredentials({ ...credentials, [e.target.name]: e.target.value });
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg('');
        try {
            const res = await api.post('/auth/login', credentials);
            login(res.data.token, res.data.user);
            navigate('/dashboard');
        } catch (error) {
            setErrorMsg(error.response?.data?.error || error.response?.data?.message || error.message || 'Gagal login, periksa kembali email & password Anda.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-screen w-full relative overflow-hidden flex items-center justify-center bg-black">
            {/* Full-Screen Spline Background */}
            <div className="absolute inset-0 z-0">
                <iframe
                    src='https://my.spline.design/nexbotrobotcharacterconcept-Od5WflpjroNUX6I1cGMg9fvj/'
                    frameBorder='0'
                    className="absolute w-[110%] h-[110%] -left-[5%] -top-[5%] pointer-events-auto opacity-100"
                    title="Interactive 3D Scene"
                    allow="autoplay; fullscreen; vr"
                ></iframe>
            </div>

            {/* Form Container */}
            <div className="relative z-10 w-full max-w-sm pointer-events-none flex flex-col items-center px-4">
                <div className="bg-white/85 backdrop-blur-xl rounded-[2rem] shadow-2xl w-full p-6 border border-white/40 pointer-events-auto">
                    <div className="text-center mb-5">
                        <img src="/dea.png" alt="DEA Logo" className="h-24 w-auto mx-auto mb-2 object-contain" onError={(e) => { e.target.style.display = 'none' }} />
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Welcome Back</h2>
                        <p className="text-gray-500 text-[10px] mt-1 font-bold uppercase tracking-wider">DEA GLOBAL NIAGA HRIS</p>
                    </div>

                    {errorMsg && (
                        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-[11px] font-bold text-center flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top-2">
                            <span className="shrink-0">⚠️</span> {errorMsg}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-3.5">
                        <div className="group relative">
                            <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase">Email, Username, atau NIK</label>
                            <div className="relative">
                                <Mail size={16} color="black" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-black z-10 pointer-events-none" />
                                <input 
                                    type="text" 
                                    name="identifier" 
                                    required 
                                    onChange={handleChange} 
                                    onFocus={() => setFocusedField('identifier')} 
                                    onBlur={() => setFocusedField(null)} 
                                    className="w-full pl-8 pr-4 py-2.5 text-sm bg-white/50 border border-slate-200/50 rounded-xl focus:ring-2 focus:ring-red-900/20 focus:border-red-900 outline-none transition-all font-medium backdrop-blur-sm" 
                                    placeholder="arya@example.com / arya_tony / INT-001" 
                                />
                            </div>
                        </div>

                        <div className="group relative">
                            <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase">Password</label>
                            <div className="relative">
                                <Lock size={16} color="black" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-black z-10 pointer-events-none" />
                                <input 
                                    type="password" 
                                    name="password" 
                                    required 
                                    minLength="8"
                                    onChange={handleChange} 
                                    className="w-full pl-8 pr-4 py-2.5 text-sm bg-white/50 border border-slate-200/50 rounded-xl focus:ring-2 focus:ring-red-900/20 focus:border-red-900 outline-none transition-all font-medium backdrop-blur-sm" 
                                    placeholder="••••••••" 
                                />
                            </div>
                        </div>

                        <div className="flex justify-end -mt-1">
                            <Link to="/forgot-password" className="text-[10px] text-slate-500 hover:text-red-900 font-bold transition-colors">
                                Lupa Password?
                            </Link>
                        </div>

                        <button 
                            type="submit" 
                            disabled={loading} 
                            className="mt-4 w-full bg-red-900/90 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl transition-all shadow-lg backdrop-blur-sm text-xs uppercase tracking-widest">
                            {loading ? 'Authenticating...' : 'Sign In'}
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
