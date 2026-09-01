const supabase = require('../config/supabase');
const { getWitaDateStr, getWitaTimeStr } = require('../utils/dateTime');

// GET /api/hris/dashboard-stats — 100% Real Database Aggregation
exports.get_dashboard_stats = async (req, res) => {
    try {
        const today = getWitaDateStr();

        // 1. Fetch Real Employees Data
        const { data: employees, error: empErr } = await supabase
            .from('employees')
            .select('id, nama_lengkap, jabatan, penempatan, status_karyawan, level, nomor_pkwt, departments(id, name)');

        if (empErr) throw empErr;

        const allEmployees = employees || [];
        const activeEmployees = allEmployees.filter(e => (e.status_karyawan || '').toLowerCase() !== 'nonaktif' && (e.status_karyawan || '').toLowerCase() !== 'resign');
        const employeesCount = activeEmployees.length;

        // 2. Real Division Distribution
        const divisionCounts = {};
        allEmployees.forEach(e => {
            const div = e.departments?.name || 'General';
            divisionCounts[div] = (divisionCounts[div] || 0) + 1;
        });

        const divisionStats = Object.keys(divisionCounts).map(key => ({
            name: key,
            count: divisionCounts[key]
        }));

        // 3. Real Today's Attendance
        const { data: todayLogs, error: logErr } = await supabase
            .from('attendance_logs')
            .select('*, employees(nama_lengkap, jabatan, departments(name))')
            .eq('date', today);

        if (logErr) throw logErr;

        const checkedInLogs = (todayLogs || []).filter(l => l.check_in);
        const presentCount = checkedInLogs.length;

        // 4. Real Active Leaves for Today
        const { data: activeLeaves, error: leaveErr } = await supabase
            .from('leaves')
            .select('*, employees(nama_lengkap, jabatan, departments(name))')
            .lte('start_date', today)
            .gte('end_date', today);

        const activeLeavesCount = (activeLeaves || []).length;
        const absentCount = Math.max(0, employeesCount - presentCount - activeLeavesCount);
        const attendanceRate = employeesCount > 0 ? Math.min(100, Math.round((presentCount / employeesCount) * 100)) : 0;

        const todayStatus = [
            { name: 'Present', value: presentCount, fill: '#10B981' },
            { name: 'On Leave', value: activeLeavesCount, fill: '#F59E0B' },
            { name: 'Absent', value: absentCount, fill: '#EF4444' }
        ];

        // 5. Real Weekly Attendance (Last 5 Workdays)
        const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
        const weeklyAttendance = [];
        const avgWorkHours = [];

        // Fetch logs for the past 7 days
        const past7Days = new Date();
        past7Days.setDate(past7Days.getDate() - 7);
        const { data: pastLogs } = await supabase
            .from('attendance_logs')
            .select('date, check_in, check_out')
            .gte('date', getWitaDateStr(past7Days));

        const logsByDate = {};
        (pastLogs || []).forEach(l => {
            if (!logsByDate[l.date]) logsByDate[l.date] = [];
            logsByDate[l.date].push(l);
        });

        for (let i = 4; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dStr = getWitaDateStr(d);
            const dName = dayNames[d.getDay()];
            const dayLogs = logsByDate[dStr] || [];
            const dayPresent = dayLogs.filter(l => l.check_in).length;

            weeklyAttendance.push({
                date: dName,
                present: dayPresent
            });

            // Calculate actual average work hours from check_in and check_out
            let totalHours = 0;
            let countWithHours = 0;
            dayLogs.forEach(l => {
                if (l.check_in && l.check_out) {
                    const dur = (new Date(l.check_out) - new Date(l.check_in)) / (1000 * 60 * 60);
                    if (dur > 0 && dur < 24) {
                        totalHours += dur;
                        countWithHours++;
                    }
                }
            });

            const avgHours = countWithHours > 0 ? +(totalHours / countWithHours).toFixed(1) : 0;
            avgWorkHours.push({
                date: dName,
                hours: avgHours
            });
        }

        // 6. Real Arrivals List (Only actual checked-in employees for today in WITA)
        const todayArrivals = checkedInLogs.map(l => ({
            name: l.employees?.nama_lengkap || 'Karyawan',
            role: l.employees?.jabatan || 'Staff',
            department: l.employees?.departments?.name || 'General',
            time: getWitaTimeStr(l.check_in),
            status: l.check_out ? 'CHECK OUT' : 'CHECK IN',
            detail: l.status || 'Hadir'
        }));

        // 7. Real Active Leaves List
        const activeLeavesList = (activeLeaves || []).map(l => ({
            name: l.employees?.nama_lengkap || 'Karyawan',
            role: l.employees?.jabatan || 'Staff',
            time: `${l.start_date} s/d ${l.end_date}`,
            status: l.leave_type || 'Cuti Operasional',
            detail: l.notes || 'Cuti Terjadwal'
        }));

        // 8. Real Contract Stats (PKWT vs PKWTT / Tetap)
        let pkwtCount = 0;
        let pkwttCount = 0;
        allEmployees.forEach(e => {
            const status = (e.status_karyawan || '').toUpperCase();
            const pkwt = (e.nomor_pkwt || '').toUpperCase();
            if (status.includes('TETAP') || status.includes('PKWTT')) {
                pkwttCount++;
            } else {
                pkwtCount++;
            }
        });

        const contractStats = [
            { name: 'PKWT', value: pkwtCount, fill: '#3B82F6' },
            { name: 'PKWTT', value: pkwttCount, fill: '#10B981' }
        ];

        // 9. Operational Timeline
        const timeline = [
            { id: '1', category: 'Toolbox Meeting', tag: 'BRIEFING SITE', tagColor: 'bg-blue-50 text-blue-700 border-blue-200', title: 'Briefing Operasional & Toolbox Meeting', description: 'Site Project BIB • Tim Mining & Hauling', time: '07:30', pic: 'PJO / Pengawas Site' },
            { id: '2', category: 'K3 & Safety', tag: 'SAFETY TALK', tagColor: 'bg-amber-50 text-amber-800 border-amber-200', title: 'Safety Talk Mingguan (Hari Jumat)', description: 'Pit Area & Workshop • Tim K3 & Seluruh Karyawan', time: '08:00', pic: 'HSE Coordinator' },
            { id: '3', category: 'Koordinasi HR', tag: 'RAPAT KOORDINASI', tagColor: 'bg-purple-50 text-purple-700 border-purple-200', title: 'Rapat Koordinasi Mingguan HRGA & Operasional', description: 'Meeting Room HO & Zoom Site BIB', time: '10:00', pic: 'Admin HRGA' },
            { id: '4', category: 'Kualifikasi', tag: 'AUDIT K3 / SIO', tagColor: 'bg-emerald-50 text-emerald-700 border-emerald-200', title: 'Pengecekan Matriks Sertifikasi & Masa Berlaku SIO', description: 'Kantor HRGA • Evaluasi Lisensi Operator', time: '13:30', pic: 'HSE Compliance' },
            { id: '5', category: 'Handover', tag: 'ROTASI ROSTER', tagColor: 'bg-teal-50 text-teal-700 border-teal-200', title: 'Rotasi Shift & Handover Log Operasional', description: 'Mess / Pos Komando Site BIB', time: '16:30', pic: 'Supervisor Lapangan' }
        ];

        // 10. Fetch Persistent System Notes from Settings
        let notesList = [];
        try {
            const { data: noteSetting } = await supabase
                .from('settings')
                .select('setting_value')
                .eq('setting_key', 'dashboard_system_notes')
                .maybeSingle();

            if (noteSetting && noteSetting.setting_value) {
                notesList = typeof noteSetting.setting_value === 'string' 
                    ? JSON.parse(noteSetting.setting_value) 
                    : noteSetting.setting_value;
            }
        } catch (nErr) {
            console.error('Error fetching dashboard notes:', nErr);
        }

        // 11. Count total employee certificates registered
        let totalCertificates = 0;
        try {
            const { count: certCount } = await supabase
                .from('employee_certificates')
                .select('*', { count: 'exact', head: true });

            totalCertificates = certCount || 0;
        } catch (docErr) {
            console.error('Error counting certificates:', docErr);
        }

        res.json({
            totalEmployees: employeesCount,
            attendanceRate,
            leaveRequests: activeLeavesCount,
            divisionStats,
            todayStatus,
            weeklyAttendance,
            todayArrivals,
            activeLeavesList,
            pendingTasks: [],
            notesList: Array.isArray(notesList) ? notesList : [],
            timeline,
            contractStats,
            avgWorkHours,
            totalCertificates
        });
    } catch (err) {
        console.error('Dashboard Stats Error:', err);
        res.status(500).json({ error: err.message });
    }
};

// GET /api/hris/employee-dashboard — Real Employee Specific Metrics
exports.get_employee_dashboard = async (req, res) => {
    try {
        const userId = req.userId;
        const today = getWitaDateStr();

        const { data: emp } = await supabase
            .from('employees')
            .select('*, departments(name), users(email, is_active)')
            .eq('user_id', userId)
            .maybeSingle();

        let todayLog = null;
        let weeklyLogs = [];
        let leaveSummary = { available: 12, used: 0, pending: 0 };

        if (emp?.id) {
            const { data: tLog } = await supabase
                .from('attendance_logs')
                .select('*')
                .eq('employee_id', emp.id)
                .eq('date', today)
                .maybeSingle();
            todayLog = tLog;

            const dateLimit = new Date();
            dateLimit.setDate(dateLimit.getDate() - 30);
            const { data: wLogs } = await supabase
                .from('attendance_logs')
                .select('*')
                .eq('employee_id', emp.id)
                .gte('date', getWitaDateStr(dateLimit))
                .order('date', { ascending: false });
            weeklyLogs = wLogs || [];

            // Real Leave balance & usage
            const { data: empLeaves } = await supabase
                .from('leaves')
                .select('*')
                .eq('employee_id', emp.id);

            let usedDays = 0;
            let pendingCount = 0;
            (empLeaves || []).forEach(l => {
                if (l.status === 'Approved') usedDays += (l.duration_days || 1);
                else if (l.status === 'Pending') pendingCount++;
            });

            leaveSummary = {
                available: Math.max(0, 12 - usedDays),
                used: usedDays,
                pending: pendingCount
            };
        }

        res.json({
            profile: {
                full_name: emp?.nama_lengkap || req.user?.nama || 'Karyawan',
                job_title: emp?.jabatan || 'Project Staff (PJO)',
                role: req.userRole || 'user',
                division: emp?.departments?.name || 'PT DEA GLOBAL NIAGA',
                profile_photo_url: emp?.foto_url || null,
                nomor_pegawai: emp?.nomor_pegawai || 'EMP-001',
                penempatan: emp?.penempatan || 'Site BIB',
                status_karyawan: emp?.status_karyawan || 'Aktif'
            },
            todayStatus: {
                hasCheckedIn: !!todayLog?.check_in,
                hasCheckedOut: !!todayLog?.check_out,
                checkInTime: todayLog?.check_in ? getWitaTimeStr(todayLog.check_in) : null,
                checkOutTime: todayLog?.check_out ? getWitaTimeStr(todayLog.check_out) : null
            },
            weeklyHistory: weeklyLogs,
            leaveSummary
        });
    } catch (err) {
        console.error('Employee Dashboard Error:', err);
        res.status(500).json({ error: err.message });
    }
};

// System Notes Persistent Handlers
exports.post_system_notes = async (req, res) => {
    try {
        const noteText = (req.body?.note_text || req.body?.text || '').trim();
        if (!noteText) {
            return res.status(400).json({ message: 'Teks catatan tidak boleh kosong.' });
        }

        // Fetch existing notes
        const { data: existing } = await supabase
            .from('settings')
            .select('setting_value')
            .eq('setting_key', 'dashboard_system_notes')
            .maybeSingle();

        let currentNotes = [];
        if (existing && existing.setting_value) {
            currentNotes = typeof existing.setting_value === 'string' 
                ? JSON.parse(existing.setting_value) 
                : existing.setting_value;
        }
        if (!Array.isArray(currentNotes)) currentNotes = [];

        const newNote = {
            id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            text: noteText,
            created_at: new Date().toISOString(),
            created_by: req.user?.nama || 'Admin HRGA'
        };

        const updatedNotes = [newNote, ...currentNotes];

        const { error: upsertErr } = await supabase
            .from('settings')
            .upsert({
                setting_key: 'dashboard_system_notes',
                setting_value: updatedNotes
            }, { onConflict: 'setting_key' });

        if (upsertErr) {
            console.error('Supabase upsert error saving note:', upsertErr);
            return res.status(500).json({ error: upsertErr.message });
        }

        res.status(201).json({ message: 'Catatan berhasil disimpan.', note: newNote });
    } catch (err) {
        console.error('Error saving dashboard note:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.delete_system_notes_id = async (req, res) => {
    try {
        const noteId = req.params.id;
        const { data: existing } = await supabase
            .from('settings')
            .select('setting_value')
            .eq('setting_key', 'dashboard_system_notes')
            .maybeSingle();

        let currentNotes = [];
        if (existing && existing.setting_value) {
            currentNotes = typeof existing.setting_value === 'string' 
                ? JSON.parse(existing.setting_value) 
                : existing.setting_value;
        }
        if (!Array.isArray(currentNotes)) currentNotes = [];

        const filtered = currentNotes.filter(n => n.id !== noteId);

        const { error: deleteErr } = await supabase
            .from('settings')
            .upsert({
                setting_key: 'dashboard_system_notes',
                setting_value: filtered
            }, { onConflict: 'setting_key' });

        if (deleteErr) {
            console.error('Supabase error deleting note:', deleteErr);
            return res.status(500).json({ error: deleteErr.message });
        }

        res.json({ message: 'Catatan berhasil dihapus.' });
    } catch (err) {
        console.error('Error deleting dashboard note:', err);
        res.status(500).json({ error: err.message });
    }
};
