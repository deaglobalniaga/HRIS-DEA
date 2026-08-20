import React, { useState, useEffect } from 'react';
import {
  Building2, Layers, Users, Search, Edit3, Check, X,
  RefreshCw, ShieldCheck, Briefcase, Plus, Filter, AlertCircle
} from 'lucide-react';
import OrganizationChart from '../../components/common/OrganizationChart';
import api from '../../api/api';
import { useToast } from '../../context/ToastContext';

const Departments = ({ readOnly = false }) => {
  const { addToast } = useToast();
  const [subTab, setSubTab] = useState('chart'); // 'chart' | 'manage'
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('ALL');

  // Inline Editing State
  const [editingEmpId, setEditingEmpId] = useState(null);
  const [empForm, setEmpForm] = useState({
    nama: '',
    department: 'Project',
    jabatan: '',
    level: 'LEVEL 6 (ENGINEER/TEKNISI)',
    penempatan: 'Site BIB'
  });
  const [saving, setSaving] = useState(false);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await api.get('/hris/employees');
      setEmployees(res.data || []);
    } catch (err) {
      console.error('Failed to fetch employees in Departments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!readOnly) {
      fetchEmployees();
    }
  }, [readOnly]);

  const startEdit = (emp) => {
    setEditingEmpId(emp.id);
    setEmpForm({
      nama: emp.nama || emp.nama_lengkap || '',
      department: emp.department || emp.departments?.name || 'Project',
      jabatan: emp.jabatan || 'Staff',
      level: emp.level || 'LEVEL 6 (ENGINEER/TEKNISI)',
      penempatan: emp.penempatan || 'Site BIB'
    });
  };

  const cancelEdit = () => {
    setEditingEmpId(null);
  };

  const handleSavePosition = async (empId) => {
    setSaving(true);
    try {
      await api.put(`/hris/employees/${empId}`, {
        nama: empForm.nama,
        nama_lengkap: empForm.nama,
        department: empForm.department,
        jabatan: empForm.jabatan,
        level: empForm.level,
        penempatan: empForm.penempatan
      });

      addToast('Jabatan dan departemen karyawan berhasil diperbarui!', 'success');
      setEditingEmpId(null);
      fetchEmployees();
    } catch (err) {
      console.error('Update position error:', err);
      addToast(err.response?.data?.error || err.response?.data?.message || 'Gagal memperbarui posisi', 'error');
    } finally {
      setSaving(false);
    }
  };

  const filteredEmployees = employees.filter(e => {
    const term = searchTerm.toLowerCase();
    const nama = (e.nama || e.nama_lengkap || '').toLowerCase();
    const jabatan = (e.jabatan || '').toLowerCase();
    const dept = (e.department || e.departments?.name || '').toLowerCase();
    const nip = (e.nomor_pegawai || '').toLowerCase();

    const matchesSearch = nama.includes(term) || jabatan.includes(term) || dept.includes(term) || nip.includes(term);
    const matchesDept = selectedDeptFilter === 'ALL' || dept.includes(selectedDeptFilter.toLowerCase());
    return matchesSearch && matchesDept;
  });

  return (
    <div className="w-full flex flex-col gap-4 font-sans animate-in fade-in">
      {/* Tab Switcher Header */}
      {!readOnly ? (
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Briefcase size={18} className="text-red-700" /> Pengelolaan Departemen & Jabatan
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Atur struktur hirarki, penempatan posisi jabatan, dan divisi kerja personel PT DEA GLOBAL NIAGA.
            </p>
          </div>

          <div className="flex p-1 bg-slate-100 rounded-2xl gap-1 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setSubTab('chart')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
                subTab === 'chart' ? 'bg-red-700 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers size={14} /> Bagan Struktur Organisasi
            </button>
            <button
              type="button"
              onClick={() => setSubTab('manage')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
                subTab === 'manage' ? 'bg-red-700 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Edit3 size={14} /> Pengaturan Jabatan & Posisi
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Briefcase size={18} className="text-slate-700" /> Struktur Organisasi & Departemen
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Tampilan hirarki resmi struktur organisasi (Mode Read-Only Super Admin).
            </p>
          </div>
          <span className="text-xs font-black bg-slate-100 text-slate-600 px-3 py-1 rounded-full border border-slate-200">
            Read-Only
          </span>
        </div>
      )}

      {/* VIEW 1: ORGANIZATIONAL CHART VIEW */}
      {(readOnly || subTab === 'chart') && (
        <div className="w-full">
          <OrganizationChart />
        </div>
      )}

      {/* VIEW 2: EDITABLE POSITION & DEPARTMENT MANAGER */}
      {!readOnly && subTab === 'manage' && (
        <div className="w-full flex flex-col gap-4 animate-in fade-in">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-80">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama, NIP, atau jabatan..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-red-900/20 font-medium"
                />
              </div>

              <select
                value={selectedDeptFilter}
                onChange={e => setSelectedDeptFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
              >
                <option value="ALL">Semua Departemen</option>
                <option value="Project">Project</option>
                <option value="Maintenance">Maintenance</option>
                <option value="HRGA">HRGA</option>
                <option value="Pengelola KO">Pengelola KO</option>
                <option value="Pengelola K3">Pengelola K3</option>
                <option value="Direksi">Direksi & Manajemen</option>
              </select>
            </div>

            <button
              onClick={fetchEmployees}
              className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl transition"
              title="Refresh data"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex items-center justify-center h-48">
                  <div className="w-8 h-8 border-4 border-red-700 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-500 font-black">
                      <th className="p-3.5">No</th>
                      <th className="p-3.5">Nama Personel</th>
                      <th className="p-3.5">Departemen</th>
                      <th className="p-3.5">Jabatan Kerja</th>
                      <th className="p-3.5">Tingkatan (Level)</th>
                      <th className="p-3.5">Penempatan</th>
                      <th className="p-3.5 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-medium">
                    {filteredEmployees.map((emp, idx) => {
                      const isEditing = editingEmpId === emp.id;
                      const deptName = emp.department || emp.departments?.name || 'Operasional';

                      if (isEditing) {
                        return (
                          <tr key={emp.id} className="bg-red-50/40 transition-colors">
                            <td className="p-3.5 font-bold text-slate-400">{idx + 1}</td>
                            <td className="p-3.5">
                              <input
                                type="text"
                                value={empForm.nama}
                                onChange={e => setEmpForm(prev => ({ ...prev, nama: e.target.value }))}
                                className="w-full px-2.5 py-1.5 bg-white border border-red-300 rounded-lg text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-red-900/20"
                              />
                            </td>
                            <td className="p-3.5">
                              <select
                                value={empForm.department}
                                onChange={e => setEmpForm(prev => ({ ...prev, department: e.target.value }))}
                                className="w-full px-2.5 py-1.5 bg-white border border-red-300 rounded-lg text-xs font-bold text-slate-900 outline-none"
                              >
                                <option value="Project">Project</option>
                                <option value="Maintenance">Maintenance</option>
                                <option value="HRGA">HRGA</option>
                                <option value="Pengelola KO">Pengelola KO</option>
                                <option value="Pengelola K3">Pengelola K3 & Safety</option>
                                <option value="Direksi & Pimpinan">Direksi & Pimpinan</option>
                              </select>
                            </td>
                            <td className="p-3.5">
                              <input
                                type="text"
                                value={empForm.jabatan}
                                onChange={e => setEmpForm(prev => ({ ...prev, jabatan: e.target.value }))}
                                placeholder="Contoh: Staff / Coordinator"
                                className="w-full px-2.5 py-1.5 bg-white border border-red-300 rounded-lg text-xs font-bold text-slate-900 outline-none"
                              />
                            </td>
                            <td className="p-3.5">
                              <select
                                value={empForm.level}
                                onChange={e => setEmpForm(prev => ({ ...prev, level: e.target.value }))}
                                className="w-full px-2.5 py-1.5 bg-white border border-red-300 rounded-lg text-xs font-bold text-slate-900 outline-none"
                              >
                                <option value="LEVEL 1 (DIREKSI)">LEVEL 1 (DIREKSI)</option>
                                <option value="LEVEL 2 (PJO)">LEVEL 2 (PJO)</option>
                                <option value="LEVEL 3 (MANAGER)">LEVEL 3 (MANAGER)</option>
                                <option value="LEVEL 4 (SUPERINTENDENT)">LEVEL 4 (SUPERINTENDENT)</option>
                                <option value="LEVEL 5 (SUPERVISOR)">LEVEL 5 (SUPERVISOR)</option>
                                <option value="LEVEL 6 (ENGINEER/TEKNISI)">LEVEL 6 (ENGINEER/TEKNISI)</option>
                                <option value="STAFF">STAFF</option>
                              </select>
                            </td>
                            <td className="p-3.5">
                              <select
                                value={empForm.penempatan}
                                onChange={e => setEmpForm(prev => ({ ...prev, penempatan: e.target.value }))}
                                className="w-full px-2.5 py-1.5 bg-white border border-red-300 rounded-lg text-xs font-bold text-slate-900 outline-none"
                              >
                                <option value="Site BIB">Site BIB</option>
                                <option value="HO">Head Office (HO)</option>
                              </select>
                            </td>
                            <td className="p-3.5 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleSavePosition(emp.id)}
                                  disabled={saving}
                                  className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition shadow-sm"
                                  title="Simpan perubahan posisi"
                                >
                                  <Check size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEdit}
                                  className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition"
                                  title="Batal"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-3.5 font-bold text-slate-400">{idx + 1}</td>
                          <td className="p-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-black text-[10px] flex items-center justify-center shrink-0">
                                {(emp.nama_lengkap || emp.nama || 'U').slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-900">{emp.nama_lengkap || emp.nama}</h4>
                                <p className="text-[10px] text-slate-400 font-mono">{emp.nomor_pegawai || '-'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-3.5">
                            <span className="text-[10px] font-black bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full border border-blue-200">
                              {deptName}
                            </span>
                          </td>
                          <td className="p-3.5 font-bold text-slate-800">{emp.jabatan || 'Staff'}</td>
                          <td className="p-3.5 text-slate-600 text-[11px] font-medium">{emp.level || 'STAFF'}</td>
                          <td className="p-3.5 text-slate-700 font-bold">{emp.penempatan || 'Site BIB'}</td>
                          <td className="p-3.5 text-center">
                            <button
                              type="button"
                              onClick={() => startEdit(emp)}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 rounded-xl font-bold text-xs transition border border-slate-200 hover:border-red-200 flex items-center justify-center gap-1 mx-auto"
                            >
                              <Edit3 size={13} /> Edit Posisi
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Departments;
