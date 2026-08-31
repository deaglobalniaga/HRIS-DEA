import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Users, Fingerprint, CalendarDays, Briefcase, Award, Building2, Shield, ShieldCheck } from 'lucide-react';
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

  // Role-based Navigation Items
  const getNavItems = () => {
    // 1. Super Admin Menu
    if (isSuperAdmin) {
      return [
        { label: 'Home', path: '/dashboard', icon: Home },
        { label: 'Organisasi', path: '/organization', icon: Building2 },
        { label: 'Presensi', path: '/attendance-hub', icon: Fingerprint },
        { label: 'Kalender', path: '/calendar', icon: CalendarDays },
        { label: 'Sertifikasi', path: '/personal-certifications', icon: Award },
      ];
    }

    // 2. HSE Admin Menu
    if (isHSEAdmin) {
      return [
        { label: 'Home', path: '/dashboard', icon: Home },
        { label: 'Matriks K3', path: '/organization', icon: ShieldCheck },
        { label: 'Presensi', path: '/attendance-hub', icon: Fingerprint },
        { label: 'Kalender', path: '/calendar', icon: CalendarDays },
        { label: 'Sertifikasi', path: '/personal-certifications', icon: Award },
      ];
    }

    // 3. HRGA Admin Menu
    if (isAdmin) {
      return [
        { label: 'Home', path: '/dashboard', icon: Home },
        { label: 'Karyawan', path: '/organization', icon: Users },
        { label: 'Presensi', path: '/attendance-hub', icon: Fingerprint },
        { label: 'Kalender', path: '/calendar', icon: CalendarDays },
        { label: 'Sertifikasi', path: '/personal-certifications', icon: Award },
      ];
    }

    // 4. User / Karyawan Menu
    return [
      { label: 'Home', path: '/dashboard', icon: Home },
      { label: 'Organisasi', path: '/organization-tree', icon: Building2 },
      { label: 'Presensi', path: '/attendance-hub', icon: Fingerprint },
      { label: 'Kalender', path: '/calendar', icon: CalendarDays },
      { label: 'Sertifikasi', path: '/personal-certifications', icon: Award },
    ];
  };

  const navItems = getNavItems();

  return (
    <div className="lg:hidden fixed bottom-3.5 inset-x-0 z-50 flex justify-center px-3.5 select-none pointer-events-none">
      {/* Floating Prismatic Rainbow Liquid Glass Capsule Bar */}
      <nav className="w-full max-w-[370px] pointer-events-auto bg-white/45 dark:bg-slate-900/40 backdrop-blur-3xl backdrop-saturate-200 border border-white/70 dark:border-white/30 px-2 py-1.5 rounded-full shadow-[0_16px_40px_rgba(0,0,0,0.12),0_0_1px_rgba(255,255,255,0.9),inset_0_1px_2px_rgba(255,255,255,0.95)] flex items-center justify-around relative transition-all duration-300 overflow-visible">
        {/* Iridescent Rainbow Chromatic Glass Refraction Sheen */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-rose-500/20 via-amber-400/20 via-emerald-400/20 via-cyan-400/20 via-blue-500/20 to-purple-500/20 pointer-events-none opacity-85 mix-blend-overlay" />

        {/* Specular Crystal Top Light Reflection */}
        <div className="absolute inset-x-0 top-0 h-[48%] bg-gradient-to-b from-white/90 via-white/25 to-transparent pointer-events-none rounded-t-full" />

        {navItems.map((item, index) => {
          const isPresensi = item.path === '/attendance-hub';
          const isActive = location.pathname === item.path || 
            (item.path === '/attendance-hub' && location.pathname.includes('attendance')) ||
            (item.path === '/organization' && (location.pathname.includes('employees') || location.pathname.includes('departments'))) ||
            (item.path === '/organization-tree' && location.pathname.includes('organization-tree')) ||
            (item.path === '/personal-certifications' && location.pathname.includes('personal-certifications')) ||
            (item.path === '/calendar' && location.pathname.includes('calendar'));
          
          const Icon = item.icon;

          // 1. Elevated Glowing Hero Center Button for "Presensi"
          if (isPresensi) {
            return (
              <NavLink
                key={index}
                to={item.path}
                className="flex flex-col items-center justify-center flex-1 -mt-5 relative group cursor-pointer transition-transform duration-200 active:scale-95 focus:outline-none z-20"
              >
                {/* Elevated Circular Action Capsule with Rainbow Iridescent Rim */}
                <div className={`relative w-12.5 h-12.5 rounded-full flex items-center justify-center transition-all duration-300 shadow-[0_8px_24px_rgba(225,29,72,0.45),inset_0_1px_2px_rgba(255,255,255,0.85)] ring-4 ring-white/80 dark:ring-slate-900/80 ${
                  isActive 
                    ? 'bg-gradient-to-tr from-red-600 via-rose-600 to-red-500 scale-105 animate-pulse' 
                    : 'bg-gradient-to-tr from-red-500 to-rose-500 group-hover:scale-105'
                }`}>
                  {/* Top Gloss Reflection */}
                  <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/70 to-transparent pointer-events-none rounded-t-full" />
                  
                  <Icon size={24} className="text-white stroke-[2.4] drop-shadow-[0_1px_3px_rgba(0,0,0,0.3)]" />
                </div>

                {/* Presensi Label */}
                <span className={`text-[10px] tracking-tight mt-1 transition-colors duration-200 leading-tight ${
                  isActive ? 'font-black text-red-600 dark:text-red-400' : 'font-bold text-slate-800 dark:text-slate-200'
                }`}>
                  {item.label}
                </span>
              </NavLink>
            );
          }

          // 2. Standard Nav Items
          return (
            <NavLink
              key={index}
              to={item.path}
              className="flex flex-col items-center justify-center flex-1 py-0.5 relative group cursor-pointer transition-transform duration-200 active:scale-90 focus:outline-none z-10"
            >
              {/* Icon Container with Oval Liquid Glass Lens on Active */}
              <div className={`relative flex items-center justify-center transition-all duration-300 ${
                isActive 
                  ? 'w-13 h-7 rounded-full bg-white/90 dark:bg-white/30 backdrop-blur-xl border border-white/95 dark:border-white/40 shadow-[0_3px_12px_rgba(220,38,38,0.22),inset_0_1px_2px_rgba(255,255,255,0.95)]' 
                  : 'w-13 h-7 rounded-full bg-transparent'
              }`}>
                {/* Active Lens Specular Gloss Highlight */}
                {isActive && (
                  <div className="absolute inset-x-0 top-0 h-[45%] bg-gradient-to-b from-white/90 to-transparent pointer-events-none rounded-t-full" />
                )}

                <Icon 
                  size={19} 
                  className={`transition-colors duration-200 ${
                    isActive 
                      ? 'text-red-600 dark:text-red-400 stroke-[2.4] drop-shadow-[0_1px_4px_rgba(220,38,38,0.35)]' 
                      : 'text-slate-700 dark:text-slate-300 stroke-[2] group-hover:text-slate-950 dark:group-hover:text-white'
                  }`} 
                />
              </div>

              {/* Text Label Below Icon */}
              <span className={`text-[10px] tracking-tight mt-0.5 transition-colors duration-200 leading-tight ${
                isActive 
                  ? 'font-black text-red-700 dark:text-red-400' 
                  : 'font-bold text-slate-700 dark:text-slate-300 group-hover:text-slate-950 dark:group-hover:text-white'
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
