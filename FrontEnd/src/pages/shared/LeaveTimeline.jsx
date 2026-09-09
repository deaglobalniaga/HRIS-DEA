import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Calendar as CalendarIcon, Users, Clock, AlertCircle, Plus, X, ChevronLeft, 
  ChevronRight, Bookmark, MapPin, Check, Info, Tag, Layers, CalendarCheck,
  Edit, Trash2, AlertTriangle, Sparkles, Eye
} from 'lucide-react';
import api from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const LeaveTimeline = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const userRole = (user?.role || '').toLowerCase();
  const isSuperAdmin = ['superadmin', 'super_admin'].includes(userRole) || user?.username === 'arya_admin';
  const isUser = ['karyawan', 'user', 'employee'].includes(userRole) || !userRole;

  // Hak kelola agenda (Tambah, Edit, Hapus, Bersihkan):
  // Diberikan kepada SEMUA role admin KECUALI superadmin dan user/karyawan:
  const canManageAgenda = !isSuperAdmin && !isUser;
  const isHRGA = canManageAgenda;

  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedAgendaDetail, setSelectedAgendaDetail] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Calendar State
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  
  // Modals
  const [showAddAgendaModal, setShowAddAgendaModal] = useState(false);
  const [showEditAgendaModal, setShowEditAgendaModal] = useState(false);
  const [showClearMonthModal, setShowClearMonthModal] = useState(false);
  const [agendaToDelete, setAgendaToDelete] = useState(null);
  
  // Forms & Action States
  const [agendaForm, setAgendaForm] = useState({
    title: '',
    category: 'Rapat Internal',
    date: '',
    end_date: '',
    time: '',
    location: '',
    description: ''
  });
  const [editForm, setEditForm] = useState({
    id: '',
    title: '',
    category: 'Rapat Internal',
    date: '',
    end_date: '',
    time: '',
    location: '',
    description: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [clearingMonth, setClearingMonth] = useState(false);
  const [deletingAgenda, setDeletingAgenda] = useState(false);
  const [formError, setFormError] = useState('');
  const [editFormError, setEditFormError] = useState('');


  const fetchTimeline = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/hris/calendar/events?month=${currentMonth + 1}&year=${currentYear}`);
      setEvents(res.data || []);
    } catch (error) {
      console.error("Failed to fetch calendar data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeline();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonth, currentYear]);

  const handleAddAgenda = async (e) => {
    e.preventDefault();
    setFormError('');

    if (isSuperAdmin) {
      setFormError('Super Admin hanya memiliki hak tata kelola sistem. Pengelolaan agenda hanya wewenang Admin.');
      return;
    }

    if (!agendaForm.title.trim()) {
      setFormError('Judul agenda wajib diisi.');
      return;
    }

    if (!agendaForm.date) {
      setFormError('Tanggal mulai wajib diisi.');
      return;
    }

    if (agendaForm.end_date && agendaForm.end_date < agendaForm.date) {
      setFormError('Tanggal selesai tidak boleh lebih awal dari tanggal mulai.');
      return;
    }

    if (!agendaForm.time) {
      setFormError('Waktu pelaksanaan agenda wajib diisi.');
      return;
    }

    if (!agendaForm.location.trim()) {
      setFormError('Lokasi / link pertemuan wajib diisi.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/hris/calendar/events', {
        title: `[${agendaForm.category}] ${agendaForm.title}`,
        category: agendaForm.category,
        description: agendaForm.description || '',
        time: agendaForm.time,
        location: agendaForm.location,
        event_date: agendaForm.date,
        event_end_date: agendaForm.end_date || agendaForm.date
      });

      addToast('Agenda operasional berhasil ditambahkan!', 'success');
      setShowAddAgendaModal(false);
      setAgendaForm({
        title: '',
        category: 'Rapat Internal',
        date: '',
        end_date: '',
        time: '',
        location: '',
        description: ''
      });
      fetchTimeline();
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || 'Gagal menambahkan agenda.';
      setFormError(errMsg);
      addToast(errMsg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (agenda) => {
    const cleanTitle = (agenda.title || '').replace(/^\[.*?\]\s*/, '');
    const cleanStart = agenda.start ? new Date(agenda.start).toISOString().split('T')[0] : '';
    const cleanEnd = agenda.end ? new Date(agenda.end).toISOString().split('T')[0] : cleanStart;

    setEditForm({
      id: agenda.raw_id || agenda.id,
      title: cleanTitle,
      category: agenda.category || agenda.subType || 'Rapat Internal',
      date: cleanStart,
      end_date: cleanEnd,
      time: agenda.time || '',
      location: agenda.location || '',
      description: agenda.description || ''
    });
    setEditFormError('');
    setShowEditAgendaModal(true);
  };

  const handleUpdateAgenda = async (e) => {
    e.preventDefault();
    setEditFormError('');

    if (isSuperAdmin) {
      setEditFormError('Super Admin tidak berwenang mengubah agenda operasional.');
      return;
    }

    if (!editForm.title.trim()) {
      setEditFormError('Judul agenda wajib diisi.');
      return;
    }

    if (!editForm.date) {
      setEditFormError('Tanggal mulai wajib diisi.');
      return;
    }

    if (editForm.end_date && editForm.end_date < editForm.date) {
      setEditFormError('Tanggal selesai tidak boleh lebih awal dari tanggal mulai.');
      return;
    }

    if (!editForm.time) {
      setEditFormError('Waktu pelaksanaan wajib diisi.');
      return;
    }

    if (!editForm.location.trim()) {
      setEditFormError('Lokasi / link pertemuan wajib diisi.');
      return;
    }

    setEditSubmitting(true);
    try {
      const cleanId = String(editForm.id).replace(/^event_/, '').replace(/^leave_/, '');
      await api.put(`/hris/calendar/events/${cleanId}`, {
        title: editForm.title,
        category: editForm.category,
        description: editForm.description || '',
        time: editForm.time,
        location: editForm.location,
        event_date: editForm.date,
        event_end_date: editForm.end_date || editForm.date
      });

      addToast('Agenda operasional berhasil diperbarui!', 'success');
      setShowEditAgendaModal(false);
      setSelectedAgendaDetail(null);
      fetchTimeline();
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || 'Gagal memperbarui agenda.';
      setEditFormError(errMsg);
      addToast(errMsg, 'error');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteAgenda = async (agenda) => {
    if (!agenda) return;
    const cleanId = String(agenda.raw_id || agenda.id).replace(/^event_/, '').replace(/^leave_/, '');
    setDeletingAgenda(true);
    try {
      await api.delete(`/hris/calendar/events/${cleanId}`);
      addToast('Agenda operasional berhasil dihapus!', 'success');
      setAgendaToDelete(null);
      setSelectedAgendaDetail(null);
      fetchTimeline();
    } catch (err) {
      console.error(err);
      addToast(err.response?.data?.message || 'Gagal menghapus agenda.', 'error');
    } finally {
      setDeletingAgenda(false);
    }
  };

  const handleClearMonthAgendas = async () => {
    setClearingMonth(true);
    try {
      const res = await api.post('/hris/calendar/events/clear-month', {
        month: currentMonth + 1,
        year: currentYear
      });
      addToast(res.data?.message || `Agenda ${monthNames[currentMonth]} ${currentYear} berhasil dibersihkan!`, 'success');
      setShowClearMonthModal(false);
      setSelectedDate(null);
      setSelectedAgendaDetail(null);
      fetchTimeline();
    } catch (err) {
      console.error(err);
      addToast(err.response?.data?.message || 'Gagal membersihkan agenda bulanan.', 'error');
    } finally {
      setClearingMonth(false);
    }
  };


  // Calendar Helpers
  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni", 
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  
  const getDaysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (month, year) => new Date(year, month, 1).getDay();

  const daysInMonthCount = getDaysInMonth(currentMonth, currentYear);
  const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
  
  const daysArray = Array.from({ length: daysInMonthCount }, (_, i) => i + 1);
  const emptySlots = Array.from({ length: firstDay }, (_, i) => i);

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
    setSelectedDate(null);
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
    setSelectedDate(null);
  };

  // Get events for a specific date
  const getEventsForDate = (date) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
    return events.filter(item => {
      const itemStart = new Date(item.start).toISOString().split('T')[0];
      const itemEnd = new Date(item.end || item.start).toISOString().split('T')[0];
      return dateStr >= itemStart && dateStr <= itemEnd;
    });
  };

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];
  
  // Format helpers
  const getEventBadge = (item) => {
    const type = (item.type || '').toLowerCase();
    const subType = (item.subType || '').toLowerCase();
    const title = (item.title || '').toLowerCase();

    if (type === 'roster_leave' || title.includes('roster') || subType.includes('roster') || title.includes('13/1') || subType.includes('13/1') || title.includes('off')) {
      return <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[9px] font-black uppercase tracking-wider">Off / Roster</span>;
    }
    if (type === 'leave' || title.includes('cuti')) {
      return <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-[9px] font-black uppercase tracking-wider">Cuti Karyawan</span>;
    }
    if (type === 'permission' || subType.includes('sakit') || title.includes('sakit') || subType.includes('izin') || title.includes('libur')) {
      return <span className="px-2.5 py-0.5 bg-rose-100 text-rose-800 border border-rose-300 rounded-lg text-[9px] font-black uppercase tracking-wider">{item.subType || 'Libur / Sakit'}</span>;
    }
    return <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 border border-blue-300 rounded-lg text-[9px] font-black uppercase tracking-wider">Agenda Kerja</span>;
  };

  return (
    <div className="w-full flex flex-col gap-5 sm:gap-6 min-h-[85vh] pb-32 sm:pb-12">
      {/* Full Width Calendar */}
      <div className="w-full flex flex-col gap-4 sm:gap-5">
        
        {/* Alerts / Warnings for Concurrent Leaves */}
        {(() => {
          let maxLeave = 0;
          daysArray.forEach(day => {
            const eventsOnDay = getEventsForDate(day);
            let leaveCount = eventsOnDay.filter(e => e.type === 'leave' || (e.title || '').toLowerCase().includes('cuti')).length;
            if (leaveCount > maxLeave) maxLeave = leaveCount;
          });
          
          if (maxLeave >= 3) {
            return (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 sm:px-4 sm:py-3 rounded-xl sm:rounded-2xl flex items-center gap-2.5 sm:gap-3 font-bold text-[11px] sm:text-xs shadow-sm">
                <AlertCircle size={18} className="text-rose-600 shrink-0" />
                <span>Peringatan Man-Power: Ada hari dengan {maxLeave} karyawan cuti bersamaan di bulan ini. Pastikan operasional site tetap aman.</span>
              </div>
            );
          }
          return null;
        })()}

        {/* Visual Calendar Box */}
        <div className="flex-1 bg-white border border-slate-200 rounded-2xl sm:rounded-3xl shadow-sm overflow-hidden flex flex-col">
          {/* Header Controls */}
          <div className="p-3 sm:p-5 border-b border-slate-100 bg-slate-50 flex flex-col xl:flex-row xl:items-center justify-between gap-3 sm:gap-4 w-full">
            {/* Left Group: Title & Month Navigator */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full xl:w-auto shrink-0">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-red-900 text-white flex items-center justify-center font-black shadow-md shadow-red-900/20 shrink-0">
                  <CalendarIcon size={18} />
                </div>
                <div>
                  <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                    {monthNames[currentMonth]} {currentYear}
                  </h1>
                  <p className="text-[10px] sm:text-xs text-slate-500 font-medium mt-0.5">
                    Jadwal & Agenda Operasional Site PT DEA GLOBAL NIAGA
                  </p>
                </div>
              </div>

              {/* Month Navigator */}
              <div className="flex items-center justify-between sm:justify-center gap-1.5 bg-white px-2 py-1.5 rounded-xl sm:rounded-2xl border border-slate-200 shadow-2xs shrink-0 self-stretch sm:self-auto">
                <button 
                  onClick={prevMonth}
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 transition cursor-pointer"
                  title="Bulan Sebelumnya"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs font-black text-slate-800 px-2 min-w-[110px] text-center whitespace-nowrap">
                  {monthNames[currentMonth]} {currentYear}
                </span>
                <button 
                  onClick={nextMonth}
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 transition cursor-pointer"
                  title="Bulan Berikutnya"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Right Group: Legend & Admin Action Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-start xl:justify-end gap-2.5 sm:gap-3 flex-1 xl:ml-auto w-full xl:w-auto">
              {/* Top Color Legend Bar - Horizontally Scrollable on Mobile so it never cuts off */}
              <div className="flex items-center gap-1.5 sm:gap-2 bg-white px-3 py-1.5 rounded-xl sm:rounded-2xl border border-slate-200 shadow-2xs shrink-0 max-w-full overflow-x-auto scrollbar-none">
                <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1 flex items-center gap-1 shrink-0">
                  <Layers size={11} /> Legenda:
                </span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs whitespace-nowrap shrink-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs" /> Cuti Karyawan
                </span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-black bg-amber-50 text-amber-900 border border-amber-200 shadow-2xs whitespace-nowrap shrink-0">
                  <span className="w-2 h-2 rounded-full bg-amber-500 shadow-xs" /> Off / Roster Leave
                </span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-black bg-blue-50 text-blue-800 border border-blue-200 shadow-2xs whitespace-nowrap shrink-0">
                  <span className="w-2 h-2 rounded-full bg-blue-500 shadow-xs" /> Agenda Kerja / Rapat
                </span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-black bg-rose-50 text-rose-800 border border-rose-200 shadow-2xs whitespace-nowrap shrink-0">
                  <span className="w-2 h-2 rounded-full bg-rose-500 shadow-xs" /> Libur / Sakit
                </span>
              </div>

              {/* Action Buttons: Responsive stacking on mobile */}
              {canManageAgenda && (
                <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                  <button 
                    onClick={() => setShowClearMonthModal(true)}
                    className="flex-1 sm:flex-none bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3 py-2 rounded-xl text-[11px] sm:text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer hover:border-rose-300 whitespace-nowrap"
                    title={`Bersihkan seluruh agenda operasional rapat/kegiatan pada bulan ${monthNames[currentMonth]} ${currentYear}`}
                  >
                    <Trash2 size={13} className="text-rose-600" /> Bersihkan Agenda
                  </button>
                  <button 
                    onClick={() => setShowAddAgendaModal(true)}
                    className="flex-1 sm:flex-none bg-red-700 hover:bg-red-800 text-white px-3.5 py-2 rounded-xl text-[11px] sm:text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm shadow-red-700/20 cursor-pointer whitespace-nowrap"
                  >
                    <Plus size={14} /> Tambah Agenda
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="p-2 sm:p-6 flex-1 flex flex-col">
            {/* Days Header */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-1.5 sm:mb-2 text-center text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <div className="text-rose-600">Min</div>
              <div>Sen</div>
              <div>Sel</div>
              <div>Rab</div>
              <div>Kam</div>
              <div>Jum</div>
              <div className="text-amber-600">Sab</div>
            </div>
            
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 flex-1">
              {emptySlots.map((_, i) => (
                <div key={`empty-${i}`} className="p-1 sm:p-2 border border-transparent min-h-[52px] sm:min-h-[90px]"></div>
              ))}
              
              {daysArray.map(day => {
                const empOnLeave = getEventsForDate(day);
                const isSelected = selectedDate === day;
                const isToday = new Date().getDate() === day && new Date().getMonth() === currentMonth && new Date().getFullYear() === currentYear;
                
                // Group events cleanly by legend type
                const cutiEvents = empOnLeave.filter(e => {
                  const t = (e.type || '').toLowerCase();
                  const sub = (e.subType || '').toLowerCase();
                  const title = (e.title || '').toLowerCase();
                  return (t === 'leave' || title.includes('cuti')) && !title.includes('roster') && !sub.includes('roster');
                });

                const rosterEvents = empOnLeave.filter(e => {
                  const t = (e.type || '').toLowerCase();
                  const sub = (e.subType || '').toLowerCase();
                  const title = (e.title || '').toLowerCase();
                  return t === 'roster_leave' || title.includes('roster') || sub.includes('roster') || title.includes('13/1') || sub.includes('13/1') || title.includes('off');
                });

                const agendaEvents = empOnLeave.filter(e => {
                  const t = (e.type || '').toLowerCase();
                  return t === 'event' || t === 'agenda';
                });

                const sickOrHolidayEvents = empOnLeave.filter(e => {
                  const t = (e.type || '').toLowerCase();
                  const sub = (e.subType || '').toLowerCase();
                  const title = (e.title || '').toLowerCase();
                  return t === 'permission' || sub.includes('sakit') || title.includes('sakit') || sub.includes('izin') || title.includes('libur');
                });

                let bgClass = "bg-white hover:border-red-900/50 hover:bg-slate-50/60";
                if (rosterEvents.length > 0) {
                  bgClass = "bg-amber-50/30 border-amber-200/80 hover:bg-amber-50/60";
                } else if (cutiEvents.length > 0) {
                  bgClass = "bg-emerald-50/30 border-emerald-200/80 hover:bg-emerald-50/60";
                } else if (sickOrHolidayEvents.length > 0) {
                  bgClass = "bg-rose-50/30 border-rose-200/80 hover:bg-rose-50/60";
                } else if (agendaEvents.length > 0) {
                  bgClass = "bg-blue-50/30 border-blue-200/80 hover:bg-blue-50/60";
                }

                return (
                  <div 
                    key={day} 
                    onClick={() => setSelectedDate(day)}
                    className={`relative p-1 sm:p-2.5 border rounded-xl sm:rounded-2xl cursor-pointer transition-all min-h-[52px] sm:min-h-[96px] flex flex-col justify-between group shadow-2xs ${
                      isSelected 
                        ? 'ring-2 ring-red-900 border-red-900 shadow-md bg-white' 
                        : 'border-slate-200/80'
                    } ${bgClass}`}
                  >
                    {/* Header with Date Number */}
                    <div className="flex items-center justify-between">
                      <span className={`text-[11px] sm:text-xs font-black transition-all ${
                        isToday 
                          ? 'w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-red-700 text-white flex items-center justify-center text-[9px] sm:text-[10px] shadow-xs' 
                          : isSelected 
                          ? 'text-red-900 font-extrabold sm:text-sm' 
                          : 'text-slate-800'
                      }`}>
                        {day}
                      </span>
                      {empOnLeave.length > 0 && (
                        <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-red-600 shadow-xs" title={`${empOnLeave.length} Agenda/Cuti`} />
                      )}
                    </div>

                    {/* Desktop View: Full descriptive badge pills */}
                    <div className="hidden sm:flex flex-col gap-1 mt-1.5">
                      {cutiEvents.length > 0 && (
                        <div className="flex items-center justify-between px-2 py-0.5 rounded-lg bg-emerald-100/90 text-emerald-900 border border-emerald-300/80 font-black text-[9px] shadow-2xs">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 shadow-2xs" />
                            Cuti
                          </span>
                          <span className="text-[9px] font-extrabold">{cutiEvents.length}</span>
                        </div>
                      )}

                      {rosterEvents.length > 0 && (
                        <div className="flex items-center justify-between px-2 py-0.5 rounded-lg bg-amber-100/90 text-amber-950 border border-amber-300/80 font-black text-[9px] shadow-2xs">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 shadow-2xs" />
                            Off Roster
                          </span>
                          <span className="text-[9px] font-extrabold">{rosterEvents.length}</span>
                        </div>
                      )}

                      {agendaEvents.length > 0 && (
                        <div className="flex items-center justify-between px-2 py-0.5 rounded-lg bg-blue-100/90 text-blue-950 border border-blue-300/80 font-black text-[9px] shadow-2xs">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 shadow-2xs" />
                            Agenda
                          </span>
                          <span className="text-[9px] font-extrabold">{agendaEvents.length}</span>
                        </div>
                      )}

                      {sickOrHolidayEvents.length > 0 && (
                        <div className="flex items-center justify-between px-2 py-0.5 rounded-lg bg-rose-100/90 text-rose-950 border border-rose-300/80 font-black text-[9px] shadow-2xs">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 shadow-2xs" />
                            Izin/Sakit
                          </span>
                          <span className="text-[9px] font-extrabold">{sickOrHolidayEvents.length}</span>
                        </div>
                      )}
                    </div>

                    {/* Mobile View: Ultra-compact, non-overlapping colored indicators with counts */}
                    <div className="flex sm:hidden flex-wrap items-center justify-center gap-0.5 mt-0.5">
                      {cutiEvents.length > 0 && (
                        <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 text-white font-black text-[7.5px] flex items-center justify-center shadow-xs" title={`${cutiEvents.length} Cuti`}>
                          {cutiEvents.length}
                        </span>
                      )}
                      {rosterEvents.length > 0 && (
                        <span className="w-3.5 h-3.5 rounded-full bg-amber-500 text-white font-black text-[7.5px] flex items-center justify-center shadow-xs" title={`${rosterEvents.length} Off Roster`}>
                          {rosterEvents.length}
                        </span>
                      )}
                      {agendaEvents.length > 0 && (
                        <span className="w-3.5 h-3.5 rounded-full bg-blue-500 text-white font-black text-[7.5px] flex items-center justify-center shadow-xs" title={`${agendaEvents.length} Agenda`}>
                          {agendaEvents.length}
                        </span>
                      )}
                      {sickOrHolidayEvents.length > 0 && (
                        <span className="w-3.5 h-3.5 rounded-full bg-rose-500 text-white font-black text-[7.5px] flex items-center justify-center shadow-xs" title={`${sickOrHolidayEvents.length} Izin/Sakit`}>
                          {sickOrHolidayEvents.length}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Details Bar for Selected Date - Shown when a date cell is clicked */}
          {selectedDate && (
            <div className="border-t border-slate-200 p-5 bg-slate-50 animate-in slide-in-from-bottom-3">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                    <CalendarCheck size={16} className="text-red-700" />
                    Rincian Aktivitas & Agenda: {selectedDate} {monthNames[currentMonth]} {currentYear}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Daftar lengkap karyawan yang cuti, off roster, izin/sakit, dan agenda operasional pada tanggal ini.
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedDate(null)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 hover:underline cursor-pointer"
                >
                  Tutup Rincian ✕
                </button>
              </div>

              {selectedDateEvents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {selectedDateEvents.map((emp, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => setSelectedAgendaDetail(emp)}
                      className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between shadow-2xs hover:shadow-md hover:border-red-900/40 transition cursor-pointer group"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          {getEventBadge(emp)}
                          <span className="text-[10px] font-bold text-blue-600 group-hover:underline flex items-center gap-1">
                            <Eye size={11} /> Lihat Rincian &rarr;
                          </span>
                        </div>
                        <h4 className="text-xs font-black text-slate-900 leading-snug">
                          {emp.title.replace(/^\[.*?\]\s*/, '')}
                        </h4>
                        <p className="text-[11px] font-medium text-slate-600 mt-1 line-clamp-2">
                          {emp.description || 'Tidak ada deskripsi tambahan.'}
                        </p>
                      </div>
                      {emp.time && (
                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-bold">
                          <span className="flex items-center gap-1"><Clock size={11} /> {emp.time}</span>
                          {emp.location && <span className="flex items-center gap-1 truncate max-w-[120px]"><MapPin size={11} /> {emp.location}</span>}
                        </div>
                      )}

                      {/* Direct Action Buttons for Operational Agenda */}
                      {canManageAgenda && (emp.is_agenda || emp.type === 'event') && (
                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => openEditModal(emp)}
                            className="flex-1 px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold transition flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
                            title="Ubah rincian agenda ini"
                          >
                            <Edit size={12} className="text-amber-700" /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setAgendaToDelete(emp)}
                            className="flex-1 px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
                            title="Hapus agenda operasional ini"
                          >
                            <Trash2 size={12} className="text-rose-600" /> Hapus
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs font-bold text-slate-400 italic">Tidak ada agenda atau cuti karyawan pada tanggal ini.</p>
              )}
            </div>
          )}

          {/* Explanatory Calculation & Operational Notes Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col md:flex-row gap-4 items-start justify-between text-[11px] text-slate-600">
            <div className="space-y-1.5 flex-1">
              <h4 className="font-black text-slate-800 flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                <CalendarIcon size={14} className="text-red-700" />
                Keterangan Penjelasan Kalender & Manajemen Cuti:
              </h4>
              <ul className="list-disc pl-4 space-y-1 text-slate-600 font-medium">
                <li><strong>Cuti Karyawan (🟢):</strong> Pengambilan hak cuti tahunan (maksimal 12 hari kerja/tahun).</li>
                <li><strong>Off / Roster Leave (🟡):</strong> Jadwal libur rotasi 8/2 (14 hari) atau hari wajib istirahat 13/1 (1 hari off) sesuai rotasi operasional lapangan.</li>
                <li><strong>Agenda Kerja / Rapat (🔵):</strong> Jadwal agenda internal perusahaan, inspeksi lapangan HSE, rapat koordinasi, atau audit sertifikasi.</li>
                <li><strong>Libur Nasional / Sakit (🔴):</strong> Tanggal merah resmi nasional atau karyawan yang berhalangan hadir disertai surat keterangan dokter.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Dedicated Monthly Agenda Management Panel (Visible to All Admins & Users) */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200/80 text-blue-700 flex items-center justify-center shadow-2xs shrink-0">
                <Bookmark size={20} className="text-blue-700" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                    Daftar Agenda & Kegiatan Operasional Bulan {monthNames[currentMonth]} {currentYear}
                  </h3>
                  <span className="text-[10px] font-black bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full border border-blue-200">
                    {events.filter(e => e.type === 'event' || e.is_agenda).length} Agenda
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Kelola jadwal rapat internal, inspeksi lapangan, audit HSE, dan pengumuman operasional.
                </p>
              </div>
            </div>

            {canManageAgenda && (
              <div className="flex items-center gap-2 shrink-0">
                {events.filter(e => e.type === 'event' || e.is_agenda).length > 0 && (
                  <button 
                    type="button"
                    onClick={() => setShowClearMonthModal(true)}
                    className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer hover:border-rose-300"
                    title="Hapus seluruh agenda operasional rapat/kegiatan bulan ini"
                  >
                    <Trash2 size={13} className="text-rose-600" /> Bersihkan Agenda Bulan Ini
                  </button>
                )}
                <button 
                  type="button"
                  onClick={() => setShowAddAgendaModal(true)}
                  className="bg-red-700 hover:bg-red-800 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm shadow-red-700/20 cursor-pointer"
                >
                  <Plus size={14} /> Tambah Agenda Baru
                </button>
              </div>
            )}
          </div>

          {/* List of Agendas for the Month */}
          {(() => {
            const monthAgendas = events
              .filter(e => e.type === 'event' || e.is_agenda)
              .sort((a, b) => new Date(a.start) - new Date(b.start));

            if (monthAgendas.length === 0) {
              return (
                <div className="p-8 text-center bg-slate-50/60 rounded-2xl border border-slate-100 flex flex-col items-center justify-center gap-2">
                  <Bookmark size={26} className="text-slate-300" />
                  <p className="text-xs font-bold text-slate-600">Belum ada agenda operasional yang dijadwalkan pada bulan {monthNames[currentMonth]} {currentYear}.</p>
                  {canManageAgenda && (
                    <button
                      type="button"
                      onClick={() => setShowAddAgendaModal(true)}
                      className="mt-1 px-3.5 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={13} /> Tambah Agenda Sekarang
                    </button>
                  )}
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {monthAgendas.map((item, idx) => (
                  <div 
                    key={item.id || idx}
                    className="bg-slate-50/70 border border-slate-200/90 rounded-2xl p-4 flex flex-col justify-between hover:bg-white hover:shadow-md hover:border-blue-300 transition-all group"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-blue-100 text-blue-900 border border-blue-300">
                          {item.category || item.subType || 'Agenda Operasional'}
                        </span>
                        <span className="text-[10px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                          {new Date(item.start).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                          {item.end && item.end !== item.start ? ` - ${new Date(item.end).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}` : ''}
                        </span>
                      </div>

                      <h4 className="text-xs sm:text-sm font-black text-slate-900 group-hover:text-blue-900 transition-colors leading-snug">
                        {item.title.replace(/^\[.*?\]\s*/, '')}
                      </h4>

                      {item.description && (
                        <p className="text-xs text-slate-600 font-medium mt-1.5 line-clamp-2">
                          {item.description}
                        </p>
                      )}

                      <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-slate-500 font-semibold">
                        {item.time && (
                          <span className="flex items-center gap-1"><Clock size={12} className="text-slate-400" /> {item.time}</span>
                        )}
                        {item.location && (
                          <span className="flex items-center gap-1 truncate max-w-[170px]"><MapPin size={12} className="text-slate-400" /> {item.location}</span>
                        )}
                      </div>
                    </div>

                    {canManageAgenda ? (
                      <div className="mt-3.5 pt-2.5 border-t border-slate-200/80 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          className="flex-1 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                          title="Ubah rincian agenda ini"
                        >
                          <Edit size={12} className="text-amber-700" /> Edit Agenda
                        </button>
                        <button
                          type="button"
                          onClick={() => setAgendaToDelete(item)}
                          className="flex-1 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                          title="Hapus agenda operasional ini"
                        >
                          <Trash2 size={12} className="text-rose-600" /> Hapus
                        </button>
                      </div>
                    ) : (
                      <div className="mt-3.5 pt-2.5 border-t border-slate-200/80 flex justify-end">
                        <button
                          type="button"
                          onClick={() => setSelectedAgendaDetail(item)}
                          className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          Lihat Rincian &rarr;
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Add Agenda Modal with Strict Validation */}
      {showAddAgendaModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Bookmark size={18} className="text-red-700" />
                  Tambah Agenda Operasional Baru
                </h2>
                <p className="text-xs font-bold text-slate-400 mt-0.5">Jadwalkan rapat, inspeksi site, atau pengumuman resmi.</p>
              </div>
              <button 
                onClick={() => setShowAddAgendaModal(false)} 
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddAgenda} className="p-6 space-y-4 bg-white">
              {formError && (
                <div className="p-3 text-xs font-bold rounded-xl flex items-center gap-2 bg-rose-50 text-rose-800 border border-rose-200">
                  <AlertCircle size={15} className="shrink-0 text-rose-600" /> 
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Judul Agenda *</label>
                <input 
                  type="text" 
                  required
                  value={agendaForm.title}
                  onChange={e => setAgendaForm({...agendaForm, title: e.target.value})}
                  placeholder="Contoh: Safety Talk Mingguan Site BIB"
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-bold text-xs rounded-xl px-3.5 py-2.5 outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Kategori Agenda *</label>
                <select
                  value={agendaForm.category}
                  onChange={e => setAgendaForm({...agendaForm, category: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-bold text-xs rounded-xl px-3.5 py-2.5 outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition cursor-pointer"
                >
                  <option value="Rapat Internal">Rapat Internal</option>
                  <option value="Rapat Klien & Eksternal">Rapat Klien & Eksternal</option>
                  <option value="Kegiatan Lapangan (On-Site)">Kegiatan Lapangan (On-Site)</option>
                  <option value="Pelatihan K3 & Safety">Pelatihan K3 & Safety</option>
                  <option value="Cuti Bersama">Cuti Bersama</option>
                  <option value="Hari Libur Nasional">Hari Libur Nasional</option>
                  <option value="Agenda Umum">Agenda Umum Lainnya</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Tanggal Mulai *</label>
                  <input 
                    type="date" 
                    required
                    value={agendaForm.date}
                    onChange={e => setAgendaForm({...agendaForm, date: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-bold text-xs rounded-xl px-3.5 py-2.5 outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Tanggal Selesai (Opsional)</label>
                  <input 
                    type="date" 
                    value={agendaForm.end_date}
                    min={agendaForm.date}
                    onChange={e => setAgendaForm({...agendaForm, end_date: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-bold text-xs rounded-xl px-3.5 py-2.5 outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Waktu (Jam) *</label>
                  <input 
                    type="time" 
                    required
                    value={agendaForm.time}
                    onChange={e => setAgendaForm({...agendaForm, time: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-bold text-xs rounded-xl px-3.5 py-2.5 outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Lokasi / Link Pertemuan *</label>
                  <input 
                    type="text" 
                    required
                    value={agendaForm.location}
                    onChange={e => setAgendaForm({...agendaForm, location: e.target.value})}
                    placeholder="Ruang Rapat Site / Zoom"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-bold text-xs rounded-xl px-3.5 py-2.5 outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Deskripsi & Catatan</label>
                <textarea 
                  rows="2"
                  value={agendaForm.description}
                  onChange={e => setAgendaForm({...agendaForm, description: e.target.value})}
                  placeholder="Detail agenda, pembicara, atau perlengkapan yang perlu disiapkan..."
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-medium text-xs rounded-xl px-3.5 py-2.5 outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition resize-none"
                ></textarea>
              </div>

              <div className="pt-3 flex gap-2">
                <button 
                  type="button"
                  onClick={() => setShowAddAgendaModal(false)}
                  className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50 transition cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-red-700 hover:bg-red-800 text-white font-bold text-xs rounded-xl transition disabled:opacity-50 shadow-md cursor-pointer"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Agenda'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Clickable Event Details Modal */}
      {selectedAgendaDetail && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 border border-slate-100">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-2">
                {getEventBadge(selectedAgendaDetail)}
                <span className="text-xs font-bold text-slate-500">Rincian Agenda / Cuti</span>
              </div>
              <button 
                onClick={() => setSelectedAgendaDetail(null)} 
                className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300 transition cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <h3 className="text-base font-black text-slate-900 leading-snug">
                  {selectedAgendaDetail.title}
                </h3>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-2 text-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-bold flex items-center gap-1.5"><CalendarIcon size={13} /> Tanggal:</span>
                  <span className="font-bold text-slate-900">
                    {selectedAgendaDetail.start ? new Date(selectedAgendaDetail.start).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '-'}
                    {selectedAgendaDetail.end && selectedAgendaDetail.end !== selectedAgendaDetail.start ? ` s/d ${new Date(selectedAgendaDetail.end).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}` : ''}
                  </span>
                </div>

                {selectedAgendaDetail.time && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-bold flex items-center gap-1.5"><Clock size={13} /> Waktu:</span>
                    <span className="font-bold text-slate-900">{selectedAgendaDetail.time}</span>
                  </div>
                )}

                {selectedAgendaDetail.location && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-bold flex items-center gap-1.5"><MapPin size={13} /> Lokasi / Media:</span>
                    <span className="font-bold text-slate-900 truncate max-w-[200px]">{selectedAgendaDetail.location}</span>
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Keterangan Lengkap</h4>
                <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed font-medium">
                  {selectedAgendaDetail.description || 'Tidak ada deskripsi tambahan.'}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                {(selectedAgendaDetail.is_agenda || selectedAgendaDetail.type === 'event' || !selectedAgendaDetail.is_leave) && canManageAgenda ? (
                  <div className="flex items-center gap-2">
                    <button 
                      type="button"
                      onClick={() => {
                        const target = selectedAgendaDetail;
                        setAgendaToDelete(target);
                      }}
                      className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      title="Hapus agenda operasional ini"
                    >
                      <Trash2 size={13} className="text-rose-600" /> Hapus
                    </button>
                    <button 
                      type="button"
                      onClick={() => openEditModal(selectedAgendaDetail)}
                      className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      title="Ubah rincian agenda ini"
                    >
                      <Edit size={13} className="text-amber-700" /> Edit Agenda
                    </button>
                  </div>
                ) : <div />}
                <button 
                  type="button"
                  onClick={() => setSelectedAgendaDetail(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Agenda Modal */}
      {showEditAgendaModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Edit size={18} className="text-amber-600" />
                  Edit Agenda Operasional
                </h2>
                <p className="text-xs font-bold text-slate-400 mt-0.5">Perbarui jadwal, lokasi, atau keterangan agenda.</p>
              </div>
              <button 
                onClick={() => setShowEditAgendaModal(false)} 
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleUpdateAgenda} className="p-6 space-y-4 bg-white">
              {editFormError && (
                <div className="p-3 text-xs font-bold rounded-xl flex items-center gap-2 bg-rose-50 text-rose-800 border border-rose-200">
                  <AlertCircle size={15} className="shrink-0 text-rose-600" /> 
                  <span>{editFormError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Judul Agenda *</label>
                <input 
                  type="text" 
                  required
                  value={editForm.title}
                  onChange={e => setEditForm({...editForm, title: e.target.value})}
                  placeholder="Contoh: Safety Talk Mingguan Site BIB"
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-bold text-xs rounded-xl px-3.5 py-2.5 outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Kategori Agenda *</label>
                <select
                  value={editForm.category}
                  onChange={e => setEditForm({...editForm, category: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-bold text-xs rounded-xl px-3.5 py-2.5 outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition cursor-pointer"
                >
                  <option value="Rapat Internal">Rapat Internal</option>
                  <option value="Rapat Klien & Eksternal">Rapat Klien & Eksternal</option>
                  <option value="Kegiatan Lapangan (On-Site)">Kegiatan Lapangan (On-Site)</option>
                  <option value="Pelatihan K3 & Safety">Pelatihan K3 & Safety</option>
                  <option value="Cuti Bersama">Cuti Bersama</option>
                  <option value="Hari Libur Nasional">Hari Libur Nasional</option>
                  <option value="Agenda Umum">Agenda Umum Lainnya</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Tanggal Mulai *</label>
                  <input 
                    type="date" 
                    required
                    value={editForm.date}
                    onChange={e => setEditForm({...editForm, date: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-bold text-xs rounded-xl px-3.5 py-2.5 outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Tanggal Selesai</label>
                  <input 
                    type="date" 
                    value={editForm.end_date}
                    min={editForm.date}
                    onChange={e => setEditForm({...editForm, end_date: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-bold text-xs rounded-xl px-3.5 py-2.5 outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Waktu (Jam) *</label>
                  <input 
                    type="time" 
                    required
                    value={editForm.time}
                    onChange={e => setEditForm({...editForm, time: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-bold text-xs rounded-xl px-3.5 py-2.5 outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Lokasi / Link *</label>
                  <input 
                    type="text" 
                    required
                    value={editForm.location}
                    onChange={e => setEditForm({...editForm, location: e.target.value})}
                    placeholder="Ruang Rapat Site / Zoom"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-bold text-xs rounded-xl px-3.5 py-2.5 outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Deskripsi & Catatan</label>
                <textarea 
                  rows="2"
                  value={editForm.description}
                  onChange={e => setEditForm({...editForm, description: e.target.value})}
                  placeholder="Detail agenda, pembicara, atau perlengkapan yang perlu disiapkan..."
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-medium text-xs rounded-xl px-3.5 py-2.5 outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition resize-none"
                ></textarea>
              </div>

              <div className="pt-3 flex gap-2">
                <button 
                  type="button"
                  onClick={() => setShowEditAgendaModal(false)}
                  className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50 transition cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  disabled={editSubmitting}
                  className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition disabled:opacity-50 shadow-md cursor-pointer"
                >
                  {editSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Clear Month Confirmation Modal */}
      {showClearMonthModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 border border-slate-100">
            <div className="p-5 border-b border-rose-100 bg-rose-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-sm shadow-rose-600/30">
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-rose-950 leading-snug">
                    Pembersihan Agenda Bulanan
                  </h3>
                  <p className="text-[11px] font-bold text-rose-700 mt-0.5">
                    Periode: {monthNames[currentMonth]} {currentYear}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowClearMonthModal(false)} 
                className="w-7 h-7 flex items-center justify-center rounded-full bg-rose-200/80 text-rose-800 hover:bg-rose-300 transition cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-700 font-medium leading-relaxed">
                Anda akan menghapus <strong>seluruh agenda kerja, inspeksi, dan rapat operasional</strong> yang terjadwal pada bulan <strong>{monthNames[currentMonth]} {currentYear}</strong>.
              </p>

              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-1">
                <div className="flex items-center gap-1.5 font-black text-[11px]">
                  <Check size={14} className="text-emerald-700 shrink-0" />
                  <span>Data Cuti & Jadwal Karyawan Tetap Aman:</span>
                </div>
                <p className="text-[11px] text-emerald-800 font-medium pl-5">
                  Data cuti tahunan, off roster, sakit, dan izin karyawan tidak akan terhapus. Hanya jadwal agenda internal yang dibersihkan.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-[11px] font-medium">
                Tindakan ini akan dicatat ke dalam <strong>Log Aktivitas Admin</strong> dan tidak dapat dikembalikan.
              </div>

              <div className="pt-2 flex gap-2.5">
                <button 
                  type="button"
                  onClick={() => setShowClearMonthModal(false)}
                  disabled={clearingMonth}
                  className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
                >
                  Batal
                </button>
                <button 
                  type="button"
                  onClick={handleClearMonthAgendas}
                  disabled={clearingMonth}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/30 cursor-pointer disabled:opacity-50"
                >
                  <Trash2 size={14} /> {clearingMonth ? 'Membersihkan...' : `Bersihkan Agenda (${monthNames[currentMonth]})`}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Single Agenda Confirmation Modal */}
      {agendaToDelete && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 border border-slate-100">
            <div className="p-5 border-b border-slate-100 bg-rose-50 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-xs">
                <Trash2 size={17} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">Hapus Agenda Operasional</h3>
                <p className="text-[11px] font-bold text-slate-500">Konfirmasi tindakan penghapusan</p>
              </div>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <p className="text-slate-600 font-medium">
                Apakah Anda yakin ingin menghapus agenda berikut?
              </p>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <h4 className="font-black text-slate-900 text-xs">{agendaToDelete.title}</h4>
                <p className="text-[11px] text-slate-500 font-medium">
                  {agendaToDelete.start ? new Date(agendaToDelete.start).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '-'}
                  {agendaToDelete.time ? ` • ${agendaToDelete.time}` : ''}
                </p>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">
                Tindakan ini akan dicatat ke dalam log aktivitas admin.
              </p>

              <div className="pt-2 flex gap-2">
                <button 
                  type="button"
                  onClick={() => setAgendaToDelete(null)}
                  disabled={deletingAgenda}
                  className="flex-1 py-2 bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
                >
                  Batal
                </button>
                <button 
                  type="button"
                  onClick={() => handleDeleteAgenda(agendaToDelete)}
                  disabled={deletingAgenda}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {deletingAgenda ? 'Menghapus...' : 'Ya, Hapus Agenda'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default LeaveTimeline;


