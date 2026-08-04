import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Inbox, Calendar, Users, Clock, Activity, CalendarRange, Briefcase, LogOut, Calculator, FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Sidebar = ({ isOpen, setIsOpen }) => {
  const { logout, user } = useAuth();
  
  const isAdmin = user?.role?.toLowerCase().includes('admin') || user?.role?.toLowerCase().includes('hr');
  
  const menuSections = [
    {
      title: '',
      items: [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, adminOnly: false },
        { name: 'Profil Saya', path: '/settings', icon: Users, adminOnly: false },
      ]
    },
    {
      title: 'Organisasi & Karyawan',
      items: [
        { name: 'Data Organisasi', path: '/organization', icon: Users, adminOnly: true },
      ]
    },
    {
      title: 'Manajemen Kehadiran',
      items: [
        { name: 'Pusat Kehadiran', path: '/attendance-hub', icon: Clock, adminOnly: false },
      ]
    },
    {
      title: 'Perencanaan',
      items: [
        { name: 'Agenda Kerja', path: '/performance', icon: Activity, adminOnly: true },
        { name: 'Kalender Tim', path: '/calendar', icon: Calendar, adminOnly: false },
      ]
    },
    {
      title: 'Laporan',
      items: [
        { name: 'Jam Kerja (Timesheet)', path: '/timesheet', icon: Calculator, adminOnly: true },
        { name: 'Rekap Kehadiran', path: '/reports', icon: FileText, adminOnly: true },
      ]
    }
  ];

  return (
    <aside className={`w-64 bg-white border-r border-slate-200 h-screen flex flex-col fixed left-0 top-0 z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
      {/* Logo */}
      <div className="h-24 flex items-center justify-center px-4 border-b border-slate-100">
        <img src="/dea.png" alt="Company Logo" className="h-20 w-auto object-contain" onError={(e) => { e.target.style.display = 'none' }} />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-5 scrollbar-hide">
        {menuSections.map((section, idx) => {
          const visibleItems = section.items.filter(item => isAdmin || !item.adminOnly);
          if (visibleItems.length === 0) return null;

          return (
            <div key={idx} className="space-y-1">
              {section.title && (
                <h3 className="px-3 text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2">
                  {section.title}
                </h3>
              )}
              {visibleItems.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.path}
                  onClick={() => setIsOpen?.(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                      isActive
                        ? 'bg-red-900 text-white shadow-md shadow-red-900/20'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-red-900'
                    }`
                  }
                >
                  <item.icon size={18} strokeWidth={2.5} />
                  <span className="truncate">{item.name}</span>
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-slate-100">
        <button 
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-slate-500 hover:bg-red-50 hover:text-red-900 transition-all"
        >
          <LogOut size={18} strokeWidth={2.5} />
          Keluar
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
