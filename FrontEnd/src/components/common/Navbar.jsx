import React, { useState, useEffect, useRef } from 'react';
import { Search, Bell, X, User, Users, Layout, Briefcase, ChevronRight, Menu, LogOut, Shield, Settings as SettingsIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../../api/api';

const getAllMenus = (role, user = {}) => {
    const r = (role || '').toLowerCase();
    const dept = (user?.department || user?.department_name || '').toLowerCase();
    const jabatan = (user?.jabatan || '').toLowerCase();
    const username = (user?.username || '').toLowerCase();

    const isSuperAdmin = ['superadmin', 'super_admin'].includes(r);
    const isAdmin = ['admin', 'hrga_admin', 'hr', 'hse_admin'].includes(r);
    const isHSEAdmin = r === 'hse_admin' || (
        isAdmin && (
            dept.includes('hse') || dept.includes('k3') || dept.includes('safety') || dept.includes('pengelola k3') ||
            jabatan.includes('hse') || jabatan.includes('k3') || jabatan.includes('safety') ||
            username.includes('hse')
        )
    );

    if (isSuperAdmin) {
        return [
            { title: 'Dashboard Monitoring', path: '/dashboard', icon: Layout },
            { title: 'Profil Perusahaan & Legalitas', path: '/organization', icon: Users },
            { title: 'Kalender Operasional', path: '/calendar', icon: Layout },
            { title: 'Kotak Masuk Notifikasi', path: '/notifications', icon: Bell },
            { title: 'Pengaturan & Keamanan', path: '/settings', icon: User }
        ];
    }

    if (isHSEAdmin) {
        return [
            { title: 'Dashboard HSE', path: '/dashboard', icon: Layout },
            { title: 'Matriks Sertifikasi K3', path: '/organization', icon: Users },
            { title: 'Sertifikasi Saya', path: '/personal-certifications', icon: Briefcase },
            { title: 'Pusat Kehadiran', path: '/attendance-hub', icon: Users },
            { title: 'Jam Kerja (Timesheet)', path: '/timesheet', icon: Layout },
            { title: 'Rekap Kehadiran Site', path: '/reports', icon: Briefcase },
            { title: 'Kalender Site', path: '/calendar', icon: Layout },
            { title: 'Kotak Masuk Notifikasi', path: '/notifications', icon: Bell }
        ];
    }

    const menus = [
        { title: 'Dashboard', path: '/dashboard', icon: Layout },
        { title: 'Direktori Karyawan', path: '/employees', icon: Users },
        { title: 'Agenda Kerja', path: '/performance', icon: Briefcase },
        { title: 'Kalender & Jadwal', path: '/calendar', icon: Layout },
        { title: 'Presensi & Kehadiran', path: '/attendance', icon: Users },
        { title: 'Cuti & Izin', path: '/permissions', icon: Briefcase },
        { title: 'Jam Kerja (Timesheet)', path: '/timesheet', icon: Layout },
        { title: 'Kotak Masuk Notifikasi', path: '/notifications', icon: Bell }
    ];

    if (isAdmin) {
        menus.push(
            { title: 'Laporan HR', path: '/reports', icon: Briefcase },
            { title: 'Departemen & Divisi', path: '/departments', icon: Users },
            { title: 'Struktur Organisasi', path: '/organization', icon: Layout }
        );
    }
    
    return menus;
};

const Navbar = ({ toggleSidebar }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState({ employees: [], menus: [] });
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef(null);
  const notificationRef = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      // Pause polling if user is not looking at the tab (tab minimized/background)
      if (document.hidden) return;
      try {
        const res = await api.get('/hris/notifications');
        setNotifications(res.data.notifications || []);
      } catch (err) {
        console.error("Failed to fetch notifications", err);
      }
    };

    fetchNotifications();

    // Poll every 60 seconds when tab is active
    const interval = setInterval(fetchNotifications, 60000);

    // Immediate refresh when user switches back to this tab
    const handleFocus = () => {
      fetchNotifications();
    };
    window.addEventListener('focus', handleFocus);

    const handleSync = () => {
      fetchNotifications();
    };
    window.addEventListener('hris_notifications_updated', handleSync);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('hris_notifications_updated', handleSync);
    };
  }, [user]);

  // Global Search Logic
  useEffect(() => {
      const delayDebounceFn = setTimeout(async () => {
          if (searchQuery.length >= 2) {
              setIsSearching(true);
              try {
                  const res = await api.get('/hris/employees');
                  const filteredEmployees = res.data.filter(e => {
                      const name = e.nama || e.full_name || '';
                      return name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             (e.role && e.role.toLowerCase().includes(searchQuery.toLowerCase()));
                  });
                  
                  const userMenus = getAllMenus(user?.role, user);
                  const filteredMenus = userMenus.filter(m => 
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

  // Handle click outside for search, notifications, and profile dropdowns
  useEffect(() => {
      const handleClickOutside = (event) => {
          if (searchRef.current && !searchRef.current.contains(event.target)) {
              setShowSearch(false);
          }
          if (notificationRef.current && !notificationRef.current.contains(event.target)) {
              setShowNotifications(false);
          }
          if (profileRef.current && !profileRef.current.contains(event.target)) {
              setShowProfileMenu(false);
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
          setNotifications(prev => prev.map(n => ({...n, is_read: true})));
          await api.put('/hris/notifications/read-all');
          window.dispatchEvent(new CustomEvent('hris_notifications_updated'));
      } catch (err) {
          console.error('Failed to mark all notifications as read', err);
      }
  };

  // Contextual Title
  let pageTitle = 'Dashboard';
  if (location.pathname.includes('/personal-certifications')) pageTitle = 'Sertifikasi Saya';
  else if (location.pathname.includes('/organization')) pageTitle = 'Organisasi';
  else if (location.pathname.includes('/employees')) pageTitle = 'Direktori Karyawan';
  else if (location.pathname.includes('/attendance')) pageTitle = 'Presensi';
  else if (location.pathname.includes('/departments')) pageTitle = 'Departemen & Jabatan';
  else if (location.pathname.includes('/permissions')) pageTitle = 'Cuti & Izin';
  else if (location.pathname.includes('/timesheet')) pageTitle = 'Jam Kerja';
  else if (location.pathname.includes('/inbox')) pageTitle = 'Kotak Masuk';
  else if (location.pathname.includes('/calendar')) pageTitle = 'Kalender & Agenda';
  else if (location.pathname.includes('/settings')) pageTitle = 'Pengaturan';
  else if (location.pathname.includes('/performance')) pageTitle = 'Agenda Kerja';
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
          HRIS / {pageTitle}
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
                                                  <img src={emp.profile_photo_url} alt={emp.nama || emp.full_name} className="w-10 h-10 min-w-[40px] rounded-full object-cover shrink-0 aspect-square" />
                                              ) : (
                                                  <div className="w-10 h-10 min-w-[40px] rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-500 shrink-0 aspect-square">
                                                      {(emp.nama || emp.full_name).charAt(0)}
                                                  </div>
                                              )}
                                              <div className="ml-3 min-w-0">
                                                  <h4 className="text-sm font-bold text-gray-900 truncate">{emp.nama || emp.full_name}</h4>
                                                  <p className="text-[10px] font-bold text-slate-400 uppercase truncate">{emp.role} • {emp.department || emp.division || 'HRIS'}</p>
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
            <button 
                onClick={() => setShowNotifications(!showNotifications)} 
                className="w-10 h-10 rounded-full border-2 border-slate-200 flex items-center justify-center text-slate-500 hover:border-red-700 hover:text-red-700 hover:bg-red-50 hover:scale-105 active:scale-95 transition-all relative shadow-sm"
            >
                <Bell size={18} />
                {notifications.some(n => !n.is_read) && (
                    <div className="absolute top-0 right-0 w-3 h-3 bg-red-600 rounded-full border-2 border-white animate-pulse"></div>
                )}
            </button>
            
            {/* Notification Dropdown */}
            {showNotifications && (
                <div className="fixed sm:absolute top-16 sm:top-14 left-4 right-4 sm:left-auto sm:right-0 w-auto sm:w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 flex flex-col animate-in fade-in zoom-in-95 duration-150">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                        <h3 className="text-sm font-black text-slate-800">Notifikasi Terbaru</h3>
                        {notifications.some(n => !n.is_read) && (
                            <button onClick={markAsRead} className="text-[10px] font-bold text-red-700 hover:underline">Tandai sudah dibaca</button>
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
                                    onClick={async () => { 
                                        setShowNotifications(false); 
                                        if (!notification.is_read) {
                                            try {
                                                await api.put(`/hris/notifications/${notification.id}/read`);
                                                setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n));
                                                window.dispatchEvent(new CustomEvent('hris_notifications_updated'));
                                            } catch (e) {
                                                console.error(e);
                                            }
                                        }
                                        if (notification.link) {
                                            navigate(notification.link);
                                        } else {
                                            const title = (notification.title || '').toLowerCase();
                                            if (title.includes('sertifikat') || title.includes('sertifikasi')) {
                                                navigate('/personal-certifications');
                                            } else if (title.includes('cuti') || title.includes('izin') || title.includes('sakit')) {
                                                navigate('/attendance-hub', { state: { tab: 'permissions' } });
                                            } else if (title.includes('karyawan') || title.includes('akun') || title.includes('role')) {
                                                navigate('/organization');
                                            } else if (title.includes('agenda') || title.includes('kalender')) {
                                                navigate('/calendar');
                                            } else {
                                                navigate('/notifications');
                                            }
                                        }
                                    }}
                                    className={`p-3 rounded-xl mb-1 flex items-start gap-3 transition-all cursor-pointer hover:scale-[1.01] ${notification.is_read ? 'hover:bg-slate-50' : 'bg-red-50/60 hover:bg-red-50'}`}>
                                    <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                                        <Bell size={14} className={notification.is_read ? 'text-slate-400' : 'text-red-700'} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className={`text-xs font-bold truncate ${notification.is_read ? 'text-slate-700' : 'text-slate-900'}`}>{notification.title}</h4>
                                        <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">{notification.message}</p>
                                        <span className="text-[9px] font-bold text-slate-400 mt-1 block">
                                            {new Date(notification.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    {!notification.is_read && <div className="w-2 h-2 rounded-full bg-red-700 shrink-0 mt-2"></div>}
                                </div>
                            ))
                        )}
                    </div>
                    <button onClick={() => { setShowNotifications(false); navigate('/notifications'); }} className="p-3 text-center text-xs font-bold text-red-700 bg-slate-50 hover:bg-red-50 border-t border-slate-100 transition-colors">
                        Lihat Semua Notifikasi
                    </button>
                </div>
            )}
        </div>

        {/* Profile Card with Interactive Dropdown Preview Popover */}
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-3 pl-4 border-l border-slate-200 cursor-pointer hover:opacity-90 transition-all focus:outline-none select-none"
          >
            <div className="w-9 h-9 min-w-[36px] rounded-full overflow-hidden border-2 border-red-800 bg-slate-900 flex justify-center items-center font-black text-white shadow-sm text-xs tracking-wider shrink-0 aspect-square">
              {((user?.nama_lengkap || user?.nama || user?.full_name || user?.username || 'US').slice(0, 2).toUpperCase())}
            </div>
            <div className="flex flex-col items-start hidden sm:flex mr-1 min-w-0 text-left">
              <span className="text-sm font-black text-gray-900 leading-tight truncate max-w-[150px] block" title={user?.nama_lengkap || user?.nama || user?.full_name || user?.username || 'User'}>
                {user?.nama_lengkap || user?.nama || user?.full_name || user?.username || 'User'}
              </span>
              <span className="text-[10px] font-black text-red-700 uppercase tracking-wider mt-0.5 block">{user?.role || 'USER'}</span>
            </div>
          </button>

          {/* Floating Small Profile Preview Card */}
          {showProfileMenu && (
            <div className="absolute right-0 mt-3 w-72 sm:w-80 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/90 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              {/* Header Profile Info */}
              <div className="p-4 bg-gradient-to-br from-slate-900 to-slate-800 text-white relative">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center font-black text-white text-base shadow-inner shrink-0 aspect-square">
                    {((user?.nama_lengkap || user?.nama || user?.full_name || user?.username || 'US').slice(0, 2).toUpperCase())}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-black text-white truncate leading-tight">
                      {user?.nama_lengkap || user?.username || 'Pengguna'}
                    </h4>
                    <p className="text-[11px] text-slate-300 truncate mt-0.5">
                      {user?.email || user?.username || 'Akun Terverifikasi'}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="px-2 py-0.5 bg-red-700/90 border border-red-500/30 text-white rounded-full text-[9px] font-black uppercase tracking-wider">
                        {user?.role || 'USER'}
                      </span>
                      <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Aktif
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Department / Detail Info */}
              {(user?.department || user?.department_name || user?.jabatan || user?.nomor_pegawai) && (
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 text-[11px] space-y-1">
                  {user?.jabatan && (
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-slate-400 font-medium">Jabatan:</span>
                      <span className="font-bold text-slate-800 truncate max-w-[170px]">{user.jabatan}</span>
                    </div>
                  )}
                  {(user?.department || user?.department_name) && (
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-slate-400 font-medium">Divisi:</span>
                      <span className="font-bold text-slate-800 truncate max-w-[170px]">{user.department || user.department_name}</span>
                    </div>
                  )}
                  {user?.nomor_pegawai && (
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-slate-400 font-medium">NIP / ID:</span>
                      <span className="font-mono font-bold text-slate-800">{user.nomor_pegawai}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Quick Actions List */}
              <div className="p-2 space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false);
                    navigate('/settings');
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-red-900 transition-all text-left group cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <User size={15} className="text-slate-400 group-hover:text-red-700 transition-colors" />
                    Profil Lengkap & Pengaturan
                  </span>
                  <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false);
                    logout();
                    navigate('/login');
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold text-red-700 hover:bg-red-50 transition-all text-left group cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <LogOut size={15} className="text-red-600" />
                    Keluar (Logout)
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
        
      </div>
    </header>
  );
};

export default Navbar;
