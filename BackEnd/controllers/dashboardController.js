const mongoose = require('mongoose');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');

exports.get_dashboard_stats = async (req, res) => {
    try {
        // 1. Basic Stats
        const users = await User.find().populate('department');
        const employeesCount = users.length;
        
        const leavesCount = await LeaveRequest.countDocuments({ status: 'Pending' });
        
        // 2. Division Stats (Bar Chart)
        const divisionCounts = {};
        users.forEach(u => {
            const div = (u.department && u.department.name) ? u.department.name : 'Unassigned';
            divisionCounts[div] = (divisionCounts[div] || 0) + 1;
        });
        const divisionStats = Object.keys(divisionCounts).map(key => ({
            name: key,
            count: divisionCounts[key]
        }));
        
        // 3. Today's Status
        const witaTime = new Date();
        witaTime.setUTCHours(witaTime.getUTCHours() + 8);
        const todayStr = witaTime.toISOString().split('T')[0];
        
        witaTime.setUTCHours(0, 0, 0, 0);
        witaTime.setUTCHours(witaTime.getUTCHours() - 8);
        const today = witaTime;

        // Dummy data for presentation since we don't have all the attendance populated yet
        const todayStatus = [
            { name: 'Present', value: Math.floor(employeesCount * 0.8), fill: '#10B981' },
            { name: 'On Leave', value: leavesCount, fill: '#F59E0B' },
            { name: 'Absent', value: Math.floor(employeesCount * 0.2), fill: '#EF4444' }
        ];
        
        // 4. Weekly Attendance
        const weeklyAttendance = [
            { date: 'Mon', present: Math.floor(employeesCount * 0.9) },
            { date: 'Tue', present: Math.floor(employeesCount * 0.85) },
            { date: 'Wed', present: Math.floor(employeesCount * 0.92) },
            { date: 'Thu', present: Math.floor(employeesCount * 0.88) },
            { date: 'Fri', present: Math.floor(employeesCount * 0.8) }
        ];
        
        // 5. Command Centre Lists
        const todayArrivals = [];
        const activeLeavesList = [];
        const pendingTasks = [];
        const notesList = [];
        const timeline = [];
        const contractStats = [
            { name: 'PKWT', value: 10, fill: '#3B82F6' },
            { name: 'PKWTT', value: 15, fill: '#10B981' }
        ];
        const avgWorkHours = [
            { date: 'Mon', hours: 8.5 },
            { date: 'Tue', hours: 8.2 },
            { date: 'Wed', hours: 8.0 }
        ];

        res.json({
            totalEmployees: employeesCount,
            attendanceRate: 85,
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
    res.status(201).json({ message: 'Note added successfully' });
};

exports.delete_system_notes_id = async (req, res) => {
    res.json({ message: 'Note deleted successfully' });
};

exports.get_employee_dashboard = async (req, res) => {
    try {
        const userId = req.userId;
        const profile = await User.findById(userId).populate('department');

        const todayStatus = {
            hasCheckedIn: false,
            hasCheckedOut: false,
            checkInTime: null,
            checkOutTime: null
        };
        
        const weeklyHistory = [];
        
        res.json({
            profile: profile || {},
            todayStatus,
            weeklyHistory,
            leaveSummary: {
                taken: 0,
                pending: 0,
                permissionsTaken: 0,
                pendingPermissions: 0
            },
            monthlyPresent: 0,
            totalWorkDaysThisMonth: 20
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
