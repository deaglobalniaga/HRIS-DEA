import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle, Info, AlertTriangle, AlertCircle, CalendarClock, Loader2, RefreshCw } from 'lucide-react';
import api from '../api/api';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get('/hris/notifications');
      setNotifications(res.data.notifications || []);
    } catch (err) {
      console.error(err);
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
          fetchNotifications(); // Refresh list
      } catch (err) {
          console.error(err);
      }
  };

  const handleClearAll = async () => {
      if (!window.confirm('Hapus semua riwayat notifikasi?')) return;
      try {
          await api.delete('/hris/notifications/clear-all');
          fetchNotifications(); // Refresh list
      } catch (err) {
          console.error(err);
      }
  };

  const getIcon = (type) => {
    switch(type) {
        case 'leave_approved': return <CheckCircle className="text-green-500" size={20} />;
        case 'leave_rejected': return <AlertCircle className="text-red-500" size={20} />;
        case 'leave_request': return <CalendarClock className="text-blue-500" size={20} />;
        case 'system': return <Info className="text-slate-500" size={20} />;
        case 'warning': return <AlertTriangle className="text-amber-500" size={20} />;
        default: return <Bell className="text-slate-400" size={20} />;
    }
  };

  const getBgColor = (type) => {
      switch(type) {
          case 'leave_approved': return 'bg-green-50';
          case 'leave_rejected': return 'bg-red-50';
          case 'leave_request': return 'bg-blue-50';
          case 'system': return 'bg-slate-50';
          case 'warning': return 'bg-amber-50';
          default: return 'bg-slate-50';
      }
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 min-h-[85vh]">
        
        {/* Header */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                    <Bell size={24} className="text-red-900" />
                    Pusat Notifikasi
                </h1>
                <p className="text-sm font-bold text-slate-500 mt-1">Lihat seluruh riwayat pemberitahuan Anda.</p>
            </div>
            <div className="flex gap-2">
                <button onClick={fetchNotifications} className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition shadow-sm">
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                </button>
                <button onClick={handleMarkAllRead} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition flex items-center gap-2 shadow-sm">
                    <CheckCircle size={16} /> Tandai Dibaca
                </button>
                <button onClick={handleClearAll} className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-sm font-bold transition flex items-center gap-2 shadow-sm">
                    Hapus Semua
                </button>
            </div>
        </div>

        {/* List */}
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm flex-1 overflow-hidden flex flex-col">
            {loading ? (
                <div className="flex-1 flex items-center justify-center p-12">
                    <Loader2 className="animate-spin text-red-900" size={40} />
                </div>
            ) : notifications.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-400">
                    <Bell size={48} className="mb-4 opacity-20" />
                    <p className="font-bold">Belum ada notifikasi.</p>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {notifications.map((notif) => (
                        <div key={notif.id} className={`p-5 rounded-2xl border transition-all ${notif.is_read ? 'border-slate-100 bg-white opacity-70' : 'border-slate-200 bg-white shadow-md'}`}>
                            <div className="flex gap-4">
                                <div className={`p-3 rounded-xl shrink-0 h-min ${getBgColor(notif.type)}`}>
                                    {getIcon(notif.type)}
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start gap-4 mb-1">
                                        <h3 className={`text-base font-black ${notif.is_read ? 'text-slate-700' : 'text-gray-900'}`}>{notif.title}</h3>
                                        <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap bg-slate-50 px-2 py-1 rounded-md">
                                            {new Date(notif.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <p className={`text-sm ${notif.is_read ? 'text-slate-500 font-medium' : 'text-slate-700 font-bold'}`}>{notif.message}</p>
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
