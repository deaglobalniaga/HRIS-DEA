import React, { useState, useEffect } from 'react';
import { FileText, Plus, AlertCircle, UploadCloud, Eye, Trash2, CalendarRange, CheckCircle } from 'lucide-react';
import api from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import PdfViewerModal from '../../components/PdfViewerModal';

const Permissions = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const role = (user?.role || '').toLowerCase();
  const isAdmin = ['admin', 'superadmin', 'super_admin', 'hr', 'hrga_admin', 'hse_admin'].includes(role) ||
    role.includes('admin') || role.includes('hr');

  const [leaves, setLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Admin Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: '',
    leave_type: 'Cuti Roster (2 Minggu)',
    start_date: '',
    end_date: '',
    notes: '',
    document_file: null
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [selectedPdfUrl, setSelectedPdfUrl] = useState('');

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const res = await api.get('/hris/leaves');
      setLeaves(res.data?.allLeaves || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    if (!isAdmin) return;
    try {
      const res = await api.get('/hris/employees');
      setEmployees(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchLeaves();
    fetchEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Smart date calculation when start_date or leave_type changes
  const handleStartDateChange = (e) => {
    const val = e.target.value;
    setFormData(prev => {
      const updated = { ...prev, start_date: val };
      if (val) {
        if (prev.leave_type.includes('Roster')) {
          const d = new Date(val);
          d.setDate(d.getDate() + 13); // 14 days total inclusive
          updated.end_date = d.toISOString().split('T')[0];
        } else if (prev.leave_type.includes('13/1') || prev.leave_type.includes('Libur 13/1')) {
          updated.end_date = val; // 1 day off for 13/1
        }
      }
      return updated;
    });
  };

  const handleLeaveTypeChange = (e) => {
    const val = e.target.value;
    setFormData(prev => {
      const updated = { ...prev, leave_type: val };
      if (prev.start_date) {
        if (val.includes('Roster')) {
          const d = new Date(prev.start_date);
          d.setDate(d.getDate() + 13);
          updated.end_date = d.toISOString().split('T')[0];
        } else if (val.includes('13/1') || val.includes('Libur 13/1')) {
          updated.end_date = prev.start_date; // 1 day off
        }
      }
      return updated;
    });
  };

  const handleCreateLeaveRecord = async (e) => {
    e.preventDefault();
    if (!formData.employee_id || !formData.start_date || !formData.end_date) {
      setMessage('Lengkapi semua kolom bertanda bintang (*)');
      return;
    }

    if (formData.end_date < formData.start_date) {
      setMessage('Tanggal selesai tidak boleh lebih awal dari tanggal mulai.');
      return;
    }

    setSubmitting(true);
    setMessage('');
    try {
      const postForm = new FormData();
      postForm.append('employee_id', formData.employee_id);
      postForm.append('leave_type', formData.leave_type);
      postForm.append('start_date', formData.start_date);
      postForm.append('end_date', formData.end_date);
      postForm.append('notes', formData.notes || '');
      if (formData.document_file) {
        postForm.append('document', formData.document_file);
      }

      await api.post('/hris/leaves', postForm, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      addToast('Pencatatan cuti/libur 13/1 karyawan berhasil disimpan!', 'success');
      setShowAddModal(false);
      setFormData({
        employee_id: '',
        leave_type: 'Cuti Roster (2 Minggu)',
        start_date: '',
        end_date: '',
        notes: '',
        document_file: null
      });
      setMessage('');
      fetchLeaves();
    } catch (err) {
      console.error(err);
      setMessage(err.response?.data?.message || 'Gagal menyimpan data cuti.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLeave = async (id) => {
    if (!window.confirm('Hapus pencatatan kehadiran ini?')) return;
    try {
      await api.delete(`/hris/leaves/${id}`);
      addToast('Data berhasil dihapus.', 'success');
      fetchLeaves();
    } catch (err) {
      console.error('Delete leave error:', err);
      addToast('Gagal menghapus data.', 'error');
    }
  };

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarRange className="text-red-600" size={24} />
            Pencatatan & Monitoring Cuti, Izin, Sakit & Libur 13/1
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Modul log recorder jadwal cuti tahunan, cuti roster 8/2, izin/sakit, serta monitoring wajib off 13/1 karyawan PT DEA GLOBAL NIAGA.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md shadow-red-200 transition-all self-start sm:self-auto cursor-pointer"
          >
            <Plus size={16} /> Catat Cuti / Libur 13/1
          </button>
        )}
      </div>

      {/* Main Table / List */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
            Riwayat Periode Kehadiran & Cuti ({leaves.length} Data)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Nama Pegawai</th>
                <th className="py-3 px-4">Departemen</th>
                <th className="py-3 px-4">Kategori / Jenis</th>
                <th className="py-3 px-4">Periode</th>
                <th className="py-3 px-4 text-center">Durasi</th>
                <th className="py-3 px-4">Dokumen</th>
                {isAdmin && <th className="py-3 px-4 text-right">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400 font-medium">Memuat data kehadiran...</td>
                </tr>
              ) : leaves.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400 font-medium">
                    Belum ada riwayat cuti atau libur 13/1 yang dicatat admin.
                  </td>
                </tr>
              ) : (
                leaves.map((item) => {
                  const is13_1 = (item.leave_type || '').includes('13/1');
                  const isRoster = (item.leave_type || '').includes('Roster');
                  const isSakit = (item.leave_type || '').toLowerCase().includes('sakit');

                  let badgeColor = 'bg-blue-50 text-blue-700 border-blue-100';
                  if (is13_1) badgeColor = 'bg-amber-50 text-amber-900 border-amber-200 font-black';
                  else if (isRoster) badgeColor = 'bg-yellow-50 text-yellow-800 border-yellow-200 font-black';
                  else if (isSakit) badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-extrabold text-slate-900 block">{item.employees?.nama_lengkap || 'Karyawan'}</span>
                        <span className="text-[10px] text-slate-400">{item.employees?.nomor_pegawai || '-'} • {item.employees?.jabatan || 'Staff'}</span>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-600">
                        {item.employees?.departments?.name || 'General'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-1 font-bold rounded-full text-[10px] border ${badgeColor}`}>
                          {item.leave_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        {item.start_date} s/d {item.end_date}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-700 text-center">
                        {item.duration_days || (is13_1 ? 1 : 14)} Hari
                      </td>
                      <td className="py-3 px-4">
                        {item.document_url ? (
                          <button
                            onClick={() => {
                              setSelectedPdfUrl(item.document_url);
                              setShowPdfModal(true);
                            }}
                            className="flex items-center gap-1 text-red-600 hover:text-red-700 font-bold text-[11px] cursor-pointer"
                          >
                            <Eye size={14} /> Lihat Dokumen
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[10px]">-</span>
                        )}
                      </td>
                      {isAdmin && (
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleDeleteLeave(item.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                            title="Hapus"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Explanatory Calculation & Operational Notes Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col md:flex-row gap-4 items-start justify-between text-[11px] text-slate-600">
          <div className="space-y-1.5 flex-1">
            <h4 className="font-black text-slate-800 flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
              <AlertCircle size={14} className="text-red-600" />
              Keterangan Penjelasan Kategori & Perhitungan Kehadiran:
            </h4>
            <ul className="list-disc pl-4 space-y-1 text-slate-600 font-medium">
              <li><strong>Libur 13/1:</strong> Karyawan operasional lapangan wajib mendapatkan istirahat/libur 1 hari penuh setelah menyelesaikan 13 hari kerja berturut-turut sesuai standar K3 & Manajemen Kelelahan (Fatigue Management).</li>
              <li><strong>Cuti Roster (8/2):</strong> Blok libur cuti rotasi selama 14 hari kalender (2 minggu) setelah menyelesaikan masa kerja on-site 8 minggu di area project.</li>
              <li><strong>Cuti Tahunan, Izin & Sakit:</strong> Pencatatan langsung oleh HRGA yang terintegrasi ke kalender operasional dan laporan akumulasi timesheet bulanan.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Admin Add Leave Record Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-6 border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <CalendarRange className="text-red-600" size={18} />
                Pencatatan Cuti / Libur 13/1 Karyawan
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            {message && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl mb-4">
                {message}
              </div>
            )}

            <form onSubmit={handleCreateLeaveRecord} className="flex flex-col gap-3.5 text-xs">
              {/* Employee Selector */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Pilih Karyawan *</label>
                <select
                  value={formData.employee_id}
                  onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-red-600/20 cursor-pointer"
                >
                  <option value="">-- Pilih Karyawan --</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.nama_lengkap} ({e.nomor_pegawai}) - {e.department || 'General'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Leave Type */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Jenis Kehadiran / Cuti *</label>
                <select
                  value={formData.leave_type}
                  onChange={handleLeaveTypeChange}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-red-600/20 cursor-pointer"
                >
                  <option value="Cuti Roster (2 Minggu)">Cuti Roster (2 Minggu - 8/2 Shift)</option>
                  <option value="Libur 13/1 (Wajib Off Site)">Libur 13/1 (13 Hari Kerja & 1 Hari Libur Off)</option>
                  <option value="Cuti Tahunan">Cuti Tahunan</option>
                  <option value="Izin Resmi">Izin Resmi</option>
                  <option value="Sakit (Surat Dokter)">Sakit (Surat Dokter)</option>
                </select>
              </div>

              {/* Start Date & End Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tanggal Mulai *</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={handleStartDateChange}
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-red-600/20 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tanggal Selesai *</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    min={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-red-600/20 cursor-pointer"
                  />
                </div>
              </div>

              {/* Document Upload */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Dokumen Lampiran (PDF / Surat Dokter / Form Cuti)</label>
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={(e) => setFormData({ ...formData, document_file: e.target.files[0] })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Catatan Tambahan</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Keterangan tiket, periode roster, atau serah terima pekerjaan..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 outline-none focus:ring-2 focus:ring-red-600/20 resize-none"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-md shadow-red-200 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Pencatatan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PDF Viewer Modal */}
      {showPdfModal && (
        <PdfViewerModal
          url={selectedPdfUrl}
          fileName="Dokumen Lampiran Cuti / Izin"
          onClose={() => setShowPdfModal(false)}
        />
      )}
    </div>
  );
};

export default Permissions;

