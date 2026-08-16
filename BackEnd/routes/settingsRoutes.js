const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');
const Setting = require('../models/Setting');

// Default settings if table is empty
const defaultSettings = {
    monthlyTargetHours: 160,
    officeLat: -3.42436, 
    officeLng: 115.99267,
    officeRadius: 50,
    checkInStart: '06:00',
    checkInEnd: '09:00',
    checkOutStart: '17:00',
    checkOutEnd: '20:00',
    maxLateMinutes: 15
};

// Helper: Convert array of {setting_key, setting_value} to an object
const arrayToObject = (arr) => {
    const obj = { ...defaultSettings };
    if (!arr) return obj;
    arr.forEach(item => {
        obj[item.setting_key] = item.setting_value;
    });
    return obj;
};

// GET settings (public to all authenticated users)
router.get('/', verifyToken, async (req, res) => {
    try {
        const data = await Setting.find({});
        const settings = arrayToObject(data);
        res.status(200).json(settings);
    } catch (error) {
        console.error("Error reading settings:", error);
        res.status(500).json({ error: 'Internal server error reading settings' });
    }
});

// PATCH settings (admin only)
router.patch('/', verifyToken, isAdmin, async (req, res) => {
    try {
        const updates = req.body;
        const keys = Object.keys(updates);
        
        if (keys.length === 0) return res.status(400).json({ error: 'No data to update' });

        // Upsert each key into the settings table
        const promises = keys.map(k => {
            return Setting.findOneAndUpdate(
                { setting_key: k },
                { setting_value: updates[k] },
                { upsert: true, new: true }
            );
        });

        await Promise.all(promises);

        // Also update the office_location jsonb object if lat, lng, or radius are updated
        if (keys.includes('officeLat') || keys.includes('officeLng') || keys.includes('officeRadius')) {
            const currData = await Setting.find({});
            const curr = arrayToObject(currData);
            
            const lat = updates.officeLat !== undefined ? updates.officeLat : curr.officeLat;
            const lng = updates.officeLng !== undefined ? updates.officeLng : curr.officeLng;
            const rad = updates.officeRadius !== undefined ? updates.officeRadius : curr.officeRadius;
            
            await Setting.findOneAndUpdate(
                { setting_key: 'office_location' },
                { setting_value: { lat, lng, radius: rad } },
                { upsert: true, new: true }
            );
        }

        res.status(200).json({ message: 'Settings updated successfully' });
    } catch (error) {
        console.error("Error updating settings:", error);
        res.status(500).json({ error: 'Internal server error updating settings' });
    }
});

module.exports = router;
