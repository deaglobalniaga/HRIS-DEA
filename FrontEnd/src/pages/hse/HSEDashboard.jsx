import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend
} from 'recharts';
import {
  Clock, ShieldCheck, AlertTriangle, Award,
  Shield, FileCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/api';

const TopBadge = ({ icon: Icon, value, title, subtitle, colorClass }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4 flex flex-col justify-between h-full hover:shadow-md hover:border-slate-300 transition-all">
    <div className="flex justify-between items-start mb-2">
      <div className={`p-2 rounded-xl ${colorClass} bg-opacity-10`}>
        <Icon size={20} className={colorClass} strokeWidth={2.5} />
      </div>
      <span className="text-2xl font-black text-slate-800 leading-none tracking-tight">{value}</span>
    </div>
    <div>
      <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">{title}</h4>
      <p className="text-[10px] text-slate-400 font-medium leading-tight">{subtitle}</p>
    </div>
  </div>
);

const HSEDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [serverTime, setServerTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setServerTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const [hseData, setHseData] = useState({
    totalPersonnel: 40,
    safeManHours: '128,450',
    zeroIncidentDays: 540,
    k3ComplianceScore: 96.5,
    expiringCertsCount: 0,
    certDistribution: [
      { name: 'POP', count: 18, fill: '#2563eb' },
      { name: 'POM', count: 4, fill: '#84cc16' },
      { name: 'AK3U', count: 3, fill: '#dc2626' },
      { name: 'WAH (Height)', count: 22, fill: '#f97316' },
      { name: 'CSMS / CSMC', count: 14, fill: '#fb923c' },
      { name: 'Teknisi Listrik', count: 6, fill: '#f59e0b' }
    ],
    deptSafetyScores: [
      { subject: 'Project', Kepatuhan: 98, Kesiapan: 95 },
      { subject: 'Maintenance', Kepatuhan: 96, Kesiapan: 92 },
      { subject: 'Pengelola KO', Kepatuhan: 100, Kesiapan: 98 },
      { subject: 'Pengelola K3', Kepatuhan: 100, Kesiapan: 100 },
      { subject: 'Direksi & Pimpinan', Kepatuhan: 100, Kesiapan: 95 }
    ],
    criticalCertAlerts: [
      { name: 'Danar Prasetyo U', cert: 'POM / WAH', dept: 'Direksi & Pimpinan', expiry: 'Aktif (18 Bulan)', status: 'Aman' },
      { name: 'Abdul Rahmat', cert: 'POP / POM', dept: 'Direksi & Pimpinan', expiry: 'Aktif (14 Bulan)', status: 'Aman' },
      { name: 'Aden Wembi L.K', cert: 'POP / CSMC', dept: 'Project', expiry: 'Aktif (12 Bulan)', status: 'Aman' },
      { name: 'Dwi Suriananda', cert: 'POP / Network', dept: 'Maintenance', expiry: 'Aktif (20 Bulan)', status: 'Aman' },
      { name: 'Tri Mulya', cert: 'POP / WAH', dept: 'Pengelola K3', expiry: 'Aktif (16 Bulan)', status: 'Aman' }
    ]
  });

  useEffect(() => {
    const fetchHSEData = async () => {
      try {
        const res = await api.get('/hris/certifications');
        if (res.data && Array.isArray(res.data)) {
          setHseData(prev => ({
            ...prev,
            expiringCertsCount: res.data.filter(c => c.status === 'Expiring Soon' || c.status === 'Expired').length
          }));
        }
      } catch (e) {
        console.error('Fetch HSE data error:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchHSEData();
  }, []);

  return (
    <div className="relative w-full min-h-screen p-3 sm:p-4 pb-12 font-sans animate-in fade-in space-y-6">
      {/* Full-Page Interactive Spline 3D Animation Background */}
      <div className="fixed inset-0 w-full h-full z-0 overflow-hidden pointer-events-auto">
        <iframe
          src="https://my.spline.design/voiceinteractionanimation-u5WoHHHjBAgQFVankCgLgBNS/"
          frameBorder="0"
          width="100%"
          height="100%"
          className="w-full h-[calc(100%+80px)] -mb-[80px] opacity-80 pointer-events-auto"
          title="Spline 3D Voice Interaction Animation"
        />
      </div>

      {/* Main Foreground Content */}
      <div className="relative z-10 space-y-6 pointer-events-none">
        {/* Floating Top Bar */}
        <div className="flex items-center justify-between pointer-events-auto">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/90 backdrop-blur-xl border border-slate-200/90 shadow-md shadow-slate-200/50">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="text-base sm:text-xl font-black font-mono tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-800 drop-shadow-sm">
              {serverTime.toTimeString().split(' ')[0]}
            </span>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-emerald-100/90 text-emerald-800 border border-emerald-200 tracking-wider">
              WITA
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 backdrop-blur-md border border-slate-200 text-slate-800 text-[10px] font-black uppercase tracking-wider shadow-sm">
              <ShieldCheck size={13} className="text-emerald-700" /> 
              <span>HSE Command Center</span>
            </div>
            <button
              onClick={() => navigate('/organization')}
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs rounded-2xl shadow-md shadow-emerald-600/25 transition-all"
            >
              <Award size={14} /> Matriks K3
            </button>
          </div>
        </div>

        {/* HSE Safety KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pointer-events-auto">
          <TopBadge
            icon={ShieldCheck}
            value="0 LTI"
            title="Zero Incident Record"
            subtitle={`${hseData.zeroIncidentDays} Hari Operasional Aman`}
            colorClass="text-emerald-600"
          />
          <TopBadge
            icon={Clock}
            value={hseData.safeManHours}
            title="Jam Kerja Selamat"
            subtitle="Akumulasi Man-Hours Aman Site"
            colorClass="text-blue-600"
          />
          <TopBadge
            icon={Award}
            value={`${hseData.k3ComplianceScore}%`}
            title="Tingkat Kepatuhan K3"
            subtitle="Standar POP, POM, WAH & CSMS"
            colorClass="text-purple-600"
          />
          <TopBadge
            icon={AlertTriangle}
            value={hseData.expiringCertsCount}
            title="Segera Kedaluwarsa"
            subtitle="Sertifikat perlu renewal (<60 hari)"
            colorClass={hseData.expiringCertsCount > 0 ? "text-amber-500" : "text-emerald-600"}
          />
        </div>

        {/* HSE Visual Analytics Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pointer-events-auto">
          {/* K3 Certification Distribution Bar Chart (7 Cols) */}
          <div className="lg:col-span-7 bg-white/95 backdrop-blur-md rounded-3xl p-5 border border-slate-200/90 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Award size={16} className="text-emerald-700" /> Matriks Kepemilikan Sertifikat K3 Personel
                </h3>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">Jumlah personel bersertifikasi resmi pengawas & teknis</p>
              </div>
              <span className="text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-xl">
                6 Kategori Kompetensi
              </span>
            </div>

            <div className="w-full h-64 my-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hseData.certDistribution} margin={{ top: 15, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} dy={5} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '11px', fontWeight: 'bold' }} />
                  <Bar dataKey="count" name="Jumlah Personel" radius={[6, 6, 0, 0]}>
                    {hseData.certDistribution.map((entry, index) => (
                      <Cell key={`bar-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-medium">Standar Acuan: ESDM & Kemenaker RI</span>
              <button
                onClick={() => navigate('/organization')}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 hover:underline"
              >
                Lihat Detail Sertifikat &rarr;
              </button>
            </div>
          </div>

          {/* Departmental Safety Radar (5 Cols) */}
          <div className="lg:col-span-5 bg-white/95 backdrop-blur-md rounded-3xl p-5 border border-slate-200/90 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Shield size={16} className="text-emerald-700" /> Kepatuhan K3 per Divisi
                </h3>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">Indeks kesiapan safety operasional</p>
              </div>
            </div>

            <div className="w-full h-64 flex items-center justify-center my-2">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={hseData.deptSafetyScores}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 10, fontWeight: 'bold' }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="Kepatuhan (%)" dataKey="Kepatuhan" stroke="#059669" fill="#10b981" fillOpacity={0.4} />
                  <Radar name="Kesiapan (%)" dataKey="Kesiapan" stroke="#2563eb" fill="#3b82f6" fillOpacity={0.3} />
                  <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }} />
                  <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>Audit CSMS: 100% Memenuhi Syarat</span>
            </div>
          </div>
        </div>

        {/* Critical Certifications Radar Table */}
        <div className="bg-white/95 backdrop-blur-md rounded-3xl p-5 border border-slate-200/90 shadow-sm pointer-events-auto">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <FileCheck size={16} className="text-emerald-700" /> Pengawasan Masa Berlaku Sertifikasi K3 Kunci
              </h3>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">Status izin kerja dan sertifikasi POP, POM & WAH pemegang tanggung jawab site</p>
            </div>
            <button
              onClick={() => navigate('/organization')}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
            >
              Buka Semua &rarr;
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] uppercase font-black text-slate-500">
                  <th className="p-3">Nama Pejabat / Karyawan</th>
                  <th className="p-3">Departemen</th>
                  <th className="p-3">Sertifikasi Dimiliki</th>
                  <th className="p-3 text-center">Status Masa Berlaku</th>
                  <th className="p-3 text-center">Aksi HSE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {hseData.criticalCertAlerts.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 transition">
                    <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-black text-[10px] flex items-center justify-center shrink-0">
                        {item.name.charAt(0)}
                      </div>
                      <span>{item.name}</span>
                    </td>
                    <td className="p-3 text-slate-600">{item.dept}</td>
                    <td className="p-3">
                      <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                        {item.cert}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        {item.expiry}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => navigate('/organization')}
                        className="px-3 py-1 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 rounded-lg text-xs font-bold transition border border-slate-200"
                      >
                        Lihat File
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HSEDashboard;
