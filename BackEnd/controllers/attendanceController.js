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
        const wibTime = new Date();
        wibTime.setUTCHours(wibTime.getUTCHours() + 7);
        const todayWibStr = wibTime.toISOString().split('T')[0];
        
        wibTime.setUTCHours(0, 0, 0, 0);
        wibTime.setUTCHours(wibTime.getUTCHours() - 7);
        const startOfDayUTC = wibTime.toISOString();
        
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
            .gte('timestamp', startOfDayUTC);
            
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
                if (p.date === todayWibStr) sakitIds.push(p.user_id);
            } else if (p.type === 'Izin' || p.type === 'Permission') {
                if (p.date === todayWibStr) izinIds.push(p.user_id);
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
        
        // --- PHOTO VALIDATION ---
        if (!hasPhoto || !photoBase64) {
            return res.status(400).json({ error: 'Wajah tidak terdeteksi. Anda wajib melampirkan foto selfie saat absen.' });
        }

        // --- LOCATION VALIDATION (Only for Check In / Check Out) ---
        if ((type === 'Check In' || type === 'Check Out') && lat && lng) {
            const { data: settingData } = await supabase.from('settings').select('setting_value').eq('setting_key', 'office_location').single();
            if (settingData && settingData.setting_value) {
                const office = settingData.setting_value;
                const radius = parseFloat(office.radius) || 50;
                const distance = getDistance(parseFloat(lat), parseFloat(lng), parseFloat(office.lat), parseFloat(office.lng));
                
                if (distance > radius) {
                    return res.status(403).json({ error: `Anda berada terlalu jauh dari kantor (${Math.round(distance)} meter). Jarak maksimal adalah ${radius} meter.` });
                }
            }
        }
        // --- TIME BOUNDARY VALIDATION ---
        const { data: settingsData } = await supabase.from('settings').select('setting_key, setting_value');
        const settings = {
            checkInStart: '06:00',
            checkInEnd: '09:00',
            checkOutStart: '17:00',
            checkOutEnd: '20:00',
        };
        (settingsData || []).forEach(item => {
            settings[item.setting_key] = item.setting_value;
        });

        // Get current WIB time (HH:mm)
        const wibTimeForCheck = new Date();
        wibTimeForCheck.setUTCHours(wibTimeForCheck.getUTCHours() + 7);
        const currentHours = String(wibTimeForCheck.getUTCHours()).padStart(2, '0');
        const currentMinutes = String(wibTimeForCheck.getUTCMinutes()).padStart(2, '0');
        const currentTime = `${currentHours}:${currentMinutes}`;

        if (type === 'Check In') {
            if (currentTime < settings.checkInStart || currentTime > settings.checkInEnd) {
                return res.status(403).json({ error: `Waktu Check In tidak valid. Check In hanya diizinkan antara jam ${settings.checkInStart} - ${settings.checkInEnd} WIB.` });
            }
        } else if (type === 'Check Out') {
            if (currentTime < settings.checkOutStart || currentTime > settings.checkOutEnd) {
                return res.status(403).json({ error: `Waktu Check Out tidak valid. Check Out hanya diizinkan antara jam ${settings.checkOutStart} - ${settings.checkOutEnd} WIB.` });
            }
        }
        // ------------------------------------------------------------
        
        // --- LIMIT VALIDATION (1 Check In / 1 Check Out per day) ---
        // Use WIB bounds (UTC+7) to correctly identify today across UTC borders
        const wibTime = new Date();
        wibTime.setUTCHours(wibTime.getUTCHours() + 7);
        wibTime.setUTCHours(0, 0, 0, 0);
        wibTime.setUTCHours(wibTime.getUTCHours() - 7);
        const startOfDayUTC = wibTime.toISOString();
        const endOfDayUTC = new Date(wibTime.getTime() + 86400000 - 1).toISOString();

        const { data: existingLogs } = await supabase
            .from('attendance')
            .select('id')
            .eq('user_id', req.userId)
            .eq('type', type)
            .gte('timestamp', startOfDayUTC)
            .lte('timestamp', endOfDayUTC);

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
