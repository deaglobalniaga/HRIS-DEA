import React, { useState, useEffect } from 'react';
import { Briefcase, Users, Plus, Edit2, Trash2, Search } from 'lucide-react';
import api from '../api/api';

const Departments = () => {
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDept, setSelectedDept] = useState(null);
  const [selectedHeadId, setSelectedHeadId] = useState('');
  const [saving, setSaving] = useState(false);

  // Fetch dynamic departments from backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [deptRes, empRes] = await Promise.all([
            api.get('/hris/departments'),
            api.get('/hris/employees')
        ]);
        setDepartments(deptRes.data);
        setEmployees(empRes.data);
      } catch (err) {
        console.error("Failed to fetch data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const openEditModal = (dept) => {
      setSelectedDept(dept);
      // Find the current head's ID if possible, or just default to empty
      const currentHead = employees.find(e => e.full_name === dept.head && (e.division || 'Unassigned') === dept.name);
      setSelectedHeadId(currentHead ? currentHead.id : '');
      setShowEditModal(true);
  };

  const handleSaveHead = async () => {
      setSaving(true);
      try {
          await api.put('/hris/departments/head', {
              divisionName: selectedDept.name,
              newHeadId: selectedHeadId
          });
          setShowEditModal(false);
          // Refresh list
          const deptRes = await api.get('/hris/departments');
          setDepartments(deptRes.data);
      } catch (err) {
          console.error(err);
          alert('Gagal mengubah kepala divisi');
      } finally {
          setSaving(false);
      }
  };

  return (
    <div className="flex flex-col w-full h-full pb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-end mb-8">
        <div className="mt-4 md:mt-0">
          <button 
            onClick={() => alert("Divisi dibentuk secara dinamis berdasarkan data karyawan. Untuk menambah divisi baru, silakan tambah atau edit divisi pada profil karyawan di tab 'Karyawan', dan divisi akan otomatis muncul di sini.")}
            className="flex items-center gap-2 bg-red-900 hover:bg-red-800 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md shadow-red-900/20 transition-all">
            <Plus size={16} /> Tambah Divisi
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Cari divisi..." 
              className="pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-red-900 w-64 bg-white"
            />
          </div>
        </div>
        
        {loading ? (
          <div className="p-8 text-center text-slate-500">Memuat data departemen...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Nama Divisi</th>
                  <th className="px-6 py-4">Kepala Divisi</th>
                  <th className="px-6 py-4">Total Karyawan</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {departments.map((dept) => (
                  <tr key={dept.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-800 flex items-center gap-3">
                      <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
                        <Briefcase size={16} />
                      </div>
                      {dept.name}
                    </td>
                    <td className="px-6 py-4">{dept.head}</td>
                    <td className="px-6 py-4 flex items-center gap-2">
                      <Users size={14} className="text-slate-400" />
                      {dept.employees}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold uppercase rounded-full tracking-wider">
                        {dept.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEditModal(dept)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <Edit2 size={16} />
                        </button>
                        <button className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-not-allowed opacity-50" title="Hanya bisa dihapus jika tidak ada karyawan">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && selectedDept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                        <Briefcase size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-slate-800">Edit Divisi</h2>
                        <p className="text-xs font-bold text-slate-500">{selectedDept.name}</p>
                    </div>
                </div>
                
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Pilih Kepala Divisi Baru</label>
                        <select 
                            value={selectedHeadId}
                            onChange={(e) => setSelectedHeadId(e.target.value)}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-900 focus:border-red-900 transition font-medium text-sm text-slate-700 outline-none"
                        >
                            <option value="">-- Pilih --</option>
                            {employees.filter(e => (e.division || 'Unassigned') === selectedDept.name).map(emp => (
                                <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.job_title || 'Staf'})</option>
                            ))}
                        </select>
                        <p className="text-[10px] text-slate-400 mt-2 font-medium">Hanya karyawan yang tergabung dalam divisi ini yang dapat dipilih.</p>
                    </div>
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                    <button 
                        onClick={() => setShowEditModal(false)}
                        className="flex-1 px-4 py-2.5 rounded-xl font-bold text-sm text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition"
                    >
                        Batal
                    </button>
                    <button 
                        onClick={handleSaveHead}
                        disabled={saving}
                        className="flex-1 px-4 py-2.5 rounded-xl font-bold text-sm text-white bg-red-900 hover:bg-red-800 transition disabled:opacity-50"
                    >
                        {saving ? 'Menyimpan...' : 'Simpan'}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Departments;
