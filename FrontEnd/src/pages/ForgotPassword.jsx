import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import api from '../api/api';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState({ loading: false, success: false, error: null });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus({ loading: true, success: false, error: null });
        try {
            const res = await api.post('/auth/forgot-password', { email });
            setStatus({ loading: false, success: true, error: null, message: res.data.message });
        } catch (err) {
            setStatus({ 
                loading: false, 
                success: false, 
                error: err.response?.data?.message || 'Terjadi kesalahan' 
            });
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
                <div className="p-8">
                    <Link to="/login" className="inline-flex items-center text-xs font-bold text-slate-500 hover:text-red-900 transition-colors mb-6">
                        <ArrowLeft size={14} className="mr-1" /> KEMBALI KE LOGIN
                    </Link>

                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Lupa Password?</h2>
                        <p className="text-slate-500 text-xs mt-2 font-medium">Masukkan email Anda. Kami akan mengirimkan tautan untuk mengatur ulang password Anda.</p>
                    </div>

                    {status.success && (
                        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-center animate-in fade-in">
                            <div className="text-green-600 font-black mb-1">Email Terkirim!</div>
                            <p className="text-green-700 text-[11px] font-medium">{status.message}</p>
                        </div>
                    )}

                    {status.error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-center animate-in fade-in">
                            <p className="text-red-600 text-xs font-bold">⚠️ {status.error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="group relative">
                            <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase">Alamat Email</label>
                            <div className="relative">
                                <Mail size={16} color="black" className="absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none" />
                                <input 
                                    type="email" 
                                    required 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={status.loading || status.success}
                                    className="w-full pl-9 pr-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-900/20 focus:border-red-900 outline-none transition-all font-medium disabled:opacity-50" 
                                    placeholder="email@deaglobalniaga.com" 
                                />
                            </div>
                        </div>

                        {!status.success && (
                            <button 
                                type="submit" 
                                disabled={status.loading} 
                                className="w-full bg-red-900/90 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg text-xs uppercase tracking-widest disabled:opacity-50">
                                {status.loading ? 'Mengirim...' : 'Kirim Link Reset'}
                            </button>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
