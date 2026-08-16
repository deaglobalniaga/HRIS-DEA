const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

const path = require('path');
const fs = require('fs');
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Ensure upload directory exists
const uploadDir = path.join(__dirname, 'uploads/documents');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const connectDB = require('./config/db');
connectDB(); // Initialize MongoDB Connection

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Removed Supabase client injected to req

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
app.use('/api/hris', require('./routes/certificationRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/settings', require('./routes/settingsRoutes'));

app.get('/', (req, res) => {
    res.send('HRIS API is running... 🚀');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;
