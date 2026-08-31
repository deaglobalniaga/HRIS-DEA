import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Users, Fingerprint, CalendarDays, Briefcase, Award, Building2, Shield, ShieldCheck, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const MobileBottomNav = () => {
  const location = useLocation();
  const { user } = useAuth();
  const role = (user?.role || '').toLowerCase();
  const dept = (user?.department || user?.department_name || user?.departments?.name || '').toLowerCase();
  const jabatan = (user?.jabatan || '').toLowerCase();
  const username = (user?.username || '').toLowerCase();

  const isSuperAdmin = ['superadmin', 'super_admin', 'super admin'].includes(role);
  const isAdmin = ['admin', 'hrga_admin', 'hr', 'hse_admin'].includes(role);
  const isHSEAdmin = role === 'hse_admin' || (
    isAdmin && (
      dept.includes('hse') || dept.includes('k3') || dept.includes('safety') || dept.includes('pengelola k3') ||
      jabatan.includes('hse') || jabatan.includes('k3') || jabatan.includes('safety') ||
      username.includes('hse')
    )
  );

  // Role-based Navigation Items (superadmin, hse admin, hrga admin, user)
  const getNavItems = () => {
    // 1. Super Admin Menu (Focus on System Governance & Security)
    if (isSuperAdmin) {
      return [
        { label: 'Home', path: '/dashboard', icon: Home },
        { label: 'Organisasi', path: '/organization', icon: Building2 },
        { label: 'Presensi', path: '/attendance-hub', icon: Fingerprint },
        { label: 'Kalender', path: '/calendar', icon: CalendarDays },
        { label: 'Saya', path: '/settings', isAvatar: true },
      ];
    }

    // 2. HSE Admin Menu (Focus on K3 & Operasional)
    if (isHSEAdmin) {
      return [
        { label: 'Home', path: '/dashboard', icon: Home },
        { label: 'Matriks K3', path: '/organization', icon: Award },
        { label: 'Presensi', path: '/attendance-hub', icon: Fingerprint },
        { label: 'Kalender', path: '/calendar', icon: CalendarDays },
        { label: 'Saya', path: '/personal-certifications', isAvatar: true },
      ];
    }

    // 3. HRGA Admin Menu (With Karyawan, Presensi, Kalender & Agenda Kerja)
    if (isAdmin) {
      return [
        { label: 'Home', path: '/dashboard', icon: Home },
        { label: 'Karyawan', path: '/organization', icon: Users },
        { label: 'Presensi', path: '/attendance-hub', icon: Fingerprint },
        { label: 'Kalender', path: '/calendar', icon: CalendarDays },
        { label: 'Saya', path: '/performance', isAvatar: true },
      ];
    }

    // 4. User / Karyawan Menu
    return [
      { label: 'Home', path: '/dashboard', icon: Home },
      { label: 'Organisasi', path: '/organization-tree', icon: Building2 },
      { label: 'Presensi', path: '/attendance-hub', icon: Fingerprint },
      { label: 'Kalender', path: '/calendar', icon: CalendarDays },
      { label: 'Saya', path: '/personal-certifications', isAvatar: true },
    ];
  };

  const navItems = getNavItems();

  return (
    <div className="lg:hidden fixed bottom-3.5 inset-x-0 z-50 flex justify-center px-3.5 select-none pointer-events-none">
      {/* Floating WhatsApp Dark Liquid Glass Capsule Bar */}
      <nav className="w-full max-w-[365px] pointer-events-auto bg-[#172228]/95 backdrop-blur-2xl border border-white/10 px-2 py-1.5 rounded-full shadow-[0_16px_36px_rgba(0,0,0,0.5),0_0_1px_rgba(255,255,255,0.2)] flex items-center justify-around relative transition-all duration-300">
        {navItems.map((item, index) => {
          const isActive = location.pathname === item.path || 
            (item.path === '/attendance-hub' && location.pathname.includes('attendance')) ||
            (item.path === '/organization' && (location.pathname.includes('employees') || location.pathname.includes('departments'))) ||
            (item.path === '/organization-tree' && location.pathname.includes('organization-tree')) ||
            (item.path === '/personal-certifications' && location.pathname.includes('personal-certifications')) ||
            (item.path === '/calendar' && location.pathname.includes('calendar'));
          
          const Icon = item.icon;

          return (
            <NavLink
              key={index}
              to={item.path}
              className="flex flex-col items-center justify-center flex-1 py-0.5 relative group cursor-pointer transition-transform duration-200 active:scale-90 focus:outline-none"
            >
              {/* Icon Container with WhatsApp Liquid Glass Oval Lens on Active */}
              <div className={`relative flex items-center justify-center transition-all duration-300 ${
                isActive 
                  ? 'w-14 h-7.5 rounded-full bg-white/20 backdrop-blur-xl border border-white/35 shadow-[0_2px_12px_rgba(255,255,255,0.18),inset_0_1px_2px_rgba(255,255,255,0.6)]' 
                  : 'w-14 h-7.5 rounded-full bg-transparent'
              }`}>
                {/* Iridescent Specular Highlight for Active Lens */}
                {isActive && (
                  <div className="absolute inset-x-0 top-0 h-[45%] bg-gradient-to-b from-white/70 to-transparent pointer-events-none rounded-t-full" />
                )}

                {item.isAvatar ? (
                  user?.profile_photo_url ? (
                    <img 
                      src={user.profile_photo_url} 
                      alt={user?.nama || 'Saya'} 
                      className={`w-5.5 h-5.5 rounded-full object-cover transition-all ${
                        isActive ? 'ring-2 ring-emerald-400' : 'ring-1.5 ring-white/50 group-hover:ring-white'
                      }`} 
                    />
                  ) : (
                    <div className={`w-5.5 h-5.5 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
                      isActive 
                        ? 'bg-emerald-500 text-slate-950 ring-2 ring-emerald-400' 
                        : 'bg-slate-800 text-slate-200 ring-1.5 ring-white/40 group-hover:ring-white'
                    }`}>
                      {(user?.nama_lengkap || user?.username || 'U').charAt(0).toUpperCase()}
                    </div>
                  )
                ) : (
                  <Icon 
                    size={20} 
                    className={`transition-colors duration-200 ${
                      isActive 
                        ? 'text-white stroke-[2.4] drop-shadow-[0_1px_4px_rgba(255,255,255,0.4)]' 
                        : 'text-slate-300/85 stroke-[1.8] group-hover:text-white'
                    }`} 
                  />
                )}
              </div>

              {/* Text Label Below Icon */}
              <span className={`text-[10px] tracking-tight mt-0.5 transition-colors duration-200 leading-tight ${
                isActive 
                  ? 'font-black text-white' 
                  : 'font-semibold text-slate-400 group-hover:text-slate-200'
              }`}>
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};

export default MobileBottomNav;
