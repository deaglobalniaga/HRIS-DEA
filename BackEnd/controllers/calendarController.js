const User = require('../models/User');
const LeaveRequest = require('../models/LeaveRequest');
const CompanyEvent = require('../models/CompanyEvent');

// GET /calendar/events - Get calendar data for a specific month (includes leaves, permissions, and company events)
exports.get_calendar_events = async (req, res) => {
    try {
        const { month, year } = req.query;
        const targetMonth = parseInt(month) || new Date().getMonth() + 1;
        const targetYear = parseInt(year) || new Date().getFullYear();

        const startDate = new Date(targetYear, targetMonth - 1, 1);
        const endDate = new Date(targetYear, targetMonth, 0);

        // 1. Get approved leaves and permissions (all in LeaveRequest)
        const leavesAndPerms = await LeaveRequest.find({
            status: 'Approved',
            $or: [
                { start_date: { $lte: endDate }, end_date: { $gte: startDate } }
            ]
        }).populate('user', 'nama full_name');

        // 2. Get company events
        const events = await CompanyEvent.find({
            event_date: { $gte: startDate, $lte: endDate }
        });

        // Format data for the frontend calendar
        const calendarData = [];

        leavesAndPerms.forEach(reqObj => {
            const isLeave = (reqObj.leave_type || '').toLowerCase().includes('cuti');
            const userName = reqObj.user ? (reqObj.user.nama || reqObj.user.full_name) : 'Karyawan';
            
            if (isLeave) {
                calendarData.push({
                    id: `leave_${reqObj._id}`,
                    type: 'leave',
                    title: `${userName} - Cuti`,
                    start: reqObj.start_date,
                    end: reqObj.end_date,
                    allDay: true,
                    description: reqObj.reason
                });
            } else {
                calendarData.push({
                    id: `perm_${reqObj._id}`,
                    type: 'permission',
                    subType: reqObj.leave_type,
                    title: `${userName} - ${reqObj.leave_type}`,
                    start: reqObj.start_date,
                    end: reqObj.end_date,
                    allDay: true,
                    description: reqObj.reason
                });
            }
        });

        // Format Events
        events.forEach(event => {
            calendarData.push({
                id: `event_${event._id}`,
                type: 'event',
                title: event.title,
                start: event.event_date,
                end: event.event_date,
                allDay: true,
                description: event.description,
                dbId: event._id.toString()
            });
        });

        // 3. Calculate Roster Leave Blocks
        const EmploymentRecord = require('../models/EmploymentRecord');
        const rosterRecords = await EmploymentRecord.find({
            roster_type: { $in: ['8/2', '6/2'] },
            roster_start_date: { $ne: null }
        }).populate('user', 'nama full_name');

        rosterRecords.forEach(record => {
            if (!record.user) return;
            const userName = record.user.nama || record.user.full_name;
            const match = record.roster_type.match(/^(\d+)\/(\d+)$/);
            if (!match) return;

            const workWeeks = parseInt(match[1]);
            const leaveWeeks = parseInt(match[2]);
            const cycleDays = (workWeeks + leaveWeeks) * 7;
            const workDays = workWeeks * 7;

            // Find overlapping leave blocks within the month
            let blockStart = null;
            let currentBlockEnd = null;

            for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                const diffTime = d - new Date(record.roster_start_date);
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                
                // If roster hasn't started yet, skip
                if (diffDays < 0) continue;

                const cyclePos = diffDays % cycleDays;
                
                if (cyclePos >= workDays) {
                    // It's a leave day
                    if (!blockStart) {
                        blockStart = new Date(d);
                    }
                    currentBlockEnd = new Date(d);
                } else {
                    // It's a work day
                    if (blockStart) {
                        calendarData.push({
                            id: `roster_${record._id}_${blockStart.getTime()}`,
                            type: 'roster_leave',
                            title: `${userName} - Roster Off (${record.roster_type})`,
                            start: blockStart,
                            end: currentBlockEnd,
                            allDay: true,
                            description: `Jadwal cuti otomatis untuk roster ${record.roster_type}`
                        });
                        blockStart = null;
                        currentBlockEnd = null;
                    }
                }
            }

            // Close trailing block if month ends while on leave
            if (blockStart) {
                calendarData.push({
                    id: `roster_${record._id}_${blockStart.getTime()}`,
                    type: 'roster_leave',
                    title: `${userName} - Roster Off (${record.roster_type})`,
                    start: blockStart,
                    end: currentBlockEnd,
                    allDay: true,
                    description: `Jadwal cuti otomatis untuk roster ${record.roster_type}`
                });
            }
        });

        res.json(calendarData);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /calendar/events - Create a new company event
exports.post_event = async (req, res) => {
    try {
        const role = (req.userRole || '').toLowerCase();
        if (!role.includes('admin') && !role.includes('hr') && role !== 'superadmin') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const { title, description, event_date, event_end_date } = req.body;
        
        if (!title || !event_date) {
            return res.status(400).json({ error: 'Title and event_date are required' });
        }

        const eventsToInsert = [];
        const start = new Date(event_date);
        const end = event_end_date ? new Date(event_end_date) : new Date(event_date);
        
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            eventsToInsert.push({
                title,
                description,
                event_date: new Date(d)
            });
        }

        const data = await CompanyEvent.insertMany(eventsToInsert);

        res.status(201).json({ message: 'Event created successfully', data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// DELETE /calendar/events/:id - Delete a company event
exports.delete_event = async (req, res) => {
    try {
        const role = (req.userRole || '').toLowerCase();
        if (!role.includes('admin') && !role.includes('hr') && role !== 'superadmin') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const { id } = req.params;

        await CompanyEvent.findByIdAndDelete(id);

        res.json({ message: 'Event deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
