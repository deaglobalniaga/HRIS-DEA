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

  const getActiveIndex = () => {
    const path = location.pathname;
    if (path.includes('/attendance') || path.includes('presensi')) {
      const idx = navItems.findIndex(i => i.path === '/attendance-hub');
      if (idx !== -1) return idx;
    }
    if (path.includes('organization-tree')) {
      const idx = navItems.findIndex(i => i.path === '/organization-tree');
      if (idx !== -1) return idx;
    }
    if (path.includes('organization') || path.includes('employees') || path.includes('departments')) {
      const idx = navItems.findIndex(i => i.path === '/organization' || i.path === '/organization-tree');
      if (idx !== -1) return idx;
    }
    if (path.includes('certificat') || path.includes('sertifikasi')) {
      const idx = navItems.findIndex(i => i.path === '/personal-certifications');
      if (idx !== -1) return idx;
    }
    if (path.includes('calendar') || path.includes('kalender')) {
      const idx = navItems.findIndex(i => i.path === '/calendar');
      if (idx !== -1) return idx;
    }
    if (path === '/' || path.includes('dashboard')) {
      const idx = navItems.findIndex(i => i.path === '/dashboard');
      if (idx !== -1) return idx;
    }
    const exact = navItems.findIndex(i => i.path === path);
    return exact !== -1 ? exact : 0;
  };

  const activeIndex = getActiveIndex();

  return (
    <div className="lg:hidden fixed bottom-3.5 inset-x-0 z-50 flex justify-center px-3.5 select-none pointer-events-none">
      {/* Floating Prismatic Rainbow Liquid Glass Capsule Bar */}
      <nav className="w-full max-w-[370px] pointer-events-auto bg-white/50 dark:bg-slate-900/50 backdrop-blur-3xl backdrop-saturate-200 border border-white/70 dark:border-white/30 px-2 py-1.5 rounded-full shadow-[0_16px_40px_rgba(0,0,0,0.12),0_0_1px_rgba(255,255,255,0.9),inset_0_1px_2px_rgba(255,255,255,0.95)] flex items-center relative transition-all duration-300 overflow-visible">
        {/* Iridescent Rainbow Chromatic Glass Refraction Sheen */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-rose-500/20 via-amber-400/20 via-emerald-400/20 via-cyan-400/20 via-blue-500/20 to-purple-500/20 pointer-events-none opacity-80 mix-blend-overlay" />

        {/* Specular Crystal Top Light Reflection */}
        <div className="absolute inset-x-0 top-0 h-[48%] bg-gradient-to-b from-white/90 via-white/25 to-transparent pointer-events-none rounded-t-full" />

        {/* SLIDING LIQUID GLASS PILL INDICATOR (WHATSAPP / IOS DYNAMIC GLIDE) */}
        <div
          className="absolute top-1.5 bottom-1.5 left-2 w-[calc((100%-16px)/5)] pointer-events-none z-0 flex items-start justify-center transition-all duration-400 ease-[cubic-bezier(0.34,1.38,0.64,1)]"
          style={{
            transform: `translateX(${activeIndex * 100}%)`,
            opacity: activeIndex === 2 ? 0 : 1,
            scale: activeIndex === 2 ? 0.75 : 1,
          }}
        >
          {/* Liquid Glass Capsule Lens */}
          <div className="w-13 h-7 rounded-full bg-white/95 dark:bg-white/35 backdrop-blur-2xl border border-white/95 dark:border-white/50 shadow-[0_3px_14px_rgba(220,38,38,0.25),0_1px_3px_rgba(0,0,0,0.06),inset_0_1px_2px_rgba(255,255,255,1)] relative overflow-hidden transition-all duration-300">
            {/* Top Gloss Specular Highlight */}
            <div className="absolute inset-x-0 top-0 h-[46%] bg-gradient-to-b from-white via-white/70 to-transparent pointer-events-none rounded-t-full" />
            {/* Subtle Liquid Shimmer */}
            <div className="absolute inset-0 bg-gradient-to-tr from-rose-500/10 via-transparent to-red-500/15 pointer-events-none" />
          </div>
        </div>

        {/* The 5 Navigation Buttons */}
        {navItems.map((item, index) => {
          const isPresensi = item.path === '/attendance-hub';
          const isActive = index === activeIndex;
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
                <span className={`text-[10px] tracking-tight mt-1 transition-all duration-200 leading-tight ${
                  isActive ? 'font-black text-red-600 dark:text-red-400 scale-105' : 'font-bold text-slate-800 dark:text-slate-200 scale-100'
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
              {/* Icon Container above the sliding liquid glass lens */}
              <div className="relative w-13 h-7 flex items-center justify-center">
                <Icon 
                  size={19} 
                  className={`transition-all duration-300 ${
                    isActive 
                      ? 'text-red-600 dark:text-red-400 scale-110 stroke-[2.4] drop-shadow-[0_1px_4px_rgba(220,38,38,0.35)]' 
                      : 'text-slate-700 dark:text-slate-300 scale-100 stroke-[2] group-hover:text-slate-950 dark:group-hover:text-white'
                  }`} 
                />
              </div>

              {/* Text Label Below Icon */}
              <span className={`text-[10px] tracking-tight mt-0.5 transition-all duration-300 leading-tight ${
                isActive 
                  ? 'font-black text-red-700 dark:text-red-400 scale-105' 
                  : 'font-bold text-slate-700 dark:text-slate-300 scale-100 group-hover:text-slate-950 dark:group-hover:text-white'
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
