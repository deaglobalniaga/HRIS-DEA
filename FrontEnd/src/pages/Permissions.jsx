import { FileText, Plus, Check, X, AlertCircle, UploadCloud, Eye } from 'lucide-react';
import { useState, useEffect } from 'react';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';

const Permissions = () => {
  const { user } = useAuth();
  const isAdmin = user?.role?.toLowerCase().includes('admin') || user?.role?.toLowerCase().includes('hr');
  const [activeTab, setActiveTab] = useState('Semua');
  const [permissions, setPermissions] = useState([]);
  const [, setLoading] = useState(true);

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [permForm, setPermForm] = useState({ type: 'Izin', date: '', endDate: '', reason: '', proof_base64: '', proof_url: '' });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [selectedPdfUrl, setSelectedPdfUrl] = useState('');

  const fetchPermissions = async () => {
    try {
      const res = await api.get('/hris/permissions');
      setPermissions(res.data);
    } catch (err) {
      console.error(err);
      setPermissions([
        { id: 1, type: 'Izin', date: '10 Jul 2026', reason: 'Urusan Keluarga', status: 'Disetujui', name: 'Sarah Connor', role: 'Support' },
        { id: 2, type: 'Sakit', date: '12 Jul 2026', reason: 'Demam Berdarah', status: 'Menunggu', name: 'John Doe', role: 'Project SPV' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, []);

  const handleAddPermission = async (e) => {
    e.preventDefault();

    if (!permForm.date) {
      setMessage('Pilih tanggal pengajuan');
      return;
    }

    if (!permForm.proof_base64) {
      setMessage('Dokumen pendukung (surat dokter/bukti PDF) wajib diunggah');
      return;
    }

    setSubmitting(true);
    setMessage('');
    try {
      if (permForm.type === 'Cuti') {
        // Calculate end date (+14 days)
        const startDate = new Date(permForm.date);
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 14);

        await api.post('/hris/leaves', {
          leave_start: permForm.date,
          leave_end: endDate.toISOString().split('T')[0],
          reason: permForm.reason,
          proof_base64: permForm.proof_base64
        });
      } else {
        let finalReason = permForm.reason;
        if (permForm.endDate && permForm.endDate !== permForm.date) {
          finalReason = `(${permForm.date} s/d ${permForm.endDate}) - ${permForm.reason}`;
        }
        await api.post('/hris/permissions', {
          type: permForm.type,
          date: permForm.date,
          reason: finalReason,
          proof_base64: permForm.proof_base64
        });
      }

      setMessage('Pengajuan berhasil dikirim!');
      setTimeout(() => {
        setShowAddModal(false);
        setPermForm({ type: 'Izin', date: '', endDate: '', reason: '', proof_base64: '', proof_url: '' });
        setMessage('');
        fetchPermissions(); // Refresh list after submitting
      }, 1500);
    } catch (err) {
      setMessage(err.response?.data?.error || 'Gagal mengirim pengajuan.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setMessage('Gagal: File harus berupa PDF.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setMessage('Gagal: Ukuran file maksimal 2MB.');
      return;
    }

    setUploading(true);
    setMessage('');

    const reader = new FileReader();
    reader.onloadend = () => {
      setPermForm({ ...permForm, proof_base64: reader.result, proof_url: file.name });
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await api.put(`/hris/permissions/${id}/status`, { status });
      fetchPermissions(); // Refresh the list
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const filteredPermissions = activeTab === 'Semua'
    ? permissions
    : permissions.filter(p => p.type === activeTab);

  return (
    <div className="w-full">
      <div className="mb-8 flex justify-between items-end">
        <div>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-red-900 hover:bg-red-800 text-white px-5 py-2.5 rounded-xl font-bold shadow-md transition-colors text-sm flex items-center">
          <Plus size={18} className="mr-2" /> Buat Pengajuan
        </button>
      </div>

      <div className="bg-white rounded-[1.5rem] p-6 shadow-sm border border-slate-100">

        {/* Tabs */}
        <div className="flex space-x-2 mb-6 border-b border-slate-100 pb-4 overflow-x-auto scrollbar-hide">
          {['Semua', 'Cuti', 'Sakit', 'Izin'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 whitespace-nowrap rounded-full text-xs font-bold transition-colors ${activeTab === tab
                  ? 'bg-red-900 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="space-y-4">
          {filteredPermissions.map((item, index) => (
            <div key={item.id || index} className="flex flex-col md:flex-row md:items-center justify-between p-4 border border-slate-100 rounded-2xl hover:border-red-100 hover:shadow-sm transition-all group">
              <div className="flex items-start gap-4 mb-4 md:mb-0">
                <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-red-50 group-hover:text-red-900 transition-colors">
                  <FileText size={24} />
                </div>
                <div>
                  <h3 className="font-black text-gray-900 text-sm">{item.type} - {item.name}</h3>
                  <p className="text-xs text-slate-500 font-medium">{item.date} • {item.reason}</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-1 font-bold">{item.role}</p>
                  {item.proof_url && (
                    <button
                      onClick={() => { setSelectedPdfUrl(item.proof_url); setShowPdfModal(true); }}
                      className="mt-2 flex items-center text-xs font-bold text-red-900 hover:underline cursor-pointer"
                    >
                      <Eye size={14} className="mr-1" /> Lihat Dokumen
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center ${item.status === 'Approved' ? 'bg-green-50 text-green-700 border border-green-100' :
                    item.status === 'Approved_Atasan' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                      item.status === 'Rejected' ? 'bg-red-50 text-red-700 border border-red-100' :
                        'bg-orange-50 text-orange-700 border border-orange-100'
                  }`}>
                  {item.status === 'Approved' && <Check size={14} className="mr-1.5" />}
                  {item.status === 'Approved_Atasan' && <AlertCircle size={14} className="mr-1.5" />}
                  {item.status === 'Rejected' && <X size={14} className="mr-1.5" />}
                  {item.status === 'Pending' && <AlertCircle size={14} className="mr-1.5" />}
                  {item.status === 'Approved_Atasan' ? 'Disetujui Atasan' : item.status}
                </div>

                {/* Admin Actions */}
                {isAdmin && item.status === 'Pending' && (
                  <div className="flex gap-1 ml-2">
                    <button onClick={() => handleUpdateStatus(item.id, 'Approved_Atasan')} title="Setujui sebagai Atasan" className="px-2 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-[10px] transition-colors flex items-center gap-1">
                      <Check size={12} /> Atasan
                    </button>
                    <button onClick={() => handleUpdateStatus(item.id, 'Rejected')} title="Tolak" className="w-8 h-8 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 flex items-center justify-center transition-colors">
                      <X size={16} />
                    </button>
                  </div>
                )}
                {isAdmin && item.status === 'Approved_Atasan' && (
                  <div className="flex gap-1 ml-2">
                    <button onClick={() => handleUpdateStatus(item.id, 'Approved')} title="Setujui sebagai HR" className="px-2 py-1 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 font-bold text-[10px] transition-colors flex items-center gap-1">
                      <Check size={12} /> HR
                    </button>
                    <button onClick={() => handleUpdateStatus(item.id, 'Rejected')} title="Tolak" className="w-8 h-8 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 flex items-center justify-center transition-colors">
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Add Permission Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-black text-gray-900">Buat Pengajuan Baru</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-red-500 transition">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleAddPermission} className="p-6 space-y-4">
              {message && (
                <div className={`p-3 text-sm font-bold rounded-xl ${message.includes('Gagal') ? 'bg-red-50 text-red-900' : 'bg-green-50 text-green-700'}`}>
                  {message}
                </div>
              )}

              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Jenis Pengajuan</label>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <label className="cursor-pointer">
                  <input type="radio" name="permType" className="peer sr-only" checked={permForm.type === 'Cuti'} onChange={() => setPermForm({ ...permForm, type: 'Cuti' })} />
                  <div className="text-center py-2 rounded-xl border border-slate-200 peer-checked:border-red-900 peer-checked:bg-red-50 peer-checked:text-red-900 font-bold text-xs transition text-slate-500">Cuti</div>
                </label>
                <label className="cursor-pointer">
                  <input type="radio" name="permType" className="peer sr-only" checked={permForm.type === 'Sakit'} onChange={() => setPermForm({ ...permForm, type: 'Sakit' })} />
                  <div className="text-center py-2 rounded-xl border border-slate-200 peer-checked:border-red-900 peer-checked:bg-red-50 peer-checked:text-red-900 font-bold text-xs transition text-slate-500">Sakit</div>
                </label>
                <label className="cursor-pointer">
                  <input type="radio" name="permType" className="peer sr-only" checked={permForm.type === 'Izin'} onChange={() => setPermForm({ ...permForm, type: 'Izin' })} />
                  <div className="text-center py-2 rounded-xl border border-slate-200 peer-checked:border-red-900 peer-checked:bg-red-50 peer-checked:text-red-900 font-bold text-xs transition text-slate-500">Izin</div>
                </label>
              </div>

              {permForm.type === 'Cuti' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Tanggal Mulai Cuti (14 Hari)
                  </label>
                  <input
                    type="date"
                    required
                    value={permForm.date}
                    onChange={(e) => setPermForm({ ...permForm, date: e.target.value })}
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-900 focus:border-red-900 transition font-medium text-sm text-slate-700"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Dari Tanggal
                    </label>
                    <input
                      type="date"
                      required
                      value={permForm.date}
                      onChange={(e) => setPermForm({ ...permForm, date: e.target.value })}
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-900 focus:border-red-900 transition font-medium text-sm text-slate-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Sampai Tanggal
                    </label>
                    <input
                      type="date"
                      required
                      value={permForm.endDate}
                      onChange={(e) => setPermForm({ ...permForm, endDate: e.target.value })}
                      min={permForm.date}
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-900 focus:border-red-900 transition font-medium text-sm text-slate-700"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Keterangan / Alasan</label>
                <textarea
                  required
                  value={permForm.reason}
                  onChange={(e) => setPermForm({ ...permForm, reason: e.target.value })}
                  placeholder="Detail pengajuan..."
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-900 focus:border-red-900 transition font-medium text-sm text-slate-700 resize-none h-24"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Upload Dokumen Pendukung (PDF Maks 2MB - Wajib)</label>
                <label className={`w-full flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${permForm.proof_base64 ? 'border-green-500 bg-green-50' : 'border-slate-300 hover:bg-slate-50 bg-slate-50/50'}`}>
                  <input type="file" required={!permForm.proof_base64} className="hidden" accept="application/pdf" onChange={handleFileUpload} />
                  {uploading ? (
                    <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                  ) : permForm.proof_base64 ? (
                    <>
                      <Check className="text-green-500 mb-1" size={24} />
                      <span className="text-xs font-bold text-green-700">Dokumen Terunggah ({permForm.proof_url})</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="text-slate-400 mb-1" size={24} />
                      <span className="text-xs font-bold text-slate-500">Klik untuk upload surat dokter/pendukung</span>
                    </>
                  )}
                </label>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-red-900 text-white font-bold rounded-xl hover:bg-red-800 transition disabled:opacity-50">
                  {submitting ? 'Memproses...' : 'Submit Pengajuan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PDF Viewer Modal */}
      {showPdfModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4 lg:p-10">
          <div className="bg-white rounded-3xl w-full max-w-4xl h-full max-h-screen overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-black text-gray-900">Peninjauan Dokumen</h2>
              <button onClick={() => setShowPdfModal(false)} className="text-slate-400 hover:text-red-500 transition p-2 bg-white rounded-xl shadow-sm">
                <X size={20} strokeWidth={3} />
              </button>
            </div>
            <div className="flex-1 bg-slate-100 p-2 lg:p-4">
              {selectedPdfUrl ? (
                <object
                  data={selectedPdfUrl}
                  type="application/pdf"
                  className="w-full h-full rounded-2xl border-0 shadow-sm"
                >
                  <div className="flex flex-col items-center justify-center h-full text-slate-500">
                    <p>Browser Anda tidak mendukung preview PDF langsung.</p>
                    <a href={selectedPdfUrl} download="dokumen.pdf" className="mt-2 text-red-900 font-bold underline">Download PDF</a>
                  </div>
                </object>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold">
                  Dokumen tidak ditemukan
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Permissions;
