const supabase = require('../config/supabaseClient');

exports.get_dashboard_stats = async (req, res) => {
    try {
        // 1. Basic Stats
        const { data: users, error: usersErr } = await supabase.from('users').select('*');
        if (usersErr) throw usersErr;
        const employeesCount = users ? users.length : 0;

        let leavesCount = 0;
        try {
            const { count } = await supabase.from('leaves').select('*', { count: 'exact', head: true }).eq('status', 'Pending');
            leavesCount = count || 0;
        } catch(e) {}

        // 2. Division Stats (Bar Chart)
        const divisionCounts = {};
        (users || []).forEach(u => {
            const div = u.division || 'Unassigned';
            divisionCounts[div] = (divisionCounts[div] || 0) + 1;
        });
        const divisionStats = Object.keys(divisionCounts).map(key => ({
            name: key,
            count: divisionCounts[key]
        }));

        // 3. Today's Status (Pie Chart)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const { data: attendance } = await supabase
            .from('attendance')
            .select('user_id, timestamp')
            .eq('type', 'Check In')
            .gte('timestamp', today.toISOString());
            
        const presentCount = attendance ? new Set(attendance.map(a => a.user_id)).size : 0;
        
        // Count active leaves today
        let activeLeavesCount = 0;
        try {
            const { data: activeLeaves } = await supabase
                .from('leaves')
                .select('user_id')
                .eq('status', 'Approved')
                .lte('leave_start', today.toISOString())
                .gte('leave_end', today.toISOString());
            activeLeavesCount = activeLeaves ? new Set(activeLeaves.map(l => l.user_id)).size : 0;
        } catch(e) {}

        const absentCount = employeesCount - presentCount - activeLeavesCount;
        
        const todayStatus = [
            { name: 'Present', value: presentCount, fill: '#10B981' }, // emerald-500
            { name: 'On Leave', value: activeLeavesCount, fill: '#F59E0B' }, // amber-500
            { name: 'Absent', value: absentCount > 0 ? absentCount : 0, fill: '#EF4444' } // red-500
        ];

        // 4. Weekly Attendance (Line Chart)
        const weeklyAttendance = [];
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        
        // We will mock the historical days for demonstration if DB is empty, but use real query
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

        const { data: weeklyData } = await supabase
            .from('attendance')
            .select('*')
            .eq('type', 'Check In')
            .gte('timestamp', sevenDaysAgo.toISOString());

        // Process data day by day
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            d.setHours(0, 0, 0, 0);
            
            const nextD = new Date(d);
            nextD.setDate(nextD.getDate() + 1);

            const dayName = days[d.getDay()];
            
            // Count unique users who checked in on this day
            const attOnDay = (weeklyData || []).filter(a => {
                const ts = new Date(a.timestamp);
                return ts >= d && ts < nextD;
            });
            const present = new Set(attOnDay.map(a => a.user_id)).size;
            
            weeklyAttendance.push({
                date: dayName,
                present: present
            });
        }

        // 5. Populate lists for Command Centre Dashboard
        // Maps users by id for quick lookup
        const userMap = {};
        (users || []).forEach(u => { userMap[u.id] = u; });

        // Today Arrivals
        const todayArrivals = (weeklyData || [])
            .filter(a => new Date(a.timestamp) >= today)
            .map(a => {
                const u = userMap[a.user_id] || {};
                const timeStr = new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                return {
                    name: u.full_name || 'Unknown User',
                    role: u.role || 'user',
                    division: u.division || 'Unassigned',
                    time: `${timeStr} · ${u.division || ''}`,
                    status: a.type === 'Check In' ? 'CHECK IN' : 'CHECK OUT',
                    detail: a.notes || (a.type === 'Check In' ? 'Masuk' : 'Pulang')
                };
            });

        // Active Leaves (Approved or Pending)
        const { data: allLeaves } = await supabase.from('leaves').select('*').gte('leave_end', today.toISOString());
        const activeLeavesList = (allLeaves || []).map(l => {
            const u = userMap[l.user_id] || {};
            const startDate = new Date(l.leave_start).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
            const endDate = new Date(l.leave_end).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
            return {
                name: u.full_name || 'Unknown User',
                role: u.role || 'user',
                time: `${startDate} - ${endDate}`,
                status: l.status, // Approved, Pending, Rejected
                detail: l.type || 'Cuti'
            };
        });

        // Pending Tasks (Leaves waiting for approval)
        const pendingTasks = (allLeaves || []).filter(l => l.status === 'Pending').map(l => {
            const u = userMap[l.user_id] || {};
            return {
                task: `Review cuti: ${u.full_name || 'Unknown'}`,
                prio: 'High',
                color: 'text-red-600 bg-red-50'
            };
        });

        // System Notes
        const { data: systemNotes } = await supabase.from('system_notes').select('*').order('created_at', { ascending: false }).limit(5);
        const notesList = (systemNotes || []).map(n => ({ id: n.id, text: n.note_text }));

        // Timeline (Upcoming Events, Leaves, Permissions)
        const timeline = [];
        const todayStr = new Date().toISOString().split('T')[0];
        // Company Events upcoming
        const { data: events } = await supabase.from('events').select('*').gte('event_date', todayStr).order('event_date').limit(3);
        if (events) {
            events.forEach(e => timeline.push({ time: e.event_date.substring(5), text: e.title, color: 'bg-purple-500' }));
        }
        // Leaves overlapping today
        const { data: todayLeaves } = await supabase.from('leaves').select('*, users(full_name)').eq('status', 'Approved').lte('leave_start', todayStr).gte('leave_end', todayStr);
        if (todayLeaves) {
            todayLeaves.forEach(l => timeline.push({ time: 'CUTI', text: `${l.users?.full_name} (${l.type})`, color: 'bg-amber-500' }));
        }
        // Permissions for today
        const { data: todayPerms } = await supabase.from('permissions').select('*, users(full_name, role, division)').eq('status', 'Approved').eq('date', todayStr);
        if (todayPerms) {
            todayPerms.forEach(p => {
                timeline.push({ time: 'IZIN', text: `${p.users?.full_name} (${p.type})`, color: 'bg-orange-500' });
                
                // Add to todayArrivals
                const u = p.users || {};
                todayArrivals.push({
                    name: u.full_name || 'Unknown User',
                    role: u.role || 'user',
                    division: u.division || 'Unassigned',
                    time: `Seharian · ${u.division || ''}`,
                    status: p.type === 'Sakit' || p.type === 'Sick' ? 'SAKIT' : 'IZIN',
                    detail: p.reason || p.type
                });
            });
        }

        // 6. Contract Stats
        const contractCounts = { 'PKWT': 0, 'PKWTT': 0 };
        (users || []).forEach(u => {
            const ct = u.employment_status;
            if (ct === 'PKWT' || ct === 'PKWTT') {
                contractCounts[ct]++;
            } else if (ct) {
                contractCounts['Lainnya'] = (contractCounts['Lainnya'] || 0) + 1;
            } else {
                contractCounts['Belum Diatur'] = (contractCounts['Belum Diatur'] || 0) + 1;
            }
        });
        const contractStats = Object.keys(contractCounts).map(key => ({
            name: key,
            value: contractCounts[key],
            fill: key === 'PKWT' ? '#3B82F6' : key === 'PKWTT' ? '#10B981' : (key === 'Belum Diatur' ? '#E5E7EB' : '#9CA3AF')
        }));

        // 7. Average Work Hours
        const avgWorkHours = [];
        const { data: allAttendance } = await supabase
            .from('attendance')
            .select('user_id, timestamp, type')
            .gte('timestamp', sevenDaysAgo.toISOString());
            
        const daysLabel = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            d.setHours(0, 0, 0, 0);
            
            const nextD = new Date(d);
            nextD.setDate(nextD.getDate() + 1);

            const dayName = daysLabel[d.getDay()];
            
            // Filter attendance for this day
            const dayAtt = (allAttendance || []).filter(a => {
                const ts = new Date(a.timestamp);
                return ts >= d && ts < nextD;
            });
            
            // Group by user
            const userAtt = {};
            dayAtt.forEach(a => {
                if (!userAtt[a.user_id]) userAtt[a.user_id] = { in: null, out: null };
                if (a.type === 'Check In') {
                    if (!userAtt[a.user_id].in || new Date(a.timestamp) < new Date(userAtt[a.user_id].in)) {
                        userAtt[a.user_id].in = a.timestamp;
                    }
                }
                if (a.type === 'Check Out') {
                    if (!userAtt[a.user_id].out || new Date(a.timestamp) > new Date(userAtt[a.user_id].out)) {
                        userAtt[a.user_id].out = a.timestamp;
                    }
                }
            });
            
            let totalHours = 0;
            let validUsers = 0;
            Object.values(userAtt).forEach(times => {
                if (times.in && times.out) {
                    const diffMs = new Date(times.out) - new Date(times.in);
                    let hours = diffMs / (1000 * 60 * 60);
                    if (hours > 16) hours = 16; // Capped for sanity
                    totalHours += hours;
                    validUsers++;
                }
            });
            
            avgWorkHours.push({
                date: dayName,
                hours: validUsers > 0 ? parseFloat((totalHours / validUsers).toFixed(1)) : 0
            });
        }

        // Return aggregated data
        res.json({
            totalEmployees: employeesCount,
            attendanceRate: employeesCount > 0 ? Math.round((presentCount / employeesCount) * 100) : 0,
            leaveRequests: leavesCount,
            newApplicants: 0,
            divisionStats,
            todayStatus,
            weeklyAttendance,
            todayArrivals,
            activeLeavesList,
            pendingTasks,
            notesList,
            timeline,
            contractStats,
            avgWorkHours
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.post_system_notes = async (req, res) => {
    try {
        const role = (req.userRole || '').toLowerCase();
        if (!role.includes('admin') && !role.includes('hr')) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        
        const { note_text } = req.body;
        if (!note_text) return res.status(400).json({ error: 'Note text is required' });

        const { data, error } = await supabase
            .from('system_notes')
            .insert([{ note_text, type: 'manual', created_by: req.userId }])
            .select();

        if (error) throw error;
        res.status(201).json({ message: 'Note added successfully', data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.delete_system_notes_id = async (req, res) => {
    try {
        const role = (req.userRole || '').toLowerCase();
        if (!role.includes('admin') && !role.includes('hr')) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const { id } = req.params;
        const { error } = await supabase.from('system_notes').delete().eq('id', id);

        if (error) throw error;
        res.json({ message: 'Note deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ========================================
// EMPLOYEE PERSONAL DASHBOARD
// ========================================
exports.get_employee_dashboard = async (req, res) => {
    try {
        const userId = req.userId;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 1. Get user profile
        const { data: profile } = await supabase
            .from('users')
            .select('id, full_name, role, division, job_title, profile_photo_url, date_of_joining, initial_work_days')
            .eq('id', userId)
            .single();

        // 2. Today's attendance status
        const { data: todayAtt } = await supabase
            .from('attendance')
            .select('type, timestamp')
            .eq('user_id', userId)
            .gte('timestamp', today.toISOString())
            .order('timestamp', { ascending: true });

        let checkInTime = null;
        let checkOutTime = null;
        (todayAtt || []).forEach(a => {
            if (a.type === 'Check In' && !checkInTime) checkInTime = a.timestamp;
            if (a.type === 'Check Out') checkOutTime = a.timestamp;
        });

        const todayStatus = {
            hasCheckedIn: !!checkInTime,
            hasCheckedOut: !!checkOutTime,
            checkInTime,
            checkOutTime
        };

        // 3. Weekly attendance (last 7 days)
        const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

        const { data: weeklyAtt } = await supabase
            .from('attendance')
            .select('type, timestamp, photo_url')
            .eq('user_id', userId)
            .gte('timestamp', sevenDaysAgo.toISOString())
            .order('timestamp', { ascending: true });

        const weeklyHistory = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            d.setHours(0, 0, 0, 0);
            const nextD = new Date(d);
            nextD.setDate(nextD.getDate() + 1);

            const dayAtts = (weeklyAtt || []).filter(a => {
                const ts = new Date(a.timestamp);
                return ts >= d && ts < nextD;
            });

            const checkIn = dayAtts.find(a => a.type === 'Check In');
            const checkOut = dayAtts.find(a => a.type === 'Check Out');

            weeklyHistory.push({
                day: days[d.getDay()],
                date: d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
                status: checkIn ? 'Hadir' : (d < today ? 'Tidak Hadir' : '-'),
                checkIn: checkIn ? new Date(checkIn.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : null,
                checkOut: checkOut ? new Date(checkOut.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : null,
                checkInPhoto: checkIn?.photo_url || null,
                checkOutPhoto: checkOut?.photo_url || null,
            });
        }

        // 4. Leave & Permission summary (this year)
        const yearStart = new Date(today.getFullYear(), 0, 1).toISOString();

        let leavesTaken = 0;
        let pendingLeaves = 0;
        try {
            const { data: leaves } = await supabase
                .from('leaves')
                .select('status, leave_start, leave_end')
                .eq('user_id', userId)
                .gte('leave_start', yearStart);

            (leaves || []).forEach(l => {
                if (l.status === 'Approved') leavesTaken++;
                if (l.status === 'Pending') pendingLeaves++;
            });
        } catch(e) {}

        let permissionsTaken = 0;
        let pendingPermissions = 0;
        try {
            const { data: perms } = await supabase
                .from('permissions')
                .select('status')
                .eq('user_id', userId)
                .gte('date', yearStart.split('T')[0]);

            (perms || []).forEach(p => {
                if (p.status === 'Approved') permissionsTaken++;
                if (p.status === 'Pending') pendingPermissions++;
            });
        } catch(e) {}

        // 5. Monthly attendance count
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const { data: monthlyAtt } = await supabase
            .from('attendance')
            .select('user_id, timestamp')
            .eq('user_id', userId)
            .eq('type', 'Check In')
            .gte('timestamp', monthStart.toISOString());

        const uniqueDays = new Set((monthlyAtt || []).map(a => new Date(a.timestamp).toDateString()));
        const initialDays = (profile && profile.initial_work_days) ? profile.initial_work_days : 0;
        const monthlyPresent = uniqueDays.size + initialDays;

        res.json({
            profile: profile || {},
            todayStatus,
            weeklyHistory,
            leaveSummary: {
                taken: leavesTaken,
                pending: pendingLeaves,
                permissionsTaken,
                pendingPermissions
            },
            monthlyPresent,
            totalWorkDaysThisMonth: today.getDate() + initialDays // approximate
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

