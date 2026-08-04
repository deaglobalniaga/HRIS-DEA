import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Lock, ArrowLeft } from 'lucide-react';
import api from '../api/api';

const ResetPassword = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    // Derive token from URL synchronously
    const params = new URLSearchParams(location.search);
    const token = params.get('token');

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [status, setStatus] = useState({ 
        loading: false, 
        success: false, 
        error: token ? null : 'Token reset tidak valid atau tidak ditemukan.' 
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (newPassword !== confirmPassword) {
            setStatus({ loading: false, success: false, error: 'Password tidak cocok.' });
            return;
        }

        setStatus({ loading: true, success: false, error: null });
        try {
            const res = await api.post('/auth/reset-password', { token, newPassword });
            setStatus({ loading: false, success: true, error: null, message: res.data.message });
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err) {
            setStatus({ 
                loading: false, 
                success: false, 
                error: err.response?.data?.message || 'Token tidak valid atau sudah kadaluarsa.' 
            });
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
                <div className="p-8">
                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Atur Ulang Password</h2>
                        <p className="text-slate-500 text-xs mt-2 font-medium">Buat password baru untuk akun HRIS Anda.</p>
                    </div>

                    {status.success && (
                        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-center animate-in fade-in">
                            <div className="text-green-600 font-black mb-1">Berhasil!</div>
                            <p className="text-green-700 text-[11px] font-medium">{status.message}</p>
                            <p className="text-green-600/80 text-[10px] mt-2">Mengarahkan ke halaman login...</p>
                        </div>
                    )}

                    {status.error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-center animate-in fade-in">
                            <p className="text-red-600 text-xs font-bold">⚠️ {status.error}</p>
                            <Link to="/forgot-password" className="text-[10px] font-bold text-red-900 underline mt-2 block">
                                Minta link reset baru
                            </Link>
                        </div>
                    )}

                    {!status.success && token && (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="group relative">
                                <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase">Password Baru</label>
                                <div className="relative">
                                    <Lock size={16} color="black" className="absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none" />
                                    <input 
                                        type="password" 
                                        required 
                                        minLength="8"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        disabled={status.loading}
                                        className="w-full pl-9 pr-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-900/20 focus:border-red-900 outline-none transition-all font-medium disabled:opacity-50" 
                                        placeholder="Min. 8 karakter" 
                                    />
                                </div>
                            </div>

                            <div className="group relative">
                                <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase">Konfirmasi Password Baru</label>
                                <div className="relative">
                                    <Lock size={16} color="black" className="absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none" />
                                    <input 
                                        type="password" 
                                        required 
                                        minLength="8"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        disabled={status.loading}
                                        className="w-full pl-9 pr-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-900/20 focus:border-red-900 outline-none transition-all font-medium disabled:opacity-50" 
                                        placeholder="Ketik ulang password baru" 
                                    />
                                </div>
                            </div>

                            <button 
                                type="submit" 
                                disabled={status.loading} 
                                className="mt-4 w-full bg-red-900/90 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg text-xs uppercase tracking-widest disabled:opacity-50">
                                {status.loading ? 'Menyimpan...' : 'Simpan Password Baru'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
