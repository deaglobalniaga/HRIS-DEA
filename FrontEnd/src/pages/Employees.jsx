import { useState, useEffect } from 'react';
import { Search, Filter, MoreVertical, Briefcase, UserPlus, X, AlertCircle, Upload, Edit, Trash2 } from 'lucide-react';
import Papa from 'papaparse';
import api from '../api/api';

const Employees = () => {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Modal State
    const [showAddModal, setShowAddModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState('');

    // Bulk Upload State
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [bulkData, setBulkData] = useState([]);
    const [, setCsvFile] = useState(null);

    const [empForm, setEmpForm] = useState({
        full_name: '', email: '', nik_internal: '', division: '', role: '', date_of_joining: '', nik_ktp: '', phone_number: '', contract_type: '', job_title: '', initial_work_days: 0
    });

    // Edit Modal State & Dropdown
    const [activeDropdown, setActiveDropdown] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedEmp, setSelectedEmp] = useState(null);
    const [editPhotoPreview, setEditPhotoPreview] = useState(null);
    const [editPhotoBase64, setEditPhotoBase64] = useState('');

    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        try {
            const res = await api.get('/hris/employees');
            setEmployees(res.data);
        } catch (err) {
            console.error("Failed to fetch employees", err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddEmployee = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setMessage('');
        try {
            await api.post('/hris/employees', {
                ...empForm,
                base_salary: parseFloat(empForm.base_salary)
            });
            setMessage('Karyawan berhasil ditambahkan!');
            setTimeout(() => {
                setShowAddModal(false);
                setEmpForm({ full_name: '', email: '', nik_internal: '', division: '', role: '', date_of_joining: '', nik_ktp: '', phone_number: '', contract_type: '', job_title: '' });
                setMessage('');
                fetchEmployees(); // refresh data
            }, 1500);
        } catch (err) {
            console.error(err);
            setMessage('Gagal menambahkan karyawan.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleEditEmployee = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setMessage('');
        try {
            const updatePayload = {
                full_name: selectedEmp.full_name,
                role: selectedEmp.role,
                division: selectedEmp.division,
                job_title: selectedEmp.job_title,
                contract_type: selectedEmp.contract_type,
                initial_work_days: selectedEmp.initial_work_days,
                email: selectedEmp.email,
                phone_number: selectedEmp.phone_number,
                nik_ktp: selectedEmp.nik_ktp,
                address: selectedEmp.address,
                emergency_contact: selectedEmp.emergency_contact,
                blood_type: selectedEmp.blood_type,
                npwp: selectedEmp.npwp,
                marital_status: selectedEmp.marital_status,
                bank_name: selectedEmp.bank_name,
                bank_account: selectedEmp.bank_account
            };
            
            if (editPhotoBase64) {
                updatePayload.profile_photo_url = editPhotoBase64;
            }

            await api.put(`/hris/employees/${selectedEmp.id}`, updatePayload);
            setMessage('Data karyawan berhasil diperbarui!');
            setTimeout(() => {
                setShowEditModal(false);
                setSelectedEmp(null);
                setMessage('');
                fetchEmployees(); // refresh data
            }, 1500);
        } catch (err) {
            console.error(err);
            setMessage('Gagal memperbarui karyawan.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleEditPhotoChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            alert('Ukuran foto melebihi batas 2MB.');
            return;
        }

        const previewUrl = URL.createObjectURL(file);
        setEditPhotoPreview(previewUrl);

        const reader = new FileReader();
        reader.onloadend = () => {
            setEditPhotoBase64(reader.result);
        };
        reader.readAsDataURL(file);
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        setCsvFile(file);
        if (file) {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    setBulkData(results.data);
                }
            });
        }
    };

    const handleBulkSubmit = async () => {
        if (!bulkData.length) return;
        setSubmitting(true);
        setMessage('');
        try {
            await api.post('/hris/employees/bulk', { employees: bulkData });
            setMessage(`${bulkData.length} Karyawan berhasil diimport!`);
            setTimeout(() => {
                setShowBulkModal(false);
                setBulkData([]);
                setCsvFile(null);
                setMessage('');
                fetchEmployees();
            }, 2000);
        } catch (err) {
            console.error(err);
            setMessage('Gagal mengimport data karyawan.');
        } finally {
            setSubmitting(false);
        }
    };

    const filteredEmployees = employees.filter(emp =>
        emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.division && emp.division.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
    const currentEmployees = filteredEmployees.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="w-full flex flex-col gap-6 relative">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowBulkModal(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 text-white font-bold rounded-xl shadow-md hover:bg-slate-900 transition">
                        <Upload size={18} /> Import CSV
                    </button>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white font-bold rounded-xl shadow-md hover:bg-red-700 transition">
                        <UserPlus size={18} /> Tambah Karyawan
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-[1.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-50">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Cari nama, role, divisi..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                        />
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl shadow-sm hover:bg-slate-50 transition w-full md:w-auto">
                        <Filter size={18} /> Filter
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-500">
                                <th className="p-4 font-black">Nama Karyawan</th>
                                <th className="p-4 font-black">NIK Internal</th>
                                <th className="p-4 font-black">Divisi</th>
                                <th className="p-4 font-black">Jabatan</th>
                                <th className="p-4 font-black">Role</th>
                                <th className="p-4 font-black">Tanggal Masuk Kerja</th>
                                <th className="p-4 font-black text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-slate-400 font-bold">Memuat daftar karyawan...</td>
                                </tr>
                            ) : filteredEmployees.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-slate-400 font-bold">Karyawan tidak ditemukan.</td>
                                </tr>
                            ) : (
                                currentEmployees.map((emp) => (
                                    <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                {emp.profile_photo_url ? (
                                                    <img src={emp.profile_photo_url} alt={emp.full_name} className="w-10 h-10 rounded-full object-cover shadow-sm border border-slate-200" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-500 shadow-sm border border-slate-200">
                                                        {emp.full_name.charAt(0)}
                                                    </div>
                                                )}
                                                <div>
                                                    <h4 className="text-sm font-bold text-gray-900">{emp.full_name}</h4>
                                                    <p className="text-[11px] font-bold text-slate-400">{emp.email || 'Belum ada email'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm font-bold text-slate-700">{emp.nik_internal || '-'}</td>
                                        <td className="p-4">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                                                <Briefcase size={12} />
                                                {emp.division || '-'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm font-bold text-slate-600">{emp.job_title || '-'}</td>
                                        <td className="p-4 text-sm font-bold text-slate-600">{emp.role}</td>
                                        <td className="p-4 text-sm font-bold text-slate-600">
                                            {emp.date_of_joining ? new Date(emp.date_of_joining).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                                        </td>
                                        <td className="p-4 text-center relative">
                                            <button onClick={() => setActiveDropdown(activeDropdown === emp.id ? null : emp.id)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors focus:outline-none">
                                                <MoreVertical size={18} />
                                            </button>
                                            {activeDropdown === emp.id && (
                                                <div className="absolute right-8 top-10 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-10 text-left">
                                                    <button onClick={() => { setActiveDropdown(null); setSelectedEmp(emp); setEditPhotoPreview(emp.profile_photo_url || null); setEditPhotoBase64(''); setShowEditModal(true); }} className="w-full px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                                                        <Edit size={14} className="text-blue-500" /> Edit Karyawan
                                                    </button>
                                                    <button onClick={() => { setActiveDropdown(null); alert('Hapus belum diimplementasikan'); }} className="w-full px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2">
                                                        <Trash2 size={14} /> Hapus Karyawan
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                
                {/* Pagination Controls */}
                {!loading && filteredEmployees.length > itemsPerPage && (
                    <div className="p-4 border-t border-slate-100 bg-white flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500">
                            Menampilkan {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredEmployees.length)} dari {filteredEmployees.length} Karyawan
                        </span>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1.5 border border-slate-200 text-xs font-bold text-slate-600 rounded hover:bg-slate-50 disabled:opacity-50"
                            >
                                Prev
                            </button>
                            <span className="px-3 py-1.5 text-xs font-bold text-slate-800">
                                {currentPage} / {totalPages}
                            </span>
                            <button 
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1.5 border border-slate-200 text-xs font-bold text-slate-600 rounded hover:bg-slate-50 disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>


            {/* Edit Employee Modal */}
            {showEditModal && selectedEmp && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                            <div>
                                <h2 className="text-xl font-black text-gray-900">Edit Data Karyawan</h2>
                                <p className="text-xs font-bold text-slate-400 mt-1">Ubah data profil dan divisi karyawan.</p>
                            </div>
                            <button onClick={() => { setShowEditModal(false); setSelectedEmp(null); }} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 text-slate-500 hover:bg-red-100 hover:text-red-900 transition">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            <form id="edit-emp-form" onSubmit={handleEditEmployee} className="space-y-4">
                                {message && (
                                    <div className={`p-4 text-sm font-bold rounded-xl flex items-center gap-3 ${message.includes('Gagal') ? 'bg-red-50 text-red-900 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'}`}>
                                        <AlertCircle size={18} /> {message}
                                    </div>
                                )}
                                
                                <div className="flex flex-col items-center mb-6">
                                    <label className="relative cursor-pointer group">
                                        <div className="w-24 h-24 rounded-full bg-slate-200 border-4 border-white shadow-md overflow-hidden flex items-center justify-center relative">
                                            {editPhotoPreview ? (
                                                <img src={editPhotoPreview} alt="Profile" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="text-slate-400 font-bold text-xs">No Photo</div>
                                            )}
                                            <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center transition-all">
                                                <Upload className="text-white" size={24} />
                                            </div>
                                        </div>
                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            className="hidden" 
                                            onChange={handleEditPhotoChange} 
                                        />
                                    </label>
                                    <span className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-wider">Ubah Foto Profil (Max 2MB)</span>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-2">Nama Lengkap</label>
                                        <input type="text" required value={selectedEmp.full_name || ''} onChange={e => setSelectedEmp({ ...selectedEmp, full_name: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:border-red-900 focus:ring-2 focus:ring-red-900/10 transition" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-2">Divisi</label>
                                        <select required value={selectedEmp.division || ''} onChange={e => setSelectedEmp({ ...selectedEmp, division: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:border-red-900 focus:ring-2 focus:ring-red-900/10 transition">
                                            <option value="" disabled>Pilih Divisi</option>
                                            <option value="Maintenance">Maintenance</option>
                                            <option value="Project">Project</option>
                                            <option value="Management">Management</option>
                                            <option value="IT">IT</option>
                                            <option value="HRGA">HRGA</option>
                                            <option value="HSE">HSE</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-2">Jabatan</label>
                                        <input type="text" value={selectedEmp.job_title || ''} onChange={e => setSelectedEmp({ ...selectedEmp, job_title: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:border-red-900 focus:ring-2 focus:ring-red-900/10 transition" placeholder="Contoh: Manager" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-2">Role</label>
                                        <select required value={selectedEmp.role || ''} onChange={e => setSelectedEmp({ ...selectedEmp, role: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:border-red-900 focus:ring-2 focus:ring-red-900/10 transition">
                                            <option value="user">User (Karyawan Biasa)</option>
                                            <option value="admin">Admin (HR/GA)</option>
                                            <option value="pjo">PJO (Manager)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-2">Email</label>
                                        <input type="email" value={selectedEmp.email || ''} onChange={e => setSelectedEmp({ ...selectedEmp, email: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:border-red-900 focus:ring-2 focus:ring-red-900/10 transition" placeholder="Email Karyawan" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-2">No HP / WhatsApp</label>
                                        <input type="text" value={selectedEmp.phone_number || ''} onChange={e => setSelectedEmp({ ...selectedEmp, phone_number: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:border-red-900 focus:ring-2 focus:ring-red-900/10 transition" placeholder="08..." />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-2">NIK KTP</label>
                                        <input type="text" value={selectedEmp.nik_ktp || ''} onChange={e => setSelectedEmp({ ...selectedEmp, nik_ktp: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:border-red-900 focus:ring-2 focus:ring-red-900/10 transition" placeholder="320..." />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-2">Siklus Cuti (Roster)</label>
                                        <select required value={selectedEmp.contract_type || ''} onChange={e => setSelectedEmp({ ...selectedEmp, contract_type: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:border-red-900 focus:ring-2 focus:ring-red-900/10 transition">
                                            <option value="8/2">8 Minggu Kerja / 2 Off</option>
                                            <option value="6/2">6 Minggu Kerja / 2 Off</option>
                                        </select>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-slate-600 mb-2">Penyesuaian Hari Off (Plus/Minus)</label>
                                        <input type="number" required value={selectedEmp.initial_work_days || 0} onChange={e => setSelectedEmp({ ...selectedEmp, initial_work_days: parseInt(e.target.value) || 0 })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:border-red-900 focus:ring-2 focus:ring-red-900/10 transition" />
                                        <p className="text-[10px] text-slate-400 font-bold mt-1 leading-relaxed">
                                            Positif (+): Tambah hari off. Negatif (-): Kurangi hari off.
                                        </p>
                                    </div>
                                </div>

                                {/* Additional Personal Data */}
                                <div className="space-y-4 pt-4 border-t border-slate-100 mt-4">
                                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Informasi Tambahan</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-bold text-slate-600 mb-2">Alamat Domisili</label>
                                            <textarea value={selectedEmp.address || ''} onChange={e => setSelectedEmp({ ...selectedEmp, address: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:border-red-900 focus:ring-2 focus:ring-red-900/10 transition" placeholder="Alamat lengkap..." rows={2}></textarea>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-2">Kontak Darurat</label>
                                            <input type="text" value={selectedEmp.emergency_contact || ''} onChange={e => setSelectedEmp({ ...selectedEmp, emergency_contact: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:border-red-900 focus:ring-2 focus:ring-red-900/10 transition" placeholder="Nama / Hubungan - 08..." />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-2">Golongan Darah</label>
                                            <select value={selectedEmp.blood_type || ''} onChange={e => setSelectedEmp({ ...selectedEmp, blood_type: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:border-red-900 focus:ring-2 focus:ring-red-900/10 transition">
                                                <option value="">Pilih</option>
                                                <option value="A">A</option>
                                                <option value="B">B</option>
                                                <option value="AB">AB</option>
                                                <option value="O">O</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-2">Status Pernikahan</label>
                                            <select value={selectedEmp.marital_status || ''} onChange={e => setSelectedEmp({ ...selectedEmp, marital_status: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:border-red-900 focus:ring-2 focus:ring-red-900/10 transition">
                                                <option value="">Pilih</option>
                                                <option value="Lajang">Lajang</option>
                                                <option value="Menikah">Menikah</option>
                                                <option value="Cerai">Cerai</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-2">NPWP</label>
                                            <input type="text" value={selectedEmp.npwp || ''} onChange={e => setSelectedEmp({ ...selectedEmp, npwp: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:border-red-900 focus:ring-2 focus:ring-red-900/10 transition" placeholder="Nomor NPWP" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-2">Nama Bank</label>
                                            <input type="text" value={selectedEmp.bank_name || ''} onChange={e => setSelectedEmp({ ...selectedEmp, bank_name: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:border-red-900 focus:ring-2 focus:ring-red-900/10 transition" placeholder="BCA / Mandiri / BNI" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-2">Nomor Rekening</label>
                                            <input type="text" value={selectedEmp.bank_account || ''} onChange={e => setSelectedEmp({ ...selectedEmp, bank_account: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:border-red-900 focus:ring-2 focus:ring-red-900/10 transition" placeholder="No Rekening" />
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                            <button type="button" onClick={() => { setShowEditModal(false); setSelectedEmp(null); }} className="px-6 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition">Batal</button>
                            <button type="submit" form="edit-emp-form" disabled={submitting} className="px-6 py-2 bg-red-900 text-white font-bold rounded-xl hover:bg-red-800 transition disabled:opacity-50">
                                {submitting ? 'Menyimpan...' : 'Simpan Penyesuaian'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Employee Modal (Professional HR Form) */}
            {showAddModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                            <div>
                                <h2 className="text-xl font-black text-gray-900">Pendaftaran Karyawan Baru</h2>
                                <p className="text-xs font-bold text-slate-400 mt-1">Formulir HRD untuk pendataan pegawai ke dalam sistem.</p>
                            </div>
                            <button onClick={() => setShowAddModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 text-slate-500 hover:bg-red-100 hover:text-red-900 transition">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="overflow-y-auto p-8">
                            <form id="add-emp-form" onSubmit={handleAddEmployee} className="space-y-6">
                                {message && (
                                    <div className={`p-4 text-sm font-bold rounded-xl flex items-center gap-3 ${message.includes('Gagal') ? 'bg-red-50 text-red-900 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'}`}>
                                        <AlertCircle size={18} /> {message}
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Informasi Pribadi</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-2">Nama Lengkap</label>
                                            <input type="text" required value={empForm.full_name} onChange={e => setEmpForm({ ...empForm, full_name: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:border-red-900 focus:ring-2 focus:ring-red-900/10 transition" placeholder="John Doe" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-2">Email Profesional</label>
                                            <input type="email" required value={empForm.email} onChange={e => setEmpForm({ ...empForm, email: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:border-red-900 focus:ring-2 focus:ring-red-900/10 transition" placeholder="john.doe@company.com" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-2">NIK KTP</label>
                                            <input type="text" required value={empForm.nik_ktp} onChange={e => setEmpForm({ ...empForm, nik_ktp: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:border-red-900 focus:ring-2 focus:ring-red-900/10 transition" placeholder="3201..." />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-2">No WhatsApp / Telepon</label>
                                            <input type="text" required value={empForm.phone_number} onChange={e => setEmpForm({ ...empForm, phone_number: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:border-red-900 focus:ring-2 focus:ring-red-900/10 transition" placeholder="081234..." />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Data Kepegawaian</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-2">NIK Internal</label>
                                            <input type="text" required value={empForm.nik_internal} onChange={e => setEmpForm({ ...empForm, nik_internal: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:border-red-900 focus:ring-2 focus:ring-red-900/10 transition" placeholder="EMP-2026-001" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-2">Tanggal Masuk Kerja</label>
                                            <input type="date" required value={empForm.date_of_joining} onChange={e => setEmpForm({ ...empForm, date_of_joining: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:border-red-900 focus:ring-2 focus:ring-red-900/10 transition" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-2">Divisi</label>
                                            <select required value={empForm.division} onChange={e => setEmpForm({ ...empForm, division: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:border-red-900 focus:ring-2 focus:ring-red-900/10 transition">
                                                <option value="" disabled>Pilih Divisi</option>
                                                <option value="Maintenance">Maintenance</option>
                                                <option value="Project">Project</option>
                                                <option value="HRGA">HRGA</option>
                                                <option value="HSE">HSE</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-2">Role (Hak Akses Sistem)</label>
                                            <select required value={empForm.role} onChange={e => setEmpForm({ ...empForm, role: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:border-red-900 focus:ring-2 focus:ring-red-900/10 transition">
                                                <option value="" disabled>Pilih Role</option>
                                                <option value="user">User (Karyawan Biasa)</option>
                                                <option value="admin">Admin (HR/GA)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-2">Siklus Roster (Cuti)</label>
                                            <select required value={empForm.contract_type} onChange={e => setEmpForm({ ...empForm, contract_type: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:border-red-900 focus:ring-2 focus:ring-red-900/10 transition">
                                                <option value="" disabled>Pilih Siklus</option>
                                                <option value="8/2">8 Minggu Kerja / 2 Off</option>
                                                <option value="6/2">6 Minggu Kerja / 2 Off</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-2">Jabatan</label>
                                            <select required value={empForm.job_title} onChange={e => setEmpForm({ ...empForm, job_title: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:border-red-900 focus:ring-2 focus:ring-red-900/10 transition">
                                                <option value="" disabled>Pilih Jabatan</option>
                                                <option value="Pengawas">Pengawas</option>
                                                <option value="Supervisor">Supervisor</option>
                                                <option value="HSE">HSE</option>
                                                <option value="PJO">PJO</option>
                                                <option value="HRGA">HRGA (Admin)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-2">Penyesuaian Siklus Off (Hari)</label>
                                            <input type="number" required value={empForm.initial_work_days} onChange={e => setEmpForm({ ...empForm, initial_work_days: parseInt(e.target.value)||0 })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:border-red-900 focus:ring-2 focus:ring-red-900/10 transition" placeholder="0" />
                                            <p className="text-[9px] text-slate-400 font-bold mt-1">Gunakan angka negatif untuk mengurangi hari (misal -2), atau positif untuk menambah hari.</p>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
                            <button type="button" onClick={() => setShowAddModal(false)} className="px-6 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition">Batal</button>
                            <button type="submit" form="add-emp-form" disabled={submitting} className="px-8 py-3 bg-red-900 text-white font-bold rounded-xl hover:bg-red-800 transition disabled:opacity-50 shadow-md">
                                {submitting ? 'Menyimpan...' : 'Simpan Karyawan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Upload Modal */}
            {showBulkModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                            <div>
                                <h2 className="text-xl font-black text-gray-900">Import Karyawan via CSV</h2>
                                <p className="text-xs font-bold text-slate-400 mt-1">Upload file CSV dengan header: full_name, email, nik_internal, division, role, dll. (Akun login otomatis terbuat).</p>
                            </div>
                            <button onClick={() => setShowBulkModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 text-slate-500 hover:bg-red-100 hover:text-red-900 transition">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="overflow-y-auto p-8">
                            <div className="space-y-6">
                                {message && (
                                    <div className={`p-4 text-sm font-bold rounded-xl flex items-center gap-3 ${message.includes('Gagal') ? 'bg-red-50 text-red-900 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'}`}>
                                        <AlertCircle size={18} /> {message}
                                    </div>
                                )}
                                <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 flex flex-col items-center justify-center text-center">
                                    <Upload size={48} className="text-slate-400 mb-4" />
                                    <h3 className="font-bold text-slate-700 mb-2">Pilih File CSV</h3>
                                    <input type="file" accept=".csv" onChange={handleFileUpload} className="block w-full max-w-xs text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100" />
                                </div>
                                {bulkData.length > 0 && (
                                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                        <h4 className="font-bold text-slate-700 mb-2">Preview Data ({bulkData.length} baris)</h4>
                                        <div className="max-h-40 overflow-y-auto text-xs">
                                            {bulkData.slice(0, 3).map((row, i) => (
                                                <div key={i} className="py-1 border-b border-slate-200">{row.full_name || 'Tanpa Nama'} - {row.nik_internal}</div>
                                            ))}
                                            {bulkData.length > 3 && <div className="py-1 text-slate-400 italic">...dan {bulkData.length - 3} lainnya</div>}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
                            <button type="button" onClick={() => setShowBulkModal(false)} className="px-6 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition">Batal</button>
                            <button onClick={handleBulkSubmit} disabled={submitting || bulkData.length === 0} className="px-8 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition disabled:opacity-50 shadow-md">
                                {submitting ? 'Memproses...' : 'Import Data'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Employees;
