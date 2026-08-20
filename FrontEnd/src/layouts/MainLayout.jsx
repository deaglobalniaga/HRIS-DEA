import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/common/Sidebar';
import Navbar from '../components/common/Navbar';
import MobileBottomNav from '../components/common/MobileBottomNav';
import { useAuth } from '../context/AuthContext';

const MainLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user } = useAuth();
  const role = (user?.role || '').toLowerCase();
  const isEmployeeRole = role === 'user' || role === 'karyawan' || role === 'pjo';

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-gray-900 selection:bg-red-900 selection:text-white">
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

        {/* Main Content Area: Proper comfortable padding on mobile, standard padding on desktop */}
        <main className={`flex-1 w-full ${isEmployeeRole ? '' : 'px-4 py-4 sm:px-6 sm:py-6'} lg:p-6 overflow-x-hidden overflow-y-auto flex flex-col pb-32 lg:pb-8`}>
          <Outlet />
        </main>
      </div>

      {/* Persistent Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
};

export default MainLayout;
