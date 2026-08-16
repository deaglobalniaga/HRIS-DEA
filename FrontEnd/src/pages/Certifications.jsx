import React, { useState, useEffect, useRef } from 'react';
import { Award, Upload, Trash2, Search, FileText } from 'lucide-react';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const Certifications = ({ preSelectedUser = null, uploadTrigger = 0 }) => {
    const { user } = useAuth();
    const { addToast } = useToast();
    const [certifications, setCertifications] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploading, setUploading] = useState(false);
    
    // Form state
    const [selectedUserId, setSelectedUserId] = useState('');
    const [namaSertifikat, setNamaSertifikat] = useState('');
    const [institusi, setInstitusi] = useState('');
    const [tglTerbit, setTglTerbit] = useState('');
    const [tglExpired, setTglExpired] = useState('');
    const [files, setFiles] = useState([]);

    const fileInputRef = useRef();

    useEffect(() => {
        if (preSelectedUser) {
            setSelectedUserId(preSelectedUser.id || preSelectedUser._id);
        }
    }, [preSelectedUser]);

    useEffect(() => {
        if (uploadTrigger > 0) {
            setSelectedUserId(''); // reset user selection
            setShowUploadModal(true);
        }
    }, [uploadTrigger]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [certRes, empRes] = await Promise.all([
                api.get('/hris/certifications'),
                api.get('/hris/employees')
            ]);
            setCertifications(certRes.data || []);
            setEmployees(empRes.data || []);
        } catch (err) {
            console.error('Failed to fetch certifications', err);
            addToast('Gagal memuat data sertifikasi', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleUploadSubmit = async (e) => {
        e.preventDefault();
        if (files.length === 0) {
            addToast('Pilih dokumen PDF/JPG terlebih dahulu', 'error');
            return;
        }
        for (let i = 0; i < files.length; i++) {
            if (files[i].size > 5 * 1024 * 1024) {
                addToast(`Ukuran file ${files[i].name} maksimal 5MB`, 'error');
                return;
            }
        }

        setUploading(true);
        const formData = new FormData();
        formData.append('user_id', selectedUserId);
        formData.append('nama_sertifikat', namaSertifikat);
        formData.append('institusi_penerbit', institusi);
        formData.append('tanggal_diterbitkan', tglTerbit);
        formData.append('tanggal_kadaluarsa', tglExpired);
        
        for (let i = 0; i < files.length; i++) {
            formData.append('attachments', files[i]);
        }

        try {
            await api.post('/hris/certifications', formData);

            addToast('Sertifikat berhasil diupload', 'success');
            setShowUploadModal(false);
            resetForm();
            fetchData();
        } catch (err) {
            console.error(err);
            addToast(err.response?.data?.error || 'Gagal mengupload sertifikat', 'error');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Yakin ingin menghapus sertifikat ini?')) return;
        try {
            await api.delete(`/hris/certifications/${id}`);
            addToast('Sertifikat berhasil dihapus', 'success');
            fetchData();
        } catch (err) {
            console.error(err);
            addToast('Gagal menghapus sertifikat', 'error');
        }
    };

    const resetForm = () => {
        if (!preSelectedUser) setSelectedUserId('');
        setNamaSertifikat('');
        setInstitusi('');
        setTglTerbit('');
        setTglExpired('');
        setFiles([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const getStatusIndicator = (cert) => {
        if (!cert.tanggal_kadaluarsa) return { color: 'bg-green-500', text: 'Aktif (Tanpa Expired)' };
        
        const expiredDate = new Date(cert.tanggal_kadaluarsa);
        const today = new Date();
        const diffTime = expiredDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return { color: 'bg-red-500', text: 'Expired' };
        if (diffDays <= 30) return { color: 'bg-yellow-400', text: 'Segera Expired' };
        return { color: 'bg-green-500', text: 'Aktif' };
    };

    const getCertBadgeStyle = (name) => {
        if (!name) return 'bg-slate-100 text-slate-700 border-slate-200';
        const lowerName = name.toLowerCase();
        if (lowerName.includes('pop') || lowerName.includes('pom') || lowerName.includes('pengawas')) 
            return 'bg-purple-100 text-purple-700 border-purple-200';
        if (lowerName.includes('ak3') || lowerName.includes('ahli k3') || lowerName.includes('safety') || lowerName.includes('lototo')) 
            return 'bg-red-100 text-red-700 border-red-200';
        if (lowerName.includes('wah') || lowerName.includes('ketinggian')) 
            return 'bg-blue-100 text-blue-700 border-blue-200';
        if (lowerName.includes('tkpk') || lowerName.includes('tkbt') || lowerName.includes('csms')) 
            return 'bg-indigo-100 text-indigo-700 border-indigo-200';
        if (lowerName.includes('first aid') || lowerName.includes('p3k') || lowerName.includes('kesehatan') || lowerName.includes('jari tangan')) 
            return 'bg-emerald-100 text-emerald-700 border-emerald-200';
        if (lowerName.includes('listrik') || lowerName.includes('electrical')) 
            return 'bg-amber-100 text-amber-700 border-amber-200';
        if (lowerName.includes('drone') || lowerName.includes('pilot')) 
            return 'bg-cyan-100 text-cyan-700 border-cyan-200';
        if (lowerName.includes('konstruksi') || lowerName.includes('civil') || lowerName.includes('architecture')) 
            return 'bg-orange-100 text-orange-700 border-orange-200';
        if (lowerName.includes('fo') || lowerName.includes('network') || lowerName.includes('mikrotik') || lowerName.includes('mtcna') || lowerName.includes('mtcre')) 
            return 'bg-teal-100 text-teal-700 border-teal-200';
        return 'bg-slate-100 text-slate-700 border-slate-200';
    };

    const getDisplayRows = () => {
        let rows = [];
        
        employees.forEach(emp => {
            const empCerts = certifications.filter(c => c.user?._id === emp.id || c.user_id === emp.id);
            const empName = emp.nama || emp.full_name || '';
            const matchName = empName.toLowerCase().includes(searchTerm.toLowerCase());
            
            if (empCerts.length > 0) {
                empCerts.forEach(cert => {
                    const matchCert = cert.nama_sertifikat.toLowerCase().includes(searchTerm.toLowerCase());
                    if (matchName || matchCert) {
                        rows.push({ type: 'cert', employee: emp, cert: cert });
                    }
                });
            } else {
                if (matchName) {
                    rows.push({ type: 'empty', employee: emp, cert: null });
                }
            }
        });
        
        return rows;
    };

    const displayRows = getDisplayRows();

    return (
        <div className="w-full flex flex-col gap-6 relative">
            <div className="bg-white border border-slate-200 rounded-[1.5rem] shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                                <th className="p-4 font-black">Karyawan</th>
                                <th className="p-4 font-black">Sertifikat</th>
                                <th className="p-4 font-black">Institusi</th>
                                <th className="p-4 font-black">Masa Berlaku</th>
                                <th className="p-4 font-black">Status</th>
                                <th className="p-4 font-black text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-slate-400 font-bold">Memuat data...</td>
                                </tr>
                            ) : displayRows.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-slate-400 font-bold">Tidak ada data ditemukan.</td>
                                </tr>
                            ) : (
                                displayRows.map((row, idx) => {
                                    const emp = row.employee;
                                    
                                    if (row.type === 'empty') {
                                        return (
                                            <tr key={`empty-${emp.id}-${idx}`} className="hover:bg-slate-50 transition-colors">
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-500">
                                                            {(emp.nama || 'U').charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-gray-900">{emp.nama || '-'}</p>
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase">{emp.department || '-'}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td colSpan="4" className="p-4 text-sm font-bold text-slate-400 italic text-center bg-slate-50/50">
                                                    Belum ada sertifikasi terdaftar.
                                                </td>
                                                <td className="p-4 text-center">
                                                    {(user?.role === 'admin' || user?.role === 'superadmin') && (
                                                        <button onClick={() => { setSelectedUserId(emp.id || emp._id); setShowUploadModal(true); }} className="p-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors group relative" title="Upload Sertifikasi">
                                                            <Upload size={16} />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    }

                                    const cert = row.cert;
                                    const status = getStatusIndicator(cert);
                                    return (
                                        <tr key={cert._id} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-500">
                                                        {(emp.nama || 'U').charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-gray-900">{emp.nama || '-'}</p>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase">{emp.department || '-'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 align-top">
                                                <div className="flex flex-col gap-2 items-start">
                                                    <div className={`inline-flex items-center px-3 py-1.5 rounded-lg text-[11px] font-black border uppercase tracking-wide shadow-sm ${getCertBadgeStyle(cert.nama_sertifikat)}`}>
                                                        {cert.nama_sertifikat}
                                                    </div>
                                                    {cert.attachment_url && (
                                                        <a href={cert.attachment_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] bg-red-50 text-red-600 px-2 py-1 rounded-full font-bold hover:bg-red-100 transition-colors">
                                                            <FileText size={10} /> Lihat PDF
                                                        </a>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4 text-sm font-bold text-slate-600 align-top">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center">
                                                        <Award size={12} className="text-slate-400" />
                                                    </div>
                                                    {cert.institusi_penerbit || '-'}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <p className="text-[11px] font-bold text-slate-500">Terbit: {new Date(cert.tanggal_diterbitkan).toLocaleDateString('id-ID')}</p>
                                                {cert.tanggal_kadaluarsa && (
                                                    <p className="text-[11px] font-bold text-slate-500 mt-1">Exp: {new Date(cert.tanggal_kadaluarsa).toLocaleDateString('id-ID')}</p>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-3 h-3 rounded-full ${status.color}`}></div>
                                                    <span className="text-xs font-bold text-slate-600">{status.text}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-center">
                                                {(user?.role === 'admin' || user?.role === 'superadmin') && (
                                                    <button onClick={() => handleDelete(cert._id)} className="p-2 bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors">
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Upload Modal */}
            {showUploadModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <form onSubmit={handleUploadSubmit} className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-lg font-black text-gray-900">Upload Sertifikat</h3>
                            <button type="button" onClick={() => setShowUploadModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-900 transition-colors">✕</button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto max-h-[70vh] flex flex-col gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-2">Karyawan</label>
                                <select required value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:border-red-900">
                                    <option value="">-- Pilih Karyawan --</option>
                                    {employees.map(e => <option key={e.id} value={e.id}>{e.nama || e.full_name}</option>)}
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-2">Nama Sertifikat / Pelatihan</label>
                                <input type="text" required value={namaSertifikat} onChange={e => setNamaSertifikat(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:border-red-900" />
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-2">Institusi Penerbit</label>
                                <input type="text" required value={institusi} onChange={e => setInstitusi(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:border-red-900" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-2">Tanggal Terbit</label>
                                    <input type="date" required value={tglTerbit} onChange={e => setTglTerbit(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:border-red-900" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-2">Tanggal Berakhir (Opsional)</label>
                                    <input type="date" value={tglExpired} onChange={e => setTglExpired(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:border-red-900" />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-2">Dokumen (Bisa pilih lebih dari satu, PDF/JPG Max 5MB)</label>
                                <input type="file" accept=".pdf,image/*" multiple required ref={fileInputRef} onChange={e => setFiles(Array.from(e.target.files))} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:border-red-900" />
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50">
                            <button type="button" onClick={() => setShowUploadModal(false)} className="px-6 py-3 font-bold text-sm text-slate-600 hover:text-gray-900 transition-colors">Batal</button>
                            <button type="submit" disabled={uploading} className="px-6 py-3 bg-red-900 text-white font-bold text-sm rounded-xl hover:bg-red-800 transition-all disabled:opacity-50">
                                {uploading ? 'Mengupload...' : 'Simpan & Upload'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

        </div>
    );
};

export default Certifications;
