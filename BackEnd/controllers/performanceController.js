const supabase = require('../config/supabaseClient');
exports.get_performance = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('performance_reviews')
            .select('*, users!performance_reviews_user_id_fkey(full_name, role, division, profile_photo_url)')
            .order('year', { ascending: false })
            .order('month', { ascending: false });

        if (error && error.code !== '42P01') throw error;
        res.json(data || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.post_performance = async (req, res) => {
    try {
        const { user_id, month, year, metrics, evaluation_date, notes } = req.body;
        
        let calculatedRating = req.body.rating || 0;
        
        if (metrics && typeof metrics === 'object') {
            let totalWeightedScore = 0;
            let totalWeight = 0;
            for (const key in metrics) {
                const m = metrics[key];
                if (m.score && m.weight) {
                    totalWeightedScore += (m.score * m.weight);
                    totalWeight += m.weight;
                }
            }
            if (totalWeight > 0) {
                calculatedRating = parseFloat(((totalWeightedScore / totalWeight) * 25).toFixed(2));
            }
        }
        
        const { data, error } = await supabase
            .from('performance_reviews')
            .insert([{
                user_id,
                evaluator_id: req.userId,
                month,
                year,
                rating: calculatedRating,
                metrics,
                evaluation_date: evaluation_date || new Date().toISOString().split('T')[0],
                notes
            }]);

        if (error) throw error;
        res.status(201).json({ message: 'Performance review saved', data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.put_performance_id = async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id, month, year, metrics, evaluation_date, notes } = req.body;
        
        let calculatedRating = req.body.rating || 0;
        
        if (metrics && typeof metrics === 'object') {
            let totalWeightedScore = 0;
            let totalWeight = 0;
            for (const key in metrics) {
                const m = metrics[key];
                if (m.score && m.weight) {
                    totalWeightedScore += (m.score * m.weight);
                    totalWeight += m.weight;
                }
            }
            if (totalWeight > 0) {
                calculatedRating = parseFloat(((totalWeightedScore / totalWeight) * 25).toFixed(2));
            }
        }
        
        const { data, error } = await supabase
            .from('performance_reviews')
            .update({
                user_id,
                evaluator_id: req.userId,
                month,
                year,
                rating: calculatedRating,
                metrics,
                evaluation_date: evaluation_date || new Date().toISOString().split('T')[0],
                notes
            })
            .eq('id', id);

        if (error) throw error;
        res.json({ message: 'Performance review updated', data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.delete_performance_id = async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('performance_reviews')
            .delete()
            .eq('id', id);

        res.json({ message: 'Performance review deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.put_user_roster = async (req, res) => {
    try {
        const { id } = req.params;
        const { contract_type, initial_work_days } = req.body;
        
        let updateData = {};
        if (contract_type) {
            if (!['6/2', '8/2'].includes(contract_type)) return res.status(400).json({ error: 'Invalid roster type' });
            updateData.contract_type = contract_type;
        }
        if (initial_work_days !== undefined) {
            updateData.initial_work_days = parseInt(initial_work_days) || 0;
        }

        const { data, error } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', id);

        if (error) throw error;
        res.json({ message: 'Roster updated successfully', data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.get_roster_stats = async (req, res) => {
    try {
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
        const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59).toISOString();

        // 1. Get Users
        const { data: users, error: userError } = await supabase
            .from('users')
            .select('id, full_name, role, division, date_of_joining, profile_photo_url, contract_type, initial_work_days');
        if (userError) throw userError;

        // 2. Get this month's attendance (Check In only to count days)
        const { data: attendance } = await supabase
            .from('attendance')
            .select('user_id, timestamp')
            .eq('type', 'Check In')
            .gte('timestamp', firstDayOfMonth)
            .lte('timestamp', lastDayOfMonth);

        const attCount = {};
        (attendance || []).forEach(a => {
            const dateStr = new Date(a.timestamp).toISOString().split('T')[0];
            if (!attCount[a.user_id]) attCount[a.user_id] = new Set();
            attCount[a.user_id].add(dateStr);
        });

        // 3. Get sick/permissions
        const { data: permissions } = await supabase
            .from('permissions')
            .select('user_id, type')
            .gte('date', firstDayOfMonth.split('T')[0])
            .lte('date', lastDayOfMonth.split('T')[0]);
            
        const sickCount = {};
        const izinCount = {};
        (permissions || []).forEach(p => {
            if (p.type === 'Sick') sickCount[p.user_id] = (sickCount[p.user_id] || 0) + 1;
            if (p.type === 'Permission') izinCount[p.user_id] = (izinCount[p.user_id] || 0) + 1;
        });

        // 4. Calculate Roster Stats per user
        const stats = users.map(u => {
            const doj = u.date_of_joining ? new Date(u.date_of_joining) : new Date('2024-01-01');
            const diffTime = Math.abs(today - doj);
            const actualDiffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            // Apply manual offset from HR
            const diffDays = actualDiffDays + (u.initial_work_days || 0);
            
            // Roster Rules: Admin explicitly sets 6/2 or 8/2 in contract_type
            let isSixTwo = (u.contract_type === '6/2');
            let cycleDays = isSixTwo ? 56 : 70; // 6w+2w vs 8w+2w
            let workDays = isSixTwo ? 42 : 56;
            let offDays = 14;
            
            // Handle negative diffDays (if offset makes it negative)
            let cycleDay = ((diffDays % cycleDays) + cycleDays) % cycleDays;
            
            let rosterStatus = cycleDay >= workDays ? 'Cuti Roster' : 'Masa Kerja';
            let daysToNextPhase = cycleDay >= workDays ? (cycleDays - cycleDay) : (workDays - cycleDay);
            
            // Sub-rule: 13 days work, 1 day off
            let subCycle14 = cycleDay % 14;
            let compliance13_1 = (subCycle14 === 13) ? 'Jadwal Off 13/1' : `Kerja (Hari ${subCycle14 + 1}/13)`;
            if (rosterStatus === 'Cuti Roster') compliance13_1 = 'Sedang Cuti';

            return {
                user_id: u.id,
                name: u.full_name,
                role: u.role,
                division: u.division,
                photo: u.profile_photo_url,
                month_present: attCount[u.id] ? attCount[u.id].size : 0,
                month_sick: sickCount[u.id] || 0,
                month_leave: izinCount[u.id] || 0,
                roster_type: isSixTwo ? '6/2 (PJO/Khusus)' : '8/2 (Staff)',
                roster_status: rosterStatus,
                days_to_change: daysToNextPhase,
                cycle_13_1: compliance13_1,
                current_cycle_day: cycleDay,
                cycle_total_days: cycleDays,
                work_days_total: workDays,
                offset: u.initial_work_days || 0
            };
        });

        res.json(stats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
