import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Calendar, Users, Clock, Activity, Briefcase, LogOut, Calculator, FileText, ShieldCheck, Award, Building2, User, Settings, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Sidebar = ({ isOpen, setIsOpen }) => {
  const { logout, user } = useAuth();
  const role = (user?.role || '').toLowerCase();
  const dept = (user?.department || user?.department_name || user?.departments?.name || '').toLowerCase();
  const jabatan = (user?.jabatan || '').toLowerCase();
  const username = (user?.username || '').toLowerCase();

  const isSuperAdmin = ['superadmin', 'super_admin'].includes(role);
  const isAdmin = ['admin', 'hrga_admin', 'hr', 'hse_admin'].includes(role);
  const isHSEAdmin = role === 'hse_admin' || (
    isAdmin && (
      dept.includes('hse') || dept.includes('k3') || dept.includes('safety') || dept.includes('pengelola k3') ||
      jabatan.includes('hse') || jabatan.includes('k3') || jabatan.includes('safety') ||
      username.includes('hse')
    )
  );

  // Menu Definition based on RBAC & Department
  const getMenuSections = () => {
    // 1. Super Admin Menu (Governance, System & Security)
    if (isSuperAdmin) {
      return [
        {
          title: 'Tata Kelola & Sistem',
          items: [
            { name: 'Dashboard Monitoring', path: '/dashboard', icon: LayoutDashboard },
            { name: 'Profil Perusahaan & Legalitas', path: '/organization', icon: Settings },
            { name: 'Kalender Operasional', path: '/calendar', icon: Calendar },
            { name: 'Pengaturan & Keamanan', path: '/settings', icon: Shield },
          ]
        }
      ];
    }

    // 2. HSE Admin Menu (Focus on K3, Keselamatan Kerja & Operasional)
    if (isHSEAdmin) {
      return [
        {
          title: 'K3 & Keselamatan Kerja',
          items: [
            { name: 'Dashboard HSE', path: '/dashboard', icon: LayoutDashboard },
            { name: 'Matriks Sertifikasi K3', path: '/organization', icon: Award },
            { name: 'Sertifikasi Saya', path: '/personal-certifications', icon: ShieldCheck },
          ]
        },
        {
          title: 'Operasional & Waktu Kerja',
          items: [
            { name: 'Pusat Kehadiran', path: '/attendance-hub', icon: Clock },
            { name: 'Jam Kerja (Timesheet)', path: '/timesheet', icon: Calculator },
            { name: 'Rekap Kehadiran Site', path: '/reports', icon: FileText },
            { name: 'Kalender Site', path: '/calendar', icon: Calendar },
          ]
        }
      ];
    }

    // 3. HRGA Admin Full Sidebar (HR, GA, Kepegawaian, Operasional)
    if (isAdmin) {
      return [
        {
          title: 'Utama',
          items: [
            { name: 'Dashboard Admin', path: '/dashboard', icon: LayoutDashboard },
          ]
        },
        {
          title: 'Organisasi & Karyawan',
          items: [
            { name: 'Data Karyawan', path: '/organization', icon: Users },
          ]
        },
        {
          title: 'Manajemen Kehadiran',
          items: [
            { name: 'Pusat Kehadiran', path: '/attendance-hub', icon: Clock },
            { name: 'Jam Kerja (Timesheet)', path: '/timesheet', icon: Calculator },
            { name: 'Rekap Kehadiran', path: '/reports', icon: FileText },
          ]
        },
        {
          title: 'Perencanaan',
          items: [
            { name: 'Agenda Kerja', path: '/performance', icon: Activity },
            { name: 'Kalender Tim', path: '/calendar', icon: Calendar },
            { name: 'Sertifikasi & Lisensi', path: '/personal-certifications', icon: Award },
          ]
        }
      ];
    }

    // 4. User / Karyawan
    return [
      {
        title: 'Menu Utama',
        items: [
          { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
          { name: 'Lisensi & Sertifikasi', path: '/personal-certifications', icon: Award },
          { name: 'Struktur Organisasi', path: '/organization-tree', icon: Building2 },
        ]
      },
      {
        title: 'Presensi & Jadwal',
        items: [
          { name: 'Pusat Kehadiran', path: '/attendance-hub', icon: Clock },
          { name: 'Kalender Jadwal', path: '/calendar', icon: Calendar },
        ]
      }
    ];
  };

  const menuSections = getMenuSections();

  return (
    <aside className={`w-64 bg-white/95 backdrop-blur-xl border-r border-slate-200/90 h-screen flex flex-col fixed left-0 top-0 z-50 transform transition-transform duration-300 ease-in-out shadow-lg shadow-slate-200/40 ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
      {/* Logo */}
      <div className="h-24 flex items-center justify-center px-4 border-b border-slate-100/80">
        <img src="/dea.png" alt="PT DEA GLOBAL NIAGA" className="h-20 w-auto object-contain transition-transform duration-300 hover:scale-105" onError={(e) => { e.target.style.display = 'none' }} />
      </div>

      {/* Navigation with Interactive Hover Effects */}
      <nav className="flex-1 overflow-y-auto py-5 px-3 space-y-4 scrollbar-thin scrollbar-thumb-slate-200">
        {menuSections.map((section, idx) => {
          const visibleItems = section.items.filter(item => item.visible !== false);
          if (visibleItems.length === 0) return null;

          return (
            <div key={idx} className="space-y-1">
              {section.title && (
                <h3 className="px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  {section.title}
                </h3>
              )}
              {visibleItems.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.path}
                  onClick={() => setIsOpen?.(false)}
                  className={({ isActive }) =>
                    `group relative flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 ${isActive
                      ? 'bg-gradient-to-r from-red-800 to-rose-800 text-white shadow-md shadow-red-900/25 translate-x-1'
                      : 'text-slate-600 hover:bg-red-50/70 hover:text-red-900 hover:translate-x-1.5 hover:shadow-sm'
                    }`
                  }
                >
                  <item.icon size={17} strokeWidth={2.5} className="shrink-0 transition-transform duration-200 group-hover:scale-115" />
                  <span className="truncate tracking-tight">{item.name}</span>
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-3.5 border-t border-slate-100">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs sm:text-sm font-black text-slate-500 hover:bg-red-50 hover:text-red-900 hover:shadow-sm hover:translate-x-1 transition-all duration-200"
        >
          <LogOut size={17} strokeWidth={2.5} className="shrink-0 transition-transform duration-200 group-hover:rotate-12" />
          Keluar
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
