import React, { useState, useEffect } from 'react';
import { Search, Filter, Clock, Calendar as CalendarIcon, Download, ChevronDown, CheckCircle, RefreshCw, Briefcase, Activity, Target } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../../api/api';
import { useToast } from '../../context/ToastContext';

const Timesheet = () => {
    const { addToast } = useToast();
    const [timesheetData, setTimesheetData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDept, setSelectedDept] = useState('ALL');
    const [targetFilter, setTargetFilter] = useState('ALL'); // 'ALL' | 'MET' | 'UNDER'
    const [targetHours, setTargetHours] = useState(160); // Default to 160
    
    // Filter State
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [expandedUser, setExpandedUser] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        fetchTimesheet();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentMonth, currentYear]);

    const fetchTimesheet = async () => {
        setLoading(true);
        try {
            // Reusing reports endpoint for timesheet data
            const res = await api.get(`/hris/reports/attendance-monthly?month=${currentMonth}&year=${currentYear}`);
            const mappedData = (res.data.data || []).map(item => ({
                ...item,
                name: item.full_name || item.name || 'Karyawan',
                division: item.division || item.department || 'General',
                present_days: item.hadir || 0,
                total_hours: (item.hadir || 0) * 8
            }));
            setTimesheetData(mappedData);
            
            // Fetch global target hours
            try {
                const setRes = await api.get('/settings');
                if (setRes.data && setRes.data.monthlyTargetHours) {
                    setTargetHours(setRes.data.monthlyTargetHours);
                }
            } catch (e) {
                console.error("Failed to fetch settings", e);
            }
        } catch (err) {
            console.error("Failed to fetch timesheet", err);
        } finally {
            setLoading(false);
        }
    };

    const toggleExpand = (userId) => {
        if (expandedUser === userId) {
            setExpandedUser(null);
        } else {
            setExpandedUser(userId);
        }
    };

    // Extract unique departments from data
    const departments = ['ALL', ...Array.from(new Set(timesheetData.map(item => item.division).filter(Boolean)))];

    const filteredData = timesheetData.filter(item => {
        const name = String(item.name || '').toLowerCase();
        const div = String(item.division || '').toLowerCase();
        const nip = String(item.nip || item.nomor_pegawai || '').toLowerCase();
        const search = searchTerm.toLowerCase().trim();

        const matchesSearch = !search || name.includes(search) || div.includes(search) || nip.includes(search);
        const matchesDept = selectedDept === 'ALL' || item.division === selectedDept;
        
        let matchesTarget = true;
        const hours = parseFloat(item.total_hours || 0);
        if (targetFilter === 'MET') {
            matchesTarget = hours >= targetHours;
        } else if (targetFilter === 'UNDER') {
            matchesTarget = hours < targetHours;
        }

        return matchesSearch && matchesDept && matchesTarget;
    });

    const resetFilters = () => {
        setSearchTerm('');
        setSelectedDept('ALL');
        setTargetFilter('ALL');
        setCurrentPage(1);
    };

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedDept, targetFilter, currentMonth, currentYear]);

    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const currentData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    const totalCumulativeHours = timesheetData.reduce((acc, curr) => acc + parseFloat(curr.total_hours || 0), 0);
    const totalPresentDays = timesheetData.reduce((acc, curr) => acc + (curr.present_days || 0), 0);
    const averageHours = totalPresentDays > 0 ? (totalCumulativeHours / totalPresentDays).toFixed(1) : 0;

    const handlePrint = () => {
        const printContent = document.getElementById('print-table');
        if (!printContent) {
            addToast('Data tabel tidak ditemukan untuk dicetak.', 'warning');
            return;
        }
        
        const win = window.open('', '', 'height=700,width=900');
        if (!win) {
            addToast('Tolong izinkan pop-up browser untuk mencetak laporan.', 'warning');
            return;
        }

        win.document.write(`
            <html><head><title>Laporan Jam Kerja Karyawan</title>
            <style>
                @media print {
                    @page { size: landscape; margin: 10mm; }
                }
                body { font-family: 'Arial', sans-serif; padding: 20px; color: #000; }
                .kop-surat { display: flex; align-items: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px; }
                .kop-logo { width: 70px; height: 70px; object-fit: contain; margin-right: 20px; }
                .kop-text h1 { margin: 0; font-size: 16pt; font-weight: bold; text-transform: uppercase; }
                .kop-text p { margin: 2px 0 0; font-size: 9pt; color: #333; }
                .report-title { text-align: center; margin-bottom: 20px; }
                .report-title h2 { margin: 0; font-size: 13pt; text-decoration: underline; }
                .report-title p { margin: 3px 0 0; font-size: 9pt; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 8.5pt; }
                th, td { border: 1px solid #333; padding: 6px 8px; text-align: left; }
                th { background-color: #f2f2f2; font-weight: bold; text-align: center; }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .badge { font-weight: bold; }
                .met { color: green; }
                .under { color: red; }
                .footer-sign { margin-top: 40px; display: flex; justify-content: space-between; page-break-inside: avoid; }
                .sign-box { text-align: center; width: 200px; font-size: 9pt; }
                .sign-space { height: 60px; }
            </style>
            </head><body>
            <div class="kop-surat">
                <img src="/dea.png" class="kop-logo" alt="Logo DEA" onerror="this.style.display='none'"/>
                <div class="kop-text">
                    <h1>PT DEA GLOBAL NIAGA</h1>
                    <p>General Contractor, Supplier, Heavy Equipment Rental & Mining Services</p>
                    <p>Jl. Pelajau Indah No. 34 RT. 06 Batulicin, Tanah Bumbu, Kalimantan Selatan</p>
                </div>
            </div>
            <div class="report-title">
                <h2>REKAPITULASI TIMESHEET BULANAN</h2>
                <p>Periode: <b>${months[currentMonth - 1]} ${currentYear}</b></p>
            </div>
            <table>
                <thead>
                    <tr>
                        <th width="30">NO</th>
                        <th>NAMA LENGKAP</th>
                        <th>NIP / ID</th>
                        <th>DIVISI / JABATAN</th>
                        <th>HADIR (HARI)</th>
                        <th>TOTAL JAM</th>
                        <th>STATUS TARGET (${targetHours} JAM)</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredData.map((d, index) => {
                        const isMet = d.total_hours >= targetHours;
                        return `
                        <tr>
                            <td class="text-center">${index + 1}</td>
                            <td><b>${d.name || d.full_name}</b></td>
                            <td class="text-center">${d.nip || d.nomor_pegawai || '-'}</td>
                            <td>${d.division} - ${d.jabatan || 'Staff'}</td>
                            <td class="text-center">${d.present_days || 0}</td>
                            <td class="text-right"><b>${d.total_hours || 0} Jam</b></td>
                            <td class="text-center"><span class="badge ${isMet ? 'met' : 'under'}">${isMet ? 'TERPENUHI' : 'BELUM TERPENUHI'}</span></td>
                        </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
            <div class="footer-sign">
                <div class="sign-box">
                    <p>Dibuat Oleh,</p>
                    <div class="sign-space"></div>
                    <p><b>Admin HRGA</b></p>
                </div>
                <div class="sign-box">
                    <p>Mengetahui,</p>
                    <div class="sign-space"></div>
                    <p><b>Direktur Operasional</b></p>
                </div>
            </div>
            <script>
                window.onload = function() {
                    window.print();
                    setTimeout(function() { window.close(); }, 500);
                }
            </script>
            </body></html>
        `);
        win.document.close();
    };


    // 1. Export CSV
    const handleExportCSV = () => {
        if (!timesheetData || timesheetData.length === 0) {
            addToast('Belum ada data jam kerja untuk diekspor.', 'warning');
            return;
        }
        const headers = ["Nama Karyawan", "NIP", "Departemen", "Jabatan", "Total Kehadiran (Hari)", "Total Jam Kerja (Jam)"];
        const rows = timesheetData.map(item => [
            `"${item.name || item.full_name || ''}"`,
            `"${item.nip || item.nomor_pegawai || ''}"`,
            `"${item.division || ''}"`,
            `"${item.jabatan || 'Staff'}"`,
            item.present_days || 0,
            item.total_hours || 0
        ]);
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Timesheet_${months[currentMonth - 1]}_${currentYear}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        addToast('Laporan Timesheet CSV berhasil diunduh.', 'success');
    };

    // 2. Export Excel (XLS)
    const handleExportExcel = () => {
        if (!timesheetData || timesheetData.length === 0) {
            addToast('Belum ada data jam kerja untuk diekspor.', 'warning');
            return;
        }
        let tableHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"/></head><body><table border="1"><thead><tr><th>Nama Karyawan</th><th>NIP</th><th>Departemen</th><th>Jabatan</th><th>Total Kehadiran (Hari)</th><th>Total Jam Kerja (Jam)</th></tr></thead><tbody>`;
        timesheetData.forEach(item => {
            tableHtml += `<tr><td>${item.name || item.full_name}</td><td>${item.nip || item.nomor_pegawai || '-'}</td><td>${item.division}</td><td>${item.jabatan || 'Staff'}</td><td>${item.present_days || 0}</td><td>${item.total_hours || 0}</td></tr>`;
        });
        tableHtml += `</tbody></table></body></html>`;
        const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Timesheet_${months[currentMonth - 1]}_${currentYear}.xls`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    return (
        <div className="w-full flex flex-col gap-6 relative">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight">
                        Jam Kerja Karyawan (Timesheet)
                    </h1>
                    <p className="text-xs text-slate-500 font-bold mt-0.5">
                        Rekapitulasi jam kerja harian, akumulasi bulanan, dan ekspor dokumen resmi.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <select 
                        value={currentMonth}
                        onChange={(e) => setCurrentMonth(parseInt(e.target.value))}
                        className="px-3 py-2 bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-xl shadow-sm hover:bg-slate-50 focus:outline-none transition">
                        {months.map((m, i) => (
                            <option key={i} value={i + 1}>{m}</option>
                        ))}
                    </select>
                    <select 
                        value={currentYear}
                        onChange={(e) => setCurrentYear(parseInt(e.target.value))}
                        className="px-3 py-2 bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-xl shadow-sm hover:bg-slate-50 focus:outline-none transition">
                        {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>

                    <button 
                        onClick={handleExportCSV}
                        className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs rounded-xl shadow-sm hover:bg-emerald-100 transition">
                        <Download size={14} /> CSV
                    </button>

                    <button 
                        onClick={handleExportExcel}
                        className="flex items-center gap-1.5 px-3 py-2 bg-green-700 text-white font-bold text-xs rounded-xl shadow-sm hover:bg-green-800 transition">
                        <Download size={14} /> Excel (.xls)
                    </button>

                    <button 
                        onClick={handlePrint}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl shadow-sm hover:bg-black transition">
                        <Download size={14} /> Cetak PDF (Kop Surat)
                    </button>
                </div>
            </div>

            {/* KPI Containers (Working Hours Explicit Calculation) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-1">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"><Clock size={20} /></div>
                        <span className="text-[9px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">ESTIMASI</span>
                    </div>
                    <div>
                        <h4 className="text-[11px] font-bold text-slate-500 mb-0.5">Rata-rata Jam Kerja</h4>
                        <div className="flex items-end gap-1.5">
                            <span className="text-2xl font-black text-slate-800 leading-none">{averageHours}</span>
                            <span className="text-xs font-bold text-slate-400 mb-0.5">Jam/Hari</span>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-1.5 bg-green-50 text-green-600 rounded-lg"><Target size={20} /></div>
                        <span className="text-[9px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">TARGET</span>
                    </div>
                    <div>
                        <h4 className="text-[11px] font-bold text-slate-500 mb-0.5">Total Target Bulanan</h4>
                        <div className="flex items-end gap-1.5">
                            <span className="text-2xl font-black text-slate-800 leading-none">{targetHours}</span>
                            <span className="text-xs font-bold text-slate-400 mb-0.5">Jam</span>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg"><Briefcase size={20} /></div>
                    </div>
                    <div>
                        <h4 className="text-[11px] font-bold text-slate-500 mb-0.5">Total Kehadiran</h4>
                        <div className="flex items-end gap-1.5">
                            <span className="text-2xl font-black text-slate-800 leading-none">{timesheetData.reduce((acc, curr) => acc + (curr.present_days || 0), 0)}</span>
                            <span className="text-xs font-bold text-slate-400 mb-0.5">Hari Pgw</span>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg"><Activity size={20} /></div>
                    </div>
                    <div>
                        <h4 className="text-[11px] font-bold text-slate-500 mb-0.5">Kumulatif Jam</h4>
                        <div className="flex items-end gap-1.5">
                            <span className="text-2xl font-black text-slate-800 leading-none">{timesheetData.reduce((acc, curr) => acc + parseFloat(curr.total_hours || 0), 0).toFixed(0)}</span>
                            <span className="text-xs font-bold text-slate-400 mb-0.5">Jam</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Chart: Explicit Hours Breakdown */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-1">
                <h3 className="text-xs font-black text-slate-800 mb-2">Grafik Distribusi Jam Kerja (Per Karyawan)</h3>
                <div className="h-32 w-full">
                    {timesheetData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={timesheetData.slice(0, 10)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b', fontWeight: 'bold' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b' }} />
                                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Bar dataKey="total_hours" name="Total Jam" fill="#0f172a" radius={[4, 4, 0, 0]} barSize={24} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-sm">Belum ada data grafik</div>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col flex-1">
                <div className="p-3 border-b border-slate-100 flex flex-col xl:flex-row gap-3 items-stretch xl:items-center justify-between bg-slate-50">
                    <div className="flex flex-wrap items-center gap-2 flex-1">
                        {/* Search Input */}
                        <div className="relative flex-1 min-w-[220px] max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input 
                                type="text" 
                                placeholder="Cari nama, NIP, atau divisi..." 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                            />
                        </div>

                        {/* Department Filter */}
                        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-sm">
                            <Briefcase size={14} className="text-slate-400" />
                            <select
                                value={selectedDept}
                                onChange={e => setSelectedDept(e.target.value)}
                                className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
                            >
                                <option value="ALL">Semua Departemen</option>
                                {departments.filter(d => d !== 'ALL').map(dept => (
                                    <option key={dept} value={dept}>{dept}</option>
                                ))}
                            </select>
                        </div>

                        {/* Status Target Filter */}
                        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-sm">
                            <Target size={14} className="text-slate-400" />
                            <select
                                value={targetFilter}
                                onChange={e => setTargetFilter(e.target.value)}
                                className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
                            >
                                <option value="ALL">Semua Target</option>
                                <option value="MET">Tercapai (≥ {targetHours} Jam)</option>
                                <option value="UNDER">Belum Tercapai (&lt; {targetHours} Jam)</option>
                            </select>
                        </div>

                        {/* Reset Filter Button */}
                        {(searchTerm || selectedDept !== 'ALL' || targetFilter !== 'ALL') && (
                            <button
                                onClick={resetFilters}
                                className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-xl text-xs font-bold transition flex items-center gap-1"
                                title="Reset semua filter"
                            >
                                <RefreshCw size={12} /> Reset Filter
                            </button>
                        )}
                    </div>

                    <div className="flex items-center justify-end text-xs font-bold text-slate-500">
                        <span>Menampilkan {filteredData.length} dari {timesheetData.length} Karyawan</span>
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    <table id="print-table" className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-500">
                                <th className="p-4 font-black">Karyawan</th>
                                <th className="p-4 font-black">Divisi & Role</th>
                                <th className="p-4 font-black text-center">Total Kehadiran</th>
                                <th className="p-4 font-black text-center">Total Jam Kerja</th>
                                <th className="p-4 font-black text-center">Detail Riwayat</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-slate-400 font-bold">Menghitung akumulasi jam kerja...</td>
                                </tr>
                            ) : filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-12 text-center">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-2">
                                                <Clock size={24} className="text-slate-400" />
                                            </div>
                                            <h4 className="text-sm font-black text-slate-800">Belum Ada Data Jam Kerja</h4>
                                            <p className="text-[11px] font-bold text-slate-500 max-w-md">
                                                Halaman ini berfungsi untuk mengakumulasi total jam kerja harian karyawan (Timesheet) 
                                                berdasarkan presensi masuk dan pulang. Saat ini masih kosong karena belum ada rekaman 
                                                jam kerja yang valid di bulan ini.
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                currentData.map((item) => (
                                    <React.Fragment key={item.id}>
                                        <tr className="hover:bg-slate-50 transition-colors">
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden shrink-0 border border-slate-200">
                                                        <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(item.full_name)}&background=random`} alt={item.full_name} />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-bold text-gray-900">{item.full_name}</h4>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-slate-800">{item.division || '-'}</span>
                                                    <span className="text-[11px] font-bold text-slate-500 capitalize">{item.role}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-blue-50 text-blue-700 border border-blue-100">
                                                    <CalendarIcon size={14} />
                                                    {item.present_days} Hari
                                                </span>
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-green-50 text-green-700 border border-green-100">
                                                    <Clock size={14} />
                                                    {item.total_hours} Jam
                                                </span>
                                            </td>
                                            <td className="p-3 text-center">
                                                <button 
                                                    onClick={() => toggleExpand(item.id)}
                                                    className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors inline-flex items-center gap-1 font-bold text-[10px]">
                                                    {expandedUser === item.id ? 'Tutup' : 'Lihat'} <ChevronDown size={14} className={`transform transition-transform ${expandedUser === item.id ? 'rotate-180' : ''}`} />
                                                </button>
                                            </td>
                                        </tr>
                                        {/* Expanded Details Row */}
                                        {expandedUser === item.user_id && (
                                            <tr>
                                                <td colSpan="5" className="p-0 bg-slate-50 border-b-2 border-slate-200">
                                                    <div className="p-6">
                                                        <h5 className="font-black text-slate-700 mb-4 flex items-center gap-2"><Clock size={16} /> Riwayat Absensi Bulanan (Hari per Hari)</h5>
                                                        {item.logs && item.logs.length > 0 ? (
                                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                                                {item.logs.map((log, idx) => (
                                                                    <div key={idx} className="bg-white border border-slate-200 p-3 rounded-xl flex flex-col shadow-sm">
                                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-50 pb-1">
                                                                            {new Date(log.date).toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long' })}
                                                                        </span>
                                                                        <div className="flex justify-between items-center mb-1">
                                                                            <span className="text-xs text-slate-500 font-medium">Masuk:</span>
                                                                            <span className="text-xs font-bold text-green-700">
                                                                                {log.checkIn ? new Date(log.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex justify-between items-center mb-2">
                                                                            <span className="text-xs text-slate-500 font-medium">Pulang:</span>
                                                                            <span className="text-xs font-bold text-amber-700">
                                                                                {log.checkOut ? new Date(log.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                                                                            </span>
                                                                        </div>
                                                                        <div className="mt-auto pt-2 border-t border-slate-50 flex justify-between items-center">
                                                                            <span className="text-[10px] font-bold text-slate-400">Total Waktu:</span>
                                                                            <span className="text-xs font-black text-slate-800">{log.hours} Jam</span>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <p className="text-sm text-slate-400 font-medium italic">Tidak ada riwayat presensi yang terekam.</p>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {!loading && filteredData.length > itemsPerPage && (
                    <div className="p-3 border-t border-slate-100 bg-white flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500">
                            Menampilkan {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredData.length)} dari {filteredData.length} Data
                        </span>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1.5 border border-slate-200 text-xs font-bold text-slate-600 rounded hover:bg-slate-50 disabled:opacity-50"
                            >
                                Prev
                            </button>
                            <span className="px-3 py-1.5 text-xs font-bold text-slate-800">
                                {currentPage} / {totalPages}
                            </span>
                            <button 
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1.5 border border-slate-200 text-xs font-bold text-slate-600 rounded hover:bg-slate-50 disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Timesheet;

