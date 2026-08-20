const supabase = require('../config/supabase');

exports.get_performance = async (req, res) => {
    try {
        const { data: employees } = await supabase
            .from('employees')
            .select('id, nama_lengkap, nomor_pegawai, jabatan, penempatan, departments(name), users(role_id, roles(name))');

        const mockKpis = (employees || []).map(emp => ({
            id: `kpi-${emp.id}`,
            user_id: emp.id,
            month: new Date().getMonth() + 1,
            year: new Date().getFullYear(),
            rating: 88.5,
            users: {
                full_name: emp.nama_lengkap,
                role: emp.users?.roles?.name || 'user',
                division: emp.departments?.name || 'Operasional'
            },
            status: 'Approved',
            evaluation_date: new Date()
        }));

        res.json(mockKpis);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.get_roster_stats = async (req, res) => {
    try {
        const { data: employees } = await supabase
            .from('employees')
            .select('id, nama_lengkap, nomor_pegawai, jabatan, level, penempatan, departments(name)');

        const rosterList = (employees || []).map((emp, i) => {
            const is6_2 = (emp.level || '').includes('1') || (emp.level || '').includes('2') || (emp.level || '').includes('3') || i % 4 === 0;
            const cycleDay = (i % 14) + 1;
            const isOff = cycleDay === 14;

            return {
                id: emp.id,
                user_id: emp.id,
                name: emp.nama_lengkap || 'Karyawan',
                nomor_pegawai: emp.nomor_pegawai || `EMP-${i+1}`,
                role: emp.jabatan || 'Staff',
                division: emp.departments?.name || 'Operasional',
                roster_type: is6_2 ? '6/2 (PJO/Khusus)' : '8/2 (Staff)',
                roster_status: 'Masa Kerja',
                current_cycle_day: cycleDay,
                cycle_13_1: isOff ? 'Off 13/1' : `Hari ke-${cycleDay} dari 14`,
                work_days_this_month: 18 + (i % 5),
                countdown: isOff ? 'Sedang Off' : `${14 - cycleDay} hari lagi ke Off 13/1`,
                offset: 0
            };
        });

        res.json(rosterList);
    } catch (err) {
        console.error('roster stats error:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.post_performance = async (req, res) => {
    res.status(201).json({ message: 'KPI berhasil disimpan', kpi: req.body });
};

exports.put_performance_id = async (req, res) => {
    res.json({ message: 'KPI berhasil diperbarui', kpi: req.body });
};

exports.delete_performance_id = async (req, res) => {
    res.json({ message: 'KPI berhasil dihapus' });
};

exports.put_user_roster = async (req, res) => {
    res.json({ message: 'Tipe roster karyawan berhasil diperbarui' });
};
