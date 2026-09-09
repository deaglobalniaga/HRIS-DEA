import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/common/Sidebar';
import Navbar from '../components/common/Navbar';
import MobileBottomNav from '../components/common/MobileBottomNav';
import DotField from '../components/common/DotField';
import { useAuth } from '../context/AuthContext';

const MainLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user } = useAuth();
  const location = useLocation();
  const role = (user?.role || '').toLowerCase();
  const dept = (user?.department || user?.department_name || user?.departments?.name || '').toLowerCase();
  const jabatan = (user?.jabatan || '').toLowerCase();
  const username = (user?.username || '').toLowerCase();

  const isSuperAdmin = ['superadmin', 'super_admin', 'super admin'].includes(role) || role.includes('super');
  const isHSEAdmin = role === 'hse_admin' || (
    (['admin', 'hr', 'hrga_admin'].includes(role) || role.includes('admin')) && (
      dept.includes('hse') || dept.includes('k3') || dept.includes('safety') || dept.includes('pengelola k3') ||
      jabatan.includes('hse') || jabatan.includes('k3') || jabatan.includes('safety') ||
      username.includes('hse')
    )
  );

  const isEmployeeRole = role === 'user' || role === 'karyawan' || role === 'pjo';
  const isEmployeeDashboard = isEmployeeRole && (location.pathname === '/' || location.pathname === '/dashboard');

  // Dynamic theme-color for mobile status bar (dark for Employee Dashboard, clean slate for others)
  useEffect(() => {
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', isEmployeeDashboard ? '#120202' : '#f8fafc');
    }
  }, [isEmployeeDashboard]);

  // Smooth scroll to top on every route navigation
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  // Desktop sidebar collapsed state with device cache (localStorage)
  const STORAGE_KEY = 'hris_desktop_sidebar_collapsed';
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {}
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-gray-900 selection:bg-red-900 selection:text-white relative">
      {/* Interactive DotField Background for Super Admin & HSE Admin Roles */}
      {(isSuperAdmin || isHSEAdmin) && (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <DotField
            dotRadius={1.8}
            dotSpacing={16}
            bulgeStrength={80}
            glowRadius={220}
            sparkle={false}
            waveAmplitude={0}
            gradientFrom={isSuperAdmin ? 'rgba(220, 38, 38, 0.65)' : 'rgba(16, 185, 129, 0.65)'}
            gradientTo={isSuperAdmin ? 'rgba(185, 28, 28, 0.35)' : 'rgba(13, 148, 136, 0.35)'}
            glowColor={isSuperAdmin ? 'rgba(220, 38, 38, 0.25)' : 'rgba(16, 185, 129, 0.25)'}
          />
        </div>
      )}

      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/50 z-40 lg:hidden" 
          onClick={() => setIsSidebarOpen(false)} 
        />
      )}
      
      <Sidebar 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen}
        isCollapsed={isSidebarCollapsed}
        toggleCollapse={toggleSidebarCollapse}
      />
      
      <div className={`flex-1 flex flex-col ${isSidebarCollapsed ? 'lg:ml-[76px]' : 'lg:ml-64'} min-h-screen relative w-full overflow-x-hidden transition-[margin] duration-300 ease-in-out`}>
        {/* Top Navbar: Hidden ONLY on Employee Dashboard (which has its own custom dark hero banner), visible for all Admin roles and all other pages */}
        <div className={isEmployeeDashboard ? 'hidden lg:block' : 'block sticky top-0 z-40'}>
          <Navbar 
            toggleSidebar={() => setIsSidebarOpen(true)} 
          />
        </div>

        {/* Main Content Area with Blur-In Page Transition */}
        <main className={`flex-1 w-full ${isEmployeeDashboard ? 'px-0 pt-0 pb-24 lg:px-6 lg:pt-2.5 lg:pb-8' : 'px-3.5 pt-3.5 pb-24 sm:px-6 sm:pt-4 sm:pb-28 lg:px-6 lg:pt-2.5 lg:pb-8'} overflow-x-hidden overflow-y-auto flex flex-col`}>
          <div key={location.pathname} className="w-full flex-1 flex flex-col page-blur-in">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Persistent Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
};

export default MainLayout;
