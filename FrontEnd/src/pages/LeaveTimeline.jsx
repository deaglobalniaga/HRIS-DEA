import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Users, Clock, AlertCircle, Plus, X, ChevronLeft, ChevronRight, Bookmark, UploadCloud, Check } from 'lucide-react';
import api from '../api/api';

const LeaveTimeline = () => {
  const [selectedDate, setSelectedDate] = useState(null);
  const [events, setEvents] = useState([]);
  const [, setLoading] = useState(true);
  
  // Calendar State
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  
  // Modals
  const [showAddAgendaModal, setShowAddAgendaModal] = useState(false);
  
  // Forms
  const [agendaForm, setAgendaForm] = useState({ title: '', date: '', end_date: '', time: '', location: '', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
      const fetchTimeline = async () => {
          try {
              const res = await api.get(`/hris/calendar/events?month=${currentMonth + 1}&year=${currentYear}`);
              setEvents(res.data);
          } catch (error) {
              console.error("Failed to fetch calendar data", error);
          } finally {
              setLoading(false);
          }
      };
      fetchTimeline();
  }, [currentMonth, currentYear]);


  const handleAddAgenda = async (e) => {
      e.preventDefault();
      setSubmitting(true);
      setMessage('');
      try {
          await api.post('/hris/calendar/events', {
              title: agendaForm.title,
              description: `${agendaForm.time} | ${agendaForm.location} - ${agendaForm.description}`,
              event_date: agendaForm.date,
              event_end_date: agendaForm.end_date || agendaForm.date
          });
          // Refresh calendar
          const res = await api.get(`/hris/calendar/events?month=${currentMonth + 1}&year=${currentYear}`);
          setEvents(res.data);
          setMessage('Agenda berhasil ditambahkan!');
          setTimeout(() => {
              setShowAddAgendaModal(false);
              setAgendaForm({ title: '', date: '', end_date: '', time: '', location: '', description: '' });
              setMessage('');
          }, 1500);
      } catch (err) {
          console.error(err);
          setMessage('Gagal menambahkan agenda.');
      } finally {
          setSubmitting(false);
      }
  };

  // Calendar Helpers
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  
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
          const itemEnd = new Date(item.end).toISOString().split('T')[0];
          return dateStr >= itemStart && dateStr <= itemEnd;
      });
  };

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];
  
  // Format helpers
  const getEventBadge = (item) => {
      if (item.type === 'leave') return <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-black uppercase tracking-wider">Cuti</span>;
      if (item.type === 'roster_leave') return <span className="px-2 py-0.5 bg-yellow-400 text-red-900 rounded text-[10px] font-black uppercase tracking-wider">ROSTER OFF</span>;
      if (item.type === 'permission') {
          if (item.subType === 'Sakit') return <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-black uppercase tracking-wider">Sakit</span>;
          return <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-black uppercase tracking-wider">{item.subType}</span>;
      }
      if (item.type === 'event') return <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px] font-black uppercase tracking-wider">Agenda</span>;
      return null;
  };

  return (
    <div className="w-full flex flex-col gap-6 min-h-[85vh]">
        
        {/* Full Width Calendar */}
        <div className="w-full flex flex-col gap-6">
            
            {/* Alerts / Warnings for Operational Divisions */}
            {(() => {
                let maxLeave = 0;
                daysArray.forEach(day => {
                    const eventsOnDay = getEventsForDate(day);
                    let leaveCount = eventsOnDay.filter(e => e.type === 'leave').length;
                    if (leaveCount > maxLeave) maxLeave = leaveCount;
                });
                
                const warnings = [];
                if (maxLeave >= 3) warnings.push(`Peringatan: Ada hari dimana ${maxLeave} karyawan mengambil cuti bersamaan di bulan ini. Potensi kekurangan man-power!`);
                
                if (warnings.length > 0) {
                    return (
                        <div className="flex flex-col gap-2">
                            {warnings.map((w, idx) => (
                                <div key={idx} className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl flex items-center gap-3 font-bold text-sm shadow-sm">
                                    <AlertCircle size={18} className="text-red-600 shrink-0" />
                                    {w}
                                </div>
                            ))}
                        </div>
                    );
                }
                return null;
            })()}

            {/* Visual Calendar */}
            <div className="flex-1 bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-100 bg-slate-50 flex flex-col md:flex-row justify-between items-center gap-4">
                    
                    <div className="flex items-center gap-4">
                        <button onClick={prevMonth} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition shadow-sm">
                            <ChevronLeft size={20} className="text-slate-600" />
                        </button>
                        <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2 min-w-[200px] justify-center">
                            <CalendarIcon size={24} className="text-red-900" />
                            {monthNames[currentMonth]} {currentYear}
                        </h2>
                        <button onClick={nextMonth} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition shadow-sm">
                            <ChevronRight size={20} className="text-slate-600" />
                        </button>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">

                        <button 
                            onClick={() => setShowAddAgendaModal(true)}
                            className="flex-1 md:flex-none bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-5 py-2.5 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 shadow-sm">
                            <Bookmark size={16} className="text-blue-600" /> Add Agenda
                        </button>
                    </div>
                </div>

                <div className="p-6 flex-1 flex flex-col">
                    {/* Days Header */}
                    <div className="grid grid-cols-7 gap-2 mb-2 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
                    </div>
                    
                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-2 flex-1">
                        {emptySlots.map((_, i) => (
                            <div key={`empty-${i}`} className="p-2 border border-transparent"></div>
                        ))}
                        
                        {daysArray.map(day => {
                            const empOnLeave = getEventsForDate(day);
                            const isSelected = selectedDate === day;
                            
                            let bgClass = "bg-white hover:border-red-900";
                            if (empOnLeave.some(e => e.type === 'roster_leave')) bgClass = "bg-yellow-100 border-yellow-400 border-2 font-bold shadow-md ring-1 ring-yellow-400";
                            else if (empOnLeave.some(e => e.type === 'leave')) bgClass = "bg-blue-50 border-blue-200";
                            else if (empOnLeave.some(e => e.type === 'permission')) bgClass = "bg-red-50 border-red-200";
                            else if (empOnLeave.some(e => e.type === 'event')) bgClass = "bg-emerald-50 border-emerald-200";

                            return (
                                <div 
                                    key={day} 
                                    onClick={() => setSelectedDate(day)}
                                    className={`relative p-2 border rounded-2xl cursor-pointer transition-all min-h-[80px] flex flex-col ${isSelected ? 'ring-2 ring-red-900 border-red-900 shadow-md' : 'border-slate-100 shadow-sm'} ${bgClass}`}
                                >
                                    <span className={`text-sm font-black mb-1 ${isSelected ? 'text-red-900' : 'text-gray-900'}`}>{day}</span>
                                    <div className="flex flex-col gap-1 mt-auto">
                                        {empOnLeave.slice(0, 3).map((e, idx) => (
                                            <div key={idx} className="truncate">
                                                {getEventBadge(e)} <span className="text-[10px] font-bold text-slate-700">{e.title.split(' - ')[0]}</span>
                                            </div>
                                        ))}
                                        {empOnLeave.length > 3 && (
                                            <div className="w-full text-center bg-slate-200 rounded text-[9px] font-bold text-slate-600 shadow-sm">
                                                +{empOnLeave.length - 3} lainnya
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
                
                {/* Details for Selected Date */}
                {selectedDate && (
                    <div className="border-t border-slate-200 p-6 bg-slate-50 animate-in slide-in-from-bottom-4">
                        <h3 className="font-black text-gray-900 mb-4">Activities on {monthNames[currentMonth]} {selectedDate}, {currentYear}</h3>
                        {selectedDateEvents.length > 0 ? (
                            <div className="flex flex-col gap-3 pb-2">
                                {selectedDateEvents.map((emp, idx) => (
                                    <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4 shadow-sm w-full">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-1">
                                                {getEventBadge(emp)}
                                                <p className="text-sm font-black text-gray-900 leading-tight">{emp.title}</p>
                                            </div>
                                            <p className="text-xs font-bold text-slate-500">{emp.description || 'Tidak ada keterangan tambahan.'}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm font-medium text-slate-500">No leave or agenda on this date.</p>
                        )}
                    </div>
                )}
            </div>
        </div>

        {/* Add Agenda Modal (Professional HR Form) */}
        {showAddAgendaModal && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <div>
                            <h2 className="text-xl font-black text-gray-900">Form Agenda Perusahaan</h2>
                            <p className="text-xs font-bold text-slate-400 mt-1">Buat jadwal rapat, acara, atau pengingat.</p>
                        </div>
                        <button onClick={() => setShowAddAgendaModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 text-slate-500 hover:bg-blue-100 hover:text-blue-900 transition">
                            <X size={18} />
                        </button>
                    </div>
                    <form onSubmit={handleAddAgenda} className="p-8 space-y-5 bg-white">
                        {message && (
                            <div className={`p-4 text-sm font-bold rounded-xl flex items-center gap-3 ${message.includes('Gagal') ? 'bg-red-50 text-red-900 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'}`}>
                                <AlertCircle size={18} /> {message}
                            </div>
                        )}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Judul Agenda</label>
                            <input 
                                type="text" 
                                required
                                value={agendaForm.title}
                                onChange={e => setAgendaForm({...agendaForm, title: e.target.value})}
                                placeholder="Example: Monthly Evaluation Meeting"
                                className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 transition"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tanggal Mulai</label>
                                <input 
                                    type="date" 
                                    required
                                    value={agendaForm.date}
                                    onChange={e => setAgendaForm({...agendaForm, date: e.target.value})}
                                    className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 transition"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Sampai Tanggal (Opsional)</label>
                                <input 
                                    type="date" 
                                    value={agendaForm.end_date}
                                    onChange={e => setAgendaForm({...agendaForm, end_date: e.target.value})}
                                    className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 transition"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Waktu (Jam)</label>
                                <input 
                                    type="time" 
                                    required
                                    value={agendaForm.time}
                                    onChange={e => setAgendaForm({...agendaForm, time: e.target.value})}
                                    className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 transition"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Lokasi / Link Pertemuan</label>
                                <input 
                                    type="text" 
                                    required
                                    value={agendaForm.location}
                                    onChange={e => setAgendaForm({...agendaForm, location: e.target.value})}
                                    placeholder="Ruang Meeting / Zoom"
                                    className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 transition"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Deskripsi Agenda</label>
                            <textarea 
                                required
                                rows="2"
                                value={agendaForm.description}
                                onChange={e => setAgendaForm({...agendaForm, description: e.target.value})}
                                placeholder="Tujuan atau agenda rapat..."
                                className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-medium rounded-xl px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 transition resize-none"
                            ></textarea>
                        </div>
                        <div className="pt-4 flex gap-3">
                            <button 
                                type="button"
                                onClick={() => setShowAddAgendaModal(false)}
                                className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition">
                                Cancel
                            </button>
                            <button 
                                type="submit" 
                                disabled={submitting}
                                className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition disabled:opacity-50 shadow-md hover:shadow-lg">
                                {submitting ? 'Saving...' : 'Save Agenda'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* Day Detail Modal */}
        {selectedDate && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <div>
                            <h2 className="text-xl font-black text-gray-900">
                                {selectedDate} {monthNames[currentMonth]} {currentYear}
                            </h2>
                            <p className="text-xs font-bold text-slate-400 mt-1">Detail jadwal dan kehadiran</p>
                        </div>
                        <button onClick={() => setSelectedDate(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 text-slate-500 hover:bg-red-100 hover:text-red-900 transition">
                            <X size={18} />
                        </button>
                    </div>
                    <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4 bg-white">
                        {selectedDateEvents.length === 0 ? (
                            <div className="text-center text-slate-400 py-8">
                                <CalendarIcon size={48} className="mx-auto mb-3 opacity-20" />
                                <p className="font-bold text-sm">Tidak ada agenda atau cuti di hari ini</p>
                            </div>
                        ) : (
                            selectedDateEvents.map((e, idx) => (
                                <div key={idx} className="flex flex-col gap-2 p-4 rounded-xl border border-slate-100 bg-slate-50">
                                    <div className="flex justify-between items-center">
                                        {getEventBadge(e)}
                                    </div>
                                    <h4 className="font-black text-gray-800 text-sm mt-1">{e.title}</h4>
                                    {e.description && <p className="text-xs font-medium text-slate-500">{e.description}</p>}
                                    {e.time && (
                                        <p className="text-[11px] font-bold text-blue-600 flex items-center gap-1 mt-1">
                                            <Clock size={12} /> {e.time}
                                        </p>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default LeaveTimeline;
