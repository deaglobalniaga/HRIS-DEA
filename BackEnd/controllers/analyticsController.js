const supabase = require('../config/supabase');

// GET /api/hris/analytics/trend?months=6
exports.get_trend = async (req, res) => {
    try {
        const { months = 6 } = req.query;
        const monthCount = parseInt(months) || 6;
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
        const monthlyData = {};

        for (let i = monthCount - 1; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const mKey = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
            monthlyData[mKey] = {
                name: mKey,
                hadir: 0,
                terlambat: 0,
                izin: 0,
                sakit: 0,
                alpha: 0
            };
        }

        const dateLimit = new Date();
        dateLimit.setMonth(dateLimit.getMonth() - monthCount);
        const limitStr = dateLimit.toISOString().split('T')[0];

        const { data: logs } = await supabase
            .from('attendance_logs')
            .select('date, status, check_in')
            .gte('date', limitStr);

        (logs || []).forEach(record => {
            if (!record.date) return;
            const dateObj = new Date(record.date);
            const monthKey = `${monthNames[dateObj.getMonth()]} ${dateObj.getFullYear()}`;

            if (monthlyData[monthKey]) {
                const status = (record.status || '').toLowerCase();
                if (status.includes('hadir') || record.check_in) {
                    monthlyData[monthKey].hadir += 1;
                }
                if (status.includes('late') || status.includes('terlambat')) {
                    monthlyData[monthKey].terlambat += 1;
                }
                if (status.includes('izin')) {
                    monthlyData[monthKey].izin += 1;
                }
                if (status.includes('sakit')) {
                    monthlyData[monthKey].sakit += 1;
                }
            }
        });

        res.json(Object.values(monthlyData));
    } catch (err) {
        console.error('Analytics Trend Error:', err);
        res.status(500).json({ error: err.message });
    }
};

// GET /api/hris/analytics/heatmap
exports.get_heatmap = async (req, res) => {
    try {
        const heatmapData = {};
        for (let i = 29; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dStr = d.toISOString().split('T')[0];
            heatmapData[dStr] = {
                date: dStr,
                count: 0,
                late: 0,
                absent: 0
            };
        }

        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - 30);
        const limitStr = dateLimit.toISOString().split('T')[0];

        const { data: logs } = await supabase
            .from('attendance_logs')
            .select('date, status, check_in')
            .gte('date', limitStr);

        (logs || []).forEach(record => {
            if (record.date && heatmapData[record.date]) {
                const status = (record.status || '').toLowerCase();
                if (record.check_in || status.includes('hadir')) {
                    heatmapData[record.date].count += 1;
                }
                if (status.includes('late') || status.includes('terlambat')) {
                    heatmapData[record.date].late += 1;
                }
            }
        });

        res.json(Object.values(heatmapData));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/hris/analytics/division-stats
exports.get_division_stats = async (req, res) => {
    try {
        const { data: departments } = await supabase.from('departments').select('name');
        const { data: employees } = await supabase.from('employees').select('id, department_id, departments(name)');
        const { data: logs } = await supabase.from('attendance_logs').select('employee_id, status, check_in');

        const deptNames = (departments && departments.length > 0)
            ? departments.map(d => d.name)
            : ['Project', 'Maintenance', 'HRGA', 'HSE', 'IT'];

        const result = deptNames.map(dept => {
            const deptEmps = (employees || []).filter(e => e.departments?.name === dept);
            const total = deptEmps.length;
            let hadirCount = 0;
            let onTimeCount = 0;

            if (total > 0) {
                const empIds = new Set(deptEmps.map(e => e.id));
                (logs || []).forEach(l => {
                    if (empIds.has(l.employee_id)) {
                        if (l.check_in) hadirCount++;
                        if ((l.status || '').toLowerCase().includes('hadir') && !(l.status || '').toLowerCase().includes('terlambat')) {
                            onTimeCount++;
                        }
                    }
                });
            }

            const kehadiran = total > 0 ? Math.min(100, Math.round((hadirCount / total) * 100)) : 100;
            const kedisiplinan = hadirCount > 0 ? Math.min(100, Math.round((onTimeCount / hadirCount) * 100)) : 100;

            return {
                subject: dept,
                Kehadiran: kehadiran || 90,
                Kedisiplinan: kedisiplinan || 90,
                fullMark: 100
            };
        });

        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
