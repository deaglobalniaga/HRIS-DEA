const supabase = require('../config/supabaseClient');

// Haversine formula to calculate distance in meters
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // metres
    const rad = Math.PI / 180;
    const dLat = (lat2 - lat1) * rad;
    const dLon = (lon2 - lon1) * rad;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // in metres
}

exports.get_attendance_today = async (req, res) => {
    try {
        // Use local timezone's start of day
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        // 1. Get all active users
        let userQuery = supabase.from('users').select('id, full_name, role, division, profile_photo_url');
        
        // If not admin/hr/pjo, only fetch their own user profile to restrict view
        const adminRoles = ['admin', 'hr'];
        if (!adminRoles.includes((req.userRole || '').toLowerCase())) {
            userQuery = userQuery.eq('id', req.userId);
        }

        const { data: users, error: userError } = await userQuery;
        if (userError) throw userError;

        // 2. Get attendance records for today (Both Check In and Check Out)
        const { data: attendance, error: attError } = await supabase
            .from('attendance')
            .select('user_id, timestamp, type')
            .gte('timestamp', startOfDay.toISOString());
            
        if (attError && attError.code !== '42P01') throw attError;

        // Group attendance by user
        const presentLogs = {};
        (attendance || []).forEach(log => {
            if (!presentLogs[log.user_id]) presentLogs[log.user_id] = {};
            // If it's a Check In and we don't have one yet, or it's earlier, save it
            if (log.type === 'Check In') {
                if (!presentLogs[log.user_id].checkIn || new Date(log.timestamp) < new Date(presentLogs[log.user_id].checkIn)) {
                    presentLogs[log.user_id].checkIn = log.timestamp;
                }
            } 
            // If it's a Check Out, get the latest one
            else if (log.type === 'Check Out') {
                if (!presentLogs[log.user_id].checkOut || new Date(log.timestamp) > new Date(presentLogs[log.user_id].checkOut)) {
                    presentLogs[log.user_id].checkOut = log.timestamp;
                }
            }
        });

        const presentIds = Object.keys(presentLogs);
        
        const missingIds = users.filter(u => !presentIds.includes(u.id)).map(u => u.id);

        // 3. Check for Sick/Permission/Cuti in permissions
        const { data: permissions } = await supabase.from('permissions').select('user_id, type, date').in('status', ['Approved', 'Pending']);
        
        const sakitIds = [];
        const izinIds = [];
        const cutiIds = [];

        (permissions || []).forEach(p => {
            const startDate = new Date(p.date);
            if (p.type === 'Sakit' || p.type === 'Sick') {
                if (startDate.toISOString().split('T')[0] === startOfDay.toISOString().split('T')[0]) sakitIds.push(p.user_id);
            } else if (p.type === 'Izin' || p.type === 'Permission') {
                if (startDate.toISOString().split('T')[0] === startOfDay.toISOString().split('T')[0]) izinIds.push(p.user_id);
            } else if (p.type === 'Cuti') {
                const endDate = new Date(startDate);
                endDate.setDate(endDate.getDate() + 14);
                if (now >= startDate && now <= endDate) cutiIds.push(p.user_id);
            }
        });

        // 5. Check for "Off" (8 weeks work, 2 weeks off logic)
        const offIds = [];
        users.forEach(u => {
            if (u.date_of_joining && missingIds.includes(u.id) && !sakitIds.includes(u.id) && !izinIds.includes(u.id) && !cutiIds.includes(u.id)) {
                const doj = new Date(u.date_of_joining);
                const diffTime = Math.abs(now - doj);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                const cycleDay = diffDays % 70; // 10 weeks cycle (70 days)
                if (cycleDay >= 56) { // Last 14 days of cycle is OFF
                    offIds.push(u.id);
                }
            }
        });

        // Filter the missing users into their respective categories
        const present = users.filter(u => presentIds.includes(u.id)).map(u => ({
            id: u.id, name: u.full_name, role: u.role, division: u.division, photo: u.profile_photo_url,
            checkIn: presentLogs[u.id].checkIn || null,
            checkOut: presentLogs[u.id].checkOut || null
        }));
        
        const sakit = users.filter(u => sakitIds.includes(u.id)).map(u => ({
            id: u.id, name: u.full_name, role: u.role, division: u.division, photo: u.profile_photo_url
        }));

        const izin = users.filter(u => izinIds.includes(u.id)).map(u => ({
            id: u.id, name: u.full_name, role: u.role, division: u.division, photo: u.profile_photo_url
        }));

        const cuti = users.filter(u => cutiIds.includes(u.id)).map(u => ({
            id: u.id, name: u.full_name, role: u.role, division: u.division, photo: u.profile_photo_url
        }));

        const off = users.filter(u => offIds.includes(u.id)).map(u => ({
            id: u.id, name: u.full_name, role: u.role, division: u.division, photo: u.profile_photo_url
        }));

        // Truly missing (no reason)
        const missing = users.filter(u => 
            missingIds.includes(u.id) && 
            !sakitIds.includes(u.id) && 
            !izinIds.includes(u.id) &&
            !cutiIds.includes(u.id) && 
            !offIds.includes(u.id)
        ).map(u => ({
            id: u.id, name: u.full_name, role: u.role, division: u.division, photo: u.profile_photo_url
        }));

        res.json({ present, missing, sakit, izin, cuti, off });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.post_attendance = async (req, res) => {
    try {
        const { type, ipAddress, lat, lng, timestamp, hasPhoto, photoBase64 } = req.body;
        
        // --- LOCATION VALIDATION (Only for Check In / Check Out) ---
        if ((type === 'Check In' || type === 'Check Out') && lat && lng) {
            const { data: settingData } = await supabase.from('settings').select('setting_value').eq('setting_key', 'office_location').single();
            if (settingData && settingData.setting_value) {
                const office = settingData.setting_value;
                const distance = getDistance(parseFloat(lat), parseFloat(lng), office.lat, office.lng);
                
                if (distance > office.radius) {
                    return res.status(403).json({ error: `Anda berada terlalu jauh dari kantor (${Math.round(distance)} meter). Jarak maksimal adalah ${office.radius} meter.` });
                }
            }
        }
        // ------------------------------------------------------------
        
        // --- LIMIT VALIDATION (1 Check In / 1 Check Out per day) ---
        const todayStr = new Date().toISOString().split('T')[0];
        const { data: existingLogs } = await supabase
            .from('attendance')
            .select('id')
            .eq('user_id', req.userId)
            .eq('type', type)
            .gte('timestamp', todayStr + 'T00:00:00.000Z');

        if (existingLogs && existingLogs.length > 0) {
            return res.status(429).json({ error: `Anda sudah merekam absensi ${type} hari ini. Maksimal 1 kali ${type} per hari.` });
        }
        // -------------------------------------------------------------
        
        let photoUrl = null;
        if (hasPhoto && photoBase64) {
            photoUrl = photoBase64;
        }
        // ------------------------------
        
        const { data, error } = await supabase
            .from('attendance')
            .insert([{
                user_id: req.userId,
                type: type,
                ip_address: ipAddress,
                timestamp: timestamp,
                has_photo: hasPhoto,
                photo_url: photoUrl
            }]);

        if (error) throw error;
        res.status(201).json({ message: 'Attendance logged successfully', data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
