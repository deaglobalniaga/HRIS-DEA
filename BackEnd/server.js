const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Load Supabase Client for routes to use
const supabase = require('./config/supabaseClient');
app.use((req, res, next) => {
    req.supabase = supabase;
    next();
});

// HRIS Modular Routes
app.use('/api/hris', require('./routes/attendanceRoutes'));
app.use('/api/hris', require('./routes/dashboardRoutes'));
app.use('/api/hris', require('./routes/employeeRoutes'));
app.use('/api/hris', require('./routes/leaveRoutes'));
app.use('/api/hris', require('./routes/performanceRoutes'));
app.use('/api/hris', require('./routes/permissionRoutes'));
app.use('/api/hris', require('./routes/notificationRoutes'));
app.use('/api/hris', require('./routes/reportRoutes'));
app.use('/api/hris', require('./routes/calendarRoutes'));
app.use('/api/hris', require('./routes/analyticsRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/settings', require('./routes/settingsRoutes'));

app.get('/', (req, res) => {
    res.send('HRIS API is running... 🚀');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;
