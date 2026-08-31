import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Users, Fingerprint, CalendarDays, Briefcase, Award, Building2, Shield, ShieldCheck, Settings } from 'lucide-react';
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
        { label: 'Presensi', path: '/attendance-hub', icon: Fingerprint, isCenter: true },
        { label: 'Kalender', path: '/calendar', icon: CalendarDays },
        { label: 'Keamanan', path: '/settings', icon: Shield },
      ];
    }

    // 2. HSE Admin Menu (Focus on K3 & Operasional)
    if (isHSEAdmin) {
      return [
        { label: 'Home', path: '/dashboard', icon: Home },
        { label: 'Matriks K3', path: '/organization', icon: Award },
        { label: 'Presensi', path: '/attendance-hub', icon: Fingerprint, isCenter: true },
        { label: 'Kalender', path: '/calendar', icon: CalendarDays },
        { label: 'Sertifikat', path: '/personal-certifications', icon: ShieldCheck },
      ];
    }

    // 3. HRGA Admin Menu (With Karyawan, Presensi, Kalender & Agenda Kerja)
    if (isAdmin) {
      return [
        { label: 'Home', path: '/dashboard', icon: Home },
        { label: 'Karyawan', path: '/organization', icon: Users },
        { label: 'Presensi', path: '/attendance-hub', icon: Fingerprint, isCenter: true },
        { label: 'Kalender', path: '/calendar', icon: CalendarDays },
        { label: 'Agenda', path: '/performance', icon: Briefcase },
      ];
    }

    // 4. User / Karyawan Menu
    return [
      { label: 'Home', path: '/dashboard', icon: Home },
      { label: 'Organisasi', path: '/organization-tree', icon: Building2 },
      { label: 'Presensi', path: '/attendance-hub', icon: Fingerprint, isCenter: true },
      { label: 'Kalender', path: '/calendar', icon: CalendarDays },
      { label: 'Sertifikasi', path: '/personal-certifications', icon: Award },
    ];
  };

  const navItems = getNavItems();

  return (
    <div className="lg:hidden fixed bottom-4 inset-x-0 z-50 flex justify-center px-4 select-none pointer-events-none">
      {/* Floating Crisp White Ultra-Slim Capsule Island Bar */}
      <nav className="w-full max-w-[325px] pointer-events-auto bg-white/95 backdrop-blur-2xl border border-slate-200/90 px-1.5 py-1 rounded-full shadow-[0_12px_32px_rgba(0,0,0,0.12)] flex items-center justify-between relative transition-all duration-300">
        {navItems.map((item, index) => {
          const isActive = location.pathname === item.path || 
            (item.path === '/attendance-hub' && location.pathname.includes('attendance')) ||
            (item.path === '/organization' && (location.pathname.includes('employees') || location.pathname.includes('departments'))) ||
            (item.path === '/organization-tree' && location.pathname.includes('organization-tree')) ||
            (item.path === '/personal-certifications' && location.pathname.includes('personal-certifications')) ||
            (item.path === '/calendar' && location.pathname.includes('calendar'));
          
          const Icon = item.icon;

          // Center Elevated Presensi Fingerprint Action Button (Slimmed)
          if (item.isCenter) {
            return (
              <NavLink
                key={index}
                to={item.path}
                className="relative -top-3.5 flex flex-col items-center group active:scale-90 transition-transform duration-200 focus:outline-none"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ring-3 ring-white group-hover:scale-105 ${
                  isActive
                    ? 'bg-gradient-to-tr from-black via-red-900 to-red-600 text-white shadow-red-600/40 scale-105'
                    : 'bg-gradient-to-tr from-slate-950 via-red-950 to-red-600 text-white shadow-slate-900/25'
                }`}>
                  <Icon size={19} className="animate-pulse text-white" />
                </div>
                <span className={`text-[8px] font-black mt-0.5 tracking-tight transition-colors ${isActive ? 'text-red-700 font-extrabold' : 'text-slate-600 group-hover:text-red-700'}`}>
                  {item.label}
                </span>
              </NavLink>
            );
          }

          // Active Item: Slim Liquid Glass Capsule Pill
          if (isActive) {
            return (
              <NavLink
                key={index}
                to={item.path}
                className="relative flex items-center gap-1 px-2.5 py-1 rounded-full font-black text-[11px] transition-all duration-300 active:scale-95 focus:outline-none overflow-hidden bg-gradient-to-b from-white/95 via-slate-100/70 to-slate-200/50 backdrop-blur-xl border border-white/90 text-slate-900 shadow-[inset_0_1px_1.5px_rgba(255,255,255,1),inset_0_-1px_1.5px_rgba(0,0,0,0.04),0_3px_10px_rgba(0,0,0,0.06)] ring-1 ring-slate-900/5 group"
              >
                {/* Liquid Glass Gloss Specular Top Highlight */}
                <div className="absolute inset-x-0 top-0 h-[45%] bg-gradient-to-b from-white/80 to-transparent pointer-events-none rounded-t-full" />
                <Icon size={14} className="stroke-[2.5] text-red-700 relative z-10" />
                <span className="truncate max-w-[62px] tracking-tight relative z-10 text-slate-900 font-black">{item.label}</span>
              </NavLink>
            );
          }

          // Inactive Items: Slim Minimalist Icon
          return (
            <NavLink
              key={index}
              to={item.path}
              className="p-1.5 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all duration-200 active:scale-90 focus:outline-none flex items-center justify-center"
              title={item.label}
            >
              <Icon size={17} className="stroke-[1.8] text-slate-500 hover:text-slate-900 transition-colors" />
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};

export default MobileBottomNav;
