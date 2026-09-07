import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Calendar, Users, Clock, Activity, Briefcase, 
  LogOut, Calculator, FileText, ShieldCheck, Award, Building2, 
  User, Settings, Shield, PanelLeftClose, PanelLeftOpen 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Sidebar = ({ isOpen, setIsOpen, isCollapsed = false, toggleCollapse }) => {
  const { logout, user } = useAuth();
  const location = useLocation();
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

    // 2. HSE Admin Menu (Focus on K3, Keselamatan Kerja, Absensi & Personel)
    if (isHSEAdmin) {
      return [
        {
          title: 'K3 & Keselamatan Kerja',
          items: [
            { name: 'Dashboard HSE', path: '/dashboard', icon: LayoutDashboard },
            { name: 'Struktur & Matriks K3', path: '/organization', icon: Award },
            { name: 'Sertifikasi Pribadi', path: '/personal-certifications', icon: ShieldCheck },
          ]
        },
        {
          title: 'Operasional & Kehadiran',
          items: [
            { name: 'Pusat Kehadiran', path: '/attendance-hub', icon: Clock },
            { name: 'Jam Kerja (Timesheet)', path: '/timesheet', icon: Calculator },
            { name: 'Rekap Kehadiran Site', path: '/reports', icon: FileText },
            { name: 'Kalender Site', path: '/calendar', icon: Calendar },
          ]
        }
      ];
    }

    // 3. HRGA Admin Full Sidebar (HR, GA, Kepegawaian & Operasional)
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
            { name: 'Sertifikasi Saya', path: '/personal-certifications', icon: ShieldCheck },
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
    <aside className={`${isCollapsed ? 'lg:w-[76px]' : 'lg:w-64'} w-64 bg-white/95 backdrop-blur-xl border-r border-slate-200/90 h-screen flex flex-col fixed left-0 top-0 ${isOpen ? 'z-40 translate-x-0' : 'z-30 -translate-x-full'} lg:translate-x-0 lg:z-30 transition-[width,transform] duration-300 ease-in-out shadow-lg shadow-slate-200/40`}>
      {/* Logo & Toggle */}
      <div className={`h-20 flex items-center ${isCollapsed ? 'justify-center px-2' : 'justify-between px-4'} border-b border-slate-100/80 transition-all duration-300 relative`}>
        {isCollapsed ? (
          <div className="flex flex-col items-center gap-1 group py-2">
            <img 
              src="/dea.png" 
              alt="DEA" 
              className="h-10 w-10 object-contain transition-transform duration-200 hover:scale-110 cursor-pointer"
              onClick={toggleCollapse}
              title="Klik untuk memperbesar menu sidebar"
              onError={(e) => { e.target.style.display = 'none'; }} 
            />
            <button
              onClick={toggleCollapse}
              title="Perlebar Menu Sidebar"
              className="hidden lg:flex p-1 rounded-lg text-slate-400 hover:text-red-900 hover:bg-red-50 transition-colors"
            >
              <PanelLeftOpen size={16} />
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 overflow-hidden">
              <img 
                src="/dea.png" 
                alt="PT DEA GLOBAL NIAGA" 
                className="h-16 w-auto object-contain transition-transform duration-300 hover:scale-105" 
                onError={(e) => { e.target.style.display = 'none'; }} 
              />
            </div>
            {toggleCollapse && (
              <button
                onClick={toggleCollapse}
                title="Kecilkan Menu Sidebar"
                className="hidden lg:flex p-1.5 rounded-xl text-slate-400 hover:text-red-900 hover:bg-slate-100 transition-colors"
              >
                <PanelLeftClose size={18} />
              </button>
            )}
          </>
        )}
      </div>

      {/* Navigation with Interactive Hover Effects & Tooltips */}
      <nav className={`flex-1 overflow-y-auto ${isCollapsed ? 'px-2 py-4 space-y-3' : 'px-3 py-5 space-y-4'} scrollbar-thin scrollbar-thumb-slate-200`}>
        {menuSections.map((section, idx) => {
          const visibleItems = section.items.filter(item => item.visible !== false);
          if (visibleItems.length === 0) return null;

          return (
            <div key={idx} className="space-y-1">
              {section.title && (
                isCollapsed ? (
                  <div className="hidden lg:block my-2 mx-auto w-6 h-px bg-slate-200/80" title={section.title} />
                ) : (
                  <h3 className="px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 truncate">
                    {section.title}
                  </h3>
                )
              )}
              {visibleItems.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.path}
                  onClick={() => setIsOpen?.(false)}
                  className={({ isActive }) => {
                    const isCustomActive = item.path.includes('?')
                      ? (location.pathname + location.search) === item.path
                      : (location.pathname === item.path && !location.search);
                    const active = item.path.includes('?') ? isCustomActive : isActive;
                    return `group relative flex items-center ${isCollapsed ? 'justify-center lg:px-2 px-3.5' : 'px-3.5'} py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 ${active
                      ? 'bg-gradient-to-r from-red-800 to-rose-800 text-white shadow-md shadow-red-900/25 ' + (isCollapsed ? '' : 'translate-x-1')
                      : 'text-slate-600 hover:bg-red-50/70 hover:text-red-900 hover:shadow-sm ' + (isCollapsed ? '' : 'hover:translate-x-1.5')
                    }`;
                  }}
                >
                  <item.icon size={18} strokeWidth={2.5} className="shrink-0 transition-transform duration-200 group-hover:scale-110" />
                  <span className={`truncate tracking-tight ${isCollapsed ? 'lg:hidden ml-3' : 'ml-3'}`}>
                    {item.name}
                  </span>

                  {/* Floating Tooltip for Desktop when Collapsed */}
                  {isCollapsed && (
                    <div className="hidden lg:group-hover:flex absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xl whitespace-nowrap z-50 pointer-events-none items-center gap-1.5 animate-in fade-in zoom-in-95 duration-150">
                      <span>{item.name}</span>
                      <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900" />
                    </div>
                  )}
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>

      {/* Logout */}
      <div className={`border-t border-slate-100 ${isCollapsed ? 'p-2' : 'p-3.5'}`}>
        <button
          onClick={logout}
          className={`group relative w-full flex items-center ${isCollapsed ? 'justify-center lg:px-2 px-4' : 'px-4'} py-3 rounded-2xl text-xs sm:text-sm font-black text-slate-500 hover:bg-red-50 hover:text-red-900 hover:shadow-sm transition-all duration-200`}
        >
          <LogOut size={18} strokeWidth={2.5} className="shrink-0 transition-transform duration-200 group-hover:rotate-12" />
          <span className={`${isCollapsed ? 'lg:hidden ml-3' : 'ml-3'}`}>Keluar</span>

          {/* Floating Tooltip for Desktop when Collapsed */}
          {isCollapsed && (
            <div className="hidden lg:group-hover:flex absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xl whitespace-nowrap z-50 pointer-events-none items-center gap-1.5 animate-in fade-in zoom-in-95 duration-150">
              <span>Keluar</span>
              <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900" />
            </div>
          )}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
