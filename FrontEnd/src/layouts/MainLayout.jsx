import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/common/Sidebar';
import Navbar from '../components/common/Navbar';

const MainLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
      
      <div className="flex-1 flex flex-col lg:ml-64 h-screen relative w-full overflow-hidden">
        <Navbar toggleSidebar={() => setIsSidebarOpen(true)} />
        <main className="flex-1 w-full p-3 lg:p-4 overflow-x-hidden overflow-y-auto flex flex-col">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
