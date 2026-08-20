import React, { useState, useEffect } from 'react';
import { 
  Shield, Camera, MapPin, Wifi, UserCheck, AlertTriangle, Search, RefreshCw, 
  CheckCircle2, Clock, Send, Check, X, FileText, UserPlus, Eye, BadgeCheck, AlertCircle,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import api from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const AccessRights = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  
  const [employees, setEmployees] = useState([]);
  const [roleRequests, setRoleRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [empCurrentPage, setEmpCurrentPage] = useState(1);
  const empItemsPerPage = 10;
  
  // Tab state
  const roleName = (user?.role || '').toLowerCase();
  const isSuperAdmin = ['superadmin', 'super_admin', 'super admin'].includes(roleName);
  const isAdmin = ['admin', 'hrga_admin', 'hr', 'hse_admin'].includes(roleName) || roleName.includes('admin');
  const canAccess = isSuperAdmin || isAdmin;

  const [activeSubTab, setActiveSubTab] = useState(isSuperAdmin ? 'verifications' : 'employees');

  // Request Role Modal State (for Admin HRGA)
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [selectedEmpForRequest, setSelectedEmpForRequest] = useState(null);
  const [requestedRole, setRequestedRole] = useState('admin');
  const [requestReason, setRequestReason] = useState('');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  // Review Modal State (for Super Admin)
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedRequestForReview, setSelectedRequestForReview] = useState(null);
  const [reviewAction, setReviewAction] = useState('approve'); // 'approve' | 'reject'
  const [reviewNotes, setReviewNotes] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Direct Role Update State (Super Admin only)
  const [updatingId, setUpdatingId] = useState(null);

  // Fetch Data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [empRes, reqRes] = await Promise.all([
        api.get('/hris/employees'),
        api.get('/hris/role-requests').catch(() => ({ data: [] }))
      ]);

      setEmployees(empRes.data || []);
      setRoleRequests(reqRes.data || []);
    } catch (err) {
      console.error('Failed to fetch access rights data:', err);
      addToast('Gagal memuat data hak akses & pengajuan role.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Super Admin: Direct Role Update
  const handleDirectUpdateRole = async (empId, newRole) => {
    if (!isSuperAdmin) {
      addToast('Hanya Super Admin yang dapat mengubah role secara langsung!', 'error');
      return;
    }

    setUpdatingId(empId);
    try {
      await api.put(`/hris/employees/${empId}`, { role: newRole });
      addToast(`Role berhasil diperbarui menjadi ${newRole.toUpperCase()}`, 'success');
      setEmployees(prev => prev.map(emp => (emp.id === empId || emp.user_id === empId ? { ...emp, role: newRole } : emp)));
    } catch (err) {
      console.error('Failed to update role:', err);
      addToast(err.response?.data?.message || 'Gagal mengubah role', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  // Super Admin: Toggle Camera Permission
  const handleToggleCamera = async (empId, currentVal) => {
    if (!isSuperAdmin) return;
    const newVal = !currentVal;
    setEmployees(prev => prev.map(emp => (emp.id === empId ? { ...emp, camera_access: newVal } : emp)));
    try {
      await api.put(`/hris/employees/${empId}`, { camera_access: newVal });
      addToast(`Akses kamera karyawan telah di-${newVal ? 'aktifkan' : 'nonaktifkan'}`, newVal ? 'success' : 'info');
    } catch (err) {
      console.error('Failed to update camera access:', err);
      addToast('Akses kamera berhasil diperbarui pada state lokal', 'info');
    }
  };

  // Super Admin: Toggle GPS Permission
  const handleToggleGPS = async (empId, currentVal) => {
    if (!isSuperAdmin) return;
    const newVal = !currentVal;
    setEmployees(prev => prev.map(emp => (emp.id === empId ? { ...emp, gps_access: newVal } : emp)));
    try {
      await api.put(`/hris/employees/${empId}`, { gps_access: newVal });
      addToast(`Akses validasi GPS karyawan telah di-${newVal ? 'aktifkan' : 'nonaktifkan'}`, newVal ? 'success' : 'info');
    } catch (err) {
      console.error('Failed to update GPS access:', err);
      addToast('Akses GPS berhasil diperbarui pada state lokal', 'info');
    }
  };

  // Super Admin: Toggle WiFi Network Lock Permission
  const handleToggleWifi = async (empId, currentVal) => {
    if (!isSuperAdmin) return;
    const newVal = !currentVal;
    setEmployees(prev => prev.map(emp => (emp.id === empId ? { ...emp, wifi_access: newVal } : emp)));
    try {
      await api.put(`/hris/employees/${empId}`, { wifi_access: newVal });
      addToast(`Validasi WiFi kantor karyawan telah di-${newVal ? 'wajibkan (Wajib WiFi)' : 'bebaskan (Bypass Tugas Lapangan)'}`, newVal ? 'success' : 'info');
    } catch (err) {
      console.error('Failed to update WiFi access:', err);
      addToast('Validasi WiFi berhasil diperbarui pada state lokal', 'info');
    }
  };

  // Super Admin: Verify & Activate Account
  const handleVerifyEmployee = async (empId, empName) => {
    if (!isSuperAdmin) return;
    try {
      await api.put(`/hris/employees/${empId}/verify`);
      addToast(`Akun ${empName} berhasil diverifikasi dan diaktifkan!`, 'success');
      setEmployees(prev => prev.map(emp => emp.id === empId ? { ...emp, is_active: true } : emp));
    } catch (err) {
      console.error('Failed to verify employee:', err);
      addToast(err.response?.data?.message || 'Gagal memverifikasi akun', 'error');
    }
  };

  // Super Admin: Reject & Clean up unverified intruder/account
  const handleRejectEmployee = async (empId, empName) => {
    if (!isSuperAdmin) return;
    if (!window.confirm(`Yakin ingin menolak dan menghapus pendaftaran akun ${empName}? Data akun akan dibersihkan secara permanen demi keamanan.`)) {
      return;
    }

    try {
      await api.delete(`/hris/employees/${empId}/reject`);
      addToast(`Pendaftaran akun ${empName} berhasil ditolak dan dibersihkan.`, 'success');
      setEmployees(prev => prev.filter(emp => emp.id !== empId));
    } catch (err) {
      console.error('Failed to reject employee:', err);
      addToast(err.response?.data?.message || 'Gagal menolak akun', 'error');
    }
  };

  // Admin HRGA: Submit Role Request
  const handleOpenRequestModal = (emp) => {
    setSelectedEmpForRequest(emp);
    const current = (emp.role || 'user').toLowerCase();
    setRequestedRole(current === 'admin' ? 'superadmin' : 'admin');
    setRequestReason('');
    setIsRequestModalOpen(true);
  };

  const handleSubmitRoleRequest = async (e) => {
    e.preventDefault();
    if (!selectedEmpForRequest) return;
    if (!requestReason.trim()) {
      addToast('Harap isi alasan pengajuan perubahan role!', 'warning');
      return;
    }

    setIsSubmittingRequest(true);
    try {
      const res = await api.post('/hris/role-requests', {
        employee_id: selectedEmpForRequest.id,
        requested_role: requestedRole,
        reason: requestReason.trim()
      });

      addToast(res.data.message || 'Pengajuan role berhasil dikirimkan ke Super Admin!', 'success');
      setIsRequestModalOpen(false);
      fetchData();
    } catch (err) {
      console.error('Failed to submit role request:', err);
      addToast(err.response?.data?.message || 'Gagal mengirim pengajuan role', 'error');
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  // Super Admin: Review Role Request
  const handleOpenReviewModal = (req, action) => {
    setSelectedRequestForReview(req);
    setReviewAction(action);
    setReviewNotes(action === 'approve' ? 'Disetujui oleh Super Admin' : 'Ditolak');
    setIsReviewModalOpen(true);
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!selectedRequestForReview) return;

    setIsSubmittingReview(true);
    try {
      const res = await api.put(`/hris/role-requests/${selectedRequestForReview.id}/review`, {
        action: reviewAction,
        review_notes: reviewNotes.trim()
      });

      addToast(res.data.message || 'Tinjauan pengajuan role berhasil diproses!', 'success');
      setIsReviewModalOpen(false);
      fetchData();
    } catch (err) {
      console.error('Failed to review role request:', err);
      addToast(err.response?.data?.message || 'Gagal memproses pengajuan role', 'error');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (!canAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
        <AlertTriangle size={48} className="text-amber-500 mb-3" />
        <h2 className="text-lg font-black text-gray-900">Akses Dibatasi</h2>
        <p className="text-xs text-slate-500 mt-1">Pengaturan hak akses role dan otorisasi sistem hanya dapat diakses oleh Admin & Super Admin.</p>
      </div>
    );
  }

  // Filtered lists
  const pendingVerifications = employees.filter(e => e.is_active === false);
  const activeEmployees = employees.filter(e => e.is_active !== false);
  const pendingRoleRequests = roleRequests.filter(r => r.status === 'pending');

  const filteredActiveEmployees = activeEmployees.filter(emp => {
    const term = searchTerm.toLowerCase();
    const nama = (emp.nama || emp.nama_lengkap || '').toLowerCase();
    const dept = (emp.department || emp.departments?.name || '').toLowerCase();
    const jabatan = (emp.jabatan || '').toLowerCase();
    const roleStr = (emp.role || '').toLowerCase();
    return nama.includes(term) || dept.includes(term) || jabatan.includes(term) || roleStr.includes(term);
  });

  return (
    <div className="w-full flex flex-col gap-6 font-sans">
      {/* Top Banner Notice */}
      {!isSuperAdmin && (
        <div className="bg-gradient-to-r from-red-900 to-rose-900 text-white rounded-2xl p-4 shadow-md flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <Shield size={22} className="text-red-200" />
            </div>
            <div>
              <h4 className="text-sm font-black tracking-tight">Panel Pengajuan Hak Akses & Role (Admin HRGA)</h4>
              <p className="text-xs text-red-100 mt-0.5">
                Perubahan role staf / admin diajukan melalui sistem permohonan dan diverifikasi oleh Super Admin untuk menjamin integritas data.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {/* Navigation Sub-Tabs */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex flex-wrap gap-2">
            {/* Super Admin Tab 1: Verifikasi Akun Baru */}
            {isSuperAdmin && (
              <button
                onClick={() => setActiveSubTab('verifications')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                  activeSubTab === 'verifications'
                    ? 'bg-red-900 text-white shadow-md'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <UserPlus size={15} /> Verifikasi Akun Baru
                {pendingVerifications.length > 0 && (
                  <span className="ml-1 bg-amber-400 text-amber-950 px-1.5 py-0.2 rounded-full text-[10px] font-black">
                    {pendingVerifications.length}
                  </span>
                )}
              </button>
            )}

            {/* Tab: Pengajuan Perubahan Role */}
            <button
              onClick={() => setActiveSubTab('role_requests')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                activeSubTab === 'role_requests'
                  ? 'bg-red-900 text-white shadow-md'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Send size={15} /> {isSuperAdmin ? 'Persetujuan Pengajuan Role' : 'Riwayat Pengajuan Role'}
              {isSuperAdmin && pendingRoleRequests.length > 0 && (
                <span className="ml-1 bg-red-500 text-white px-1.5 py-0.2 rounded-full text-[10px] font-black">
                  {pendingRoleRequests.length}
                </span>
              )}
            </button>

            {/* Tab: Daftar Personel & Otorisasi */}
            <button
              onClick={() => setActiveSubTab('employees')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                activeSubTab === 'employees'
                  ? 'bg-red-900 text-white shadow-md'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Shield size={15} /> {isSuperAdmin ? 'Otorisasi Seluruh Personel' : 'Daftar Karyawan & Ajukan Role'}
            </button>

            {/* Admin HRGA Tab: Menunggu Verifikasi */}
            {!isSuperAdmin && pendingVerifications.length > 0 && (
              <button
                onClick={() => setActiveSubTab('hr_verifications')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                  activeSubTab === 'hr_verifications'
                    ? 'bg-red-900 text-white shadow-md'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <Clock size={15} /> Menunggu Verifikasi Super Admin
                <span className="ml-1 bg-amber-400 text-amber-950 px-1.5 py-0.2 rounded-full text-[10px] font-black">
                  {pendingVerifications.length}
                </span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 shadow-sm"
              title="Refresh data"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* SUB-TAB 1: VERIFIKASI AKUN BARU (SUPER ADMIN) */}
        {activeSubTab === 'verifications' && isSuperAdmin && (
          <div className="p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <UserCheck className="text-red-700" size={18} />
                  Antrean Verifikasi Pendaftaran Akun Karyawan Baru
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tinjau keabsahan identitas akun yang mendaftar secara mandiri atau didaftarkan untuk mencegah kesalahan data dan penyusup.
                </p>
              </div>
            </div>

            {pendingVerifications.length === 0 ? (
              <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-10 text-center flex flex-col items-center justify-center">
                <CheckCircle2 size={36} className="text-emerald-500 mb-2" />
                <p className="text-sm font-bold text-slate-700">Semua akun karyawan telah diverifikasi</p>
                <p className="text-xs text-slate-400 mt-0.5">Tidak ada antrean verifikasi akun baru saat ini.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingVerifications.map((emp) => (
                  <div key={emp.id} className="bg-white border-2 border-amber-200/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between gap-4">
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-red-800 text-white font-black text-sm flex items-center justify-center">
                            {(emp.nama || emp.nama_lengkap || 'US').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h5 className="text-sm font-black text-slate-900">{emp.nama || emp.nama_lengkap}</h5>
                            <span className="text-[11px] font-mono text-slate-500 font-bold">{emp.nomor_pegawai || '-'}</span>
                          </div>
                        </div>
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Clock size={11} /> Menunggu Verifikasi
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-bold">Departemen</span>
                          <span className="font-bold text-slate-800">{emp.department || 'General'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-bold">Jabatan</span>
                          <span className="font-bold text-slate-800">{emp.jabatan || 'Staff'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-bold">NIK / KTP</span>
                          <span className="font-mono font-bold text-slate-800">{emp.nik || '-'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-bold">No. Handphone</span>
                          <span className="font-bold text-slate-800">{emp.no_handphone || '-'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => handleVerifyEmployee(emp.id, emp.nama || emp.nama_lengkap)}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm"
                      >
                        <Check size={15} /> Setujui & Aktifkan
                      </button>
                      <button
                        onClick={() => handleRejectEmployee(emp.id, emp.nama || emp.nama_lengkap)}
                        className="bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1 transition-all border border-red-200"
                        title="Tolak pendaftaran akun"
                      >
                        <X size={15} /> Tolak & Hapus
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SUB-TAB 2: PENGAJUAN PERUBAHAN ROLE */}
        {activeSubTab === 'role_requests' && (
          <div className="p-6 flex flex-col gap-4">
            <div>
              <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Send className="text-red-700" size={18} />
                {isSuperAdmin ? 'Daftar Pengajuan Perubahan Role dari Admin HRGA' : 'Riwayat Pengajuan Perubahan Role'}
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                {isSuperAdmin
                  ? 'Tinjau dan berikan persetujuan promosi/perubahan hak akses akun personel yang diajukan oleh HRGA.'
                  : 'Pantau status permohonan promosi atau perubahan hak akses role yang telah Anda ajukan ke Super Admin.'}
              </p>
            </div>

            {roleRequests.length === 0 ? (
              <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-10 text-center flex flex-col items-center justify-center">
                <FileText size={36} className="text-slate-300 mb-2" />
                <p className="text-sm font-bold text-slate-700">Belum ada pengajuan perubahan role</p>
                <p className="text-xs text-slate-400 mt-0.5">Pengajuan role dari Admin HRGA akan tercatat di sini.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                      <th className="py-3 px-4">Karyawan</th>
                      <th className="py-3 px-4">Role Diajukan</th>
                      <th className="py-3 px-4">Pemohon</th>
                      <th className="py-3 px-4">Alasan Pengajuan</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      {isSuperAdmin && <th className="py-3 px-4 text-center">Aksi</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {roleRequests.map((req) => {
                      const empName = req.user?.employees?.[0]?.nama_lengkap || req.user?.username || 'Karyawan';
                      const requesterName = req.requester?.employees?.[0]?.nama_lengkap || req.requester?.username || 'Admin HRGA';

                      return (
                        <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3.5 px-4">
                            <span className="font-black text-slate-900 block">{empName}</span>
                            <span className="text-[10px] text-slate-400">Role Saat Ini: <span className="font-bold text-slate-600 uppercase">{req.old_role || 'user'}</span></span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="bg-red-50 text-red-800 px-2.5 py-1 rounded-lg text-xs font-black border border-red-200">
                              ➔ {req.requested_role?.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">
                            <span className="font-bold block">{requesterName}</span>
                            <span className="text-[10px] text-slate-400">{new Date(req.created_at).toLocaleDateString('id-ID')}</span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-700 max-w-xs">
                            <p className="line-clamp-2 italic">"{req.reason || '-'}"</p>
                            {req.review_notes && req.status !== 'pending' && (
                              <span className="text-[10px] text-slate-400 block mt-1">Catatan Super Admin: {req.review_notes}</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {req.status === 'approved' && (
                              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-[10px] font-black border border-emerald-200">
                                <CheckCircle2 size={12} /> Disetujui
                              </span>
                            )}
                            {req.status === 'rejected' && (
                              <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 px-2.5 py-1 rounded-full text-[10px] font-black border border-red-200">
                                <AlertCircle size={12} /> Ditolak
                              </span>
                            )}
                            {req.status === 'pending' && (
                              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full text-[10px] font-black border border-amber-200">
                                <Clock size={12} /> Menunggu Verifikasi
                              </span>
                            )}
                          </td>
                          {isSuperAdmin && (
                            <td className="py-3.5 px-4 text-center">
                              {req.status === 'pending' ? (
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => handleOpenReviewModal(req, 'approve')}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-all shadow-sm"
                                  >
                                    <Check size={13} /> Setujui
                                  </button>
                                  <button
                                    onClick={() => handleOpenReviewModal(req, 'reject')}
                                    className="bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-all border border-red-200"
                                  >
                                    <X size={13} /> Tolak
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-bold">Selesai</span>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* SUB-TAB 3: DAFTAR KARYAWAN & OTORISASI / PENGAJUAN ROLE */}
        {activeSubTab === 'employees' && (
          <div>
            {/* Search Header */}
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
              <div>
                <h4 className="text-sm font-black text-slate-900">
                  {isSuperAdmin ? 'Otorisasi Hak Akses Seluruh Personel' : 'Daftar Karyawan Aktif & Pengajuan Role'}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isSuperAdmin
                    ? 'Super Admin memiliki wewenang penuh untuk mengubah role langsung atau meninjau perizinan.'
                    : 'Pilih karyawan untuk mengajukan permohonan perubahan hak akses ke Super Admin.'}
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama, jabatan, atau role..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setEmpCurrentPage(1);
                  }}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-red-900/20 font-medium"
                />
              </div>
            </div>

            {/* Table Container with Pagination */}
            {(() => {
              const totalEmpPages = Math.max(1, Math.ceil(filteredActiveEmployees.length / empItemsPerPage));
              const paginatedActiveEmployees = filteredActiveEmployees.slice((empCurrentPage - 1) * empItemsPerPage, empCurrentPage * empItemsPerPage);

              return (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/80 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                        <th className="py-3.5 px-6">Karyawan</th>
                        <th className="py-3.5 px-6">Jabatan / Divisi</th>
                        <th className="py-3.5 px-6">Role Sistem HRIS</th>
                        <th className="py-3.5 px-6 text-center">Akses Kamera</th>
                        <th className="py-3.5 px-6 text-center">Akses GPS</th>
                        <th className="py-3.5 px-6 text-center">Akses WiFi Kantor</th>
                        <th className="py-3.5 px-6 text-center">Aksi / Otorisasi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {loading ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-xs font-bold text-slate-400">
                            <RefreshCw className="animate-spin text-red-700 mx-auto mb-2" size={20} />
                            Memuat data karyawan...
                          </td>
                        </tr>
                      ) : filteredActiveEmployees.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-xs font-bold text-slate-400">
                            Tidak ada data karyawan yang sesuai.
                          </td>
                        </tr>
                      ) : (
                        paginatedActiveEmployees.map((emp) => {
                          const currentRole = (emp.role || 'user').toLowerCase();
                          const isUpdating = updatingId === emp.id;

                          return (
                            <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                              {/* Name & Photo */}
                              <td className="py-4 px-6 font-bold text-slate-900">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 min-w-[36px] rounded-full bg-gradient-to-tr from-slate-900 to-red-900 text-white font-black text-xs flex items-center justify-center shrink-0 aspect-square">
                                    {(emp.nama || emp.nama_lengkap || 'US').slice(0, 2).toUpperCase()}
                                  </div>
                                  <div>
                                    <span className="block">{emp.nama || emp.nama_lengkap}</span>
                                    <span className="text-[10px] text-slate-400 font-mono">{emp.nomor_pegawai || '-'}</span>
                                  </div>
                                </div>
                              </td>

                              {/* Division */}
                              <td className="py-4 px-6 text-slate-600">
                                <span className="font-bold text-slate-800 block">{emp.jabatan || 'Staff'}</span>
                                <span className="text-[11px] text-slate-400">{emp.department || 'General'}</span>
                              </td>

                              {/* Role Display / Dropdown */}
                              <td className="py-4 px-6">
                                {isSuperAdmin ? (
                                  <select
                                    disabled={isUpdating}
                                    value={currentRole}
                                    onChange={(e) => handleDirectUpdateRole(emp.id, e.target.value)}
                                    className="bg-white border border-slate-200 text-slate-800 text-xs font-bold rounded-xl px-3 py-1.5 outline-none focus:ring-2 focus:ring-red-900/20 cursor-pointer disabled:opacity-50"
                                  >
                                    <option value="user">User / Karyawan</option>
                                    <option value="admin">Admin</option>
                                    <option value="superadmin">Super Admin</option>
                                  </select>
                                ) : (
                                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black ${
                                    currentRole === 'superadmin' 
                                      ? 'bg-purple-100 text-purple-900 border border-purple-200' 
                                      : currentRole === 'admin' 
                                      ? 'bg-red-100 text-red-900 border border-red-200' 
                                      : 'bg-slate-100 text-slate-700'
                                  }`}>
                                    <Shield size={12} />
                                    {currentRole === 'superadmin' ? 'Super Admin' : currentRole === 'admin' ? 'Admin' : 'User'}
                                  </span>
                                )}
                              </td>

                              {/* Camera Access Toggle */}
                              <td className="py-4 px-6 text-center">
                                {isSuperAdmin ? (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleCamera(emp.id, emp.camera_access !== false)}
                                    disabled={isUpdating}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black transition-all cursor-pointer shadow-sm ${
                                      emp.camera_access !== false
                                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300'
                                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-300'
                                    }`}
                                    title="Klik untuk mengaktifkan / menonaktifkan izin akses kamera"
                                  >
                                    <Camera size={12} className={emp.camera_access !== false ? 'text-emerald-700' : 'text-slate-400'} />
                                    <span>{emp.camera_access !== false ? 'Aktif' : 'Mati'}</span>
                                    <span className={`w-2 h-2 rounded-full ${emp.camera_access !== false ? 'bg-emerald-600 animate-pulse' : 'bg-slate-400'}`} />
                                  </button>
                                ) : (
                                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                    emp.camera_access !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                                  }`}>
                                    <Camera size={12} /> {emp.camera_access !== false ? 'Aktif' : 'Mati'}
                                  </span>
                                )}
                              </td>

                              {/* GPS Access Toggle */}
                              <td className="py-4 px-6 text-center">
                                {isSuperAdmin ? (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleGPS(emp.id, emp.gps_access !== false)}
                                    disabled={isUpdating}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black transition-all cursor-pointer shadow-sm ${
                                      emp.gps_access !== false
                                        ? 'bg-blue-100 text-blue-800 hover:bg-blue-200 border border-blue-300'
                                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-300'
                                    }`}
                                    title="Klik untuk mengaktifkan / menonaktifkan validasi lokasi GPS"
                                  >
                                    <MapPin size={12} className={emp.gps_access !== false ? 'text-blue-700' : 'text-slate-400'} />
                                    <span>{emp.gps_access !== false ? 'Aktif' : 'Mati'}</span>
                                    <span className={`w-2 h-2 rounded-full ${emp.gps_access !== false ? 'bg-blue-600 animate-pulse' : 'bg-slate-400'}`} />
                                  </button>
                                ) : (
                                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                    emp.gps_access !== false ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'
                                  }`}>
                                    <MapPin size={12} /> {emp.gps_access !== false ? 'Aktif' : 'Mati'}
                                  </span>
                                )}
                              </td>

                              {/* WiFi Office Access Toggle */}
                              <td className="py-4 px-6 text-center">
                                {isSuperAdmin ? (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleWifi(emp.id, emp.wifi_access !== false)}
                                    disabled={isUpdating}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black transition-all cursor-pointer shadow-sm ${
                                      emp.wifi_access !== false
                                        ? 'bg-purple-100 text-purple-800 hover:bg-purple-200 border border-purple-300'
                                        : 'bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-300'
                                    }`}
                                    title={emp.wifi_access !== false ? 'Wajib terhubung WiFi/IP Kantor (Klik untuk bypass tugas lapangan)' : 'Bypass / Bebas WiFi (Klik untuk mewajibkan WiFi kantor)'}
                                  >
                                    <Wifi size={12} className={emp.wifi_access !== false ? 'text-purple-700' : 'text-amber-700'} />
                                    <span>{emp.wifi_access !== false ? 'Wajib WiFi' : 'Bypass Lapangan'}</span>
                                    <span className={`w-2 h-2 rounded-full ${emp.wifi_access !== false ? 'bg-purple-600 animate-pulse' : 'bg-amber-500'}`} />
                                  </button>
                                ) : (
                                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                    emp.wifi_access !== false ? 'bg-purple-50 text-purple-700' : 'bg-amber-50 text-amber-700'
                                  }`}>
                                    <Wifi size={12} /> {emp.wifi_access !== false ? 'Wajib WiFi' : 'Bypass'}
                                  </span>
                                )}
                              </td>

                              {/* Action Button */}
                              <td className="py-4 px-6 text-center">
                                {isSuperAdmin ? (
                                  <span className="inline-flex items-center gap-1 text-emerald-700 text-xs font-bold bg-emerald-50 px-3 py-1 rounded-xl">
                                    <CheckCircle2 size={13} /> Full Access
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => handleOpenRequestModal(emp)}
                                    className="bg-red-50 hover:bg-red-100 text-red-800 text-xs font-black px-3.5 py-1.5 rounded-xl border border-red-200 transition-all flex items-center gap-1.5 mx-auto shadow-sm"
                                  >
                                    <Send size={12} /> Ajukan Role Baru
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>

                  {/* Pagination Footer */}
                  {filteredActiveEmployees.length > 0 && (
                    <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
                      <div className="flex items-center gap-2">
                        <span>Menampilkan <strong>{Math.min((empCurrentPage - 1) * empItemsPerPage + 1, filteredActiveEmployees.length)}</strong> - <strong>{Math.min(empCurrentPage * empItemsPerPage, filteredActiveEmployees.length)}</strong> dari <strong>{filteredActiveEmployees.length}</strong> personel</span>
                      </div>

                      <div className="flex items-center gap-1.5 self-center">
                        <button
                          type="button"
                          disabled={empCurrentPage === 1}
                          onClick={() => setEmpCurrentPage(prev => Math.max(1, prev - 1))}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                          title="Halaman sebelumnya"
                        >
                          <ChevronLeft size={15} />
                        </button>

                        <div className="flex items-center gap-1 px-2 font-bold text-xs">
                          <span>Hal {empCurrentPage} dari {totalEmpPages}</span>
                        </div>

                        <button
                          type="button"
                          disabled={empCurrentPage >= totalEmpPages}
                          onClick={() => setEmpCurrentPage(prev => Math.min(totalEmpPages, prev + 1))}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                          title="Halaman berikutnya"
                        >
                          <ChevronRight size={15} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* SUB-TAB 4: STATUS PENDAFTARAN MENUNGGU VERIFIKASI (ADMIN HRGA VIEW) */}
        {activeSubTab === 'hr_verifications' && !isSuperAdmin && (
          <div className="p-6 flex flex-col gap-4">
            <div>
              <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Clock className="text-amber-600" size={18} />
                Daftar Akun Baru yang Menunggu Verifikasi Super Admin
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Karyawan baru di bawah ini belum dapat masuk ke sistem sampai disetujui & diaktifkan oleh Super Admin.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingVerifications.map((emp) => (
                <div key={emp.id} className="bg-slate-50 border border-amber-200 rounded-2xl p-4 flex flex-col justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500 text-white font-black flex items-center justify-center">
                      {(emp.nama || emp.nama_lengkap || 'US').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h5 className="text-sm font-black text-slate-900">{emp.nama || emp.nama_lengkap}</h5>
                      <span className="text-[10px] text-slate-500 font-mono">{emp.nomor_pegawai} | {emp.department || 'General'}</span>
                    </div>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-xs text-amber-800 font-bold flex items-center gap-2">
                    <Clock size={14} className="text-amber-600 shrink-0" />
                    <span>Menunggu verifikasi identitas & persetujuan Super Admin</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* MODAL: AJUKAN PERUBAHAN ROLE (ADMIN HRGA) */}
      {isRequestModalOpen && selectedEmpForRequest && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-red-50 text-red-800 rounded-xl">
                  <Send size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900">Form Pengajuan Perubahan Role</h4>
                  <p className="text-[11px] text-slate-500 font-medium">Permohonan akan dikirimkan ke Super Admin</p>
                </div>
              </div>
              <button onClick={() => setIsRequestModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitRoleRequest} className="mt-5 space-y-4">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Karyawan yang Diajukan</span>
                <span className="text-sm font-black text-slate-900 block mt-0.5">
                  {selectedEmpForRequest.nama || selectedEmpForRequest.nama_lengkap}
                </span>
                <span className="text-xs text-slate-500 font-medium block">
                  {selectedEmpForRequest.jabatan || 'Staff'} ({selectedEmpForRequest.department || 'General'}) • Role Saat Ini: <b className="uppercase text-slate-800">{selectedEmpForRequest.role || 'User'}</b>
                </span>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">Role Baru yang Diajukan</label>
                <select
                  value={requestedRole}
                  onChange={(e) => setRequestedRole(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-bold rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-red-900/20"
                >
                  <option value="user">User / Karyawan</option>
                  <option value="admin">Admin</option>
                  <option value="superadmin">Super Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">
                  Alasan / Catatan Pengajuan <span className="text-red-600">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  placeholder="Contoh: Promosi jabatan menjadi Coordinator HRGA atau mutasi tanggung jawab..."
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-medium rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-red-900/20 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRequestModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRequest}
                  className="px-5 py-2.5 bg-gradient-to-r from-red-900 to-rose-900 hover:from-red-950 hover:to-rose-950 text-white text-xs font-black rounded-xl shadow-md flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmittingRequest ? <RefreshCw className="animate-spin" size={14} /> : <Send size={14} />}
                  Kirim Pengajuan ke Super Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TINJAU PENGAJUAN ROLE (SUPER ADMIN) */}
      {isReviewModalOpen && selectedRequestForReview && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${reviewAction === 'approve' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                  {reviewAction === 'approve' ? <Check size={18} /> : <X size={18} />}
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900">
                    {reviewAction === 'approve' ? 'Persetujuan Pengajuan Role' : 'Tolak Pengajuan Role'}
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium">Verifikasi keputusan Super Admin</p>
                </div>
              </div>
              <button onClick={() => setIsReviewModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="mt-5 space-y-4">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 text-xs">
                <div className="flex justify-between mb-1">
                  <span className="text-slate-400 font-bold">Karyawan:</span>
                  <span className="font-black text-slate-900">
                    {selectedRequestForReview.user?.employees?.[0]?.nama_lengkap || selectedRequestForReview.user?.username}
                  </span>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-400 font-bold">Perubahan Role:</span>
                  <span className="font-black text-red-900">
                    {selectedRequestForReview.old_role?.toUpperCase()} ➔ {selectedRequestForReview.requested_role?.toUpperCase()}
                  </span>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-200">
                  <span className="text-slate-400 font-bold block mb-0.5">Alasan dari HRGA:</span>
                  <p className="italic text-slate-700 bg-white p-2 rounded-lg border border-slate-100">
                    "{selectedRequestForReview.reason || '-'}"
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">Catatan Tinjauan Super Admin</label>
                <textarea
                  rows={2}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Masukkan catatan persetujuan atau alasan penolakan..."
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-medium rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-red-900/20 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsReviewModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReview}
                  className={`px-5 py-2.5 text-white text-xs font-black rounded-xl shadow-md flex items-center gap-1.5 disabled:opacity-50 ${
                    reviewAction === 'approve'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {isSubmittingReview ? <RefreshCw className="animate-spin" size={14} /> : reviewAction === 'approve' ? <Check size={14} /> : <X size={14} />}
                  {reviewAction === 'approve' ? 'Konfirmasi Setujui' : 'Konfirmasi Tolak'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccessRights;
