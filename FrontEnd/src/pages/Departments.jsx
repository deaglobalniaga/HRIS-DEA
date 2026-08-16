import React, { useState, useEffect, useCallback } from 'react';
import { Briefcase, Users, Plus, Edit2, Save, User, Filter } from 'lucide-react';
import api from '../api/api';
import { ReactFlow, MiniMap, Controls, Background, useNodesState, useEdgesState, addEdge, Handle, Position } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// Custom Node Component to look like our beautiful cards
const DepartmentNode = ({ data }) => {
  return (
    <div className="p-4 bg-white border border-slate-200 shadow-md rounded-2xl min-w-[150px] relative group hover:border-red-900 hover:shadow-lg transition-all">
      <Handle type="target" position={Position.Top} className="w-4 h-4 bg-red-500 border-2 border-white hover:scale-150 transition-transform cursor-pointer" title="Tarik garis penghubung ke sini" />
      
      {data.onEdit && (
        <button 
            onClick={() => data.onEdit(data.dept)}
            className="absolute -top-2 -right-2 bg-red-900 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10"
        >
            <Edit2 size={12} />
        </button>
      )}
      
      <div className="flex flex-col items-center gap-1">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mb-1 border border-slate-200">
              <User size={18} />
          </div>
          <h4 className="font-black text-sm text-gray-900 text-center">{data.head || '-'}</h4>
          <p className="text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full uppercase tracking-wider text-center">{data.title}</p>
          {data.subtitle && <p className="text-[10px] font-medium text-slate-400 mt-1 text-center">{data.subtitle}</p>}
          {data.count !== undefined && (
              <div className="mt-2 text-[10px] font-bold text-slate-500 flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                  <Users size={10} /> {data.count} Karyawan
              </div>
          )}
      </div>

      <Handle type="source" position={Position.Bottom} className="w-4 h-4 bg-blue-500 border-2 border-white hover:scale-150 transition-transform cursor-pointer" title="Tarik garis penghubung dari sini" />
    </div>
  );
};

const nodeTypes = {
  departmentNode: DepartmentNode,
};

const Departments = () => {
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // React Flow State
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDept, setSelectedDept] = useState(null);
  const [selectedHeadId, setSelectedHeadId] = useState('');
  const [saving, setSaving] = useState(false);
  const [savingStructure, setSavingStructure] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [deptRes, empRes] = await Promise.all([
          api.get('/hris/departments'),
          api.get('/hris/employees')
      ]);
      const fetchedDepts = deptRes.data;
      setDepartments(fetchedDepts);
      setEmployees(empRes.data);
      
      // Map to nodes and edges
      const newNodes = fetchedDepts.map((dept, index) => {
        return {
          id: dept.id,
          type: 'departmentNode',
          position: { 
            x: dept.position_x || (index * 200), 
            y: dept.position_y || (dept.parent_id ? 150 : 50) 
          },
          data: {
            title: dept.name,
            head: dept.head,
            count: dept.employees,
            dept: dept,
            onEdit: openEditModal
          },
        };
      });

      const newEdges = [];
      fetchedDepts.forEach(dept => {
        if (dept.parent_id) {
          newEdges.push({
            id: `e${dept.parent_id}-${dept.id}`,
            source: dept.parent_id,
            target: dept.id,
            type: 'smoothstep',
            animated: false,
          });
        }
      });

      setNodes(newNodes);
      setEdges(newEdges);

    } catch (err) {
      console.error("Failed to fetch data", err);
    } finally {
      setLoading(false);
    }
  };

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, type: 'smoothstep' }, eds)),
    [setEdges],
  );

  const handleSaveStructure = async () => {
    setSavingStructure(true);
    try {
      // Rebuild structure based on nodes and edges
      const nodesData = nodes.map(node => {
        // find if it has an incoming edge (target = node.id)
        const incomingEdge = edges.find(e => e.target === node.id);
        const parent_id = incomingEdge ? incomingEdge.source : null;
        
        return {
          id: node.id,
          position_x: Math.round(node.position.x),
          position_y: Math.round(node.position.y),
          parent_id: parent_id
        };
      });

      await api.put('/hris/departments/structure', { nodes: nodesData });
      alert('Struktur organisasi berhasil disimpan!');
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan struktur organisasi');
    } finally {
      setSavingStructure(false);
    }
  };

  const openEditModal = useCallback((dept) => {
      setSelectedDept(dept);
      // We use the most current employees state which we have loaded
      // Wait, employees is in outer scope, useCallback needs employees in dep array or ref.
      // But since employees doesn't change often it's fine if we omit, but better to just not use useCallback for openEditModal if we depend on changing state.
  }, []);

  useEffect(() => {
    // Update node data when employees or selectedDept logic changes
    // Specifically, re-inject onEdit so it has fresh closure if needed.
    setNodes((nds) => 
      nds.map(node => {
        node.data = {
          ...node.data,
          onEdit: (d) => {
            setSelectedDept(d);
            const currentHead = employees.find(e => (e.nama || e.full_name) === d.head && (e.department || e.division || 'Unassigned').toUpperCase() === d.name.toUpperCase());
            setSelectedHeadId(currentHead ? currentHead.id : '');
            setShowEditModal(true);
          }
        };
        return node;
      })
    );
  }, [employees]);

  const handleSaveHead = async () => {
      setSaving(true);
      try {
          await api.put('/hris/departments/head', {
              divisionName: selectedDept.name,
              newHeadId: selectedHeadId
          });
          setShowEditModal(false);
          fetchData(); // Refresh list to get updated heads
      } catch (err) {
          console.error(err);
          alert('Gagal mengubah kepala divisi');
      } finally {
          setSaving(false);
      }
  };

  return (
    <div className="flex flex-col w-full h-[calc(100vh-140px)] pb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 flex-shrink-0">
        <div>
            <h2 className="text-2xl font-black text-gray-900">Struktur Organisasi</h2>
            <p className="text-sm font-bold text-slate-500 mt-1">Susun struktur hirarki dengan drag & drop dan tarik garis antar divisi</p>
        </div>
        <div className="mt-4 md:mt-0 flex gap-3">
          <button className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all" title="Filter Departemen">
            <Filter size={18} /> <span className="hidden md:inline">Filter</span>
          </button>
          <button 
            onClick={handleSaveStructure}
            disabled={savingStructure}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-green-600/20 transition-all disabled:opacity-50"
          >
            <Save size={18} /> {savingStructure ? 'Menyimpan...' : 'Simpan Struktur'}
          </button>
          <button 
            onClick={() => alert("Untuk menambah divisi baru, silakan tambah divisi pada profil karyawan di tab 'Karyawan', divisi otomatis terbentuk di sini.")}
            className="flex items-center gap-2 bg-red-900 hover:bg-red-800 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-red-900/20 transition-all">
            <Plus size={18} /> Info
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden flex-grow relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center text-slate-500 font-bold bg-slate-50/50 z-10">Memuat struktur organisasi...</div>
        ) : null}
        
        <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
            className="bg-slate-50/50"
        >
            <Controls />
            <MiniMap 
              nodeColor={(node) => {
                return '#991b1b';
              }}
              nodeStrokeWidth={3}
            />
            <Background color="#cbd5e1" gap={16} />
        </ReactFlow>
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
                        <h2 className="text-lg font-black text-slate-800">Edit Kepala Divisi</h2>
                        <p className="text-xs font-bold text-slate-500">{selectedDept.name}</p>
                    </div>
                </div>
                
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Pilih Kepala Divisi Baru</label>
                        <select 
                            value={selectedHeadId}
                            onChange={(e) => setSelectedHeadId(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-900 focus:border-red-900 transition font-bold text-sm text-slate-700 outline-none"
                        >
                            <option value="">-- Kosong / Belum Ada --</option>
                            {employees.filter(e => (e.department || e.division || 'Unassigned').toUpperCase() === selectedDept.name.toUpperCase()).map(emp => (
                                <option key={emp.id} value={emp.id}>{emp.full_name || emp.nama} ({emp.job_title || emp.jabatan || 'Staf'})</option>
                            ))}
                        </select>
                        <p className="text-[10px] text-slate-400 mt-3 font-medium bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <strong>Info:</strong> Hanya karyawan yang tergabung dalam departemen <strong>{selectedDept.name}</strong> yang dapat dipilih sebagai kepala.
                        </p>
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
                        {saving ? 'Menyimpan...' : 'Simpan Kepala Divisi'}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Departments;
