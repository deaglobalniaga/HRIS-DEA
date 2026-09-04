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

  // Smooth scroll to top on every route navigation
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

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
      
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      
      <div className="flex-1 flex flex-col lg:ml-64 min-h-screen relative w-full overflow-x-hidden">
        {/* Desktop Navbar (Hidden on mobile for clean native app experience) */}
        <div className="hidden lg:block">
          <Navbar toggleSidebar={() => setIsSidebarOpen(true)} />
        </div>

        {/* Main Content Area with Blur-In Page Transition */}
        <main className={`flex-1 w-full ${isEmployeeRole ? 'pb-20' : 'px-4 pt-1.5 pb-4 sm:px-6 sm:pt-2 sm:pb-6 pb-32'} lg:px-6 lg:pt-2.5 lg:pb-8 overflow-x-hidden overflow-y-auto flex flex-col`}>
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
