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
      {/* Floating Bright Crystal Liquid Glass Capsule Bar */}
      <nav className="w-full max-w-[365px] pointer-events-auto bg-white/75 dark:bg-slate-900/75 backdrop-blur-3xl backdrop-saturate-150 border border-white/80 dark:border-white/25 px-2 py-1.5 rounded-full shadow-[0_12px_32px_rgba(0,0,0,0.12),0_0_1px_rgba(255,255,255,0.8),inset_0_1px_2px_rgba(255,255,255,0.9)] flex items-center justify-around relative transition-all duration-300">
        {/* Specular Top Reflection Highlight */}
        <div className="absolute inset-x-0 top-0 h-[45%] bg-gradient-to-b from-white/80 dark:from-white/20 to-transparent pointer-events-none rounded-t-full" />

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
              className="flex flex-col items-center justify-center flex-1 py-0.5 relative group cursor-pointer transition-transform duration-200 active:scale-90 focus:outline-none z-10"
            >
              {/* Icon Container with Oval Liquid Glass Lens on Active */}
              <div className={`relative flex items-center justify-center transition-all duration-300 ${
                isActive 
                  ? 'w-14 h-7.5 rounded-full bg-white/90 dark:bg-white/25 backdrop-blur-xl border border-white/95 dark:border-white/40 shadow-[0_3px_12px_rgba(220,38,38,0.22),inset_0_1px_2px_rgba(255,255,255,0.95)]' 
                  : 'w-14 h-7.5 rounded-full bg-transparent'
              }`}>
                {/* Active Lens Specular Gloss Highlight */}
                {isActive && (
                  <div className="absolute inset-x-0 top-0 h-[45%] bg-gradient-to-b from-white/90 to-transparent pointer-events-none rounded-t-full" />
                )}

                <Icon 
                  size={20} 
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
