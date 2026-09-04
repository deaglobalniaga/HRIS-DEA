import React, { useState, useRef, useEffect, useCallback } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Home, Users, Fingerprint, CalendarDays, Award, Building2, ShieldCheck, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const MobileBottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const navRef = useRef(null);

  const role = (user?.role || '').toLowerCase();
  const dept = (user?.department || user?.department_name || user?.departments?.name || '').toLowerCase();
  const jabatan = (user?.jabatan || '').toLowerCase();
  const username = (user?.username || '').toLowerCase();

  const isSuperAdmin = ['superadmin', 'super_admin', 'super admin'].includes(role);
  const isHSEAdmin = role === 'hse_admin' || (
    !isSuperAdmin && (
      dept.includes('hse') || dept.includes('k3') || dept.includes('safety') || dept.includes('pengelola k3') ||
      jabatan.includes('hse') || jabatan.includes('k3') || jabatan.includes('safety') ||
      username.includes('hse')
    )
  );
  const isAdmin = !isSuperAdmin && (
    ['admin', 'hrga_admin', 'hr', 'hse_admin'].includes(role) ||
    role.includes('hr') ||
    isHSEAdmin
  );

  // Role-based Navigation Items (5 items per role, strictly segregated)
  const getNavItems = useCallback(() => {
    // 1. Super Admin: IT Governance, System Security & Role Permissions ONLY
    // (NO Employee Data, NO Certificates, NO Presensi)
    if (isSuperAdmin) {
      return [
        { label: 'Home', path: '/dashboard', icon: Home },
        { label: 'Perusahaan', path: '/organization?tab=company', icon: Building2 },
        { label: 'Keamanan', path: '/settings', icon: ShieldCheck, isSpecial: true },
        { label: 'Hak Akses', path: '/organization?tab=permissions', icon: Shield },
        { label: 'Kalender', path: '/calendar', icon: CalendarDays },
      ];
    }

    // 2. HSE Admin: Safety, K3 Compliance, Presensi, Kalender, Sertifikasi
    if (isHSEAdmin) {
      return [
        { label: 'Home', path: '/dashboard', icon: Home },
        { label: 'Matriks K3', path: '/organization?tab=certifications', icon: ShieldCheck },
        { label: 'Presensi', path: '/attendance-hub', icon: Fingerprint, isSpecial: true },
        { label: 'Kalender', path: '/calendar', icon: CalendarDays },
        { label: 'Sertifikasi', path: '/personal-certifications', icon: Award },
      ];
    }

    // 3. HRGA Admin: Data Karyawan, Presensi, Kalender, Sertifikasi
    if (isAdmin) {
      return [
        { label: 'Home', path: '/dashboard', icon: Home },
        { label: 'Karyawan', path: '/organization?tab=employees', icon: Users },
        { label: 'Presensi', path: '/attendance-hub', icon: Fingerprint, isSpecial: true },
        { label: 'Kalender', path: '/calendar', icon: CalendarDays },
        { label: 'Sertifikasi', path: '/personal-certifications', icon: Award },
      ];
    }

    // 4. Default Employee / Karyawan
    return [
      { label: 'Home', path: '/dashboard', icon: Home },
      { label: 'Organisasi', path: '/organization-tree', icon: Building2 },
      { label: 'Presensi', path: '/attendance-hub', icon: Fingerprint, isSpecial: true },
      { label: 'Kalender', path: '/calendar', icon: CalendarDays },
      { label: 'Sertifikasi', path: '/personal-certifications', icon: Award },
    ];
  }, [isSuperAdmin, isHSEAdmin, isAdmin]);

  const navItems = getNavItems();

  // Determine active index based on route and query parameters
  const getActiveIndex = useCallback(() => {
    const path = location.pathname;
    const search = location.search;

    // Superadmin-specific matching
    if (isSuperAdmin) {
      if (path === '/organization') {
        if (search.includes('tab=company')) return 1;
        if (search.includes('tab=permissions')) return 3;
        return 1;
      }
      if (path.includes('/settings')) return 2;
      if (path.includes('/calendar') || path.includes('kalender')) return 4;
      if (path === '/' || path.includes('dashboard')) return 0;
    }

    // HSE Admin matching
    if (isHSEAdmin) {
      if (path === '/organization' && search.includes('tab=certifications')) return 1;
    }

    // HRGA Admin matching
    if (isAdmin) {
      if (path === '/organization' && search.includes('tab=employees')) return 1;
    }

    if (path.includes('/attendance') || path.includes('presensi')) {
      const idx = navItems.findIndex(i => i.path === '/attendance-hub');
      if (idx !== -1) return idx;
    }
    if (path.includes('organization-tree')) {
      const idx = navItems.findIndex(i => i.path === '/organization-tree');
      if (idx !== -1) return idx;
    }
    if (path.includes('organization')) {
      const idx = navItems.findIndex(i => i.path.startsWith('/organization'));
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
  }, [location.pathname, location.search, navItems, isSuperAdmin, isHSEAdmin, isAdmin]);

  const activeIndex = getActiveIndex();

  // Interactive Drag & Swipe State (WhatsApp-style elastic pill with lens zoom)
  const [isDragging, setIsDragging] = useState(false);
  const [dragPos, setDragPos] = useState(activeIndex);
  const [dragVelocity, setDragVelocity] = useState(0);
  const lastXRef = useRef(0);
  const startXRef = useRef(0);
  const hasMovedRef = useRef(false);
  const lastVibrateIndexRef = useRef(activeIndex);

  // Keep lastVibrateIndex in sync
  useEffect(() => {
    lastVibrateIndexRef.current = activeIndex;
  }, [activeIndex]);

  // Haptic feedback tick
  const triggerHaptic = (ms = 8) => {
    try {
      if (typeof window !== 'undefined' && window.navigator?.vibrate) {
        window.navigator.vibrate(ms);
      }
    } catch {
      // Silently ignore
    }
  };

  // Calculate continuous index from horizontal coordinate
  const getIndexFromClientX = (clientX) => {
    if (!navRef.current) return activeIndex;
    const rect = navRef.current.getBoundingClientRect();
    const itemWidth = rect.width / navItems.length;
    const relativeX = clientX - rect.left;
    const rawIndex = relativeX / itemWidth - 0.5;
    // Elastic boundary resistance
    return Math.max(-0.25, Math.min(navItems.length - 0.75, rawIndex));
  };

  // Pointer / Touch Handlers
  const handlePointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    setIsDragging(true);
    hasMovedRef.current = false;
    startXRef.current = e.clientX;
    lastXRef.current = e.clientX;
    const currentIdx = getIndexFromClientX(e.clientX);
    setDragPos(currentIdx);
    setDragVelocity(0);
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const deltaTotal = Math.abs(e.clientX - startXRef.current);
    if (deltaTotal > 5) {
      hasMovedRef.current = true;
    }

    const currentIdx = getIndexFromClientX(e.clientX);
    const instantaneousVelocity = e.clientX - lastXRef.current;
    lastXRef.current = e.clientX;

    setDragVelocity(instantaneousVelocity);
    setDragPos(currentIdx);

    // Micro-haptic tick when crossing item boundary
    const nearestIndex = Math.max(0, Math.min(navItems.length - 1, Math.round(currentIdx)));
    if (nearestIndex !== lastVibrateIndexRef.current && hasMovedRef.current) {
      lastVibrateIndexRef.current = nearestIndex;
      triggerHaptic(8);
    }
  };

  const handlePointerUp = (e) => {
    if (!isDragging) return;
    setIsDragging(false);

    const finalContinuous = getIndexFromClientX(e.clientX);
    // Add slight momentum
    const targetWithMomentum = finalContinuous + (dragVelocity * 0.015);
    const finalIndex = Math.max(0, Math.min(navItems.length - 1, Math.round(targetWithMomentum)));

    setDragPos(finalIndex);
    setDragVelocity(0);

    // If dragged to a new tab, navigate
    if (hasMovedRef.current) {
      triggerHaptic(15);
      const targetItem = navItems[finalIndex];
      if (targetItem && (targetItem.path !== location.pathname + location.search)) {
        navigate(targetItem.path);
      }
    }
  };

  // Item Width percentage (20% for 5 items)
  const itemPercent = 100 / navItems.length;

  // Fluid Liquid Capsule Stretch Physics based on velocity
  const currentPillIndex = isDragging ? dragPos : activeIndex;
  const stretchAmount = isDragging ? Math.min(1.22, 1 + Math.abs(dragVelocity) * 0.012) : 1;

  return (
    <div className="lg:hidden fixed bottom-3 inset-x-0 z-50 flex justify-center px-3.5 select-none pointer-events-none">
      {/* 
        Clean Acrylic Frosted Glass Dock (Exact Dribbble Reference):
        Bilah kaca kapsul minimalis putih bersih tanpa border pelangi di badan bilah.
        Pelangi hanya ada secara eksklusif pada tetesan kaca cair (liquid glass droplet).
      */}
      <nav
        ref={navRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ touchAction: 'none' }}
        className="w-full max-w-[380px] h-[58px] px-1 py-1 rounded-full relative pointer-events-auto flex items-center justify-between
          bg-white/80 dark:bg-white/90 backdrop-blur-2xl backdrop-saturate-150
          border border-white/95
          shadow-[0_12px_36px_rgba(0,0,0,0.07),0_2px_8px_rgba(0,0,0,0.03),inset_0_1px_2px_rgba(255,255,255,1)]
          cursor-grab active:cursor-grabbing transition-shadow duration-300"
      >
        {/* Pure Specular Top-Rim Light Reflection */}
        <div className="absolute inset-x-0 top-0 h-[44%] bg-gradient-to-b from-white/95 via-white/30 to-transparent pointer-events-none rounded-t-full" />

        {/* 
          SLIDING LIQUID GLASS DROPLET (EXACT DRIBBLE 1:1 REPLICATION)
          - Kaca kristal jernih transparan cembung (ultra-clear physical glass droplet)
          - Refraksi pelangi kromatik tajam HANYA pada lengkungan atas dan bawah (persis video Dribbble)
          - Pantulan kilau cermin cembung atas & bayangan optik 3D melayang
        */}
        <div
          className="absolute -top-1.5 -bottom-1.5 pointer-events-none z-0 flex items-center justify-center will-change-transform"
          style={{
            width: `${itemPercent}%`,
            left: 0,
            transform: `translateX(${currentPillIndex * 100}%) scaleX(${stretchAmount})`,
            transition: isDragging
              ? 'transform 0.04s linear'
              : 'transform 0.36s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          {/* Circular 3D Crystal Glass Droplet Container */}
          <div className="w-[62px] h-[62px] rounded-full relative overflow-hidden bg-gradient-to-b from-white/80 via-white/20 to-white/60 backdrop-blur-xl border border-white/95 shadow-[0_12px_28px_rgba(0,0,0,0.11),0_3px_8px_rgba(0,0,0,0.05),inset_0_2px_4px_rgba(255,255,255,0.95),inset_0_-2px_4px_rgba(0,0,0,0.06)]">
            {/* Top Chromatic Aberration Arc (Dribbble Refraction Highlight) */}
            <div className="absolute -top-0.5 inset-x-2.5 h-[3.5px] rounded-t-full bg-gradient-to-r from-cyan-400 via-amber-300 via-rose-500 to-purple-500 blur-[0.6px] opacity-95 pointer-events-none" />

            {/* Bottom Chromatic Aberration Arc (Dribbble Optical Caustic Fringe) */}
            <div className="absolute -bottom-0.5 inset-x-2.5 h-[3.5px] rounded-b-full bg-gradient-to-r from-rose-500 via-amber-300 via-cyan-400 to-blue-500 blur-[0.6px] opacity-95 pointer-events-none" />

            {/* Specular Curved Top Convex Lens Highlight */}
            <div className="absolute inset-x-1.5 top-0.5 h-[46%] bg-gradient-to-b from-white via-white/50 to-transparent rounded-t-full pointer-events-none" />

            {/* Specular Gloss Oval Glint (Top-Left Angle) */}
            <div className="absolute top-1.5 left-2.5 w-6 h-2.5 rounded-full bg-white/70 blur-[0.6px] -rotate-12 pointer-events-none" />

            {/* Bottom Refracted Caustic Glow */}
            <div className="absolute bottom-1 inset-x-2 h-[7px] bg-gradient-to-t from-cyan-400/30 via-rose-400/20 to-transparent rounded-b-full blur-[0.8px] pointer-events-none" />

            {/* Center Convex Magnifying Light Diffuser */}
            <div className="absolute inset-0 bg-radial from-white/60 via-transparent to-transparent pointer-events-none" />
          </div>
        </div>

        {/* 5 Navigation Tab Buttons with Liquid Lens Zoom Effect */}
        {navItems.map((item, index) => {
          const isActive = index === activeIndex;
          // Calculate distance to current drag/active position for smooth convex magnification zoom
          const dist = Math.abs(currentPillIndex - index);
          const isHovered = dist < 0.45;
          const isZoomed = isActive || isHovered;
          const Icon = item.icon;
          const isSpecial = item.isSpecial;

          return (
            <NavLink
              key={index}
              to={item.path}
              onClick={(e) => {
                // If user dragged to another tab, prevent native click conflict
                if (hasMovedRef.current) {
                  e.preventDefault();
                  return;
                }
                triggerHaptic(10);
              }}
              className="flex-1 h-full flex flex-col items-center justify-center relative z-10 select-none outline-none group py-1"
            >
              {/* Icon Container with Convex Magnifying Zoom Effect */}
              <div
                className={`relative flex items-center justify-center h-5 w-full transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                  isZoomed
                    ? 'scale-[1.24] -translate-y-0.5 drop-shadow-[0_2px_6px_rgba(234,88,12,0.35)]'
                    : 'scale-100 translate-y-0 group-hover:scale-105'
                }`}
              >
                {/* Subtle ambient pulse halo for special center button */}
                {isSpecial && (
                  <div
                    className={`absolute -inset-1 rounded-full pointer-events-none transition-all duration-300 ${
                      isZoomed
                        ? 'bg-orange-500/15 scale-110 animate-pulse'
                        : 'bg-transparent scale-90'
                    }`}
                  />
                )}

                <Icon
                  size={20}
                  className={`transition-colors duration-200 ${
                    isZoomed
                      ? 'text-orange-600 fill-orange-600 stroke-[2]'
                      : 'text-[#1f2937] stroke-[2.2] group-hover:text-orange-600'
                  }`}
                />
              </div>

              {/* Text Label: Crisp Dark before clicked, Vibrant Orange when active */}
              <span
                className={`text-[9.5px] tracking-tight mt-1 transition-all duration-200 leading-none ${
                  isZoomed
                    ? 'font-black text-orange-600 scale-105 drop-shadow-[0_1px_1px_rgba(255,255,255,0.9)]'
                    : 'font-semibold text-[#374151] scale-100 group-hover:text-orange-600'
                }`}
              >
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
