import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Users, Building2, Search, Briefcase, Shield, Award,
  ChevronDown, ChevronRight, UserCheck, CheckCircle2, Filter,
  ZoomIn, ZoomOut, RotateCcw, Move, Edit3, Plus, Trash2, Save,
  Maximize2, Sparkles, Check, X, ShieldAlert, ArrowDown, GripVertical, Lock
} from 'lucide-react';
import api from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

// Certification Badges Definitions with official colors from PDF
export const CERT_DEFINITIONS = {
  POM: { label: 'POM', color: 'bg-lime-400 text-lime-950 border-lime-500', name: 'Pengawas Operasional Madya' },
  POP: { label: 'POP', color: 'bg-blue-600 text-white border-blue-700', name: 'Pengawas Operasional Pertama' },
  AK3U: { label: 'AK3U', color: 'bg-red-600 text-white border-red-700', name: 'Ahli K3 Umum' },
  AK3_Listrik: { label: 'AK3 Listrik', color: 'bg-yellow-400 text-yellow-950 border-yellow-500', name: 'AK3 Listrik' },
  WAH: { label: 'WAH', color: 'bg-orange-500 text-white border-orange-600', name: 'Working at Height' },
  Teknisi_Listrik: { label: 'Teknisi Listrik', color: 'bg-amber-300 text-amber-950 border-amber-400', name: 'Teknisi Listrik' },
  MTCNA: { label: 'MTCNA', color: 'bg-purple-600 text-white border-purple-700', name: 'MikroTik Certified Network Associate' },
  Ubiqty: { label: 'Ubiqty', color: 'bg-cyan-500 text-white border-cyan-600', name: 'Ubiquiti Network Specialist' },
  FO: { label: 'FO', color: 'bg-emerald-500 text-white border-emerald-600', name: 'Fiber Optic Specialist' },
  TOT: { label: 'TOT', color: 'bg-teal-700 text-white border-teal-800', name: 'Training of Trainer' },
  First_Aid: { label: 'First Aid', color: 'bg-emerald-700 text-white border-emerald-800', name: 'Pertolongan Pertama (P3K)' },
  Operator_Drone: { label: 'Operator Drone', color: 'bg-rose-700 text-white border-rose-800', name: 'Lisensi Operator Drone' },
  Teknisi_Geoteknik: { label: 'Teknisi Geoteknik', color: 'bg-amber-800 text-white border-amber-900', name: 'Teknisi Geoteknik' },
  Building_Construction: { label: 'Building Construction', color: 'bg-stone-600 text-white border-stone-700', name: 'Building Construction' },
  CSMC: { label: 'CSMC', color: 'bg-orange-400 text-orange-950 border-orange-500', name: 'Certified Safety Management' }
};

// Initial Canvas Node Positions & Structure mirroring official PDF
const INITIAL_CANVAS_NODES = [
  {
    id: 'direksi',
    role: 'DIREKSI',
    division: 'Direksi & Pimpinan',
    members: [{ name: 'AGUS MUHAROM', title: 'Direktur Utama', certs: [] }],
    color: 'red',
    x: 750,
    y: 40,
    width: 220,
    parent: null
  },
  {
    id: 'ktt',
    role: 'KTT',
    division: 'Direksi & Pimpinan',
    members: [{ name: 'RIADI SIMKA PINEM', title: 'Kepala Teknik Tambang (KTT)', certs: [] }],
    color: 'navy',
    x: 1060,
    y: 115,
    width: 220,
    parent: 'direksi',
    lineType: 'dashed'
  },
  {
    id: 'pjo',
    role: 'PJO',
    division: 'Direksi & Pimpinan',
    members: [{ name: 'ABDUL RAHMAT', title: 'Penanggung Jawab Operasional', certs: ['POM', 'POP'] }],
    color: 'darkred',
    x: 750,
    y: 175,
    width: 220,
    parent: 'direksi'
  },
  {
    id: 'deputy',
    role: 'DEPUTY MANAGER',
    division: 'Direksi & Pimpinan',
    members: [{ name: 'DANAR PRASETYO U', title: 'Deputy Manager', certs: ['POM', 'POP', 'WAH', 'CSMC'] }],
    color: 'white_red',
    x: 750,
    y: 305,
    width: 220,
    parent: 'pjo'
  },

  // Division 1: HRGA
  {
    id: 'coor_hrga',
    role: 'COOR HRGA',
    division: 'HRGA',
    members: [{ name: 'RISWAN RIYADI', title: 'Coordinator HRGA', certs: ['POP'] }],
    color: 'blue',
    x: 70,
    y: 470,
    width: 200,
    parent: 'deputy'
  },
  {
    id: 'staff_hrga',
    role: 'STAFF HRGA',
    division: 'HRGA',
    members: [
      { name: 'DAVID OLOAN P', certs: [] },
      { name: 'YOEL ERRI S', certs: [] },
      { name: 'ANNISA FERDA', certs: [] }
    ],
    color: 'blue',
    x: 70,
    y: 610,
    width: 200,
    parent: 'coor_hrga'
  },

  // Division 2: Pengelola KO
  {
    id: 'pengelola_ko',
    role: 'PENGELOLA KO',
    division: 'Pengelola KO',
    members: [
      { name: 'SETYADI', certs: ['POP'] },
      { name: 'WAHYU N', certs: ['POP'] }
    ],
    color: 'green',
    x: 320,
    y: 470,
    width: 200,
    parent: 'deputy'
  },

  // Division 3: Pengelola K3
  {
    id: 'pengelola_k3_lead',
    role: 'PENGELOLA K3',
    division: 'Pengelola K3',
    members: [{ name: 'TRI MULYA', certs: ['POP', 'WAH'] }],
    color: 'green',
    x: 570,
    y: 470,
    width: 200,
    parent: 'deputy'
  },
  {
    id: 'pengelola_k3_so',
    role: 'PENGELOLA K3 (SAFETY OFFICER)',
    division: 'Pengelola K3',
    members: [{ name: 'PUTRI RISKI NOPIANTI', certs: ['WAH'] }],
    color: 'green',
    x: 570,
    y: 610,
    width: 200,
    parent: 'pengelola_k3_lead'
  },

  // Division 4: Project
  {
    id: 'spv_project',
    role: 'SPV PROJECT',
    division: 'Project',
    members: [
      { name: 'ADEN WEMBI L.K', certs: ['POP', 'CSMC'] },
      { name: 'WURRY KURNIA P', certs: ['POP', 'CSMC'] }
    ],
    color: 'orange',
    x: 830,
    y: 470,
    width: 210,
    parent: 'deputy'
  },
  {
    id: 'specialist_project',
    role: 'SPECIALIST',
    division: 'Project',
    members: [
      { name: 'IBNU ISA', certs: ['POP', 'CSMC'] },
      { name: 'ANNISA NEVELFIA', certs: ['POP', 'CSMC'] }
    ],
    color: 'orange',
    x: 1060,
    y: 570,
    width: 190,
    parent: 'spv_project'
  },
  {
    id: 'coor_project',
    role: 'COOR PROJECT',
    division: 'Project',
    members: [
      { name: 'RYAN RAHDI', certs: ['POP'] },
      { name: 'M ABOJASIN J', certs: ['POP'] }
    ],
    color: 'orange',
    x: 830,
    y: 680,
    width: 210,
    parent: 'spv_project'
  },
  {
    id: 'engineer_project',
    role: 'ENGINEER PROJECT',
    division: 'Project',
    members: [
      { name: 'AGUNG TRI W', certs: ['WAH', 'AK3U', 'Teknisi_Listrik', 'CSMC'] },
      { name: 'DERIO L', certs: ['WAH', 'Teknisi_Listrik'] },
      { name: 'SAIFUL ANWAR', certs: ['WAH'] },
      { name: 'ABDUL GAFFAR', certs: ['WAH'] },
      { name: 'AGUS ALI M', certs: ['WAH'] },
      { name: 'MAWARDI', certs: ['WAH'] },
      { name: 'ADE RENGGA', certs: ['WAH'] }
    ],
    color: 'orange_red',
    x: 830,
    y: 830,
    width: 210,
    parent: 'coor_project'
  },

  // Division 5: Maintenance
  {
    id: 'spv_maint',
    role: 'SPV MAINTENANCE',
    division: 'Maintenance',
    members: [{ name: 'DWI SURIANANDA', certs: ['POP'] }],
    color: 'teal',
    x: 1320,
    y: 470,
    width: 210,
    parent: 'deputy'
  },
  {
    id: 'l2_network',
    role: 'L2 NETWORK',
    division: 'Maintenance',
    members: [{ name: 'JUSTIN RIDWAN', certs: ['Ubiqty'] }],
    color: 'blue',
    x: 1540,
    y: 570,
    width: 180,
    parent: 'spv_maint'
  },
  {
    id: 'coor_maint',
    role: 'COOR MAINTENANCE',
    division: 'Maintenance',
    members: [
      { name: 'WAHYU WIDODO', certs: ['POP', 'CSMC'] },
      { name: 'APRIAN MUJAHID', certs: ['POP', 'CSMC'] },
      { name: 'JOKO RIYANTO', certs: ['POP', 'CSMC'] }
    ],
    color: 'blue',
    x: 1320,
    y: 680,
    width: 210,
    parent: 'spv_maint'
  },
  {
    id: 'engineer_maint',
    role: 'ENGINEER MAINTENANCE',
    division: 'Maintenance',
    members: [
      { name: 'RAHMAT APRIAN', certs: ['WAH', 'CSMC'] },
      { name: 'SUGIARTO', certs: ['WAH', 'CSMC'] },
      { name: 'YUNIO R', certs: ['WAH', 'CSMC'] },
      { name: 'M RIZKY', certs: ['WAH', 'CSMC'] },
      { name: 'ARIEF BUDIMAN', certs: ['WAH', 'CSMC'] },
      { name: 'TONI SUWARDI', certs: ['WAH', 'CSMC'] },
      { name: 'M FACHRUL ROZY', certs: ['WAH', 'CSMC'] },
      { name: 'ADITYA ANDI', certs: ['WAH', 'CSMC'] },
      { name: 'AHMAD MULYADI', certs: ['WAH', 'CSMC'] },
      { name: 'ARIS SETIAWAN', certs: ['WAH', 'CSMC'] }
    ],
    color: 'slate_red',
    x: 1320,
    y: 830,
    width: 210,
    parent: 'coor_maint'
  }
];

// Flat Member List for Directory Tab
export const ORG_DATA = INITIAL_CANVAS_NODES.flatMap(node =>
  node.members.map(m => ({
    tier: ['direksi', 'ktt', 'pjo'].includes(node.id) ? 'Executive' : node.id === 'deputy' ? 'Management' : 'Operational',
    division: node.division,
    role: node.role,
    name: m.name,
    title: m.title || node.role,
    certs: m.certs || []
  }))
);

const OrganizationChart = ({ readOnly = false }) => {
  const { user } = useAuth();
  const { addToast } = useToast();

  // RBAC: HRGA & HSE Admins can edit or drag nodes
  const userRole = (user?.role || '').toLowerCase();
  const isOrgAdmin = ['admin', 'hrga_admin', 'hr', 'hse_admin'].includes(userRole) || userRole.includes('admin');
  const canEdit = isOrgAdmin && !readOnly;

  const [nodes, setNodes] = useState(() => {
    try {
      const saved = localStorage.getItem('hris_org_nodes_canvas');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return INITIAL_CANVAS_NODES;
  });

  const [selectedDivision, setSelectedDivision] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('tree'); // 'tree' | 'directory'

  // Canvas Pan & Zoom State
  const [scale, setScale] = useState(0.85);
  const [pan, setPan] = useState({ x: 40, y: 20 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  // Node Drag State
  const [draggingNodeId, setDraggingNodeId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Editing Modal State
  const [editingNode, setEditingNode] = useState(null);
  const [editForm, setEditForm] = useState({
    role: '',
    division: 'Project',
    color: 'orange',
    parent: '',
    membersText: ''
  });

  const canvasRef = useRef(null);

  // Sync Live DB Employees to directory if available
  const [directoryMembers, setDirectoryMembers] = useState(ORG_DATA);

  useEffect(() => {
    const fetchLiveEmployees = async () => {
      try {
        const res = await api.get('/hris/employees');
        if (res.data && res.data.length > 0) {
          const mapped = res.data.map(emp => {
            const certsList = (emp.certificates || []).map(c => c.certificate_types?.code || c.code || '').filter(Boolean);
            const deptName = (emp.department || emp.departments?.name || 'Project').replace(' BIB', '');
            return {
              tier: (emp.level || '').includes('1') ? 'Executive' : (emp.level || '').includes('2') || (emp.level || '').includes('3') ? 'Management' : 'Operational',
              division: deptName,
              role: (emp.jabatan || 'Staff').replace(' BIB', ''),
              name: emp.nama || emp.nama_lengkap || 'Karyawan',
              title: (emp.jabatan || 'Staff').replace(' BIB', ''),
              certs: certsList
            };
          });
          if (mapped.length >= 10) {
            setDirectoryMembers(mapped);
          }
        }
      } catch (e) {
        console.error('Failed to fetch live org chart:', e);
      }
    };
    fetchLiveEmployees();
  }, []);

  // Save Nodes positions to localStorage & DB History (Admin HRGA & HSE)
  const handleSaveCanvas = async () => {
    if (!canEdit) return;
    try {
      localStorage.setItem('hris_org_nodes_canvas', JSON.stringify(nodes));
      try {
        await api.post('/hris/organization/history', {
          nodes,
          notes: `Tata letak kanvas bagan organisasi (${nodes.length} posisi) diperbarui dan disimpan oleh ${user?.nama || user?.username || 'Admin'}.`
        });
      } catch (e) {}
      addToast('Tata letak struktur organisasi berhasil disimpan!', 'success');
    } catch (e) {
      addToast('Gagal menyimpan tata letak bagan', 'error');
    }
  };

  // Reset to original PDF Layout (Admin HRGA only)
  const handleResetCanvas = () => {
    if (!canEdit) return;
    if (window.confirm('Kembalikan posisi seluruh bagan organisasi ke tata letak standar awal?')) {
      setNodes(INITIAL_CANVAS_NODES);
      localStorage.removeItem('hris_org_nodes_canvas');
      setScale(0.85);
      setPan({ x: 40, y: 20 });
      addToast('Tata letak bagan dikembalikan ke posisi standar awal', 'info');
    }
  };

  // Pan Handlers
  const handleCanvasMouseDown = (e) => {
    if (e.target === canvasRef.current || e.target.tagName === 'svg' || e.target.classList.contains('canvas-background')) {
      setIsPanning(true);
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleCanvasMouseMove = (e) => {
    if (isPanning) {
      setPan({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y
      });
    } else if (draggingNodeId && canEdit) {
      const containerRect = canvasRef.current.getBoundingClientRect();
      const rawX = (e.clientX - containerRect.left - pan.x) / scale - dragOffset.x;
      const rawY = (e.clientY - containerRect.top - pan.y) / scale - dragOffset.y;

      setNodes(prev =>
        prev.map(n => (n.id === draggingNodeId ? { ...n, x: Math.round(rawX), y: Math.round(rawY) } : n))
      );
    }
  };

  const handleCanvasMouseUp = () => {
    setIsPanning(false);
    setDraggingNodeId(null);
  };

  // Wheel Zoom Handler
  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    const newScale = Math.min(Math.max(0.4, scale * zoomFactor), 1.8);
    setScale(newScale);
  };

  // Start Dragging Node (Only if canEdit)
  const handleNodeMouseDown = (e, nodeId, nodeX, nodeY) => {
    if (!canEdit) return; // Read-only for regular users
    e.stopPropagation();
    const containerRect = canvasRef.current.getBoundingClientRect();
    const cursorCanvasX = (e.clientX - containerRect.left - pan.x) / scale;
    const cursorCanvasY = (e.clientY - containerRect.top - pan.y) / scale;

    setDraggingNodeId(nodeId);
    setDragOffset({
      x: cursorCanvasX - nodeX,
      y: cursorCanvasY - nodeY
    });
  };

  // Open Edit Node Modal (Only if canEdit)
  const openEditModal = (node, e) => {
    if (!canEdit) return;
    e?.stopPropagation?.();
    setEditingNode(node);
    setEditForm({
      role: node.role,
      division: node.division || 'Project',
      color: node.color || 'orange',
      parent: node.parent || '',
      membersText: node.members.map(m => m.name).join('\n')
    });
  };

  // Save Node Edit
  const handleSaveNodeEdit = (e) => {
    e.preventDefault();
    if (!editingNode || !canEdit) return;

    const names = editForm.membersText
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);

    const updatedMembers = names.map(name => {
      const existing = editingNode.members.find(m => m.name.toLowerCase() === name.toLowerCase());
      return {
        name,
        certs: existing ? existing.certs : []
      };
    });

    setNodes(prev =>
      prev.map(n => {
        if (n.id === editingNode.id) {
          return {
            ...n,
            role: editForm.role,
            division: editForm.division,
            color: editForm.color,
            parent: editForm.parent || null,
            members: updatedMembers.length > 0 ? updatedMembers : [{ name: 'Belum Ditugaskan', certs: [] }]
          };
        }
        return n;
      })
    );

    addToast(`Posisi ${editForm.role} berhasil diperbarui!`, 'success');
    setEditingNode(null);
  };

  // Filtered Directory for Tab 2
  const filteredDirectory = directoryMembers.filter(m => {
    if (!m) return false;
    const term = (searchTerm || '').toLowerCase();
    const name = String(m.name || '').toLowerCase();
    const role = String(m.role || '').toLowerCase();
    const title = String(m.title || '').toLowerCase();
    const certs = Array.isArray(m.certs) ? m.certs : [];

    const matchSearch =
      name.includes(term) ||
      role.includes(term) ||
      title.includes(term) ||
      certs.some(c => String(c || '').toLowerCase().includes(term));

    const matchDivision = selectedDivision === 'All' || m.division.toLowerCase() === selectedDivision.toLowerCase();
    return matchSearch && matchDivision;
  });

  // Calculate Node Style by Color Theme
  const getNodeCardStyles = (colorType) => {
    switch (colorType) {
      case 'red':
        return {
          headerBg: 'bg-red-600 text-white',
          cardBg: 'bg-white border-2 border-red-600',
          shadow: 'shadow-red-900/20'
        };
      case 'navy':
        return {
          headerBg: 'bg-red-600 text-white',
          cardBg: 'bg-white border-2 border-red-600',
          shadow: 'shadow-slate-900/20'
        };
      case 'darkred':
        return {
          headerBg: 'bg-red-600 text-white',
          cardBg: 'bg-white border-2 border-red-600',
          shadow: 'shadow-red-950/20'
        };
      case 'white_red':
        return {
          headerBg: 'bg-red-50 text-red-600 border-b border-red-200',
          cardBg: 'bg-white border-2 border-red-600',
          shadow: 'shadow-red-500/10'
        };
      case 'blue':
        return {
          headerBg: 'bg-blue-600 text-white',
          cardBg: 'bg-white border-2 border-slate-800',
          shadow: 'shadow-blue-900/15'
        };
      case 'green':
        return {
          headerBg: 'bg-emerald-600 text-white',
          cardBg: 'bg-white border-2 border-slate-800',
          shadow: 'shadow-emerald-900/15'
        };
      case 'teal':
        return {
          headerBg: 'bg-teal-700 text-white',
          cardBg: 'bg-white border-2 border-slate-800',
          shadow: 'shadow-teal-900/15'
        };
      case 'orange':
      case 'orange_red':
      default:
        return {
          headerBg: 'bg-amber-500 text-white',
          cardBg: 'bg-white border-2 border-slate-800',
          shadow: 'shadow-amber-900/15'
        };
    }
  };

  return (
    <div className="w-full flex flex-col gap-4 font-sans select-none">
      {/* Top Header Bar */}
      <div className="bg-white/80 backdrop-blur-2xl rounded-[32px] p-5 border border-white/80 ring-1 ring-slate-900/5 shadow-xl shadow-slate-200/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-red-50 text-red-700 flex items-center justify-center font-black shadow-sm">
              <Building2 size={20} />
            </div>
            <h2 className="text-base lg:text-lg font-black text-slate-900 tracking-tight">
              Struktur Organisasi & Matriks Tim PT DEA GLOBAL NIAGA
            </h2>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            {canEdit
              ? 'Bagan hirarki resmi format PDF, interaktif drag-and-drop dengan garis relasi (Mode Editor HRGA).'
              : 'Bagan hirarki resmi struktur organisasi PT DEA GLOBAL NIAGA (Mode Lihat).'}
          </p>
        </div>

        {/* View Mode Switcher & Admin Action Buttons */}
        <div className="flex items-center gap-2">
          {viewMode === 'tree' && (
            <>
              {canEdit ? (
                <div className="hidden sm:flex items-center gap-1.5 mr-2">
                  <button
                    type="button"
                    onClick={handleSaveCanvas}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Simpan perubahan tata letak posisi bagan"
                  >
                    <Save size={14} /> Simpan Tata Letak
                  </button>
                  <button
                    type="button"
                    onClick={handleResetCanvas}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Kembalikan tata letak ke susunan standar awal"
                  >
                    <RotateCcw size={14} /> Reset Default
                  </button>
                </div>
              ) : (
                <div className="hidden sm:flex items-center gap-1.5 mr-2">
                  <span className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-xl border border-slate-200 flex items-center gap-1.5">
                    <Lock size={12} className="text-slate-500" /> Mode Lihat Saja
                  </span>
                </div>
              )}
            </>
          )}

          <div className="flex bg-slate-100/70 backdrop-blur-md p-1 rounded-2xl border border-slate-200/60">
            <button
              type="button"
              onClick={() => setViewMode('tree')}
              className={`px-4 py-2 text-xs font-black rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'tree'
                  ? 'bg-gradient-to-r from-red-700 to-rose-700 text-white shadow-md shadow-red-900/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Building2 size={14} /> Hirarki Visual (Canvas)
            </button>
            <button
              type="button"
              onClick={() => setViewMode('directory')}
              className={`px-4 py-2 text-xs font-black rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'directory'
                  ? 'bg-gradient-to-r from-red-700 to-rose-700 text-white shadow-md shadow-red-900/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Users size={14} /> Direktori Anggota ({ORG_DATA.length})
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 1. INTERACTIVE CANVAS VIEW (MATCHING OFFICIAL PDF EXACTLY) */}
      {/* ======================================================== */}
      {viewMode === 'tree' && (
        <div className="relative w-full h-[780px] bg-white/70 backdrop-blur-2xl border border-white/80 ring-1 ring-slate-900/5 rounded-[32px] overflow-hidden shadow-xl shadow-slate-200/40 flex">
          {/* Left Fixed Certification Legend Sidebar */}
          <div className="w-56 bg-white/80 backdrop-blur-xl border-r border-slate-200/70 p-3.5 flex flex-col z-30 shadow-sm overflow-y-auto shrink-0 custom-scrollbar">
            <span className="text-[11px] font-black uppercase text-slate-800 tracking-wider mb-2.5 pb-1 border-b border-slate-100 flex items-center gap-1.5">
              <Award size={14} className="text-red-700" /> Matriks Sertifikasi
            </span>
            <div className="space-y-1.5">
              {Object.entries(CERT_DEFINITIONS).map(([key, cert]) => (
                <div key={key} className="flex items-center gap-2 text-[10px] p-1 rounded-lg hover:bg-slate-50 transition-colors">
                  <span className={`w-3.5 h-3.5 rounded-full border shrink-0 ${cert.color.split(' ')[0]} ${cert.color.split(' ')[2]}`} />
                  <div className="flex flex-col min-w-0">
                    <span className="font-black text-slate-800 leading-tight truncate">{cert.label}</span>
                    <span className="text-[9px] text-slate-400 truncate">{cert.name}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 text-[10px] text-slate-400 font-medium">
              💡 <span className="font-bold text-slate-600">Panduan Canvas:</span>
              <ul className="list-disc pl-3.5 mt-1 space-y-0.5 text-[9px]">
                <li>Geser latar belakang untuk pan</li>
                <li>Scroll mouse untuk zoom in/out</li>
                <li>Gunakan tombol kontrol di sudut kanan</li>
                {canEdit && (
                  <>
                    <li className="text-emerald-700 font-bold">Drag kartu untuk atur posisi</li>
                    <li className="text-emerald-700 font-bold">Klik ikon ✏️ untuk edit node</li>
                  </>
                )}
              </ul>
            </div>
          </div>

          {/* Interactive Zoom/Pan Canvas Area */}
          <div
            ref={canvasRef}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onWheel={handleWheel}
            className={`flex-1 h-full relative overflow-hidden cursor-grab active:cursor-grabbing canvas-background ${
              isPanning ? 'cursor-grabbing' : ''
            }`}
            style={{
              backgroundImage: 'radial-gradient(#cbd5e1 1.2px, transparent 1.2px)',
              backgroundSize: '24px 24px',
              backgroundColor: '#f8fafc'
            }}
          >
            {/* Transform Layer */}
            <div
              className="absolute inset-0 origin-top-left pointer-events-none"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
                width: '2400px',
                height: '1800px'
              }}
            >
              {/* Dynamic SVG Connecting Lines */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                <defs>
                  <marker
                    id="arrow"
                    viewBox="0 0 10 10"
                    refX="6"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#1e293b" />
                  </marker>
                </defs>

                {nodes.map(node => {
                  if (!node.parent) return null;
                  const parentNode = nodes.find(n => n.id === node.parent);
                  if (!parentNode) return null;

                  // Compute coordinates
                  const parentWidth = parentNode.width || 210;
                  const parentHeight = 70 + (parentNode.members?.length || 1) * 26;
                  const childWidth = node.width || 210;

                  const pX = parentNode.x + parentWidth / 2;
                  const pY = parentNode.y + parentHeight;

                  const cX = node.x + childWidth / 2;
                  const cY = node.y;

                  // Special Direksi -> KTT Dashed Horizontal/Direct Line
                  if (node.id === 'ktt') {
                    const kttX = parentNode.x + parentWidth;
                    const kttY = parentNode.y + 40;
                    return (
                      <g key={`${node.id}-ktt-line`}>
                        <path
                          d={`M ${kttX} ${kttY} L ${node.x} ${node.y + 35}`}
                          fill="none"
                          stroke="#dc2626"
                          strokeWidth="2"
                          strokeDasharray="5,5"
                        />
                      </g>
                    );
                  }

                  // Specialist Project connection (branches from SPV Project)
                  if (node.id === 'specialist_project') {
                    const spvNode = nodes.find(n => n.id === 'spv_project');
                    const spvX = (spvNode?.x || 830) + 210;
                    const spvY = (spvNode?.y || 470) + 40;
                    return (
                      <g key={`${node.id}-specialist-line`}>
                        <path
                          d={`M ${spvX} ${spvY} H ${node.x}`}
                          fill="none"
                          stroke="#1e293b"
                          strokeWidth="2.2"
                          markerEnd="url(#arrow)"
                        />
                      </g>
                    );
                  }

                  // L2 Network connection (branches from SPV Maintenance)
                  if (node.id === 'l2_network') {
                    const spvMaint = nodes.find(n => n.id === 'spv_maint');
                    const spvX = (spvMaint?.x || 1320) + 210;
                    const spvY = (spvMaint?.y || 470) + 40;
                    return (
                      <g key={`${node.id}-l2-line`}>
                        <path
                          d={`M ${spvX} ${spvY} H ${node.x}`}
                          fill="none"
                          stroke="#1e293b"
                          strokeWidth="2.2"
                          markerEnd="url(#arrow)"
                        />
                      </g>
                    );
                  }

                  // Standard Orthogonal Branch Line (Top-to-Bottom with Elbow)
                  const midY = pY + (cY - pY) / 2;
                  return (
                    <g key={`${parentNode.id}->${node.id}`}>
                      <path
                        d={`M ${pX} ${pY} V ${midY} H ${cX} V ${cY}`}
                        fill="none"
                        stroke="#1e293b"
                        strokeWidth="2.2"
                        markerEnd="url(#arrow)"
                      />
                    </g>
                  );
                })}
              </svg>

              {/* Node Cards */}
              {nodes.map(node => {
                const styles = getNodeCardStyles(node.color);
                return (
                  <div
                    key={node.id}
                    onMouseDown={(e) => handleNodeMouseDown(e, node.id, node.x, node.y)}
                    className={`absolute pointer-events-auto rounded-lg overflow-hidden transition-shadow select-none ${styles.cardBg} ${styles.shadow} ${
                      draggingNodeId === node.id && canEdit
                        ? 'ring-4 ring-red-500/40 z-30 shadow-2xl scale-[1.02] cursor-grabbing'
                        : canEdit
                        ? 'z-10 shadow-md hover:shadow-lg cursor-grab'
                        : 'z-10 shadow-md cursor-default'
                    }`}
                    style={{
                      left: `${node.x}px`,
                      top: `${node.y}px`,
                      width: `${node.width || 210}px`
                    }}
                  >
                    {/* Node Header */}
                    <div className={`px-2.5 py-1.5 flex items-center justify-between text-[11px] font-black tracking-wide ${styles.headerBg}`}>
                      <div className="flex items-center gap-1.5 truncate">
                        {canEdit && <GripVertical size={13} className="opacity-60 cursor-grab" />}
                        <span className="truncate">{node.role}</span>
                      </div>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={(e) => openEditModal(node, e)}
                          className="p-1 hover:bg-black/20 rounded-md transition-colors text-white/90 hover:text-white cursor-pointer"
                          title="Edit Jabatan / Personel"
                        >
                          <Edit3 size={11} />
                        </button>
                      )}
                    </div>

                    {/* Member Names & Certification Dots */}
                    <div className="p-2 space-y-1.5 bg-white divide-y divide-slate-100">
                      {node.members.map((m, idx) => (
                        <div key={idx} className={`pt-1.5 first:pt-0 flex items-center justify-between gap-1`}>
                          <div className="flex flex-col min-w-0">
                            <span className="text-[11px] font-black text-slate-900 leading-tight truncate">
                              {m.name}
                            </span>
                            {m.title && m.title !== node.role && (
                              <span className="text-[9px] text-slate-400 font-medium truncate">{m.title}</span>
                            )}
                          </div>

                          {/* Colored Certification Dots */}
                          {m.certs && m.certs.length > 0 && (
                            <div className="flex items-center gap-1 shrink-0 ml-1">
                              {m.certs.map((c, cIdx) => {
                                const certDef = CERT_DEFINITIONS[c] || { color: 'bg-red-500' };
                                const dotBg = certDef.color.split(' ')[0];
                                return (
                                  <span
                                    key={cIdx}
                                    title={`${c} - ${certDef.name || c}`}
                                    className={`w-3 h-3 rounded-full border border-slate-700 ${dotBg}`}
                                  />
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Floating Bottom-Right Canvas Controls */}
            <div className="absolute bottom-4 right-4 z-40 bg-white/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200 shadow-xl flex items-center gap-1">
              <button
                type="button"
                onClick={() => setScale(prev => Math.min(prev + 0.15, 1.8))}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center font-bold transition-all cursor-pointer"
                title="Perbesar (Zoom In)"
              >
                <ZoomIn size={16} />
              </button>
              <button
                type="button"
                onClick={() => setScale(prev => Math.max(prev - 0.15, 0.4))}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center font-bold transition-all cursor-pointer"
                title="Perkecil (Zoom Out)"
              >
                <ZoomOut size={16} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setScale(0.85);
                  setPan({ x: 40, y: 20 });
                }}
                className="px-2.5 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black flex items-center gap-1 transition-all cursor-pointer"
                title="Pusatkan Tampilan"
              >
                <Maximize2 size={13} /> Fit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. DIRECTORY MEMBER LIST VIEW (WITH CLEAN FILTER PILLS) */}
      {/* ======================================================== */}
      {viewMode === 'directory' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* Category Filter Pills (Only visible in Directory View) */}
          <div className="flex flex-wrap gap-1.5 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-sm">
            {['All', 'Direksi & Pimpinan', 'HRGA', 'Pengelola KO', 'Pengelola K3', 'Project', 'Maintenance'].map((div) => (
              <button
                key={div}
                onClick={() => setSelectedDivision(div)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedDivision === div
                    ? 'bg-gradient-to-r from-red-800 to-red-700 text-white shadow-md'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {div}
              </button>
            ))}
          </div>

          {/* Search bar inside directory */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari anggota tim, jabatan, atau sertifikasi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-red-900/20 font-medium"
              />
            </div>
            <span className="text-xs font-bold text-slate-500">
              Ditemukan: <span className="text-red-700 font-black">{filteredDirectory.length}</span> Personel
            </span>
          </div>

          {/* Directory Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredDirectory.map((member, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                      {member.division}
                    </span>
                    <span className="text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-md border border-red-100">
                      {member.role}
                    </span>
                  </div>
                  <h3 className="text-sm font-black text-slate-900">{member.name}</h3>
                  <p className="text-xs text-slate-500 font-medium">{member.title}</p>
                </div>

                {member.certs && member.certs.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-100">
                    <span className="text-[9px] font-bold text-slate-400 block mb-1">Sertifikasi & Lisensi:</span>
                    <div className="flex flex-wrap gap-1">
                      {member.certs.map((c, cIdx) => {
                        const certDef = CERT_DEFINITIONS[c] || { label: c, color: 'bg-red-100 text-red-800' };
                        return (
                          <span
                            key={cIdx}
                            className={`text-[9px] font-black px-2 py-0.5 rounded-md border shadow-2xs ${certDef.color}`}
                          >
                            {certDef.label}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. EDIT NODE MODAL (ADMIN HRGA ONLY) */}
      {/* ======================================================== */}
      {editingNode && canEdit && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-red-50 text-red-700 flex items-center justify-center font-black">
                  <Edit3 size={16} />
                </div>
                <h3 className="text-sm font-black text-slate-900">
                  Edit Posisi: {editingNode.role}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingNode(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveNodeEdit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Nama Jabatan / Posisi</label>
                <input
                  type="text"
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-900"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Divisi Kerja</label>
                  <select
                    value={editForm.division}
                    onChange={(e) => setEditForm({ ...editForm, division: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium"
                  >
                    <option value="Direksi & Pimpinan">Direksi & Pimpinan</option>
                    <option value="HRGA">HRGA</option>
                    <option value="Pengelola KO">Pengelola KO</option>
                    <option value="Pengelola K3">Pengelola K3</option>
                    <option value="Project">Project</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Tema Warna Card</label>
                  <select
                    value={editForm.color}
                    onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium"
                  >
                    <option value="red">Merah (Direksi / Pimpinan)</option>
                    <option value="navy">Navy (KTT)</option>
                    <option value="blue">Biru (HRGA / Maintenance)</option>
                    <option value="green">Hijau (K3 / KO)</option>
                    <option value="orange">Orange (Project)</option>
                    <option value="teal">Teal (SPV Maint)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Daftar Personel / Anggota (1 nama per baris)
                </label>
                <textarea
                  rows={4}
                  value={editForm.membersText}
                  onChange={(e) => setEditForm({ ...editForm, membersText: e.target.value })}
                  placeholder="Masukkan nama personel..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono text-xs text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingNode(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-700 hover:bg-red-800 text-white font-black rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Check size={15} /> Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizationChart;
