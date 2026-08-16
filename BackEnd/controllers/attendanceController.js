const User = require('../models/User');
const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');
const Setting = require('../models/Setting');

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
        const witaTime = new Date();
        witaTime.setUTCHours(witaTime.getUTCHours() + 8);
        const todayWitaStr = witaTime.toISOString().split('T')[0];
        
        witaTime.setUTCHours(0, 0, 0, 0);
        witaTime.setUTCHours(witaTime.getUTCHours() - 8);
        const startOfDayUTC = new Date(witaTime);
        const endOfDayUTC = new Date(startOfDayUTC.getTime() + 86400000 - 1);
        const now = new Date();

        // 1. Get users
        let userQuery = User.find().populate('department');
        const adminRoles = ['admin', 'hr', 'superadmin'];
        if (!adminRoles.includes((req.userRole || '').toLowerCase())) {
            userQuery = userQuery.where('_id').equals(req.userId);
        }
        const users = await userQuery.exec();

        // 2. Get attendance records for today
        const attendance = await Attendance.find({
            tanggal: { $gte: startOfDayUTC, $lte: endOfDayUTC }
        });

        // Group attendance by user
        const presentLogs = {};
        attendance.forEach(log => {
            const uId = log.user.toString();
            presentLogs[uId] = {
                checkIn: log.check_in || null,
                checkOut: log.check_out || null
            };
        });

        const presentIds = Object.keys(presentLogs).filter(id => presentLogs[id].checkIn);
        const missingIds = users.map(u => u._id.toString()).filter(id => !presentIds.includes(id));

        // 3. Check for permissions/leaves
        const permissions = await LeaveRequest.find({
            status: { $in: ['Approved', 'Pending'] },
            start_date: { $lte: endOfDayUTC },
            end_date: { $gte: startOfDayUTC }
        });

        const sakitIds = [];
        const izinIds = [];
        const cutiIds = [];

        permissions.forEach(p => {
            const uId = p.user.toString();
            const type = (p.leave_type || '').toLowerCase();
            if (type.includes('sakit') || type.includes('sick')) {
                sakitIds.push(uId);
            } else if (type.includes('izin') || type.includes('permission')) {
                izinIds.push(uId);
            } else if (type.includes('cuti')) {
                cutiIds.push(uId);
            }
        });

        // 4. Check for "Off" (8 weeks work, 2 weeks off logic)
        const offIds = [];
        users.forEach(u => {
            const uId = u._id.toString();
            if (u.date_of_joining && missingIds.includes(uId) && !sakitIds.includes(uId) && !izinIds.includes(uId) && !cutiIds.includes(uId)) {
                const doj = new Date(u.date_of_joining);
                const diffTime = Math.abs(now - doj);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                const cycleDay = diffDays % 70; // 10 weeks cycle (70 days)
                if (cycleDay >= 56) { // Last 14 days of cycle is OFF
                    offIds.push(uId);
                }
            }
        });

        const mapUser = (u) => ({
            id: u._id.toString(),
            name: u.nama || u.full_name,
            role: u.role,
            division: u.department?.name || 'Unassigned',
            photo: u.profile_photo_url
        });

        const present = users.filter(u => presentIds.includes(u._id.toString())).map(u => ({
            ...mapUser(u),
            checkIn: presentLogs[u._id.toString()].checkIn,
            checkOut: presentLogs[u._id.toString()].checkOut
        }));
        
        const sakit = users.filter(u => sakitIds.includes(u._id.toString())).map(mapUser);
        const izin = users.filter(u => izinIds.includes(u._id.toString())).map(mapUser);
        const cuti = users.filter(u => cutiIds.includes(u._id.toString())).map(mapUser);
        const off = users.filter(u => offIds.includes(u._id.toString())).map(mapUser);

        const trulyMissing = users.filter(u => 
            missingIds.includes(u._id.toString()) && 
            !sakitIds.includes(u._id.toString()) && 
            !izinIds.includes(u._id.toString()) &&
            !cutiIds.includes(u._id.toString()) && 
            !offIds.includes(u._id.toString())
        ).map(mapUser);

        res.json({ present, missing: trulyMissing, sakit, izin, cuti, off });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.post_attendance = async (req, res) => {
    try {
        const { type, ipAddress, lat, lng, timestamp, hasPhoto, photoBase64 } = req.body;
        
        if (!hasPhoto || !photoBase64) {
            return res.status(400).json({ error: 'Wajah tidak terdeteksi. Anda wajib melampirkan foto selfie saat absen.' });
        }

        const settingsData = await Setting.find();
        const settingsMap = {};
        settingsData.forEach(s => { settingsMap[s.key] = s.value; });

        if ((type === 'Check In' || type === 'Check Out') && lat && lng) {
            if (settingsMap['office_lat'] && settingsMap['office_lng']) {
                const radius = parseFloat(settingsMap['office_radius']) || 50;
                const distance = getDistance(parseFloat(lat), parseFloat(lng), parseFloat(settingsMap['office_lat']), parseFloat(settingsMap['office_lng']));
                
                if (distance > radius) {
                    return res.status(403).json({ error: `Anda berada terlalu jauh dari kantor (${Math.round(distance)} meter). Jarak maksimal adalah ${radius} meter.` });
                }
            }
        }

        const checkInStart = settingsMap['check_in_start'] || '06:00';
        const checkInEnd = settingsMap['check_in_end'] || '09:00';
        const checkOutStart = settingsMap['check_out_start'] || '17:00';
        const checkOutEnd = settingsMap['check_out_end'] || '20:00';

        const witaTimeForCheck = new Date();
        witaTimeForCheck.setUTCHours(witaTimeForCheck.getUTCHours() + 8);
        const currentHours = String(witaTimeForCheck.getUTCHours()).padStart(2, '0');
        const currentMinutes = String(witaTimeForCheck.getUTCMinutes()).padStart(2, '0');
        const currentTime = `${currentHours}:${currentMinutes}`;

        if (type === 'Check In') {
            if (currentTime < checkInStart || currentTime > checkInEnd) {
                return res.status(403).json({ error: `Waktu Check In tidak valid. Check In hanya diizinkan antara jam ${checkInStart} - ${checkInEnd} WITA.` });
            }
        } else if (type === 'Check Out') {
            if (currentTime < checkOutStart || currentTime > checkOutEnd) {
                return res.status(403).json({ error: `Waktu Check Out tidak valid. Check Out hanya diizinkan antara jam ${checkOutStart} - ${checkOutEnd} WITA.` });
            }
        }

        const witaTime = new Date();
        witaTime.setUTCHours(witaTime.getUTCHours() + 8);
        witaTime.setUTCHours(0, 0, 0, 0);
        witaTime.setUTCHours(witaTime.getUTCHours() - 8);
        const startOfDayUTC = new Date(witaTime);
        const endOfDayUTC = new Date(witaTime.getTime() + 86400000 - 1);

        let attRecord = await Attendance.findOne({
            user: req.userId,
            tanggal: { $gte: startOfDayUTC, $lte: endOfDayUTC }
        });

        const photoUrl = (hasPhoto && photoBase64) ? photoBase64 : null;

        if (type === 'Check In') {
            if (attRecord && attRecord.check_in) {
                return res.status(429).json({ error: `Anda sudah merekam absensi Check In hari ini.` });
            }
            if (!attRecord) {
                attRecord = new Attendance({ user: req.userId, tanggal: startOfDayUTC });
            }
            attRecord.check_in = new Date(timestamp);
            attRecord.photo_url = photoUrl;
            let statusStr = "Hadir";
            if (currentTime > checkInEnd) statusStr = "Hadir (Terlambat)";
            attRecord.status = statusStr;

        } else if (type === 'Check Out') {
            if (attRecord && attRecord.check_out) {
                return res.status(429).json({ error: `Anda sudah merekam absensi Check Out hari ini.` });
            }
            if (!attRecord) {
                return res.status(400).json({ error: `Anda belum Check In hari ini.` });
            }
            attRecord.check_out = new Date(timestamp);
            if (currentTime < checkOutStart) {
                attRecord.status += " (Pulang Cepat)";
            }
        }

        await attRecord.save();
        res.status(201).json({ message: 'Attendance logged successfully', data: attRecord });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
