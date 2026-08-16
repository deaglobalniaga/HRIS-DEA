import React, { useState, useEffect } from 'react';
import { Shield, Camera, MapPin, UserCheck, AlertTriangle } from 'lucide-react';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const AccessRights = () => {
    const { user } = useAuth();
    const { addToast } = useToast();
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchEmployees = async () => {
        try {
            setLoading(true);
            const res = await api.get('/hris/employees');
            setEmployees(res.data || []);
        } catch (err) {
            console.error('Failed to fetch employees:', err);
            addToast('Gagal memuat data hak akses karyawan.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEmployees();
    }, []);

    const handleUpdateAccess = async (empId, field, value) => {
        if (user?.role !== 'superadmin') {
            addToast('Hanya Super Admin yang dapat mengubah hak akses!', 'error');
            return;
        }

        try {
            // Optimistic update
            setEmployees(prev => prev.map(emp => {
                if (emp.id === empId) {
                    if (field === 'role') return { ...emp, role: value };
                    if (field === 'camera' || field === 'gps') {
                        return { 
                            ...emp, 
                            attendance_access: { 
                                ...emp.attendance_access, 
                                [field]: value 
                            } 
                        };
                    }
                }
                return emp;
            }));

            // Prepare payload
            const payload = {};
            if (field === 'role') payload.role = value;
            if (field === 'camera' || field === 'gps') {
                const emp = employees.find(e => e.id === empId);
                payload.attendance_access = { 
                    ...emp.attendance_access, 
                    [field]: value 
                };
            }

            await api.put(`/hris/employees/${empId}`, payload);
            addToast('Hak akses berhasil diperbarui.', 'success');
        } catch (err) {
            console.error('Failed to update access:', err);
            addToast(err.response?.data?.error || 'Gagal memperbarui hak akses.', 'error');
            fetchEmployees(); // revert on fail
        }
    };

    if (user?.role !== 'superadmin') {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-center">
                <AlertTriangle size={48} className="text-yellow-500 mb-4" />
                <h2 className="text-xl font-black text-gray-900">Akses Ditolak</h2>
                <p className="text-sm text-slate-500 mt-2">Halaman ini khusus untuk Super Admin.</p>
            </div>
        );
    }

    const filteredEmployees = employees.filter(emp => 
        (emp.nama && emp.nama.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (emp.department && emp.department.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="w-full flex flex-col gap-6">
            <div className="bg-white rounded-[1.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <div>
                        <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                            <Shield className="text-red-600" size={20} />
                            Hak Akses & Presensi
                        </h3>
                        <p className="text-xs text-slate-500 mt-1 font-medium">Atur peran sistem dan perizinan fitur absensi harian.</p>
                    </div>
                    <div className="w-72">
                        <input 
                            type="text" 
                            placeholder="Cari karyawan..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full bg-white border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-2 text-sm outline-none focus:border-red-500 transition-colors"
                        />
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-left text-xs uppercase tracking-wider text-slate-500 bg-slate-50 border-b border-slate-200">
                                <th className="p-4 font-black">Karyawan</th>
                                <th className="p-4 font-black">Jabatan / Divisi</th>
                                <th className="p-4 font-black">Role Sistem</th>
                                <th className="p-4 font-black text-center">Akses Kamera</th>
                                <th className="p-4 font-black text-center">Akses GPS</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-slate-400 font-bold">Memuat data...</td>
                                </tr>
                            ) : filteredEmployees.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-slate-400 font-bold">Karyawan tidak ditemukan.</td>
                                </tr>
                            ) : (
                                filteredEmployees.map((emp) => (
                                    <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-500">
                                                    {(emp.nama || 'U').charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-bold text-gray-900">{emp.nama}</h4>
                                                    <p className="text-[11px] font-bold text-slate-400">{emp.email_office || '-'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <p className="text-sm font-bold text-slate-700">{emp.jabatan || '-'}</p>
                                            <p className="text-[11px] font-bold text-slate-400">{emp.department || '-'}</p>
                                        </td>
                                        <td className="p-4">
                                            <select 
                                                value={emp.role || 'user'}
                                                onChange={(e) => handleUpdateAccess(emp.id, 'role', e.target.value)}
                                                className="bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-red-100 transition-all cursor-pointer"
                                            >
                                                <option value="user">User</option>
                                                <option value="admin">Admin (HRGA/HSE)</option>
                                                <option value="superadmin">Super Admin</option>
                                            </select>
                                        </td>
                                        <td className="p-4 text-center">
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    className="sr-only peer" 
                                                    checked={emp.attendance_access?.camera ?? true}
                                                    onChange={(e) => handleUpdateAccess(emp.id, 'camera', e.target.checked)}
                                                />
                                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                                                <Camera className="absolute left-1.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" size={12} />
                                            </label>
                                        </td>
                                        <td className="p-4 text-center">
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    className="sr-only peer" 
                                                    checked={emp.attendance_access?.gps ?? true}
                                                    onChange={(e) => handleUpdateAccess(emp.id, 'gps', e.target.checked)}
                                                />
                                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                                                <MapPin className="absolute left-1.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" size={12} />
                                            </label>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AccessRights;
