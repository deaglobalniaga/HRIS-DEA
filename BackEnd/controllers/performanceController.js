const User = require('../models/User');
const KPIAppraisal = require('../models/KPIAppraisal');
const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');

exports.get_performance = async (req, res) => {
    try {
        const data = await KPIAppraisal.find()
            .populate('user', 'full_name nama role department profile_photo_url')
            .sort({ year: -1, month: -1 });

        // Map department to division for frontend backward compatibility
        const mappedData = data.map(doc => {
            const obj = doc.toObject();
            if (obj.user) {
                obj.users = {
                    full_name: obj.user.nama || obj.user.full_name,
                    role: obj.user.role,
                    division: obj.user.department?.name || 'Unassigned',
                    profile_photo_url: obj.user.profile_photo_url
                };
            }
            return obj;
        });

        res.json(mappedData);
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
        
        const data = await KPIAppraisal.create({
            user: user_id,
            evaluator: req.userId,
            month,
            year,
            rating: calculatedRating,
            metrics,
            evaluation_date: evaluation_date || new Date(),
            notes
        });

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
        
        const data = await KPIAppraisal.findByIdAndUpdate(id, {
            user: user_id,
            evaluator: req.userId,
            month,
            year,
            rating: calculatedRating,
            metrics,
            evaluation_date: evaluation_date || new Date(),
            notes
        }, { new: true });

        res.json({ message: 'Performance review updated', data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.delete_performance_id = async (req, res) => {
    try {
        const { id } = req.params;
        await KPIAppraisal.findByIdAndDelete(id);
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

        const data = await User.findByIdAndUpdate(id, updateData, { new: true });
        res.json({ message: 'Roster updated successfully', data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.get_roster_stats = async (req, res) => {
    try {
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

        // 1. Get Users
        const users = await User.find().populate('department');

        // 2. Get this month's attendance (Check In only to count days)
        const attendance = await Attendance.find({
            tanggal: { $gte: firstDayOfMonth, $lte: lastDayOfMonth },
            check_in: { $ne: null }
        });

        const attCount = {};
        attendance.forEach(a => {
            const dateStr = new Date(a.tanggal).toISOString().split('T')[0];
            const uId = a.user.toString();
            if (!attCount[uId]) attCount[uId] = new Set();
            attCount[uId].add(dateStr);
        });

        // 3. Get sick/permissions
        const permissions = await LeaveRequest.find({
            start_date: { $gte: firstDayOfMonth, $lte: lastDayOfMonth },
            status: 'Approved'
        });
            
        const sickCount = {};
        const izinCount = {};
        permissions.forEach(p => {
            const uId = p.user.toString();
            const type = (p.leave_type || '').toLowerCase();
            if (type.includes('sakit') || type.includes('sick')) {
                sickCount[uId] = (sickCount[uId] || 0) + 1;
            } else if (type.includes('izin') || type.includes('permission')) {
                izinCount[uId] = (izinCount[uId] || 0) + 1;
            }
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
                user_id: u._id,
                name: u.nama || u.full_name,
                role: u.role,
                division: u.department?.name || 'Unassigned',
                photo: u.profile_photo_url,
                month_present: attCount[u._id.toString()] ? attCount[u._id.toString()].size : 0,
                month_sick: sickCount[u._id.toString()] || 0,
                month_leave: izinCount[u._id.toString()] || 0,
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
