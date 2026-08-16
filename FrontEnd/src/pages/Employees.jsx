import { useState, useEffect } from 'react';
import { Search, Filter, MoreVertical, Briefcase, UserPlus, X, AlertCircle, Upload, Edit, Trash2, ArrowRight, ArrowLeft } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';
import Certifications from './Certifications';
import CreatableSelect from 'react-select/creatable';
import PdfViewerModal from '../components/PdfViewerModal';

const customSelectStyles = {
    control: (base, state) => ({
        ...base,
        background: '#f8fafc',
        borderColor: state.isFocused ? '#3b82f6' : '#e2e8f0',
        borderRadius: '0.75rem',
        padding: '0.35rem 0.5rem',
        boxShadow: state.isFocused ? '0 0 0 1px #3b82f6' : 'none',
        '&:hover': { borderColor: state.isFocused ? '#3b82f6' : '#cbd5e1' },
        fontWeight: 'bold',
        color: '#111827',
        fontSize: '0.875rem'
    }),
    valueContainer: (base) => ({ ...base, padding: '0 0.5rem' }),
    input: (base) => ({ ...base, margin: '0', padding: '0' }),
    placeholder: (base) => ({ ...base, color: '#94a3b8', fontWeight: 'normal' }),
    singleValue: (base) => ({ ...base, color: '#111827' }),
    menu: (base) => ({
        ...base,
        borderRadius: '0.75rem',
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        overflow: 'hidden',
        zIndex: 50
    }),
    option: (base, state) => ({
        ...base,
        backgroundColor: state.isSelected ? '#eff6ff' : state.isFocused ? '#f8fafc' : 'white',
        color: state.isSelected ? '#1d4ed8' : '#334155',
        fontWeight: state.isSelected ? 'bold' : '500',
        cursor: 'pointer',
        fontSize: '0.875rem',
        padding: '0.5rem 1rem',
        '&:active': { backgroundColor: '#eff6ff' }
    })
};

const Employees = () => {
    const { addToast } = useToast();
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [activeTab, setActiveTab] = useState('all');
    const [selectedHSEEmployee, setSelectedHSEEmployee] = useState(null);
    const [uploadSertifikatTrigger, setUploadSertifikatTrigger] = useState(0);

    // Modal State
    const [showAddModal, setShowAddModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [showPdfModal, setShowPdfModal] = useState(false);
    const [selectedPdfUrl, setSelectedPdfUrl] = useState('');
    const [message, setMessage] = useState('');
    const [wizardStep, setWizardStep] = useState(1);

    // Bulk Delete State
    const [selectedIds, setSelectedIds] = useState([]);

    // Bulk Upload State
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [bulkData, setBulkData] = useState([]);
    const [csvFile, setCsvFile] = useState(null);



    // Comprehensive EmpForm based on MongoDB Schema
    const initialEmpForm = {
        nama: '', tempat_lahir: '', tanggal_lahir: '', alamat: '', agama: '', pendidikan: '', jurusan: '', status_perkawinan: '', no_handphone: '', kontak_darurat: '', hubungan: '',
        nomor_pkwt: '', perusahaan: '', penempatan: '', department: '', cost_center: '', jabatan: '', level: '', status_karyawan: '', nik: '', nomor_pegawai: '', email: '', email_office: '', join_date: '', efektif_resign: '',
        status_pajak: '', npwp: '', nomor_kpj: '', nomor_jkn: '', no_ktp: '', kartu_keluarga: '', kartu_npwp: '', ijazah_transkrip: '', nama_rekening: '', nomor_rekening: '',
        role: 'user', password: '', roster_type: '8/2',
        ktp_file: null, kk_file: null, npwp_file: null, ijazah_file: null
    };
    const [empForm, setEmpForm] = useState(initialEmpForm);

    // Edit Modal State & Dropdown
    const [activeDropdown, setActiveDropdown] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedEmp, setSelectedEmp] = useState(null);
    const [editWizardStep, setEditWizardStep] = useState(1);

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
        if (wizardStep < 3) {
            setWizardStep(wizardStep + 1);
            return;
        }

        setSubmitting(true);
        setMessage('');
        try {
            const formData = new FormData();
            Object.keys(empForm).forEach(key => {
                if (empForm[key] !== null && empForm[key] !== '') {
                    formData.append(key, empForm[key]);
                }
            });

            const res = await api.post('/hris/employees', formData);

            const credMsg = res.data.default_password
                ? `Karyawan berhasil ditambahkan!\n\nUsername: ${res.data.username}\nDefault Password: ${res.data.default_password}\n\nSalin dan berikan kredensial ini kepada karyawan.`
                : 'Karyawan berhasil ditambahkan!';

            addToast('Karyawan berhasil ditambahkan!', 'success');
            window.alert(credMsg);
            setShowAddModal(false);
            setEmpForm(initialEmpForm);
            setWizardStep(1);
            fetchEmployees();
        } catch (err) {
            console.error(err);
            const msg = err.response?.data?.error || err.response?.data?.message || 'Gagal menambahkan karyawan.';
            addToast('Error: ' + msg, 'error');
        } finally {
            setSubmitting(false);
        }
    };


    const handleEditEmployee = async (e) => {
        e.preventDefault();
        if (editWizardStep < 3) {
            setEditWizardStep(editWizardStep + 1);
            return;
        }

        setSubmitting(true);
        setMessage('');
        try {
            const formData = new FormData();
            const whitelist = [
                'nama', 'tempat_lahir', 'tanggal_lahir', 'alamat', 'agama', 'pendidikan', 'jurusan', 'status_perkawinan', 'no_handphone', 'kontak_darurat', 'hubungan',
                'nomor_pkwt', 'perusahaan', 'penempatan', 'department', 'cost_center', 'jabatan', 'level', 'status_karyawan', 'nik', 'nomor_pegawai', 'email', 'email_office', 'join_date', 'efektif_resign',
                'status_pajak', 'npwp', 'nomor_kpj', 'nomor_jkn', 'no_ktp', 'nama_rekening', 'nomor_rekening', 'nama_bank',
                'role', 'roster_type', 'attendance_camera_access', 'attendance_gps_access'
            ];

            whitelist.forEach(key => {
                if (selectedEmp[key] !== null && selectedEmp[key] !== undefined) {
                    formData.append(key, selectedEmp[key]);
                }
            });

            // Append files
            if (selectedEmp.ktp_file) formData.append('ktp_file', selectedEmp.ktp_file);
            if (selectedEmp.kk_file) formData.append('kk_file', selectedEmp.kk_file);
            if (selectedEmp.npwp_file) formData.append('npwp_file', selectedEmp.npwp_file);
            if (selectedEmp.ijazah_file) formData.append('ijazah_file', selectedEmp.ijazah_file);

            const empId = selectedEmp.id || selectedEmp._id;
            await api.put(`/hris/employees/${empId}`, formData);


            addToast('Data karyawan berhasil diperbarui!', 'success');
            setTimeout(() => {
                setShowEditModal(false);
                setSelectedEmp(null);
                setEditWizardStep(1);
                setMessage('');
                fetchEmployees();
            }, 500);
        } catch (err) {
            console.error(err);
            setMessage(err.response?.data?.error || 'Gagal memperbarui karyawan.');
            addToast('Gagal memperbarui karyawan.', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteEmployee = async (id) => {
        if (window.confirm('Apakah Anda yakin ingin menghapus karyawan ini? Data ini tidak dapat dikembalikan.')) {
            try {
                await api.delete(`/hris/employees/${id}`);
                addToast('Karyawan berhasil dihapus', 'success');
                fetchEmployees();
            } catch (err) {
                console.error("Gagal menghapus karyawan", err);
                addToast("Gagal menghapus karyawan. Pastikan Anda memiliki hak akses Admin.", 'error');
            }
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        if (window.confirm(`Apakah Anda yakin ingin menghapus ${selectedIds.length} karyawan terpilih? Data tidak dapat dikembalikan.`)) {
            try {
                await api.delete(`/hris/employees/bulk`, { data: { ids: selectedIds } });
                addToast(`${selectedIds.length} Karyawan berhasil dihapus`, 'success');
                setSelectedIds([]);
                fetchEmployees();
            } catch (err) {
                console.error("Gagal menghapus karyawan", err);
                addToast("Gagal menghapus karyawan. Pastikan Anda memiliki hak akses Admin.", 'error');
            }
        }
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(filteredEmployees.map(emp => emp.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectOne = (e, id) => {
        if (e.target.checked) {
            setSelectedIds(prev => [...prev, id]);
        } else {
            setSelectedIds(prev => prev.filter(item => item !== id));
        }
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        setCsvFile(file);
        if (file) {
            const ext = file.name.split('.').pop().toLowerCase();
            if (ext === 'xlsx' || ext === 'xls') {
                const reader = new FileReader();
                reader.onload = (evt) => {
                    const bstr = evt.target.result;
                    const wb = XLSX.read(bstr, { type: 'binary' });
                    const wsname = wb.SheetNames[0];
                    const ws = wb.Sheets[wsname];
                    const data = XLSX.utils.sheet_to_json(ws);
                    setBulkData(data);
                };
                reader.readAsBinaryString(file);
            } else {
                Papa.parse(file, {
                    header: true,
                    skipEmptyLines: true,
                    complete: function (results) {
                        setBulkData(results.data);
                    }
                });
            }
        }
    };

    const handleBulkSubmit = async () => {
        if (!bulkData.length) return;
        setSubmitting(true);
        setMessage('');
        try {
            await api.post('/hris/employees/bulk', { employees: bulkData });
            addToast(`${bulkData.length} Karyawan berhasil diimport!`, 'success');
            setTimeout(() => {
                setShowBulkModal(false);
                setBulkData([]);
                setCsvFile(null);
                setMessage('');
                fetchEmployees();
            }, 2000);
        } catch (err) {
            console.error(err);
            const msg = err.response?.data?.error || err.response?.data?.message || 'Gagal mengimport data karyawan.';
            addToast('Error: ' + msg, 'error');
            setMessage('Error: ' + msg);
        } finally {
            setSubmitting(false);
        }
    };

    const { user } = useAuth();

    const isHRAdmin = user?.role?.toLowerCase() === 'superadmin' ||
        (user?.role?.toLowerCase() === 'admin' && (user?.department?.toLowerCase().includes('hr') || user?.division?.toLowerCase().includes('hr')));

    const filteredEmployees = employees.filter(emp => {
        const term = searchTerm.toLowerCase();
        const matchesSearch =
            (emp.nama && emp.nama.toLowerCase().includes(term)) ||
            (emp.full_name && emp.full_name.toLowerCase().includes(term)) ||
            (emp.role && emp.role.toLowerCase().includes(term)) ||
            (emp.department && emp.department.toLowerCase().includes(term)) ||
            (emp.nomor_pegawai && emp.nomor_pegawai.toLowerCase().includes(term)) ||
            (emp.nik && emp.nik.toLowerCase().includes(term));

        return matchesSearch;
    });

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
    const currentEmployees = filteredEmployees.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="w-full flex flex-col gap-6 relative">
            <div className="flex flex-col md:flex-row md:items-center justify-end gap-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowBulkModal(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 text-white font-bold rounded-xl shadow-md hover:bg-slate-900 transition">
                        <Upload size={18} /> Import CSV
                    </button>
                    {isHRAdmin && (
                        <button
                            onClick={() => { setShowAddModal(true); setWizardStep(1); }}
                            className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white font-bold rounded-xl shadow-md hover:bg-red-700 transition">
                            <UserPlus size={18} /> Tambah Karyawan
                        </button>
                    )}
                </div>
            </div>


            <div className="flex items-center gap-4 border-b border-slate-200 mb-2">
                <button
                    onClick={() => setActiveTab('all')}
                    className={`py-3 px-4 font-bold text-sm border-b-2 transition-colors ${activeTab === 'all' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                    Semua Karyawan
                </button>
                {(user?.role === 'superadmin' || user?.role === 'admin') && (
                    <button
                        onClick={() => setActiveTab('sertifikasi')}
                        className={`py-3 px-4 font-bold text-sm border-b-2 transition-colors ${activeTab === 'sertifikasi' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                        Sertifikasi
                    </button>
                )}
            </div>

            <div className="bg-white rounded-[1.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-50">
                    <div className="flex items-center gap-3 w-full md:w-auto">
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
                        <button className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition text-slate-500 shadow-sm flex items-center gap-2" title="Filter Data">
                            <Filter size={18} /> <span className="hidden md:inline font-bold text-sm">Filter</span>
                        </button>
                    </div>
                    <div className="flex items-center gap-3">
                        {isHRAdmin && selectedIds.length > 0 && activeTab === 'all' && (
                            <button
                                onClick={handleBulkDelete}
                                className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 transition rounded-xl font-bold text-sm border border-red-200"
                            >
                                <Trash2 size={16} /> Hapus {selectedIds.length} Terpilih
                            </button>
                        )}
                        {(user?.role === 'superadmin' || user?.role === 'admin') && activeTab === 'sertifikasi' && (
                            <button
                                onClick={() => setUploadSertifikatTrigger(prev => prev + 1)}
                                className="px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-800 transition shadow-md whitespace-nowrap"
                            >
                                <Upload size={16} /> Upload Sertifikat
                            </button>
                        )}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    {activeTab === 'sertifikasi' ? (
                        <div className="p-4">
                            <Certifications preSelectedUser={selectedHSEEmployee} uploadTrigger={uploadSertifikatTrigger} />
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-left text-xs uppercase tracking-wider text-slate-500 bg-slate-50 border-b border-slate-200">
                                    {isHRAdmin && activeTab === 'all' && (
                                        <th className="p-4 font-black sticky left-0 bg-slate-50 z-20 w-[40px] min-w-[40px] max-w-[40px] outline outline-1 outline-slate-50 text-center">
                                            <input type="checkbox" onChange={handleSelectAll} checked={filteredEmployees.length > 0 && selectedIds.length === filteredEmployees.length} className="cursor-pointer" />
                                        </th>
                                    )}
                                    <th className={`p-4 font-black sticky bg-slate-50 z-20 w-[50px] min-w-[50px] max-w-[50px] outline outline-1 outline-slate-50 ${isHRAdmin && activeTab === 'all' ? 'left-[40px]' : 'left-0'}`}>No</th>
                                    <th className={`p-4 font-black sticky bg-slate-50 z-20 w-[150px] min-w-[150px] max-w-[150px] outline outline-1 outline-slate-50 ${isHRAdmin && activeTab === 'all' ? 'left-[90px]' : 'left-[50px]'}`}>No PKWT</th>
                                    <th className={`p-4 font-black sticky bg-slate-50 z-20 w-[250px] min-w-[250px] max-w-[250px] shadow-[10px_0_15px_-3px_rgba(0,0,0,0.05)] border-r border-slate-200 outline outline-1 outline-slate-50 ${isHRAdmin && activeTab === 'all' ? 'left-[240px]' : 'left-[200px]'}`}>Karyawan</th>
                                    <th className="p-4 font-black whitespace-nowrap">Perusahaan</th>
                                    <th className="p-4 font-black whitespace-nowrap">Penempatan</th>
                                    <th className="p-4 font-black whitespace-nowrap">Department</th>
                                    <th className="p-4 font-black whitespace-nowrap">Cost Center</th>
                                    <th className="p-4 font-black whitespace-nowrap">Jabatan</th>
                                    <th className="p-4 font-black whitespace-nowrap">Level</th>
                                    <th className="p-4 font-black whitespace-nowrap">Status Karyawan</th>
                                    <th className="p-4 font-black whitespace-nowrap">Nomor Pegawai</th>
                                    <th className="p-4 font-black whitespace-nowrap">NIK</th>
                                    <th className="p-4 font-black whitespace-nowrap">Tempat Lahir</th>
                                    <th className="p-4 font-black whitespace-nowrap">Tanggal Lahir</th>
                                    <th className="p-4 font-black whitespace-nowrap min-w-[250px]">Alamat</th>
                                    <th className="p-4 font-black whitespace-nowrap">Pendidikan</th>
                                    <th className="p-4 font-black whitespace-nowrap">Jurusan</th>
                                    <th className="p-4 font-black whitespace-nowrap">Status Perkawinan</th>
                                    <th className="p-4 font-black whitespace-nowrap">Agama</th>
                                    <th className="p-4 font-black whitespace-nowrap">No Handphone</th>
                                    <th className="p-4 font-black whitespace-nowrap">Status Pajak</th>
                                    <th className="p-4 font-black whitespace-nowrap">Kontak Darurat</th>
                                    <th className="p-4 font-black whitespace-nowrap">Hubungan</th>
                                    <th className="p-4 font-black whitespace-nowrap">Email Pribadi</th>
                                    <th className="p-4 font-black whitespace-nowrap">Email Office</th>
                                    <th className="p-4 font-black whitespace-nowrap">Join Date</th>
                                    <th className="p-4 font-black whitespace-nowrap">NPWP</th>
                                    <th className="p-4 font-black whitespace-nowrap">Nomor KPJ</th>
                                    <th className="p-4 font-black whitespace-nowrap">Nomor JKN</th>
                                    <th className="p-4 font-black whitespace-nowrap">KTP (PDF)</th>
                                    <th className="p-4 font-black whitespace-nowrap">Kartu Keluarga (PDF)</th>
                                    <th className="p-4 font-black whitespace-nowrap">Kartu NPWP (PDF)</th>
                                    <th className="p-4 font-black whitespace-nowrap">Ijazah & Transkrip (PDF)</th>
                                    <th className="p-4 font-black whitespace-nowrap">Nama Rekening</th>
                                    <th className="p-4 font-black whitespace-nowrap">Nomor Rekening</th>
                                    <th className="p-4 font-black whitespace-nowrap">Efektif Resign</th>
                                    <th className="p-4 font-black whitespace-nowrap">Role</th>
                                    <th className="p-4 font-black text-center sticky right-0 bg-slate-50 z-10 shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.1)] outline outline-1 outline-slate-50">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan="7" className="p-8 text-center text-slate-400 font-bold">Memuat daftar karyawan...</td>
                                    </tr>
                                ) : filteredEmployees.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="p-8 text-center text-slate-400 font-bold">Karyawan tidak ditemukan.</td>
                                    </tr>
                                ) : (
                                    currentEmployees.map((emp, index) => (
                                        <tr key={emp.id} onClick={() => activeTab === 'sertifikasi' ? setSelectedHSEEmployee(emp) : null} className={`group hover:bg-slate-50 transition-colors ${activeTab === 'sertifikasi' ? 'cursor-pointer' : ''}`}>
                                            {isHRAdmin && activeTab === 'all' && (
                                                <td className="p-4 text-center sticky left-0 z-10 bg-white group-hover:bg-slate-50 w-[40px] min-w-[40px] max-w-[40px] outline outline-1 outline-white group-hover:outline-slate-50">
                                                    <input type="checkbox" onChange={(e) => handleSelectOne(e, emp.id)} checked={selectedIds.includes(emp.id)} className="cursor-pointer" />
                                                </td>
                                            )}
                                            <td className={`p-4 text-sm font-bold text-slate-700 whitespace-nowrap sticky z-10 bg-white group-hover:bg-slate-50 w-[50px] min-w-[50px] max-w-[50px] outline outline-1 outline-white group-hover:outline-slate-50 ${isHRAdmin && activeTab === 'all' ? 'left-[40px]' : 'left-0'}`}>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                                            <td className={`p-4 text-sm font-bold text-slate-700 whitespace-nowrap sticky z-10 bg-white group-hover:bg-slate-50 w-[150px] min-w-[150px] max-w-[150px] outline outline-1 outline-white group-hover:outline-slate-50 ${isHRAdmin && activeTab === 'all' ? 'left-[90px]' : 'left-[50px]'}`}>{emp.nomor_pkwt || '-'}</td>
                                            <td className={`p-4 whitespace-nowrap sticky z-10 bg-white group-hover:bg-slate-50 w-[250px] min-w-[250px] max-w-[250px] shadow-[10px_0_15px_-3px_rgba(0,0,0,0.05)] border-r border-slate-100 outline outline-1 outline-white group-hover:outline-slate-50 ${isHRAdmin && activeTab === 'all' ? 'left-[240px]' : 'left-[200px]'}`}>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-500 shadow-sm border border-slate-200">
                                                        {(emp.nama || 'U').charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-bold text-gray-900">{emp.nama || emp.full_name}</h4>
                                                        <p className="text-[11px] font-bold text-slate-400">{emp.email_office || emp.email || 'Belum ada email'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 text-sm font-bold text-slate-600 whitespace-nowrap">{emp.perusahaan || '-'}</td>
                                            <td className="p-4 text-sm font-bold text-slate-600 whitespace-nowrap">{emp.penempatan || '-'}</td>
                                            <td className="p-4 whitespace-nowrap">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                                                    <Briefcase size={12} />
                                                    {emp.department || emp.division || '-'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-sm font-bold text-slate-600 whitespace-nowrap">{emp.cost_center || '-'}</td>
                                            <td className="p-4 text-sm font-bold text-slate-600 whitespace-nowrap">{emp.jabatan || emp.job_title || '-'}</td>
                                            <td className="p-4 text-sm font-bold text-slate-600 whitespace-nowrap">{emp.level || '-'}</td>
                                            <td className="p-4 text-sm font-bold text-slate-600 whitespace-nowrap">{emp.status_karyawan || '-'}</td>
                                            <td className="p-4 text-sm font-bold text-slate-600 whitespace-nowrap">{emp.nomor_pegawai || '-'}</td>
                                            <td className="p-4 text-sm font-bold text-slate-700 whitespace-nowrap">{emp.nik || emp.nik_internal || '-'}</td>
                                            <td className="p-4 text-sm font-bold text-slate-600 whitespace-nowrap">{emp.tempat_lahir || '-'}</td>
                                            <td className="p-4 text-sm font-bold text-slate-600 whitespace-nowrap">{emp.tanggal_lahir ? new Date(emp.tanggal_lahir).toLocaleDateString('id-ID') : '-'}</td>
                                            <td className="p-4 text-sm font-bold text-slate-600 min-w-[250px] break-words">{emp.alamat || '-'}</td>
                                            <td className="p-4 text-sm font-bold text-slate-600 whitespace-nowrap">{emp.pendidikan || '-'}</td>
                                            <td className="p-4 text-sm font-bold text-slate-600 whitespace-nowrap">{emp.jurusan || '-'}</td>
                                            <td className="p-4 text-sm font-bold text-slate-600 whitespace-nowrap">{emp.status_perkawinan || '-'}</td>
                                            <td className="p-4 text-sm font-bold text-slate-600 whitespace-nowrap">{emp.agama || '-'}</td>
                                            <td className="p-4 text-sm font-bold text-slate-600 whitespace-nowrap">{emp.no_handphone || '-'}</td>
                                            <td className="p-4 text-sm font-bold text-slate-600 whitespace-nowrap">{emp.status_pajak || '-'}</td>
                                            <td className="p-4 text-sm font-bold text-slate-600 whitespace-nowrap">{emp.kontak_darurat || '-'}</td>
                                            <td className="p-4 text-sm font-bold text-slate-600 whitespace-nowrap">{emp.hubungan || '-'}</td>
                                            <td className="p-4 text-sm font-bold text-slate-600 whitespace-nowrap">{emp.email || '-'}</td>
                                            <td className="p-4 text-sm font-bold text-slate-600 whitespace-nowrap">{emp.email_office || '-'}</td>
                                            <td className="p-4 text-sm font-bold text-slate-600 whitespace-nowrap">
                                                {emp.join_date ? new Date(emp.join_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                                            </td>
                                            <td className="p-4 text-sm font-bold text-slate-600 whitespace-nowrap">{emp.npwp || '-'}</td>
                                            <td className="p-4 text-sm font-bold text-slate-600 whitespace-nowrap">{emp.nomor_kpj || '-'}</td>
                                            <td className="p-4 text-sm font-bold text-slate-600 whitespace-nowrap">{emp.nomor_jkn || '-'}</td>

                                            {/* File Upload Links */}
                                            <td className="p-4 whitespace-nowrap">
                                                {emp.ktp_file_url ? <button onClick={(e) => { e.stopPropagation(); setSelectedPdfUrl(`${emp.ktp_file_url}`); setShowPdfModal(true); }} className="px-3 py-1 bg-red-50 text-red-700 font-bold text-xs rounded hover:bg-red-100 flex items-center gap-1 w-fit">📄 Lihat KTP</button> : <span className="text-slate-400 text-xs">-</span>}
                                            </td>
                                            <td className="p-4 whitespace-nowrap">
                                                {emp.kk_file_url ? <button onClick={(e) => { e.stopPropagation(); setSelectedPdfUrl(`${emp.kk_file_url}`); setShowPdfModal(true); }} className="px-3 py-1 bg-red-50 text-red-700 font-bold text-xs rounded hover:bg-red-100 flex items-center gap-1 w-fit">📄 Lihat KK</button> : <span className="text-slate-400 text-xs">-</span>}
                                            </td>
                                            <td className="p-4 whitespace-nowrap">
                                                {emp.npwp_file_url ? <button onClick={(e) => { e.stopPropagation(); setSelectedPdfUrl(`${emp.npwp_file_url}`); setShowPdfModal(true); }} className="px-3 py-1 bg-red-50 text-red-700 font-bold text-xs rounded hover:bg-red-100 flex items-center gap-1 w-fit">📄 Lihat NPWP</button> : <span className="text-slate-400 text-xs">-</span>}
                                            </td>
                                            <td className="p-4 whitespace-nowrap">
                                                {emp.ijazah_file_url ? <button onClick={(e) => { e.stopPropagation(); setSelectedPdfUrl(`${emp.ijazah_file_url}`); setShowPdfModal(true); }} className="px-3 py-1 bg-red-50 text-red-700 font-bold text-xs rounded hover:bg-red-100 flex items-center gap-1 w-fit">📄 Lihat Ijazah</button> : <span className="text-slate-400 text-xs">-</span>}
                                            </td>

                                            <td className="p-4 text-sm font-bold text-slate-600 whitespace-nowrap">{emp.nama_rekening || '-'}</td>
                                            <td className="p-4 text-sm font-bold text-slate-600 whitespace-nowrap">{emp.nomor_rekening || '-'}</td>
                                            <td className="p-4 text-sm font-bold text-slate-600 whitespace-nowrap">{emp.efektif_resign ? new Date(emp.efektif_resign).toLocaleDateString('id-ID') : '-'}</td>
                                            <td className="p-4 text-sm font-bold text-slate-600 capitalize whitespace-nowrap">{emp.role}</td>

                                            <td className="p-4 text-sm font-bold sticky right-0 z-10 bg-white group-hover:bg-slate-50 shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.05)] border-l border-slate-100 outline outline-1 outline-white group-hover:outline-slate-50">
                                                {isHRAdmin && (
                                                    <>
                                                        <button onClick={() => setActiveDropdown(activeDropdown === emp.id ? null : emp.id)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors focus:outline-none">
                                                            <MoreVertical size={18} />
                                                        </button>
                                                        {activeDropdown === emp.id && (
                                                            <div className="absolute right-12 top-10 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-20 text-left">
                                                                <button onClick={() => { setActiveDropdown(null); setSelectedEmp(emp); setShowEditModal(true); }} className="w-full px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                                                                    <Edit size={14} className="text-blue-500" /> Edit Karyawan
                                                                </button>
                                                                <button onClick={() => { setActiveDropdown(null); handleDeleteEmployee(emp.id); }} className="w-full px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2">
                                                                    <Trash2 size={14} /> Hapus Karyawan
                                                                </button>
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
                {/* Pagination Controls */}
                {!loading && filteredEmployees.length > 0 && (
                    <div className="p-4 border-t border-slate-100 bg-white flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <span className="text-xs font-bold text-slate-500">
                                Menampilkan {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredEmployees.length)} dari {filteredEmployees.length} Karyawan
                            </span>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-500">Tampilkan:</span>
                                <select
                                    value={itemsPerPage}
                                    onChange={(e) => {
                                        setItemsPerPage(Number(e.target.value));
                                        setCurrentPage(1);
                                    }}
                                    className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 rounded p-1 outline-none"
                                >
                                    <option value={10}>10</option>
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                </select>
                            </div>
                        </div>
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

            {/* Edit Employee WIZARD Modal */}
            {showEditModal && selectedEmp && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] w-full max-w-4xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                            <div>
                                <h2 className="text-xl font-black text-gray-900">Edit Data Karyawan</h2>
                                <p className="text-xs font-bold text-slate-400 mt-1">Perbarui informasi untuk {selectedEmp.nama}</p>
                            </div>
                            <button onClick={() => { setShowEditModal(false); setSelectedEmp(null); }} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 text-slate-500 hover:bg-red-100 hover:text-red-900 transition">
                                <X size={18} />
                            </button>
                        </div>

                        {/* Modern Stepper */}
                        <div className="w-full bg-white px-8 pt-6 pb-2 shrink-0">
                            <div className="flex items-center justify-between relative">
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-100 rounded-full z-0"></div>
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-red-600 rounded-full z-0 transition-all duration-300" style={{ width: `${(editWizardStep - 1) * 50}%` }}></div>

                                {[1, 2, 3].map(step => (
                                    <div key={step} className={`relative z-10 flex flex-col items-center justify-center w-8 h-8 rounded-full font-bold text-xs border-2 transition-all duration-300 ${editWizardStep >= step ? 'bg-red-600 border-red-600 text-white shadow-md shadow-red-200' : 'bg-white border-slate-200 text-slate-400'}`}>
                                        {step}
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-between mt-2 px-1">
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${editWizardStep >= 1 ? 'text-red-700' : 'text-slate-400'}`}>Pribadi</span>
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${editWizardStep >= 2 ? 'text-red-700' : 'text-slate-400'}`}>Kepegawaian</span>
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${editWizardStep >= 3 ? 'text-red-700' : 'text-slate-400'}`}>Dokumen</span>
                            </div>
                        </div>

                        <div className="overflow-y-auto p-8 bg-white flex-1">
                            <form id="edit-emp-form" onSubmit={handleEditEmployee} className="space-y-6">
                                {message && (
                                    <div className={`p-4 text-sm font-bold rounded-xl flex items-center gap-3 ${message.includes('Gagal') ? 'bg-red-50 text-red-900 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'}`}>
                                        <AlertCircle size={18} /> {message}
                                    </div>
                                )}

                                {/* STEP 1: Data Pribadi */}
                                {editWizardStep === 1 && (
                                    <div className="space-y-4 animate-in slide-in-from-right-4">
                                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Step 1: Data Pribadi</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-2">Nama Lengkap *</label>
                                                <input type="text" required value={selectedEmp.nama} onChange={e => setSelectedEmp({ ...selectedEmp, nama: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-2">Tempat Lahir</label>
                                                <input type="text" value={selectedEmp.tempat_lahir} onChange={e => setSelectedEmp({ ...selectedEmp, tempat_lahir: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-2">Tanggal Lahir</label>
                                                <input type="date" value={selectedEmp.tanggal_lahir} onChange={e => setSelectedEmp({ ...selectedEmp, tanggal_lahir: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-2">No Handphone</label>
                                                <input type="text" value={selectedEmp.no_handphone} onChange={e => setSelectedEmp({ ...selectedEmp, no_handphone: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none" />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="block text-xs font-bold text-slate-600 mb-2">Alamat</label>
                                                <textarea rows="2" value={selectedEmp.alamat} onChange={e => setSelectedEmp({ ...selectedEmp, alamat: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none"></textarea>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-2">Agama</label>
                                                <CreatableSelect
                                                    styles={customSelectStyles}
                                                    value={selectedEmp.agama ? { value: selectedEmp.agama, label: selectedEmp.agama } : null}
                                                    onChange={(newValue) => setSelectedEmp({ ...selectedEmp, agama: newValue ? newValue.value : '' })}
                                                    options={['Islam', 'Kristen Protestan', 'Katolik', 'Hindu', 'Buddha', 'Konghucu'].map(x => ({ value: x, label: x }))}
                                                    placeholder="Pilih atau ketik agama..."
                                                    isClearable
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-2">Status Perkawinan</label>
                                                <CreatableSelect
                                                    styles={customSelectStyles}
                                                    value={selectedEmp.status_perkawinan ? { value: selectedEmp.status_perkawinan, label: selectedEmp.status_perkawinan } : null}
                                                    onChange={(newValue) => setSelectedEmp({ ...selectedEmp, status_perkawinan: newValue ? newValue.value : '' })}
                                                    options={['Belum Menikah', 'Menikah', 'Cerai'].map(x => ({ value: x, label: x }))}
                                                    placeholder="Pilih atau ketik status..."
                                                    isClearable
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-2">Pendidikan Terakhir</label>
                                                <CreatableSelect
                                                    styles={customSelectStyles}
                                                    value={selectedEmp.pendidikan ? { value: selectedEmp.pendidikan, label: selectedEmp.pendidikan } : null}
                                                    onChange={(newValue) => setSelectedEmp({ ...selectedEmp, pendidikan: newValue ? newValue.value : '' })}
                                                    options={['SMA', 'SMK', 'D3', 'S1', 'S2'].map(x => ({ value: x, label: x }))}
                                                    placeholder="Pilih atau ketik pendidikan..."
                                                    isClearable
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-2">Jurusan</label>
                                                <input type="text" value={selectedEmp.jurusan} onChange={e => setSelectedEmp({ ...selectedEmp, jurusan: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-2">Kontak Darurat (Nama)</label>
                                                <input type="text" value={selectedEmp.kontak_darurat} onChange={e => setSelectedEmp({ ...selectedEmp, kontak_darurat: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-2">Hubungan (Misal: Istri)</label>
                                                <input type="text" value={selectedEmp.hubungan} onChange={e => setSelectedEmp({ ...selectedEmp, hubungan: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none" />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* STEP 2: Data Kepegawaian */}
                                {editWizardStep === 2 && (
                                    <div className="space-y-4 animate-in slide-in-from-right-4">
                                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Step 2: Data Kepegawaian</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-2">Perusahaan</label>
                                                <CreatableSelect
                                                    styles={customSelectStyles}
                                                    value={selectedEmp.perusahaan ? { value: selectedEmp.perusahaan, label: selectedEmp.perusahaan } : null}
                                                    onChange={(newValue) => setSelectedEmp({ ...selectedEmp, perusahaan: newValue ? newValue.value : '' })}
                                                    options={['PT DEA GLOBAL NIAGA'].map(x => ({ value: x, label: x }))}
                                                    placeholder="Pilih atau ketik perusahaan..."
                                                    isClearable
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-2">Penempatan</label>
                                                <input type="text" value={selectedEmp.penempatan} onChange={e => setSelectedEmp({ ...selectedEmp, penempatan: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-2">Department</label>
                                                <input type="text" value={selectedEmp.department} onChange={e => setSelectedEmp({ ...selectedEmp, department: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-2">Cost Center</label>
                                                <input type="text" value={selectedEmp.cost_center} onChange={e => setSelectedEmp({ ...selectedEmp, cost_center: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-2">Jabatan</label>
                                                <CreatableSelect
                                                    styles={customSelectStyles}
                                                    value={selectedEmp.jabatan ? { value: selectedEmp.jabatan, label: selectedEmp.jabatan } : null}
                                                    onChange={(newValue) => setSelectedEmp({ ...selectedEmp, jabatan: newValue ? newValue.value : '' })}
                                                    options={['HRGA OFFICER', 'Operator', 'Mechanic', 'IT Support', 'Admin', 'Engineer', 'Manager'].map(x => ({ value: x, label: x }))}
                                                    placeholder="Pilih atau ketik jabatan..."
                                                    isClearable
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-2">Level</label>
                                                <CreatableSelect
                                                    styles={customSelectStyles}
                                                    value={selectedEmp.level ? { value: selectedEmp.level, label: selectedEmp.level } : null}
                                                    onChange={(newValue) => setSelectedEmp({ ...selectedEmp, level: newValue ? newValue.value : '' })}
                                                    options={['OFFICER', 'Staff', 'Supervisor', 'Manager', 'Director'].map(x => ({ value: x, label: x }))}
                                                    placeholder="Pilih atau ketik level..."
                                                    isClearable
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-2">Status Karyawan</label>
                                                <CreatableSelect
                                                    styles={customSelectStyles}
                                                    value={selectedEmp.status_karyawan ? { value: selectedEmp.status_karyawan, label: selectedEmp.status_karyawan } : null}
                                                    onChange={(newValue) => setSelectedEmp({ ...selectedEmp, status_karyawan: newValue ? newValue.value : '' })}
                                                    options={['Aktif', 'PKWT', 'Magang', 'Probation', 'Harian'].map(x => ({ value: x, label: x }))}
                                                    placeholder="Pilih atau ketik status..."
                                                    isClearable
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-2">Nomor PKWT</label>
                                                <input type="text" value={selectedEmp.nomor_pkwt} onChange={e => setSelectedEmp({ ...selectedEmp, nomor_pkwt: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-2">NIK</label>
                                                <input type="text" value={selectedEmp.nik} onChange={e => setSelectedEmp({ ...selectedEmp, nik: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-2">Nomor Pegawai</label>
                                                <input type="text" value={selectedEmp.nomor_pegawai} onChange={e => setSelectedEmp({ ...selectedEmp, nomor_pegawai: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-2">Join Date</label>
                                                <input type="date" value={selectedEmp.join_date} onChange={e => setSelectedEmp({ ...selectedEmp, join_date: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-2">Efektif Resign</label>
                                                <input type="date" value={selectedEmp.efektif_resign} onChange={e => setSelectedEmp({ ...selectedEmp, efektif_resign: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-2">Email Pribadi</label>
                                                <input type="email" value={selectedEmp.email} onChange={e => setSelectedEmp({ ...selectedEmp, email: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-2">Email Office</label>
                                                <input type="email" value={selectedEmp.email_office} onChange={e => setSelectedEmp({ ...selectedEmp, email_office: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-2">Role Sistem</label>
                                                <select value={selectedEmp.role || 'user'} onChange={e => setSelectedEmp({ ...selectedEmp, role: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none">
                                                    <option value="user">User (Karyawan Biasa)</option>
                                                    <option value="admin">Admin (HRGA / HSE / Manager)</option>

                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-2">Tipe Roster Pertambangan</label>
                                                <select
                                                    value={selectedEmp.roster_type}
                                                    onChange={e => setSelectedEmp({ ...selectedEmp, roster_type: e.target.value })}
                                                    className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none"
                                                >
                                                    <option value="8/2">8 Minggu Kerja / 2 Minggu Cuti (8/2)</option>
                                                    <option value="6/2">6 Minggu Kerja / 2 Minggu Cuti (6/2)</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* STEP 3: Dokumen & Bank */}
                                {editWizardStep === 3 && (
                                    <div className="space-y-4 animate-in slide-in-from-right-4">
                                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Step 3: Dokumen & Bank</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {[
                                                { id: 'ktp_file', label: 'Upload KTP (PDF)' },
                                                { id: 'kk_file', label: 'Upload Kartu Keluarga (PDF)' },
                                            ].map((field) => (
                                                <div key={field.id}>
                                                    <label className="block text-xs font-bold text-slate-600 mb-2">{field.label}</label>
                                                    <div className="relative w-full">
                                                        <input
                                                            type="file"
                                                            accept=".pdf"
                                                            onChange={e => setSelectedEmp({ ...selectedEmp, [field.id]: e.target.files[0] })}
                                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                        />
                                                        <div className={`w-full border-2 border-dashed rounded-xl px-4 py-3 text-sm flex items-center justify-between transition-colors ${selectedEmp[field.id] ? 'border-red-500 bg-red-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'}`}>
                                                            <span className={`font-bold truncate pr-4 ${selectedEmp[field.id] ? 'text-red-700' : 'text-slate-400'}`}>
                                                                {selectedEmp[field.id] ? selectedEmp[field.id].name : 'Pilih atau drop file...'}
                                                            </span>
                                                            <Upload size={16} className={selectedEmp[field.id] ? 'text-red-500' : 'text-slate-400'} />
                                                        </div>
                                                        {selectedEmp[field.id] && (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => { e.preventDefault(); setSelectedEmp({ ...selectedEmp, [field.id]: null }); }}
                                                                className="absolute -right-2 -top-2 bg-red-100 text-red-600 rounded-full p-1 shadow-sm hover:bg-red-200 z-20"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        )}
                                                        {field.id === 'ktp_file' && selectedEmp.ktp_file_url && <button type="button" onClick={() => { setSelectedPdfUrl(`${selectedEmp.ktp_file_url}`); setShowPdfModal(true); }} className="text-[10px] text-blue-600 hover:underline mt-1 block w-fit">Lihat KTP Saat Ini</button>}
                                                        {field.id === 'kk_file' && selectedEmp.kk_file_url && <button type="button" onClick={() => { setSelectedPdfUrl(`${selectedEmp.kk_file_url}`); setShowPdfModal(true); }} className="text-[10px] text-blue-600 hover:underline mt-1 block w-fit">Lihat KK Saat Ini</button>}
                                                        {field.id === 'npwp_file' && selectedEmp.npwp_file_url && <button type="button" onClick={() => { setSelectedPdfUrl(`${selectedEmp.npwp_file_url}`); setShowPdfModal(true); }} className="text-[10px] text-blue-600 hover:underline mt-1 block w-fit">Lihat NPWP Saat Ini</button>}
                                                        {field.id === 'ijazah_file' && selectedEmp.ijazah_file_url && <button type="button" onClick={() => { setSelectedPdfUrl(`${selectedEmp.ijazah_file_url}`); setShowPdfModal(true); }} className="text-[10px] text-blue-600 hover:underline mt-1 block w-fit">Lihat Ijazah Saat Ini</button>}
                                                    </div>
                                                </div>
                                            ))}
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-2">Status Pajak</label>
                                                <input type="text" value={selectedEmp.status_pajak} onChange={e => setSelectedEmp({ ...selectedEmp, status_pajak: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-2">Nomor KTP</label>
                                                <input type="text" value={selectedEmp.no_ktp} onChange={e => setSelectedEmp({ ...selectedEmp, no_ktp: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-2">Nomor NPWP</label>
                                                <input type="text" value={selectedEmp.npwp} onChange={e => setSelectedEmp({ ...selectedEmp, npwp: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none" />
                                            </div>
                                            {[
                                                { id: 'npwp_file', label: 'Upload Kartu NPWP (PDF)' },
                                            ].map((field) => (
                                                <div key={field.id}>
                                                    <label className="block text-xs font-bold text-slate-600 mb-2">{field.label}</label>
                                                    <div className="relative w-full">
                                                        <input
                                                            type="file"
                                                            accept=".pdf"
                                                            onChange={e => setSelectedEmp({ ...selectedEmp, [field.id]: e.target.files[0] })}
                                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                        />
                                                        <div className={`w-full border-2 border-dashed rounded-xl px-4 py-3 text-sm flex items-center justify-between transition-colors ${selectedEmp[field.id] ? 'border-red-500 bg-red-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'}`}>
                                                            <span className={`font-bold truncate pr-4 ${selectedEmp[field.id] ? 'text-red-700' : 'text-slate-400'}`}>
                                                                {selectedEmp[field.id] ? selectedEmp[field.id].name : 'Pilih atau drop file...'}
                                                            </span>
                                                            <Upload size={16} className={selectedEmp[field.id] ? 'text-red-500' : 'text-slate-400'} />
                                                        </div>
                                                        {selectedEmp[field.id] && (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => { e.preventDefault(); setSelectedEmp({ ...selectedEmp, [field.id]: null }); }}
                                                                className="absolute -right-2 -top-2 bg-red-100 text-red-600 rounded-full p-1 shadow-sm hover:bg-red-200 z-20"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        )}
                                                        {field.id === 'ktp_file' && selectedEmp.ktp_file_url && <button type="button" onClick={() => { setSelectedPdfUrl(`${selectedEmp.ktp_file_url}`); setShowPdfModal(true); }} className="text-[10px] text-blue-600 hover:underline mt-1 block w-fit">Lihat KTP Saat Ini</button>}
                                                        {field.id === 'kk_file' && selectedEmp.kk_file_url && <button type="button" onClick={() => { setSelectedPdfUrl(`${selectedEmp.kk_file_url}`); setShowPdfModal(true); }} className="text-[10px] text-blue-600 hover:underline mt-1 block w-fit">Lihat KK Saat Ini</button>}
                                                        {field.id === 'npwp_file' && selectedEmp.npwp_file_url && <button type="button" onClick={() => { setSelectedPdfUrl(`${selectedEmp.npwp_file_url}`); setShowPdfModal(true); }} className="text-[10px] text-blue-600 hover:underline mt-1 block w-fit">Lihat NPWP Saat Ini</button>}
                                                        {field.id === 'ijazah_file' && selectedEmp.ijazah_file_url && <button type="button" onClick={() => { setSelectedPdfUrl(`${selectedEmp.ijazah_file_url}`); setShowPdfModal(true); }} className="text-[10px] text-blue-600 hover:underline mt-1 block w-fit">Lihat Ijazah Saat Ini</button>}
                                                    </div>
                                                </div>
                                            ))}
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-2">Nomor KPJ (BPJS TK)</label>
                                                <input type="text" value={selectedEmp.nomor_kpj} onChange={e => setSelectedEmp({ ...selectedEmp, nomor_kpj: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-2">Nomor JKN (BPJS Kes)</label>
                                                <input type="text" value={selectedEmp.nomor_jkn} onChange={e => setSelectedEmp({ ...selectedEmp, nomor_jkn: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none" />
                                            </div>
                                            {[
                                                { id: 'ijazah_file', label: 'Upload Ijazah & Transkrip (PDF)' },
                                            ].map((field) => (
                                                <div key={field.id}>
                                                    <label className="block text-xs font-bold text-slate-600 mb-2">{field.label}</label>
                                                    <div className="relative w-full">
                                                        <input
                                                            type="file"
                                                            accept=".pdf"
                                                            onChange={e => setSelectedEmp({ ...selectedEmp, [field.id]: e.target.files[0] })}
                                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                        />
                                                        <div className={`w-full border-2 border-dashed rounded-xl px-4 py-3 text-sm flex items-center justify-between transition-colors ${selectedEmp[field.id] ? 'border-red-500 bg-red-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'}`}>
                                                            <span className={`font-bold truncate pr-4 ${selectedEmp[field.id] ? 'text-red-700' : 'text-slate-400'}`}>
                                                                {selectedEmp[field.id] ? selectedEmp[field.id].name : 'Pilih atau drop file...'}
                                                            </span>
                                                            <Upload size={16} className={selectedEmp[field.id] ? 'text-red-500' : 'text-slate-400'} />
                                                        </div>
                                                        {selectedEmp[field.id] && (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => { e.preventDefault(); setSelectedEmp({ ...selectedEmp, [field.id]: null }); }}
                                                                className="absolute -right-2 -top-2 bg-red-100 text-red-600 rounded-full p-1 shadow-sm hover:bg-red-200 z-20"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        )}
                                                        {field.id === 'ktp_file' && selectedEmp.ktp_file_url && <button type="button" onClick={() => { setSelectedPdfUrl(`${selectedEmp.ktp_file_url}`); setShowPdfModal(true); }} className="text-[10px] text-blue-600 hover:underline mt-1 block w-fit">Lihat KTP Saat Ini</button>}
                                                        {field.id === 'kk_file' && selectedEmp.kk_file_url && <button type="button" onClick={() => { setSelectedPdfUrl(`${selectedEmp.kk_file_url}`); setShowPdfModal(true); }} className="text-[10px] text-blue-600 hover:underline mt-1 block w-fit">Lihat KK Saat Ini</button>}
                                                        {field.id === 'npwp_file' && selectedEmp.npwp_file_url && <button type="button" onClick={() => { setSelectedPdfUrl(`${selectedEmp.npwp_file_url}`); setShowPdfModal(true); }} className="text-[10px] text-blue-600 hover:underline mt-1 block w-fit">Lihat NPWP Saat Ini</button>}
                                                        {field.id === 'ijazah_file' && selectedEmp.ijazah_file_url && <button type="button" onClick={() => { setSelectedPdfUrl(`${selectedEmp.ijazah_file_url}`); setShowPdfModal(true); }} className="text-[10px] text-blue-600 hover:underline mt-1 block w-fit">Lihat Ijazah Saat Ini</button>}
                                                    </div>
                                                </div>
                                            ))}
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-2">Nama Rekening Bank</label>
                                                <input type="text" value={selectedEmp.nama_rekening} onChange={e => setSelectedEmp({ ...selectedEmp, nama_rekening: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-2">Nomor Rekening Bank</label>
                                                <input type="text" value={selectedEmp.nomor_rekening} onChange={e => setSelectedEmp({ ...selectedEmp, nomor_rekening: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none" />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </form>
                        </div>

                        {/* WIZARD FOOTER ACTIONS */}
                        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between gap-3 shrink-0">
                            {editWizardStep > 1 ? (
                                <button type="button" onClick={() => setEditWizardStep(editWizardStep - 1)} className="px-6 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition flex items-center gap-2">
                                    <ArrowLeft size={16} /> Kembali
                                </button>
                            ) : (
                                <div></div>
                            )}

                            <div className="flex gap-2">
                                <button type="button" onClick={() => { setShowEditModal(false); setSelectedEmp(null); }} className="px-6 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition">Batal</button>
                                <button type="submit" form="edit-emp-form" disabled={submitting} className="px-6 py-2 bg-red-900 text-white font-bold rounded-xl hover:bg-red-800 transition disabled:opacity-50 flex items-center gap-2">
                                    {editWizardStep < 3 ? (
                                        <>Lanjut <ArrowRight size={16} /></>
                                    ) : (
                                        submitting ? 'Menyimpan...' : 'Simpan Perubahan'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}


            {/* Add Employee WIZARD Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] w-full max-w-4xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                            <div>
                                <h2 className="text-xl font-black text-gray-900">Formulir Pendaftaran Karyawan Baru</h2>
                                <p className="text-xs font-bold text-slate-400 mt-1">Langkah {wizardStep} dari 3</p>
                            </div>
                            <button onClick={() => setShowAddModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 text-slate-500 hover:bg-red-100 hover:text-red-900 transition">
                                <X size={18} />
                            </button>
                        </div>

                        {/* Modern Stepper */}
                        <div className="w-full bg-white px-8 pt-6 pb-2 shrink-0">
                            <div className="flex items-center justify-between relative">
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-100 rounded-full z-0"></div>
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-red-600 rounded-full z-0 transition-all duration-300" style={{ width: `${(wizardStep - 1) * 50}%` }}></div>

                                {[1, 2, 3].map(step => (
                                    <div key={step} className={`relative z-10 flex flex-col items-center justify-center w-8 h-8 rounded-full font-bold text-xs border-2 transition-all duration-300 ${wizardStep >= step ? 'bg-red-600 border-red-600 text-white shadow-md shadow-red-200' : 'bg-white border-slate-200 text-slate-400'}`}>
                                        {step}
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-between mt-2 px-1">
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${wizardStep >= 1 ? 'text-red-700' : 'text-slate-400'}`}>Pribadi</span>
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${wizardStep >= 2 ? 'text-red-700' : 'text-slate-400'}`}>Kepegawaian</span>
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${wizardStep >= 3 ? 'text-red-700' : 'text-slate-400'}`}>Dokumen</span>
                            </div>
                        </div>

                        <div className="overflow-y-auto p-8 bg-white flex-1">
                            <form id="add-emp-form" onSubmit={handleAddEmployee} className="space-y-6">
                                {message && (
                                    <div className={`p-4 text-sm font-bold rounded-xl flex items-center gap-3 ${message.includes('Gagal') ? 'bg-red-50 text-red-900 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'}`}>
                                        <AlertCircle size={18} /> {message}
                                    </div>
                                )}

                                {/* STEP 1: Data Pribadi */}
                                {wizardStep === 1 && (
                                    <div className="space-y-4 animate-in slide-in-from-right-4">
                                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Step 1: Data Pribadi</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-2">Nama Lengkap *</label>
                                                <input type="text" required value={empForm.nama} onChange={e => setEmpForm({ ...empForm, nama: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-2">Tempat Lahir</label>
                                                <input type="text" value={empForm.tempat_lahir} onChange={e => setEmpForm({ ...empForm, tempat_lahir: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-2">Tanggal Lahir</label>
                                                <input type="date" value={empForm.tanggal_lahir} onChange={e => setEmpForm({ ...empForm, tanggal_lahir: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-2">No Handphone</label>
                                                <input type="text" value={empForm.no_handphone} onChange={e => setEmpForm({ ...empForm, no_handphone: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none" />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="block text-xs font-bold text-slate-600 mb-2">Alamat</label>
                                                <textarea rows="2" value={empForm.alamat} onChange={e => setEmpForm({ ...empForm, alamat: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none"></textarea>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-2">Agama</label>
                                                <CreatableSelect
                                                    styles={customSelectStyles}
                                                    value={empForm.agama ? { value: empForm.agama, label: empForm.agama } : null}
                                                    onChange={(newValue) => setEmpForm({ ...empForm, agama: newValue ? newValue.value : '' })}
                                                    options={['Islam', 'Kristen Protestan', 'Katolik', 'Hindu', 'Buddha', 'Konghucu'].map(x => ({ value: x, label: x }))}
                                                    placeholder="Pilih atau ketik agama..."
                                                    isClearable
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-2">Status Perkawinan</label>
                                                <CreatableSelect
                                                    styles={customSelectStyles}
                                                    value={empForm.status_perkawinan ? { value: empForm.status_perkawinan, label: empForm.status_perkawinan } : null}
                                                    onChange={(newValue) => setEmpForm({ ...empForm, status_perkawinan: newValue ? newValue.value : '' })}
                                                    options={['Belum Menikah', 'Menikah', 'Cerai'].map(x => ({ value: x, label: x }))}
                                                    placeholder="Pilih atau ketik status..."
                                                    isClearable
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-2">Pendidikan Terakhir</label>
                                                <CreatableSelect
                                                    styles={customSelectStyles}
                                                    value={empForm.pendidikan ? { value: empForm.pendidikan, label: empForm.pendidikan } : null}
                                                    onChange={(newValue) => setEmpForm({ ...empForm, pendidikan: newValue ? newValue.value : '' })}
                                                    options={['SMA', 'SMK', 'D3', 'S1', 'S2'].map(x => ({ value: x, label: x }))}
                                                    placeholder="Pilih atau ketik pendidikan..."
                                                    isClearable
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-2">Jurusan</label>
                                                <input type="text" value={empForm.jurusan} onChange={e => setEmpForm({ ...empForm, jurusan: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-2">Kontak Darurat (Nama)</label>
                                                <input type="text" value={empForm.kontak_darurat} onChange={e => setEmpForm({ ...empForm, kontak_darurat: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-2">Hubungan (Misal: Istri)</label>
                                                <input type="text" value={empForm.hubungan} onChange={e => setEmpForm({ ...empForm, hubungan: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none" />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* STEP 2: Data Kepegawaian */}
                                {wizardStep === 2 && (
                                    <div className="space-y-4 animate-in slide-in-from-right-4">
                                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Step 2: Data Kepegawaian</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-2">Perusahaan</label>
                                                <CreatableSelect
                                                    styles={customSelectStyles}
                                                    value={empForm.perusahaan ? { value: empForm.perusahaan, label: empForm.perusahaan } : null}
                                                    onChange={(newValue) => setEmpForm({ ...empForm, perusahaan: newValue ? newValue.value : '' })}
                                                    options={['PT DEA GLOBAL NIAGA'].map(x => ({ value: x, label: x }))}
                                                    placeholder="Pilih atau ketik perusahaan..."
                                                    isClearable
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-2">Penempatan</label>
                                                <input type="text" value={empForm.penempatan} onChange={e => setEmpForm({ ...empForm, penempatan: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-2">Department</label>
                                                <input type="text" value={empForm.department} onChange={e => setEmpForm({ ...empForm, department: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-2">Cost Center</label>
                                                <input type="text" value={empForm.cost_center} onChange={e => setEmpForm({ ...empForm, cost_center: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-2">Jabatan</label>
                                                <CreatableSelect
                                                    styles={customSelectStyles}
                                                    value={empForm.jabatan ? { value: empForm.jabatan, label: empForm.jabatan } : null}
                                                    onChange={(newValue) => setEmpForm({ ...empForm, jabatan: newValue ? newValue.value : '' })}
                                                    options={['HRGA OFFICER', 'Operator', 'Mechanic', 'IT Support', 'Admin', 'Engineer', 'Manager'].map(x => ({ value: x, label: x }))}
                                                    placeholder="Pilih atau ketik jabatan..."
                                                    isClearable
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-2">Level</label>
                                                <CreatableSelect
                                                    styles={customSelectStyles}
                                                    value={empForm.level ? { value: empForm.level, label: empForm.level } : null}
                                                    onChange={(newValue) => setEmpForm({ ...empForm, level: newValue ? newValue.value : '' })}
                                                    options={['OFFICER', 'Staff', 'Supervisor', 'Manager', 'Director'].map(x => ({ value: x, label: x }))}
                                                    placeholder="Pilih atau ketik level..."
                                                    isClearable
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-2">Status Karyawan</label>
                                                <CreatableSelect
                                                    styles={customSelectStyles}
                                                    value={empForm.status_karyawan ? { value: empForm.status_karyawan, label: empForm.status_karyawan } : null}
                                                    onChange={(newValue) => setEmpForm({ ...empForm, status_karyawan: newValue ? newValue.value : '' })}
                                                    options={['Aktif', 'PKWT', 'Magang', 'Probation', 'Harian'].map(x => ({ value: x, label: x }))}
                                                    placeholder="Pilih atau ketik status..."
                                                    isClearable
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-2">Nomor PKWT</label>
                                                <input type="text" value={empForm.nomor_pkwt} onChange={e => setEmpForm({ ...empForm, nomor_pkwt: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-2">NIK</label>
                                                <input type="text" value={empForm.nik} onChange={e => setEmpForm({ ...empForm, nik: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-2">Nomor Pegawai</label>
                                                <input type="text" value={empForm.nomor_pegawai} onChange={e => setEmpForm({ ...empForm, nomor_pegawai: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-2">Join Date</label>
                                                <input type="date" value={empForm.join_date} onChange={e => setEmpForm({ ...empForm, join_date: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-2">Efektif Resign</label>
                                                <input type="date" value={empForm.efektif_resign} onChange={e => setEmpForm({ ...empForm, efektif_resign: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-2">Email Pribadi</label>
                                                <input type="email" value={empForm.email} onChange={e => setEmpForm({ ...empForm, email: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-2">Email Office</label>
                                                <input type="email" value={empForm.email_office} onChange={e => setEmpForm({ ...empForm, email_office: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-2">Role Sistem</label>
                                                <select value={empForm.role} onChange={e => setEmpForm({ ...empForm, role: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none">
                                                    <option value="user">User (Karyawan)</option>
                                                    <option value="admin">Admin (HRGA / HSE)</option>

                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-2">Password Login Sementara <span className="text-slate-400 font-normal">(kosongkan = pakai NIK)</span></label>
                                                <input type="text" value={empForm.password} onChange={e => setEmpForm({ ...empForm, password: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none" placeholder="Otomatis = NIK karyawan" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-2">Tipe Roster Pertambangan</label>
                                                <select
                                                    value={empForm.roster_type}
                                                    onChange={e => setEmpForm({ ...empForm, roster_type: e.target.value })}
                                                    className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none"
                                                >
                                                    <option value="8/2">8 Minggu Kerja / 2 Minggu Cuti (8/2)</option>
                                                    <option value="6/2">6 Minggu Kerja / 2 Minggu Cuti (6/2)</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* STEP 3: Dokumen & Bank */}
                                {wizardStep === 3 && (
                                    <div className="space-y-4 animate-in slide-in-from-right-4">
                                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Step 3: Dokumen & Bank</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {[
                                                { id: 'ktp_file', label: 'Upload KTP (PDF)' },
                                                { id: 'kk_file', label: 'Upload Kartu Keluarga (PDF)' },
                                            ].map((field) => (
                                                <div key={field.id}>
                                                    <label className="block text-xs font-bold text-slate-600 mb-2">{field.label}</label>
                                                    <div className="relative w-full">
                                                        <input
                                                            type="file"
                                                            accept=".pdf"
                                                            onChange={e => setEmpForm({ ...empForm, [field.id]: e.target.files[0] })}
                                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                        />
                                                        <div className={`w-full border-2 border-dashed rounded-xl px-4 py-3 text-sm flex items-center justify-between transition-colors ${empForm[field.id] ? 'border-red-500 bg-red-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'}`}>
                                                            <span className={`font-bold truncate pr-4 ${empForm[field.id] ? 'text-red-700' : 'text-slate-400'}`}>
                                                                {empForm[field.id] ? empForm[field.id].name : 'Pilih atau drop file...'}
                                                            </span>
                                                            <Upload size={16} className={empForm[field.id] ? 'text-red-500' : 'text-slate-400'} />
                                                        </div>
                                                        {empForm[field.id] && (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => { e.preventDefault(); setEmpForm({ ...empForm, [field.id]: null }); }}
                                                                className="absolute -right-2 -top-2 bg-red-100 text-red-600 rounded-full p-1 shadow-sm hover:bg-red-200 z-20"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-2">Status Pajak</label>
                                                <input type="text" value={empForm.status_pajak} onChange={e => setEmpForm({ ...empForm, status_pajak: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-2">Nomor KTP</label>
                                                <input type="text" value={empForm.no_ktp} onChange={e => setEmpForm({ ...empForm, no_ktp: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-2">Nomor NPWP</label>
                                                <input type="text" value={empForm.npwp} onChange={e => setEmpForm({ ...empForm, npwp: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none" />
                                            </div>
                                            {[
                                                { id: 'npwp_file', label: 'Upload Kartu NPWP (PDF)' },
                                            ].map((field) => (
                                                <div key={field.id}>
                                                    <label className="block text-xs font-bold text-slate-600 mb-2">{field.label}</label>
                                                    <div className="relative w-full">
                                                        <input
                                                            type="file"
                                                            accept=".pdf"
                                                            onChange={e => setEmpForm({ ...empForm, [field.id]: e.target.files[0] })}
                                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                        />
                                                        <div className={`w-full border-2 border-dashed rounded-xl px-4 py-3 text-sm flex items-center justify-between transition-colors ${empForm[field.id] ? 'border-red-500 bg-red-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'}`}>
                                                            <span className={`font-bold truncate pr-4 ${empForm[field.id] ? 'text-red-700' : 'text-slate-400'}`}>
                                                                {empForm[field.id] ? empForm[field.id].name : 'Pilih atau drop file...'}
                                                            </span>
                                                            <Upload size={16} className={empForm[field.id] ? 'text-red-500' : 'text-slate-400'} />
                                                        </div>
                                                        {empForm[field.id] && (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => { e.preventDefault(); setEmpForm({ ...empForm, [field.id]: null }); }}
                                                                className="absolute -right-2 -top-2 bg-red-100 text-red-600 rounded-full p-1 shadow-sm hover:bg-red-200 z-20"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-2">Nomor KPJ (BPJS TK)</label>
                                                <input type="text" value={empForm.nomor_kpj} onChange={e => setEmpForm({ ...empForm, nomor_kpj: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-2">Nomor JKN (BPJS Kes)</label>
                                                <input type="text" value={empForm.nomor_jkn} onChange={e => setEmpForm({ ...empForm, nomor_jkn: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none" />
                                            </div>
                                            {[
                                                { id: 'ijazah_file', label: 'Upload Ijazah & Transkrip (PDF)' },
                                            ].map((field) => (
                                                <div key={field.id}>
                                                    <label className="block text-xs font-bold text-slate-600 mb-2">{field.label}</label>
                                                    <div className="relative w-full">
                                                        <input
                                                            type="file"
                                                            accept=".pdf"
                                                            onChange={e => setEmpForm({ ...empForm, [field.id]: e.target.files[0] })}
                                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                        />
                                                        <div className={`w-full border-2 border-dashed rounded-xl px-4 py-3 text-sm flex items-center justify-between transition-colors ${empForm[field.id] ? 'border-red-500 bg-red-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'}`}>
                                                            <span className={`font-bold truncate pr-4 ${empForm[field.id] ? 'text-red-700' : 'text-slate-400'}`}>
                                                                {empForm[field.id] ? empForm[field.id].name : 'Pilih atau drop file...'}
                                                            </span>
                                                            <Upload size={16} className={empForm[field.id] ? 'text-red-500' : 'text-slate-400'} />
                                                        </div>
                                                        {empForm[field.id] && (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => { e.preventDefault(); setEmpForm({ ...empForm, [field.id]: null }); }}
                                                                className="absolute -right-2 -top-2 bg-red-100 text-red-600 rounded-full p-1 shadow-sm hover:bg-red-200 z-20"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-2">Nama Rekening Bank</label>
                                                <input type="text" value={empForm.nama_rekening} onChange={e => setEmpForm({ ...empForm, nama_rekening: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-2">Nomor Rekening Bank</label>
                                                <input type="text" value={empForm.nomor_rekening} onChange={e => setEmpForm({ ...empForm, nomor_rekening: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none" />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </form>
                        </div>

                        {/* WIZARD FOOTER ACTIONS */}
                        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between gap-3 shrink-0">
                            {wizardStep > 1 ? (
                                <button type="button" onClick={() => setWizardStep(wizardStep - 1)} className="px-6 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition flex items-center gap-2">
                                    <ArrowLeft size={16} /> Kembali
                                </button>
                            ) : (
                                <div></div>
                            )}

                            <div className="flex gap-2">
                                <button type="button" onClick={() => setShowAddModal(false)} className="px-6 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition">Batal</button>
                                <button type="submit" form="add-emp-form" disabled={submitting} className="px-6 py-2 bg-red-900 text-white font-bold rounded-xl hover:bg-red-800 transition disabled:opacity-50 flex items-center gap-2">
                                    {wizardStep < 3 ? (
                                        <>Lanjut <ArrowRight size={16} /></>
                                    ) : (
                                        submitting ? 'Menyimpan...' : 'Simpan Karyawan'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Upload Modal placeholder to avoid errors */}
            {showBulkModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl p-6">
                        <h2 className="text-xl font-black mb-4">Import Karyawan</h2>
                        <input type="file" onChange={handleFileUpload} accept=".csv,.xlsx,.xls" className="mb-4" />
                        <button onClick={handleBulkSubmit} className="bg-red-600 text-white px-4 py-2 rounded">Upload</button>
                        <button onClick={() => setShowBulkModal(false)} className="ml-2 px-4 py-2">Batal</button>
                    </div>
                </div>
            )}

            {selectedHSEEmployee && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedHSEEmployee(null)}></div>
                    <div className="w-full max-w-md bg-white h-full shadow-2xl relative z-10 flex flex-col transform transition-transform">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <h2 className="text-lg font-black text-slate-800">Profil & Sertifikasi</h2>
                            <button onClick={() => setSelectedHSEEmployee(null)} className="p-2 bg-white rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"><X size={20} /></button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xl text-slate-500">
                                    {(selectedHSEEmployee.nama || 'U').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="font-black text-lg text-slate-800">{selectedHSEEmployee.nama}</h3>
                                    <p className="font-bold text-sm text-slate-500">{selectedHSEEmployee.role}</p>
                                    <p className="font-bold text-xs text-slate-400">{selectedHSEEmployee.department || '-'}</p>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Tipe Roster Pertambangan</label>
                                        <select
                                            value={empForm.roster_type}
                                            onChange={e => setEmpForm({ ...empForm, roster_type: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all font-medium"
                                        >
                                            <option value="8/2">8 Minggu Kerja / 2 Minggu Cuti (8/2)</option>
                                            <option value="6/2">6 Minggu Kerja / 2 Minggu Cuti (6/2)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-3 border-b pb-2">
                                    <h4 className="font-black text-slate-800">Daftar Sertifikasi</h4>
                                    <label className="cursor-pointer bg-red-50 text-red-700 hover:bg-red-100 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2">
                                        <Upload size={14} /> Upload Sertifikat
                                        <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => {
                                            const file = e.target.files[0];
                                            if (file) {
                                                if (file.size > 5 * 1024 * 1024) {
                                                    addToast('Ukuran file maksimal 5MB', 'error');
                                                } else {
                                                    addToast('File siap diunggah. Menunggu integrasi backend.', 'success');
                                                }
                                                e.target.value = '';
                                            }
                                        }} />
                                    </label>
                                </div>
                                {!selectedHSEEmployee.certifications || selectedHSEEmployee.certifications.length === 0 ? (
                                    <p className="text-sm font-bold text-slate-500">Belum ada sertifikasi.</p>
                                ) : (
                                    <div className="flex flex-col gap-3">
                                        {selectedHSEEmployee.certifications.map((cert, idx) => (
                                            <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                                                <h5 className="font-black text-sm text-slate-700">{cert.name}</h5>
                                                {cert.issue_date && <p className="text-xs font-bold text-slate-500 mt-1">Diterbitkan: {new Date(cert.issue_date).toLocaleDateString('id-ID')}</p>}
                                                {cert.document_url && (
                                                    <a href={`${cert.document_url}`} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg hover:bg-blue-100 transition-colors">
                                                        Lihat Dokumen
                                                    </a>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showPdfModal && (
                <div className="fixed inset-0 z-[100] flex justify-end">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowPdfModal(false)}></div>
                    <div className="relative bg-white w-full md:w-[65%] lg:w-[50%] h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0 bg-white shadow-sm z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                                    <FileText size={20} />
                                </div>
                                <div>
                                    <h3 className="font-black text-gray-900">Pratinjau Dokumen</h3>
                                    <p className="text-xs font-bold text-slate-400">Tampilan penuh dokumen karyawan</p>
                                </div>
                            </div>
                            <button onClick={() => setShowPdfModal(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-red-100 hover:text-red-900 transition">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="flex-1 bg-slate-100 w-full h-full overflow-hidden flex items-center justify-center p-4">
                            {selectedPdfUrl ? (
                                selectedPdfUrl.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/) ? (
                                    <img src={selectedPdfUrl} alt="Dokumen" className="max-w-full max-h-full object-contain rounded shadow-sm" />
                                ) : (
                                    <object data={selectedPdfUrl} type="application/pdf" className="w-full h-full border-0 rounded shadow-sm" style={{ minHeight: '100%' }}>
                                        <div className="flex flex-col items-center justify-center text-slate-500 h-full p-8 text-center">
                                            <FileText size={48} className="mb-4 opacity-50 text-red-500" />
                                            <p className="font-bold mb-2">Tidak dapat menampilkan dokumen PDF di browser ini.</p>
                                            <a href={selectedPdfUrl} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition">
                                                Unduh Dokumen
                                            </a>
                                        </div>
                                    </object>
                                )
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                                    <FileText size={64} className="mb-4 opacity-20" />
                                    <p className="font-medium text-lg">Dokumen tidak tersedia</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Employees;
