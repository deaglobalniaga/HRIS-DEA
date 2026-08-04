import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Lock, Type, Mail, Check, X, CreditCard, Building, Briefcase } from 'lucide-react';
import api from '../api/api';

const Signup = () => {
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        email: '',
        division: '',
        secret_key: '',
        first_name: '',
        last_name: '',
        date_of_birth: '',
        date_of_joining: '',
        address: ''
    });
    const [loading, setLoading] = useState(false);
    const [focusedField, setFocusedField] = useState(null);
    const [usernameValid, setUsernameValid] = useState({ length: false, noSpace: false, alphanumeric: false });
    const [passwordValid, setPasswordValid] = useState({ length: false, upper: false, lower: false, number: false });
    const [emailValid, setEmailValid] = useState({ format: false });
    const [errorMsg, setErrorMsg] = useState('');
    const navigate = useNavigate();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });

        if (name === 'username') {
            setUsernameValid({
                length: value.length >= 5,
                noSpace: value.length > 0 && !/\s/.test(value),
                alphanumeric: value.length > 0 && /^[a-zA-Z0-9_]+$/.test(value)
            });
        }
        if (name === 'password') {
            setPasswordValid({
                length: value.length >= 8,
                upper: /[A-Z]/.test(value),
                lower: /[a-z]/.test(value),
                number: /[0-9]/.test(value)
            });
        }
        if (name === 'email') {
            setEmailValid({
                format: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
            });
        }
    };

    const handleSignup = async (e) => {
        e.preventDefault();
        setErrorMsg('');

        // Strict Client-Side Validation
        if (!emailValid.format) {
            return setErrorMsg('Format email tidak valid.');
        }
        if (!usernameValid.length || !usernameValid.noSpace || !usernameValid.alphanumeric) {
            return setErrorMsg('Username tidak memenuhi syarat (min 5 karakter, tanpa spasi, alphanumeric).');
        }

        const pwd = formData.password;
        if (pwd.length < 8 || !/[A-Z]/.test(pwd) || !/[a-z]/.test(pwd) || !/[0-9]/.test(pwd)) {
            return setErrorMsg('Password terlalu lemah. Penuhi semua syarat password.');
        }

        setLoading(true);
        try {
            await api.post('/auth/signup', formData);
            alert('HRIS Account created successfully! Please login.');
            navigate('/login');
        } catch (error) {
            setErrorMsg(error.response?.data?.message || error.response?.data?.error || error.message || 'Pendaftaran gagal.');
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
            <div className="relative z-10 w-full max-w-lg pointer-events-none flex flex-col items-center px-4">
                <div className="bg-white/85 backdrop-blur-xl rounded-[2rem] shadow-2xl w-full p-6 border border-white/40 pointer-events-auto">
                    <div className="text-center mb-4">
                        <img src="/dea.png" alt="DEA Logo" className="h-20 w-auto mx-auto mb-3 object-contain" onError={(e) => { e.target.style.display = 'none' }} />
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Create HRIS Account</h2>
                        <p className="text-gray-500 text-[10px] mt-0.5 font-bold uppercase tracking-wider">Join DEA GLOBAL NIAGA HR Management</p>
                    </div>

                    {errorMsg && (
                        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-[11px] font-bold text-center flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top-2">
                            <span className="shrink-0">⚠️</span> {errorMsg}
                        </div>
                    )}

                    <form onSubmit={handleSignup} className="grid grid-cols-1 md:grid-cols-6 gap-x-3 gap-y-2.5">
                        <div className="col-span-3 group">
                            <label className="block text-[10px] font-bold text-slate-500 mb-0.5 uppercase">First Name</label>
                            <input type="text" name="first_name" required onChange={handleChange} className="w-full px-3 py-1.5 text-xs bg-white/50 border border-slate-200/50 rounded-xl focus:ring-2 focus:ring-red-900/20 focus:border-red-900 outline-none transition-all font-medium backdrop-blur-sm" />
                        </div>
                        <div className="col-span-3 group">
                            <label className="block text-[10px] font-bold text-slate-500 mb-0.5 uppercase">Last Name</label>
                            <input type="text" name="last_name" required onChange={handleChange} className="w-full px-3 py-1.5 text-xs bg-white/50 border border-slate-200/50 rounded-xl focus:ring-2 focus:ring-red-900/20 focus:border-red-900 outline-none transition-all font-medium backdrop-blur-sm" />
                        </div>

                        <div className="col-span-3 group relative">
                            <label className="block text-[10px] font-bold text-slate-500 mb-0.5 uppercase">Email</label>
                            <div className="relative">
                                <Mail size={14} color="black" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-black z-10 pointer-events-none" />
                                <input type="email" name="email" required onChange={handleChange} onFocus={() => setFocusedField('email')} onBlur={() => setFocusedField(null)} className="w-full pl-8 pr-3 py-1.5 text-xs bg-white/50 border border-slate-200/50 rounded-xl focus:ring-2 focus:ring-red-900/20 focus:border-red-900 outline-none transition-all font-medium backdrop-blur-sm" placeholder="arya@example.com" />
                            </div>
                            {focusedField === 'email' && (
                                <div className="absolute top-full left-0 mt-1 w-full p-2 bg-white rounded-lg shadow-xl border border-slate-100 z-50 text-[10px] space-y-1 animate-in fade-in zoom-in duration-200">
                                    <div className={`flex items-center gap-1.5 ${emailValid.format ? 'text-green-600' : 'text-slate-600'}`}>
                                        <Check size={12} className={emailValid.format ? 'opacity-100' : 'opacity-50'} /> Format email valid (@ dan .)
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="col-span-3 group relative">
                            <label className="block text-[10px] font-bold text-slate-500 mb-0.5 uppercase">Username</label>
                            <div className="relative">
                                <Type size={14} color="black" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-black z-10 pointer-events-none" />
                                <input type="text" name="username" required onChange={handleChange} onFocus={() => setFocusedField('username')} onBlur={() => setFocusedField(null)} className="w-full pl-8 pr-3 py-1.5 text-xs bg-white/50 border border-slate-200/50 rounded-xl focus:ring-2 focus:ring-red-900/20 focus:border-red-900 outline-none transition-all font-medium backdrop-blur-sm" placeholder="aryatony" />
                            </div>
                            {focusedField === 'username' && (
                                <div className="absolute top-full left-0 mt-1 w-full p-2 bg-white rounded-lg shadow-xl border border-slate-100 z-50 text-[10px] space-y-1 animate-in fade-in zoom-in duration-200">
                                    <div className={`flex items-center gap-1.5 ${usernameValid.length ? 'text-green-600' : 'text-slate-600'}`}>
                                        <Check size={12} className={usernameValid.length ? 'opacity-100' : 'opacity-50'} /> Minimal 5 karakter
                                    </div>
                                    <div className={`flex items-center gap-1.5 ${usernameValid.noSpace ? 'text-green-600' : 'text-slate-600'}`}>
                                        <Check size={12} className={usernameValid.noSpace ? 'opacity-100' : 'opacity-50'} /> Tanpa spasi
                                    </div>
                                    <div className={`flex items-center gap-1.5 ${usernameValid.alphanumeric ? 'text-green-600' : 'text-slate-600'}`}>
                                        <Check size={12} className={usernameValid.alphanumeric ? 'opacity-100' : 'opacity-50'} /> Hanya huruf, angka, atau underscore
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="col-span-3 group">
                            <label className="block text-[10px] font-bold text-slate-500 mb-0.5 uppercase">NIK Internal</label>
                            <div className="relative">
                                <CreditCard size={14} color="black" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-black z-10 pointer-events-none" />
                                <input type="text" name="nik_internal" required onChange={handleChange} className="w-full pl-8 pr-3 py-1.5 text-xs bg-white/50 border border-slate-200/50 rounded-xl focus:ring-2 focus:ring-red-900/20 focus:border-red-900 outline-none transition-all font-medium backdrop-blur-sm" placeholder="INT-2026-001" />
                            </div>
                        </div>

                        <div className="col-span-3 group">
                            <label className="block text-[10px] font-bold text-slate-500 mb-0.5 uppercase">Divisi</label>
                            <div className="relative">
                                <Briefcase color="black" className="absolute left-2.5 top-2 text-black z-10 pointer-events-none" size={14} />
                                <select 
                                    name="division"
                                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                                    value={formData.division} onChange={handleChange}>
                                    <option value="">Pilih Divisi...</option>
                                    <option value="Maintenance">Maintenance</option>
                                    <option value="Project">Project</option>
                                    <option value="HRGA">HRGA</option>
                                    <option value="HSE">HSE</option>
                                </select>
                            </div>
                        </div>

                        <div className="col-span-3 group">
                            <label className="block text-[10px] font-bold text-slate-500 mb-0.5 uppercase">Date of Birth</label>
                            <input type="date" name="date_of_birth" required onChange={handleChange} className="w-full px-3 py-1.5 text-xs bg-white/50 border border-slate-200/50 rounded-xl focus:ring-2 focus:ring-red-900/20 focus:border-red-900 outline-none transition-all font-medium backdrop-blur-sm" />
                        </div>
                        <div className="col-span-3 group">
                            <label className="block text-[10px] font-bold text-slate-500 mb-0.5 uppercase">Date of Joining</label>
                            <input type="date" name="date_of_joining" required onChange={handleChange} className="w-full px-3 py-1.5 text-xs bg-white/50 border border-slate-200/50 rounded-xl focus:ring-2 focus:ring-red-900/20 focus:border-red-900 outline-none transition-all font-medium backdrop-blur-sm" />
                        </div>

                        <div className="col-span-6 group relative">
                            <label className="block text-[10px] font-bold text-slate-500 mb-0.5 uppercase">Secret Key (Khusus Admin)</label>
                            <div className="relative">
                                <Lock size={14} color="black" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-black z-10 pointer-events-none" />
                                <input type="password" name="secret_key" onChange={handleChange} className="w-full pl-8 pr-3 py-1.5 text-xs bg-white/50 border border-slate-200/50 rounded-xl focus:ring-2 focus:ring-red-900/20 focus:border-red-900 outline-none transition-all font-medium backdrop-blur-sm" placeholder="Leave empty for regular user" />
                            </div>
                        </div>

                        <div className="col-span-6 group relative">
                            <label className="block text-[10px] font-bold text-slate-500 mb-0.5 uppercase">Password</label>
                            <div className="relative">
                                <Lock size={14} color="black" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-black z-10 pointer-events-none" />
                                <input type="password" name="password" required onChange={handleChange} onFocus={() => setFocusedField('password')} onBlur={() => setFocusedField(null)} className="w-full pl-8 pr-3 py-1.5 text-xs bg-white/50 border border-slate-200/50 rounded-xl focus:ring-2 focus:ring-red-900/20 focus:border-red-900 outline-none transition-all font-medium backdrop-blur-sm" placeholder="••••••••" />
                            </div>
                            {focusedField === 'password' && (
                                <div className="absolute bottom-full left-0 mb-1 w-full p-2 bg-white rounded-lg shadow-xl border border-slate-100 z-50 text-[10px] space-y-1 animate-in fade-in zoom-in duration-200">
                                    <div className={`flex items-center gap-1.5 ${passwordValid.length ? 'text-green-600' : 'text-slate-600'}`}>
                                        <Check size={12} className={passwordValid.length ? 'opacity-100' : 'opacity-50'} /> Minimal 8 karakter
                                    </div>
                                    <div className={`flex items-center gap-1.5 ${passwordValid.upper ? 'text-green-600' : 'text-slate-600'}`}>
                                        <Check size={12} className={passwordValid.upper ? 'opacity-100' : 'opacity-50'} /> Mengandung huruf besar (A-Z)
                                    </div>
                                    <div className={`flex items-center gap-1.5 ${passwordValid.lower ? 'text-green-600' : 'text-slate-600'}`}>
                                        <Check size={12} className={passwordValid.lower ? 'opacity-100' : 'opacity-50'} /> Mengandung huruf kecil (a-z)
                                    </div>
                                    <div className={`flex items-center gap-1.5 ${passwordValid.number ? 'text-green-600' : 'text-slate-600'}`}>
                                        <Check size={12} className={passwordValid.number ? 'opacity-100' : 'opacity-50'} /> Mengandung angka (0-9)
                                    </div>
                                </div>
                            )}
                        </div>

                        <button type="submit" disabled={loading} className="col-span-6 mt-1 w-full bg-red-900/90 hover:bg-red-700 text-white font-bold py-2 rounded-xl transition-all shadow-lg backdrop-blur-sm text-xs uppercase tracking-widest">
                            {loading ? 'Creating...' : 'Sign Up'}
                        </button>
                    </form>

                    <div className="mt-3 pt-3 border-t border-gray-200/30 text-center text-[10px] font-bold uppercase text-slate-500">
                        Already have an account? <Link to="/login" className="text-red-900 font-black hover:text-red-700 transition-colors ml-1">Login here</Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Signup;
