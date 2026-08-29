import React, { useState, useEffect, useRef } from 'react';
import { Search, Filter, Clock, Calendar as CalendarIcon, Download, ChevronDown, CheckCircle, RefreshCw, Briefcase, Activity, Target, Info, FileSpreadsheet, FileText, Printer, Percent, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import api from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const Timesheet = () => {
    const { user } = useAuth();
    const { addToast } = useToast();
    
    // Role check
    const roleName = (user?.role || '').toLowerCase();
    const deptName = (user?.department || user?.department_name || user?.departments?.name || '').toLowerCase();
    const isHSEAdmin = roleName === 'hse_admin' || deptName.includes('hse') || deptName.includes('k3') || deptName.includes('safety');

    const [timesheetData, setTimesheetData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDept, setSelectedDept] = useState('ALL');
    const [targetFilter, setTargetFilter] = useState('ALL'); // 'ALL' | 'MET' | 'UNDER'
    const [targetHours, setTargetHours] = useState(160); // Default to 160 Jam (20 hari x 8 jam)
    const [chartDisplayCount, setChartDisplayCount] = useState('10'); // '5' | '10' | 'ALL'
    const [showExportMenu, setShowExportMenu] = useState(false);
    const exportDropdownRef = useRef(null);

    // Close export dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target)) {
                setShowExportMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
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
            const res = await api.get(`/hris/reports/attendance-monthly?month=${currentMonth}&year=${currentYear}`);
            const rawList = res.data?.report || res.data?.data || [];
            const mappedData = rawList.map(item => {
                const presentDays = item.hadir ?? item.present_days ?? 0;
                const totalHours = item.total_hours ?? (presentDays * 8);
                const lateHours = item.late_hours ?? (item.late_minutes ? (item.late_minutes / 60).toFixed(1) : 0);
                const effectiveWorkDays = 20; // 20 working days standard per month
                const attendanceRate = Math.min(100, ((presentDays / effectiveWorkDays) * 100)).toFixed(1);

                return {
                    ...item,
                    name: item.full_name || item.name || 'Karyawan',
                    division: item.division || item.department || 'General',
                    present_days: presentDays,
                    total_hours: parseFloat(totalHours),
                    late_hours: parseFloat(lateHours),
                    attendance_rate: parseFloat(attendanceRate),
                    logs: item.logs || []
                };
            });
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

    // Aggregates & Formulas
    const totalCumulativeHours = timesheetData.reduce((acc, curr) => acc + parseFloat(curr.total_hours || 0), 0);
    const totalPresentDays = timesheetData.reduce((acc, curr) => acc + (curr.present_days || 0), 0);
    const averageHours = totalPresentDays > 0 ? (totalCumulativeHours / totalPresentDays).toFixed(1) : '0.0';
    const effectiveDays = 20;
    const overallAttendanceRate = timesheetData.length > 0
        ? ((totalPresentDays / (timesheetData.length * effectiveDays)) * 100).toFixed(1)
        : '0.0';
    const totalLateHours = timesheetData.reduce((acc, curr) => acc + parseFloat(curr.late_hours || 0), 0).toFixed(1);

    // Chart Data Slicing
    const chartData = (() => {
        if (chartDisplayCount === '5') return filteredData.slice(0, 5);
        if (chartDisplayCount === '10') return filteredData.slice(0, 10);
        return filteredData;
    })();

    // Official Print with Kop Surat
    const handlePrint = () => {
        setShowExportMenu(false);
        const win = window.open('', '', 'height=750,width=950');
        if (!win) {
            addToast('Tolong izinkan pop-up browser untuk mencetak laporan.', 'warning');
            return;
        }

        win.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Laporan Rekapitulasi Jam Kerja (Timesheet) - PT DEA GLOBAL NIAGA</title>
                <style>
                    @page { size: landscape; margin: 12mm; }
                    body { font-family: 'Arial', 'Helvetica', sans-serif; padding: 15px; color: #111; line-height: 1.3; }
                    .kop-surat { display: flex; align-items: center; border-bottom: 3px double #000; padding-bottom: 12px; margin-bottom: 18px; }
                    .kop-logo { width: 75px; height: 75px; object-fit: contain; margin-right: 18px; }
                    .kop-text h1 { margin: 0; font-size: 17pt; font-weight: 900; letter-spacing: 0.5px; color: #800000; text-transform: uppercase; }
                    .kop-text h2 { margin: 2px 0 0; font-size: 9.5pt; font-weight: bold; color: #222; }
                    .kop-text p { margin: 2px 0 0; font-size: 8.5pt; color: #444; }
                    .report-header { text-align: center; margin-bottom: 15px; }
                    .report-header h3 { margin: 0; font-size: 13pt; font-weight: 900; text-decoration: underline; text-transform: uppercase; }
                    .report-header p { margin: 4px 0 0; font-size: 9pt; color: #333; }
                    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 8.5pt; }
                    th, td { border: 1px solid #444; padding: 6px 8px; text-align: left; }
                    th { background-color: #f4f4f4; font-weight: bold; text-align: center; font-size: 8.5pt; }
                    .text-center { text-align: center; }
                    .text-right { text-align: right; }
                    .badge { font-weight: bold; padding: 2px 6px; border-radius: 4px; font-size: 7.5pt; }
                    .met { color: #065f46; background-color: #d1fae5; }
                    .under { color: #991b1b; background-color: #fee2e2; }
                    .formula-note { font-size: 7.5pt; color: #666; margin-top: 10px; font-style: italic; }
                    .footer-sign { margin-top: 35px; display: flex; justify-content: space-between; page-break-inside: avoid; }
                    .sign-box { text-align: center; width: 220px; font-size: 9pt; }
                    .sign-space { height: 55px; }
                </style>
            </head>
            <body>
                <div class="kop-surat">
                    <img src="/dea.png" class="kop-logo" alt="Logo PT DEA" onerror="this.style.display='none'"/>
                    <div class="kop-text">
                        <h1>PT DEA GLOBAL NIAGA</h1>
                        <h2>General Contractor, Supplier, Heavy Equipment Rental & Mining Services</h2>
                        <p>Jl. Pelajau Indah No. 34 RT. 06 Batulicin, Tanah Bumbu, Kalimantan Selatan | Telp: (0518) 71234</p>
                    </div>
                </div>
                <div class="report-header">
                    <h3>REKAPITULASI TIMESHEET & TINGKAT KEHADIRAN KARYAWAN</h3>
                    <p>Periode: <b>${months[currentMonth - 1]} ${currentYear}</b> | Standar Efektif: <b>${targetHours} Jam / 20 Hari Kerja</b></p>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th width="30">NO</th>
                            <th>NAMA LENGKAP</th>
                            <th>NIP / ID</th>
                            <th>DIVISI & JABATAN</th>
                            <th>HADIR (HARI)</th>
                            <th>TOTAL JAM KERJA</th>
                            <th>TINGKAT KEHADIRAN</th>
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
                                <td class="text-center">${d.present_days || 0} Hari</td>
                                <td class="text-right"><b>${d.total_hours || 0} Jam</b></td>
                                <td class="text-center"><b>${d.attendance_rate || 0}%</b></td>
                                <td class="text-center"><span class="badge ${isMet ? 'met' : 'under'}">${isMet ? 'TERPENUHI' : 'BELUM TERPENUHI'}</span></td>
                            </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
                <p class="formula-note">* Rumus Tingkat Kehadiran (%) = (Hari Hadir / 20 Hari Kerja Efektif) × 100%</p>
                <div class="footer-sign">
                    <div class="sign-box">
                        <p>Dibuat Oleh,</p>
                        <div class="sign-space"></div>
                        <p><b>Admin HRGA Operasional</b></p>
                    </div>
                    <div class="sign-box">
                        <p>Mengetahui,</p>
                        <div class="sign-space"></div>
                        <p><b>Direktur Operasional Site</b></p>
                    </div>
                </div>
                <script>
                    window.onload = function() {
                        window.print();
                        setTimeout(function() { window.close(); }, 500);
                    }
                </script>
            </body>
            </html>
        `);
        win.document.close();
    };

    // 1. Export CSV
    const handleExportCSV = () => {
        setShowExportMenu(false);
        if (!timesheetData || timesheetData.length === 0) {
            addToast('Belum ada data jam kerja untuk diekspor.', 'warning');
            return;
        }
        const headers = ["Nama Karyawan", "NIP", "Departemen", "Jabatan", "Total Kehadiran (Hari)", "Total Jam Kerja (Jam)", "Tingkat Kehadiran (%)", "Status Target"];
        const rows = timesheetData.map(item => [
            `"${item.name || item.full_name || ''}"`,
            `"${item.nip || item.nomor_pegawai || ''}"`,
            `"${item.division || ''}"`,
            `"${item.jabatan || 'Staff'}"`,
            item.present_days || 0,
            item.total_hours || 0,
            `${item.attendance_rate || 0}%`,
            item.total_hours >= targetHours ? "TERPENUHI" : "BELUM TERPENUHI"
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
        setShowExportMenu(false);
        if (!timesheetData || timesheetData.length === 0) {
            addToast('Belum ada data jam kerja untuk diekspor.', 'warning');
            return;
        }
        let tableHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"/></head><body><table border="1"><thead><tr style="background-color:#f2f2f2;"><th>Nama Karyawan</th><th>NIP</th><th>Departemen</th><th>Jabatan</th><th>Total Kehadiran (Hari)</th><th>Total Jam Kerja (Jam)</th><th>Tingkat Kehadiran (%)</th><th>Status Target</th></tr></thead><tbody>`;
        timesheetData.forEach(item => {
            const isMet = item.total_hours >= targetHours ? "TERPENUHI" : "BELUM TERPENUHI";
            tableHtml += `<tr><td>${item.name || item.full_name}</td><td>${item.nip || item.nomor_pegawai || '-'}</td><td>${item.division}</td><td>${item.jabatan || 'Staff'}</td><td>${item.present_days || 0}</td><td>${item.total_hours || 0}</td><td>${item.attendance_rate || 0}%</td><td>${isMet}</td></tr>`;
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
        addToast('Laporan Timesheet Excel (.xls) berhasil diunduh.', 'success');
    };

    return (
        <div className="w-full flex flex-col gap-6 relative">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <Clock className="text-red-700" size={24} /> Jam Kerja Karyawan (Timesheet)
                    </h1>
                    <p className="text-xs text-slate-500 font-bold mt-0.5">
                        Rekapitulasi jam kerja reguler, tingkat kehadiran, dan ekspor dokumen resmi.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <select 
                        value={currentMonth}
                        onChange={(e) => setCurrentMonth(parseInt(e.target.value))}
                        className="px-3 py-2 bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-xl shadow-sm hover:bg-slate-50 focus:outline-none transition cursor-pointer">
                        {months.map((m, i) => (
                            <option key={i} value={i + 1}>{m}</option>
                        ))}
                    </select>
                    <select 
                        value={currentYear}
                        onChange={(e) => setCurrentYear(parseInt(e.target.value))}
                        className="px-3 py-2 bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-xl shadow-sm hover:bg-slate-50 focus:outline-none transition cursor-pointer">
                        {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>

                    {/* Unified Export & Print Dropdown */}
                    <div className="relative" ref={exportDropdownRef}>
                        <button
                            onClick={() => setShowExportMenu(prev => !prev)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
                        >
                            <Download size={14} /> Export & Cetak Rekap <ChevronDown size={14} className={`transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
                        </button>

                        {showExportMenu && (
                            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95">
                                <button
                                    onClick={handleExportCSV}
                                    className="w-full px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 flex items-center gap-2.5 transition text-left cursor-pointer"
                                >
                                    <FileText size={15} className="text-emerald-600" /> Unduh Dokumen CSV (.csv)
                                </button>
                                <button
                                    onClick={handleExportExcel}
                                    className="w-full px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-green-50 hover:text-green-800 flex items-center gap-2.5 transition text-left cursor-pointer"
                                >
                                    <FileSpreadsheet size={15} className="text-green-600" /> Unduh Dokumen Excel (.xls)
                                </button>
                                <div className="border-t border-slate-100 my-1"></div>
                                <button
                                    onClick={handlePrint}
                                    className="w-full px-4 py-2.5 text-xs font-bold text-slate-900 hover:bg-slate-50 flex items-center gap-2.5 transition text-left cursor-pointer"
                                >
                                    <Printer size={15} className="text-red-700" /> Cetak PDF (Kop Surat Resmi)
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* KPI Summary Cards with Formula Explanations */}
            <div className={`grid grid-cols-1 sm:grid-cols-2 ${isHSEAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-5'} gap-3 mb-1`}>
                {/* 1. Rata-rata Jam Kerja */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-blue-300 transition">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"><Clock size={20} /></div>
                        <span className="text-[9px] font-black bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full">REALISASI</span>
                    </div>
                    <div>
                        <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 mb-0.5">
                            <h4>Rata-rata Jam Kerja</h4>
                            <span title="Rumus: Total Kumulatif Jam / Total Hari Hadir" className="cursor-help text-slate-400 hover:text-slate-600">
                                <Info size={12} />
                            </span>
                        </div>
                        <div className="flex items-end gap-1.5">
                            <span className="text-2xl font-black text-slate-800 leading-none">{averageHours}</span>
                            <span className="text-xs font-bold text-slate-400 mb-0.5">Jam/Hari</span>
                        </div>
                        <p className="text-[9px] text-slate-400 font-bold mt-1">Σ(Jam Kerja) ÷ Σ(Hari Masuk)</p>
                    </div>
                </div>

                {/* 2. Target Jam Bulanan */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-green-300 transition">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-1.5 bg-green-50 text-green-600 rounded-lg"><Target size={20} /></div>
                        <span className="text-[9px] font-black bg-green-50 text-green-700 border border-green-100 px-2 py-0.5 rounded-full">STANDAR</span>
                    </div>
                    <div>
                        <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 mb-0.5">
                            <h4>Target Jam Bulanan</h4>
                            <span title="Standar Jam Kerja Efektif: 20 Hari Kerja x 8 Jam/Hari = 160 Jam" className="cursor-help text-slate-400 hover:text-slate-600">
                                <Info size={12} />
                            </span>
                        </div>
                        <div className="flex items-end gap-1.5">
                            <span className="text-2xl font-black text-slate-800 leading-none">{targetHours}</span>
                            <span className="text-xs font-bold text-slate-400 mb-0.5">Jam</span>
                        </div>
                        <p className="text-[9px] text-slate-400 font-bold mt-1">20 Hari Kerja × 8 Jam</p>
                    </div>
                </div>

                {/* 3. Tingkat Kehadiran (%) */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-purple-300 transition">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg"><Percent size={20} /></div>
                        <span className="text-[9px] font-black bg-purple-50 text-purple-700 border border-purple-100 px-2 py-0.5 rounded-full">EFISIENSI</span>
                    </div>
                    <div>
                        <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 mb-0.5">
                            <h4>Tingkat Kehadiran</h4>
                            <span title="Rumus: (Total Hari Hadir / (Total Karyawan x 20 Hari Efektif)) x 100%" className="cursor-help text-slate-400 hover:text-slate-600">
                                <Info size={12} />
                            </span>
                        </div>
                        <div className="flex items-end gap-1.5">
                            <span className="text-2xl font-black text-slate-800 leading-none">{overallAttendanceRate}%</span>
                        </div>
                        <p className="text-[9px] text-slate-400 font-bold mt-1">(Hadir ÷ Hari Efektif) × 100%</p>
                    </div>
                </div>

                {/* 4. Kumulatif Jam Kerja */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-amber-300 transition">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg"><Activity size={20} /></div>
                        <span className="text-[9px] font-black bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded-full">TOTAL</span>
                    </div>
                    <div>
                        <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 mb-0.5">
                            <h4>Kumulatif Jam</h4>
                            <span title="Akumulasi seluruh jam kerja real karyawan pada bulan berjalan" className="cursor-help text-slate-400 hover:text-slate-600">
                                <Info size={12} />
                            </span>
                        </div>
                        <div className="flex items-end gap-1.5">
                            <span className="text-2xl font-black text-slate-800 leading-none">{totalCumulativeHours.toFixed(0)}</span>
                            <span className="text-xs font-bold text-slate-400 mb-0.5">Jam</span>
                        </div>
                        <p className="text-[9px] text-slate-400 font-bold mt-1">Σ Total Jam Seluruh Karyawan</p>
                    </div>
                </div>

                {/* 5. Total Jam Terlambat (HIDDEN for HSE Admin, Active for HRGA) */}
                {!isHSEAdmin && (
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-rose-300 transition">
                        <div className="flex justify-between items-start mb-2">
                            <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg"><AlertCircle size={20} /></div>
                            <span className="text-[9px] font-black bg-rose-50 text-rose-700 border border-rose-100 px-2 py-0.5 rounded-full">DEVIASI</span>
                        </div>
                        <div>
                            <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 mb-0.5">
                                <h4>Total Jam Terlambat</h4>
                                <span title="Akumulasi waktu keterlambatan check-in dihitung terhadap batas toleransi" className="cursor-help text-slate-400 hover:text-slate-600">
                                    <Info size={12} />
                                </span>
                            </div>
                            <div className="flex items-end gap-1.5">
                                <span className="text-2xl font-black text-rose-700 leading-none">{totalLateHours}</span>
                                <span className="text-xs font-bold text-slate-400 mb-0.5">Jam</span>
                            </div>
                            <p className="text-[9px] text-rose-500 font-bold mt-1">Akumulasi Keterlambatan Check-In</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Chart: Explicit Hours Breakdown with Configurable Display Rules */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-100">
                    <div>
                        <h3 className="text-xs font-black text-slate-800">Grafik Distribusi Jam Kerja (Per Karyawan)</h3>
                        <p className="text-[10px] text-slate-500 font-medium">Perbandingan akumulasi jam kerja terhadap target bulanan ({targetHours} Jam)</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-500">Tampilkan:</span>
                        <select
                            value={chartDisplayCount}
                            onChange={(e) => setChartDisplayCount(e.target.value)}
                            className="text-xs font-bold bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-2.5 py-1 outline-none cursor-pointer"
                        >
                            <option value="5">Top 5 Karyawan</option>
                            <option value="10">Top 10 Karyawan</option>
                            <option value="ALL">Semua ({filteredData.length} Karyawan)</option>
                        </select>
                    </div>
                </div>

                <div className="h-36 w-full">
                    {chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 15 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b', fontWeight: 'bold' }} interval={0} angle={-10} textAnchor="end" />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b' }} />
                                <Tooltip 
                                    cursor={{ fill: '#f8fafc' }} 
                                    formatter={(val) => [`${val} Jam Kerja`, 'Total Jam']}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '11px', fontWeight: 'bold' }} 
                                />
                                <Bar dataKey="total_hours" name="Total Jam" radius={[4, 4, 0, 0]} barSize={22}>
                                    {chartData.map((entry, idx) => (
                                        <Cell key={`cell-${idx}`} fill={entry.total_hours >= targetHours ? '#059669' : '#0f172a'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-sm">Belum ada data grafik</div>
                    )}
                </div>
                {/* Explanatory Caption below Bar Chart */}
                <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-medium">
                    <span>💡 <strong>Keterangan Visualisasi:</strong> Bar hijau menandakan karyawan yang telah memenuhi target bulanan (≥ {targetHours} Jam), bar gelap menandakan akumulasi jam kerja berjalan.</span>
                    <span className="font-bold text-slate-700">Target Acuan: {targetHours} Jam / Bulan</span>
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
                                className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
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
                                <th className="p-4 font-black text-center">Tingkat Kehadiran</th>
                                <th className="p-4 font-black text-center">Total Jam Kerja</th>
                                <th className="p-4 font-black text-center">Status Target</th>
                                <th className="p-4 font-black text-center">Detail Riwayat</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="p-8 text-center text-slate-400 font-bold">Menghitung akumulasi jam kerja...</td>
                                </tr>
                            ) : filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="p-12 text-center">
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
                                currentData.map((item) => {
                                    const isMet = item.total_hours >= targetHours;
                                    return (
                                        <React.Fragment key={item.id}>
                                            <tr className="hover:bg-slate-50 transition-colors">
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden shrink-0 border border-slate-200">
                                                            <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(item.name || item.full_name)}&background=random`} alt={item.name} />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-sm font-bold text-gray-900">{item.name || item.full_name}</h4>
                                                            <span className="text-[10px] text-slate-400 font-mono font-bold">{item.nip || item.nomor_pegawai || '-'}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-slate-800">{item.division || '-'}</span>
                                                        <span className="text-[11px] font-bold text-slate-500 capitalize">{item.jabatan || item.role || 'Staff'}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-blue-50 text-blue-700 border border-blue-100">
                                                        <CalendarIcon size={13} />
                                                        {item.present_days} Hari
                                                    </span>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <div className="inline-flex flex-col items-center">
                                                        <span className="text-xs font-black text-slate-800">
                                                            {item.attendance_rate || 0}%
                                                        </span>
                                                        <span className="text-[9px] text-slate-400 font-medium">({item.present_days}/20 hari)</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-slate-100 text-slate-800 border border-slate-200">
                                                        <Clock size={13} />
                                                        {item.total_hours} Jam
                                                    </span>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black border ${
                                                        isMet 
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                                            : 'bg-rose-50 text-rose-700 border-rose-200'
                                                    }`}>
                                                        <CheckCircle size={11} /> {isMet ? 'TERPENUHI' : 'BELUM TERPENUHI'}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-center">
                                                    <button 
                                                        onClick={() => toggleExpand(item.id)}
                                                        className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors inline-flex items-center gap-1 font-bold text-[10px] cursor-pointer">
                                                        {expandedUser === item.id ? 'Tutup' : 'Lihat'} <ChevronDown size={14} className={`transform transition-transform ${expandedUser === item.id ? 'rotate-180' : ''}`} />
                                                    </button>
                                                </td>
                                            </tr>
                                            {/* Expanded Details Row */}
                                            {expandedUser === item.id && (
                                                <tr>
                                                    <td colSpan="7" className="p-0 bg-slate-50 border-b-2 border-slate-200">
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
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Explanatory Calculation & Operational Notes */}
                <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col md:flex-row gap-4 items-start justify-between text-[11px] text-slate-600">
                    <div className="space-y-1.5 flex-1">
                        <h4 className="font-black text-slate-800 flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                            <AlertCircle size={14} className="text-red-600" />
                            Keterangan Penjelasan Rumus & Perhitungan Timesheet:
                        </h4>
                        <ul className="list-disc pl-4 space-y-1 text-slate-600 font-medium">
                            <li><strong>Target Jam Kerja Bulanan ({targetHours} Jam):</strong> Dihitung berdasarkan standar 20 hari kerja efektif per bulan × 8 jam kerja per hari.</li>
                            <li><strong>Tingkat Kehadiran (%):</strong> Dihitung dengan rumus <code>(Jumlah Hari Hadir / 20 Hari Kerja Efektif) × 100%</code>.</li>
                            <li><strong>Total Jam Kerja:</strong> Akumulasi selisih jam pulang (check-out) dan jam masuk (check-in) per hari dari rekaman presensi biometrik GPS valid.</li>
                            <li><strong>Status Target:</strong> <code>TERPENUHI</code> jika akumulasi jam kerja bulanan mencapai ≥ {targetHours} jam, dan <code>BELUM TERPENUHI</code> jika berada di bawah target.</li>
                        </ul>
                    </div>
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
                                className="px-3 py-1.5 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                            >
                                Prev
                            </button>
                            <span className="px-3 py-1.5 text-xs font-bold text-slate-800">
                                {currentPage} / {totalPages}
                            </span>
                            <button 
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1.5 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
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

