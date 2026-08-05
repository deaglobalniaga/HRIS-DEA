const { chromium, devices } = require('playwright');
const path = require('path');
const fs = require('fs');

async function captureScreens() {
  const screenshotsDir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir);
  }

  const createFakeToken = (role) => {
    const payload = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600, id: 1, role })).toString('base64');
    return `header.${payload}.signature`;
  };

  const browser = await chromium.launch({ headless: true });

  try {
    // 1. ADMIN ROLE (DESKTOP)
    console.log('--- START ADMIN (DESKTOP) ---');
    const adminContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const adminPage = await adminContext.newPage();
    
    await adminPage.route('**/auth/login', route => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify({ token: createFakeToken('admin'), user: { id: 1, role: 'admin', full_name: 'Admin Boss' } })
    }));
    await adminPage.route('**/auth/profile', route => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify({ id: 1, role: 'admin', full_name: 'Admin Boss', email: 'admin@test.com' })
    }));
    await adminPage.route('**/dashboard/stats', route => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify({
        totalEmployees: 45, presentToday: 42, onLeave: 3, totalDivisions: 5,
        attendanceTrends: [{date: '2023-01-01', hadir: 40, terlambat: 2, tidak_hadir: 3}],
        radarData: [{division: 'IT', kedisiplinan: 95}, {division: 'HR', kedisiplinan: 88}]
      })
    }));
    await adminPage.route('**/attendance/today', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }));
    await adminPage.route('**/users*', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{id: 1, full_name: 'Karyawan 1', role: 'user', division: 'IT'}]) }));
    await adminPage.route('**/reports*', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }));
    
    await adminPage.goto('http://localhost:5173/login');
    await adminPage.waitForTimeout(2000);
    await adminPage.screenshot({ path: path.join(screenshotsDir, '1_login.png') });
    console.log('Login screenshot saved.');
    
    await adminPage.fill('input[name="identifier"]', 'admin@test.com');
    await adminPage.fill('input[name="password"]', 'password123');
    await adminPage.click('button[type="submit"]');
    
    await adminPage.waitForURL('**/dashboard', { timeout: 15000 });
    await adminPage.waitForTimeout(3000);
    await adminPage.screenshot({ path: path.join(screenshotsDir, '2_dashboard.png') });
    console.log('Dashboard screenshot saved.');

    try {
      await adminPage.goto('http://localhost:5173/organization');
      await adminPage.waitForTimeout(1500);
      await adminPage.screenshot({ path: path.join(screenshotsDir, '5_employees.png') });
      console.log('Organization screenshot saved.');
    } catch(e) {}

    try {
      await adminPage.goto('http://localhost:5173/reports');
      await adminPage.waitForTimeout(1500);
      await adminPage.screenshot({ path: path.join(screenshotsDir, '6_reports.png') });
      console.log('Reports screenshot saved.');
    } catch(e) {}

    try {
      await adminPage.goto('http://localhost:5173/settings');
      await adminPage.waitForTimeout(1500);
      await adminPage.screenshot({ path: path.join(screenshotsDir, '7_profile.png') });
      console.log('Settings screenshot saved.');
    } catch(e) {}

    await adminContext.close();

    // 2. USER ROLE (MOBILE)
    console.log('--- START USER (MOBILE) ---');
    const mobileDevice = devices['iPhone 13'];
    const userContext = await browser.newContext({
      ...mobileDevice,
      geolocation: { latitude: -6.200000, longitude: 106.816666 },
      permissions: ['geolocation', 'camera']
    });
    const userPage = await userContext.newPage();
    
    await userPage.route('**/auth/login', route => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify({ token: createFakeToken('user'), user: { id: 2, role: 'user', full_name: 'Karyawan Biasa' } })
    }));
    await userPage.route('**/auth/profile', route => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify({ id: 2, role: 'user', full_name: 'Karyawan Biasa', email: 'user@test.com' })
    }));
    await userPage.route('**/dashboard/stats', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) }));
    await userPage.route('**/attendance/today', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }));

    await userPage.goto('http://localhost:5173/login');
    await userPage.fill('input[name="identifier"]', 'user@test.com');
    await userPage.fill('input[name="password"]', 'password123');
    await userPage.click('button[type="submit"]');
    
    await userPage.waitForURL('**/dashboard', { timeout: 15000 });
    
    console.log('Navigating to Attendance Hub (Mobile)...');
    await userPage.goto('http://localhost:5173/attendance-hub');
    await userPage.waitForTimeout(3000); 
    await userPage.screenshot({ path: path.join(screenshotsDir, '3_attendance.png') });
    console.log('Attendance Mobile screenshot saved.');
    
    try {
      // In mobile view, we might need to click the tab directly if there's no route for it,
      // but if we are on /attendance-hub, let's try to click the tab button.
      await userPage.click('button:has-text("Cuti")'); 
      await userPage.waitForTimeout(1000);
      await userPage.screenshot({ path: path.join(screenshotsDir, '4_leave.png') });
      console.log('Leave Tab Mobile screenshot saved.');
    } catch(e) { console.log('Leave tab failed:', e.message); }

    await userContext.close();

  } catch (err) {
    console.error('Error during capture:', err);
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
}

captureScreens();
