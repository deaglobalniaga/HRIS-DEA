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
      {/* Floating Translucent Frosted Liquid Glass Capsule Bar */}
      <nav className="w-full max-w-[365px] pointer-events-auto bg-[#1e293b]/90 dark:bg-slate-900/90 backdrop-blur-2xl backdrop-saturate-200 border border-white/25 dark:border-white/20 px-2 py-1.5 rounded-full shadow-[0_16px_36px_rgba(0,0,0,0.45),inset_0_1px_2px_rgba(255,255,255,0.4)] flex items-center justify-around relative transition-all duration-300">
        {/* Specular Top Reflection Highlight */}
        <div className="absolute inset-x-0 top-0 h-[45%] bg-gradient-to-b from-white/30 dark:from-white/15 to-transparent pointer-events-none rounded-t-full" />

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
                  ? 'w-14 h-7.5 rounded-full bg-white/20 dark:bg-white/20 backdrop-blur-xl border border-white/40 dark:border-white/35 shadow-[0_2px_12px_rgba(255,255,255,0.2),inset_0_1px_2px_rgba(255,255,255,0.6)]' 
                  : 'w-14 h-7.5 rounded-full bg-transparent'
              }`}>
                {/* Active Lens Specular Gloss Highlight */}
                {isActive && (
                  <div className="absolute inset-x-0 top-0 h-[45%] bg-gradient-to-b from-white/70 to-transparent pointer-events-none rounded-t-full" />
                )}

                <Icon 
                  size={20} 
                  className={`transition-colors duration-200 ${
                    isActive 
                      ? 'text-emerald-400 dark:text-emerald-400 stroke-[2.4] drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]' 
                      : 'text-slate-200 dark:text-slate-200 stroke-[2] group-hover:text-white'
                  }`} 
                />
              </div>

              {/* Text Label Below Icon */}
              <span className={`text-[10px] tracking-tight mt-0.5 transition-colors duration-200 leading-tight ${
                isActive 
                  ? 'font-black text-white' 
                  : 'font-bold text-slate-200 group-hover:text-white'
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
