const supabase = require('../config/supabaseClient');

exports.get_trend = async (req, res) => {
    try {
        const adminRoles = ['admin', 'hr', 'pjo'];
        if (!adminRoles.includes((req.userRole || '').toLowerCase())) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const { months = 6 } = req.query;
        
        // Calculate the date X months ago
        const dateLimit = new Date();
        dateLimit.setMonth(dateLimit.getMonth() - parseInt(months));
        const dateLimitStr = dateLimit.toISOString(); // Use full timestamp string for comparison

        // Fetch attendance records from the last X months
        const { data: attendanceData, error: attendanceError } = await supabase
            .from('attendance')
            .select('timestamp, status, type')
            .eq('type', 'Check In')
            .gte('timestamp', dateLimitStr)
            .order('timestamp', { ascending: true });

        if (attendanceError) throw attendanceError;
        
        // Also we need permission data for Sick / Permission trends
        const { data: permissionData } = await supabase
            .from('permissions')
            .select('date, type')
            .in('status', ['Approved'])
            .gte('date', dateLimitStr.split('T')[0]);

        // Group by month
        const monthlyData = {};
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];

        // Initialize last X months
        for (let i = parseInt(months) - 1; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const mKey = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
            monthlyData[mKey] = { name: mKey, hadir: 0, terlambat: 0, izin: 0, sakit: 0, alpha: 0 };
        }

        (attendanceData || []).forEach(record => {
            if (!record.timestamp) return;
            const dateObj = new Date(record.timestamp);
            const monthKey = `${monthNames[dateObj.getMonth()]} ${dateObj.getFullYear()}`;

            if (!monthlyData[monthKey]) return; // Skip if older

            const status = (record.status || '').toLowerCase();
            monthlyData[monthKey].hadir += 1; // Since they checked in, they are hadir
            
            if (status.includes('late') || status.includes('terlambat')) {
                monthlyData[monthKey].terlambat += 1;
            }
        });
        
        (permissionData || []).forEach(record => {
            if (!record.date) return;
            const dateObj = new Date(record.date);
            const monthKey = `${monthNames[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
            
            if (!monthlyData[monthKey]) return;
            
            const type = (record.type || '').toLowerCase();
            if (type.includes('izin') || type.includes('permission')) {
                monthlyData[monthKey].izin += 1;
            } else if (type.includes('sakit') || type.includes('sick')) {
                monthlyData[monthKey].sakit += 1;
            }
        });

        const trendArray = Object.values(monthlyData);
        res.json(trendArray);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.get_heatmap = async (req, res) => {
    try {
        const adminRoles = ['admin', 'hr', 'pjo'];
        if (!adminRoles.includes((req.userRole || '').toLowerCase())) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Just fetch the last 30 days of attendance
        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - 30);
        const dateLimitStr = dateLimit.toISOString();

        const { data, error } = await supabase
            .from('attendance')
            .select('timestamp, status, type')
            .eq('type', 'Check In')
            .gte('timestamp', dateLimitStr);

        if (error) throw error;
        
        // Also get permissions for absences
        const { data: permissions } = await supabase
            .from('permissions')
            .select('date, type')
            .in('status', ['Approved'])
            .gte('date', dateLimitStr.split('T')[0]);

        // Count frequencies per date
        const heatmapData = {};
        
        // Initialize 30 days
        for(let i=30; i>=0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dStr = d.toISOString().split('T')[0];
            heatmapData[dStr] = { date: dStr, count: 0, late: 0, absent: 0 };
        }

        (data || []).forEach(record => {
            if (!record.timestamp) return;
            const dStr = record.timestamp.split('T')[0];
            if (!heatmapData[dStr]) {
                heatmapData[dStr] = { date: dStr, count: 0, late: 0, absent: 0 };
            }
            heatmapData[dStr].count += 1;
            
            const status = (record.status || '').toLowerCase();
            if (status.includes('late') || status.includes('terlambat')) {
                heatmapData[dStr].late += 1;
            }
        });
        
        (permissions || []).forEach(record => {
            if (!record.date) return;
            const dStr = record.date.split('T')[0];
            if (heatmapData[dStr]) {
                heatmapData[dStr].absent += 1;
            }
        });

        const result = Object.values(heatmapData).sort((a, b) => new Date(a.date) - new Date(b.date));
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.get_division_stats = async (req, res) => {
    try {
        const adminRoles = ['admin', 'hr', 'pjo'];
        if (!adminRoles.includes((req.userRole || '').toLowerCase())) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0,0,0,0);
        const startStr = startOfMonth.toISOString();

        const { data, error } = await supabase
            .from('attendance')
            .select('status, type, users!attendance_user_id_fkey(division)')
            .eq('type', 'Check In')
            .gte('timestamp', startStr);

        if (error) throw error;

        const divStats = {};
        (data || []).forEach(record => {
            const div = record.users?.division || 'Unassigned';
            if (!divStats[div]) {
                divStats[div] = { subject: div, A: 0, B: 0, fullMark: 100 };
            }
            
            divStats[div].A += 1; // Hadir
            const status = (record.status || '').toLowerCase();
            if (status.includes('late') || status.includes('terlambat')) {
                divStats[div].B += 1; // Penalty for being late
            }
        });

        // Normalize data for radar chart (max 100 scale)
        const result = Object.values(divStats).map(stat => {
            const total = stat.A + stat.B;
            if (total === 0) return stat;
            
            const attendanceScore = Math.min(100, Math.round((stat.A / (stat.A + (stat.B * 0.5))) * 100));
            const disciplineScore = Math.min(100, Math.round(100 - ((stat.B / stat.A) * 100)));
            
            return {
                subject: stat.subject,
                Kehadiran: attendanceScore || 100,
                Kedisiplinan: disciplineScore > 0 ? disciplineScore : 0,
                fullMark: 100
            };
        });

        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
