import React, { useState, useEffect } from 'react';
import { 
  Bell, CheckCircle, Info, AlertTriangle, AlertCircle, CalendarClock, 
  Loader2, RefreshCw, ShieldAlert, ArrowRight, ExternalLink, Trash2 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/api';

const Notifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get('/hris/notifications');
      setNotifications(res.data.notifications || []);
    } catch (err) {
      console.error('Fetch notifications error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.put('/hris/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Mark all read error:', err);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Hapus semua riwayat notifikasi untuk akun Anda?')) return;
    try {
      setLoading(true);
      await api.delete('/hris/notifications/clear-all');
      setNotifications([]);
    } catch (err) {
      console.error('Clear all notifications error:', err);
      fetchNotifications();
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSingle = async (e, notifId) => {
    e.stopPropagation();
    try {
      setNotifications(prev => prev.filter(n => n.id !== notifId));
      await api.delete(`/hris/notifications/${notifId}`);
    } catch (err) {
      console.error('Delete notif error:', err);
      fetchNotifications();
    }
  };

  const handleClickNotif = async (notif) => {
    if (!notif.is_read) {
      try {
        await api.put(`/hris/notifications/${notif.id}/read`);
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
      } catch (e) {
        console.error('Mark read error:', e);
      }
    }
    if (notif.link) {
      navigate(notif.link);
    } else {
      const title = (notif.title || '').toLowerCase();
      if (title.includes('sertifikat') || title.includes('sertifikasi')) {
        navigate('/personal-certifications');
      } else if (title.includes('cuti') || title.includes('izin') || title.includes('sakit')) {
        navigate('/attendance-hub', { state: { tab: 'permissions' } });
      } else if (title.includes('karyawan') || title.includes('akun') || title.includes('role')) {
        navigate('/organization');
      } else if (title.includes('agenda') || title.includes('kalender')) {
        navigate('/calendar');
      }
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'security_alert':
        return <ShieldAlert className="text-red-600" size={20} />;
      case 'leave_approved':
      case 'success':
        return <CheckCircle className="text-emerald-500" size={20} />;
      case 'leave_rejected':
        return <AlertCircle className="text-red-500" size={20} />;
      case 'leave_request':
        return <CalendarClock className="text-blue-500" size={20} />;
      case 'warning':
        return <AlertTriangle className="text-amber-500" size={20} />;
      default:
        return <Info className="text-slate-500" size={20} />;
    }
  };

  const getBgColor = (type) => {
    switch (type) {
      case 'security_alert':
        return 'bg-red-50 border border-red-200';
      case 'leave_approved':
      case 'success':
        return 'bg-emerald-50 border border-emerald-200';
      case 'leave_rejected':
        return 'bg-red-50 border border-red-200';
      case 'leave_request':
        return 'bg-blue-50 border border-blue-200';
      case 'warning':
        return 'bg-amber-50 border border-amber-200';
      default:
        return 'bg-slate-50 border border-slate-200';
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 min-h-[85vh] font-sans pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Bell size={24} className="text-red-900" />
            Pusat Notifikasi & Informasi Role
          </h1>
          <p className="text-xs font-bold text-slate-500 mt-1">
            Pemberitahuan keamanan, presensi, sertifikasi K3, dan aktivitas sistem.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchNotifications}
            className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition shadow-sm"
            title="Muat Ulang"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={handleMarkAllRead}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm"
          >
            <CheckCircle size={15} /> Tandai Dibaca
          </button>
          <button
            onClick={handleClearAll}
            disabled={loading || notifications.length === 0}
            className="px-4 py-2.5 bg-red-50 hover:bg-red-100 disabled:opacity-40 disabled:cursor-not-allowed text-red-700 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <Trash2 size={15} /> Hapus Semua
          </button>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex-1 overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center p-12">
            <Loader2 className="animate-spin text-red-900" size={40} />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-400">
            <Bell size={48} className="mb-4 opacity-20" />
            <p className="font-bold text-sm">Belum ada notifikasi baru untuk role Anda.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleClickNotif(notif)}
                className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer ${
                  notif.is_read
                    ? 'border-slate-100 bg-white/70 hover:bg-slate-50'
                    : 'border-slate-200 bg-white shadow-sm hover:shadow-md hover:border-red-200'
                }`}
              >
                <div className="flex gap-4 items-start">
                  <div className={`p-2.5 rounded-xl shrink-0 h-min ${getBgColor(notif.type)}`}>
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-4 mb-1">
                      <div className="flex items-center gap-2">
                        <h3 className={`text-sm font-black ${notif.is_read ? 'text-slate-700' : 'text-gray-900'}`}>
                          {notif.title}
                        </h3>
                        {!notif.is_read && (
                          <span className="w-2 h-2 rounded-full bg-red-600 shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap bg-slate-50 px-2 py-1 rounded-md">
                          {new Date(notif.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        <button
                          onClick={(e) => handleDeleteSingle(e, notif.id)}
                          title="Hapus notifikasi ini"
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <p className={`text-xs ${notif.is_read ? 'text-slate-500 font-medium' : 'text-slate-700 font-bold'} leading-relaxed`}>
                      {notif.message}
                    </p>

                    {notif.link && (
                      <div className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-bold text-red-700 hover:text-red-800">
                        <span>Buka Halaman Terkait</span>
                        <ArrowRight size={13} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;

