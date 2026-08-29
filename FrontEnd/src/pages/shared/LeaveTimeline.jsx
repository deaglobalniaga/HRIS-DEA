import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, Users, Clock, AlertCircle, Plus, X, ChevronLeft, 
  ChevronRight, Bookmark, MapPin, Check, Info, Tag, Layers, CalendarCheck
} from 'lucide-react';
import api from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const LeaveTimeline = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const userRole = (user?.role || '').toLowerCase();
  const isSuperAdmin = ['superadmin', 'super_admin'].includes(userRole);
  const isHRGA = ['admin', 'hr', 'hrga_admin', 'hse_admin'].includes(userRole) && !isSuperAdmin;

  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedAgendaDetail, setSelectedAgendaDetail] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Calendar State
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  
  // Modals
  const [showAddAgendaModal, setShowAddAgendaModal] = useState(false);
  
  // Forms
  const [agendaForm, setAgendaForm] = useState({
    title: '',
    category: 'Rapat Internal',
    date: '',
    end_date: '',
    time: '',
    location: '',
    description: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

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
      setFormError('Super Admin hanya memiliki hak tata kelola sistem. Penambahan agenda hanya wewenang Admin HRGA.');
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
    <div className="w-full flex flex-col gap-6 min-h-[85vh]">
      {/* Full Width Calendar */}
      <div className="w-full flex flex-col gap-5">
        
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
              <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-2xl flex items-center gap-3 font-bold text-xs shadow-sm">
                <AlertCircle size={18} className="text-rose-600 shrink-0" />
                <span>Peringatan Man-Power: Ada hari dengan {maxLeave} karyawan cuti bersamaan di bulan ini. Pastikan operasional site tetap aman.</span>
              </div>
            );
          }
          return null;
        })()}

        {/* Visual Calendar Box */}
        <div className="flex-1 bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden flex flex-col">
          {/* Header Controls */}
          <div className="p-5 border-b border-slate-100 bg-slate-50 flex flex-col lg:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-900 text-white flex items-center justify-center font-black shadow-md shadow-red-900/20">
                <CalendarIcon size={20} />
              </div>
              <div>
                <h1 className="text-lg font-black text-slate-900 tracking-tight">
                  {monthNames[currentMonth]} {currentYear}
                </h1>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Jadwal & Agenda Operasional Site PT DEA GLOBAL NIAGA
                </p>
              </div>
            </div>

            {/* Month Navigator */}
            <div className="flex items-center gap-2 bg-white px-2 py-1.5 rounded-2xl border border-slate-200 shadow-2xs">
              <button 
                onClick={prevMonth}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 transition cursor-pointer"
                title="Bulan Sebelumnya"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs font-black text-slate-800 px-2 min-w-[110px] text-center">
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

            {/* Top Color Legend Bar */}
            <div className="flex flex-wrap items-center justify-center gap-2 bg-white px-3.5 py-1.5 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1 flex items-center gap-1">
                <Layers size={11} /> Legenda:
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs" /> Cuti Karyawan
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-black bg-amber-50 text-amber-900 border border-amber-200 shadow-2xs">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-xs" /> Off / Roster Leave
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-black bg-blue-50 text-blue-800 border border-blue-200 shadow-2xs">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-xs" /> Agenda Kerja / Rapat
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-black bg-rose-50 text-rose-800 border border-rose-200 shadow-2xs">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-xs" /> Libur Nasional / Sakit
              </span>
            </div>

            {isHRGA && (
              <div className="flex items-center gap-3 w-full lg:w-auto">
                <button 
                  onClick={() => setShowAddAgendaModal(true)}
                  className="w-full lg:w-auto bg-slate-900 hover:bg-black text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  <Plus size={15} /> Tambah Agenda Baru
                </button>
              </div>
            )}
          </div>

          <div className="p-4 sm:p-6 flex-1 flex flex-col">
            {/* Days Header */}
            <div className="grid grid-cols-7 gap-2 mb-2 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <div className="text-rose-600">Min</div>
              <div>Sen</div>
              <div>Sel</div>
              <div>Rab</div>
              <div>Kam</div>
              <div>Jum</div>
              <div className="text-amber-600">Sab</div>
            </div>
            
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2 flex-1">
              {emptySlots.map((_, i) => (
                <div key={`empty-${i}`} className="p-2 border border-transparent min-h-[90px]"></div>
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
                    className={`relative p-2.5 border rounded-2xl cursor-pointer transition-all min-h-[96px] flex flex-col justify-between group shadow-2xs ${
                      isSelected 
                        ? 'ring-2 ring-red-900 border-red-900 shadow-md bg-white' 
                        : 'border-slate-200/80'
                    } ${bgClass}`}
                  >
                    {/* Header with Date Number */}
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-black transition-all ${
                        isToday 
                          ? 'w-6 h-6 rounded-full bg-red-700 text-white flex items-center justify-center text-[10px] shadow-xs' 
                          : isSelected 
                          ? 'text-red-900 font-extrabold text-sm' 
                          : 'text-slate-800'
                      }`}>
                        {day}
                      </span>
                      {empOnLeave.length > 0 && (
                        <span className="w-2 h-2 rounded-full bg-red-600 shadow-xs" title={`${empOnLeave.length} Agenda/Cuti`} />
                      )}
                    </div>

                    {/* Color Badges (Legend Only - Clean & Readable, No Crowded Text) */}
                    <div className="flex flex-col gap-1 mt-1.5">
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
                          <span className="text-[10px] font-bold text-blue-600 group-hover:underline">
                            Lihat Rincian &rarr;
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
      </div>

      {/* Add Agenda Modal with Strict Validation */}
      {showAddAgendaModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
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
        </div>
      )}

      {/* Clickable Event Details Modal */}
      {selectedAgendaDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
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

              <div className="pt-2 text-right">
                <button 
                  onClick={() => setSelectedAgendaDetail(null)}
                  className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveTimeline;

