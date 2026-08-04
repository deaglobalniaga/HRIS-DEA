import React, { useState, useEffect, useRef } from 'react';
import { Search, Bell, X, User, Users, Layout, Briefcase, ChevronRight, Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../../api/api';

const MENUS = [
  { title: 'Dashboard', path: '/dashboard', icon: Layout },
  { title: 'Direktori Karyawan', path: '/employees', icon: Users },
  { title: 'Agenda Kerja', path: '/performance', icon: Briefcase },
  { title: 'Kalender & Cuti', path: '/calendar', icon: Layout },
];

const Navbar = ({ toggleSidebar }) => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState({ employees: [], menus: [] });
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef(null);
  const notificationRef = useRef(null);



  useEffect(() => {
    const fetchNotifications = async () => {
        try {
            const res = await api.get('/hris/notifications');
            setNotifications(res.data.notifications || []);
        } catch (err) {
            console.error("Failed to fetch notifications", err);
        }
    };
    fetchNotifications();
    // Poll every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Global Search Logic
  useEffect(() => {
      const delayDebounceFn = setTimeout(async () => {
          if (searchQuery.length >= 2) {
              setIsSearching(true);
              try {
                  const res = await api.get('/hris/employees');
                  const filteredEmployees = res.data.filter(e => 
                      e.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                      e.role.toLowerCase().includes(searchQuery.toLowerCase())
                  );
                  
                  const filteredMenus = MENUS.filter(m => 
                      m.title.toLowerCase().includes(searchQuery.toLowerCase())
                  );
                  
                  setSearchResults({ employees: filteredEmployees.slice(0, 5), menus: filteredMenus });
              } catch (error) {
                  console.error("Search failed", error);
              } finally {
                  setIsSearching(false);
              }
          } else {
              setSearchResults({ employees: [], menus: [] });
          }
      }, 300);

      return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // Handle click outside for search and notifications dropdowns
  useEffect(() => {
      const handleClickOutside = (event) => {
          if (searchRef.current && !searchRef.current.contains(event.target)) {
              setShowSearch(false);
          }
          if (notificationRef.current && !notificationRef.current.contains(event.target)) {
              setShowNotifications(false);
          }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchSelect = (path) => {
      setShowSearch(false);
      setSearchQuery('');
      navigate(path);
  };

  const markAsRead = async () => {
      try {
          await api.put('/hris/notifications/read-all');
          setNotifications(notifications.map(n => ({...n, is_read: true})));
      } catch (err) {
          console.error(err);
      }
  };

  // Contextual Title
  let pageTitle = 'Dashboard';
  if (location.pathname.includes('/organization')) pageTitle = 'Organisasi';
  else if (location.pathname.includes('/employees')) pageTitle = 'Direktori Karyawan';
  else if (location.pathname.includes('/attendance')) pageTitle = 'Presensi';
  else if (location.pathname.includes('/departments')) pageTitle = 'Departemen & Jabatan';
  else if (location.pathname.includes('/permissions')) pageTitle = 'Cuti & Izin';
  else if (location.pathname.includes('/timesheet')) pageTitle = 'Jam Kerja';
  else if (location.pathname.includes('/inbox')) pageTitle = 'Kotak Masuk';
  else if (location.pathname.includes('/calendar')) pageTitle = 'Kalender & Agenda';
  else if (location.pathname.includes('/settings')) pageTitle = 'Pengaturan';
  else if (location.pathname.includes('/performance')) pageTitle = 'Kinerja & KPI';
  else if (location.pathname.includes('/reports')) pageTitle = 'Laporan HR';
  else if (location.pathname.includes('/payroll')) pageTitle = 'Penggajian';

    return (
    <header className="h-16 w-full px-3 sm:px-6 flex items-center justify-between gap-3 sm:gap-6 bg-slate-50 relative z-40">
      
      {/* Left section: Breadcrumbs / Title */}
      <div className="flex flex-col shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={toggleSidebar} className="lg:hidden p-1 -ml-2 text-slate-500 hover:text-red-900 transition-colors">
            <Menu size={24} />
          </button>
          <h2 className="text-xl font-black text-gray-900 tracking-tight">{pageTitle}</h2>
        </div>
        <div className="text-xs font-bold text-slate-400 mt-0.5 lg:ml-0 ml-10">
          HRIS
        </div>
      </div>

      {/* Center section: Global Search Bar */}
      <div className="hidden md:flex relative flex-1 group" ref={searchRef}>
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-red-900 transition-colors" />
        <input 
          type="text" 
          placeholder="Cari karyawan atau menu..."
          value={searchQuery}
          onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearch(true);
          }}
          onFocus={() => setShowSearch(true)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-full text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-900/10 focus:border-red-900 transition-all shadow-sm"
        />
        
        {/* Search Results Dropdown */}
        {showSearch && searchQuery.length >= 2 && (
            <div className="absolute top-14 left-0 w-full bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50">
                  <div className="max-h-[400px] overflow-y-auto p-2">
                      {isSearching ? (
                          <div className="p-4 text-center text-xs font-bold text-slate-400">Mencari...</div>
                      ) : (
                          <>
                              {searchResults.menus.length > 0 && (
                                  <div className="mb-2">
                                      <div className="px-3 py-2 text-[10px] font-black text-slate-400 uppercase tracking-wider">Menu</div>
                                      {searchResults.menus.map(menu => (
                                          <div 
                                              key={menu.path} 
                                              onClick={() => handleSearchSelect(menu.path)}
                                              className="flex items-center justify-between p-3 mx-1 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors group/item"
                                          >
                                              <div className="flex items-center gap-3">
                                                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover/item:text-red-900 transition-colors">
                                                      <menu.icon size={16} />
                                                  </div>
                                                  <span className="text-sm font-bold text-gray-900">{menu.title}</span>
                                              </div>
                                              <ChevronRight size={16} className="text-slate-300 group-hover/item:text-red-900" />
                                          </div>
                                      ))}
                                  </div>
                              )}
                              
                              {searchResults.employees.length > 0 && (
                                  <div>
                                      <div className="px-3 py-2 text-[10px] font-black text-slate-400 uppercase tracking-wider">Karyawan</div>
                                      {searchResults.employees.map(emp => (
                                          <div 
                                              key={emp.id} 
                                              onClick={() => handleSearchSelect('/employees')}
                                              className="flex items-center p-3 mx-1 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
                                          >
                                              {emp.profile_photo_url ? (
                                                  <img src={emp.profile_photo_url} alt={emp.full_name} className="w-10 h-10 rounded-full object-cover shrink-0" />
                                              ) : (
                                                  <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-500 shrink-0">
                                                      {emp.full_name.charAt(0)}
                                                  </div>
                                              )}
                                              <div className="ml-3 min-w-0">
                                                  <h4 className="text-sm font-bold text-gray-900 truncate">{emp.full_name}</h4>
                                                  <p className="text-[10px] font-bold text-slate-400 uppercase truncate">{emp.role} • {emp.division || 'HRIS'}</p>
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              )}

                              {searchResults.menus.length === 0 && searchResults.employees.length === 0 && (
                                  <div className="p-8 text-center flex flex-col items-center">
                                      <Search size={24} className="text-slate-300 mb-2" />
                                      <p className="text-sm font-bold text-gray-900">Tidak ditemukan</p>
                                      <p className="text-xs text-slate-500 mt-1">Coba cari dengan nama atau modul lainnya.</p>
                                  </div>
                              )}
                          </>
                      )}
                  </div>
            </div>
        )}
      </div>

      {/* Right section: Profile & Notifications */}
      <div className="flex items-center gap-6 shrink-0">

        <div className="flex items-center gap-3 relative" ref={notificationRef}>
            <button onClick={() => setShowNotifications(!showNotifications)} className="w-10 h-10 rounded-full border-2 border-slate-200 flex items-center justify-center text-slate-400 hover:border-red-900 hover:text-red-900 transition-colors relative">
                <Bell size={20} />
                {notifications.some(n => !n.is_read) && (
                    <div className="absolute top-0 right-0 w-3 h-3 bg-red-900 rounded-full border-2 border-white"></div>
                )}
            </button>
            
            {/* Notification Dropdown */}
            {showNotifications && (
                <div className="fixed sm:absolute top-16 sm:top-14 left-4 right-4 sm:left-auto sm:right-0 w-auto sm:w-80 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 flex flex-col">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                        <h3 className="text-sm font-black text-slate-800">Notifikasi Terbaru</h3>
                        {notifications.some(n => !n.is_read) && (
                            <button onClick={markAsRead} className="text-[10px] font-bold text-red-900 hover:underline">Tandai sudah dibaca</button>
                        )}
                    </div>
                    <div className="max-h-[300px] overflow-y-auto p-2">
                        {notifications.length === 0 ? (
                            <div className="p-6 text-center">
                                <Bell size={24} className="mx-auto text-slate-300 mb-2" />
                                <p className="text-xs font-bold text-slate-500">Belum ada notifikasi</p>
                            </div>
                        ) : (
                            notifications.slice(0, 5).map(notification => (
                                <div key={notification.id} 
                                    onClick={() => { 
                                        setShowNotifications(false); 
                                        const title = notification.title.toLowerCase();
                                        if (title.includes('cuti') || title.includes('izin') || title.includes('sakit')) {
                                            navigate('/attendance-hub', { state: { tab: 'permissions' } });
                                        } else if (title.includes('karyawan')) {
                                            navigate('/employees');
                                        } else {
                                            navigate('/notifications');
                                        }
                                    }}
                                    className={`p-3 rounded-xl mb-1 flex items-start gap-3 transition-colors cursor-pointer ${notification.is_read ? 'hover:bg-slate-50' : 'bg-red-50/50 hover:bg-red-50'}`}>
                                    <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                                        <Bell size={14} className={notification.is_read ? 'text-slate-400' : 'text-red-900'} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className={`text-xs font-bold truncate ${notification.is_read ? 'text-slate-700' : 'text-slate-900'}`}>{notification.title}</h4>
                                        <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">{notification.message}</p>
                                        <span className="text-[9px] font-bold text-slate-400 mt-1 block">
                                            {new Date(notification.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    {!notification.is_read && <div className="w-2 h-2 rounded-full bg-red-900 shrink-0 mt-2"></div>}
                                </div>
                            ))
                        )}
                    </div>
                    <button onClick={() => { setShowNotifications(false); navigate('/notifications'); }} className="p-3 text-center text-xs font-bold text-blue-600 bg-slate-50 hover:bg-slate-100 border-t border-slate-100 transition-colors">
                        Lihat Semua Notifikasi
                    </button>
                </div>
            )}
        </div>

        {/* Profile Card */}
        <Link to="/settings" className="flex items-center gap-3 pl-4 border-l border-slate-200 cursor-pointer">
          <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-transparent hover:border-red-900 transition-colors bg-slate-200 flex justify-center items-center font-bold text-red-900">
            {user?.profile_photo_url ? (
              <img src={user.profile_photo_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              user?.full_name ? user.full_name.charAt(0) : 'D'
            )}
          </div>
          <div className="hidden lg:flex flex-col">
            <span className="text-sm font-black text-gray-900 leading-tight">{user?.full_name || 'Guest'}</span>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{user?.role || 'Admin'}</span>
          </div>
        </Link>
        
      </div>
    </header>
  );
};

export default Navbar;
