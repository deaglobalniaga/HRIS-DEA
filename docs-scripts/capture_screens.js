const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const screenshotsDir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir);
  }

  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  try {
    // Mock APIs (Match any endpoint ending with these paths)
    const fakePayload = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600, id: 1, role: 'admin' })).toString('base64');
    const fakeToken = `header.${fakePayload}.signature`;
    
    await page.route('**/auth/login', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ token: fakeToken, user: { id: 1, role: 'admin', full_name: 'Robot' } })
    }));
    await page.route('**/auth/profile', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: 1, role: 'admin', full_name: 'Robot', email: 'robot@test.com' })
    }));
    await page.route('**/dashboard/stats', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        totalEmployees: 25, presentToday: 24, onLeave: 1, totalDivisions: 5,
        attendanceTrends: [{date: '2023-01-01', hadir: 20, terlambat: 2, tidak_hadir: 3}],
        radarData: [{division: 'IT', kedisiplinan: 90}]
      })
    }));
    await page.route('**/attendance/today', route => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify([])
    }));
    await page.route('**/users*', route => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify([{id: 1, full_name: 'Karyawan 1', role: 'user', division: 'IT'}])
    }));
    await page.route('**/reports*', route => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify([])
    }));

    // 1. Screenshot Login Page
    console.log('Navigating to Login...');
    await page.goto('http://localhost:5173/login');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(screenshotsDir, '1_login.png') });
    console.log('Login screenshot saved.');

    // 2. Login
    console.log('Logging in...');
    await page.fill('input[name="identifier"]', 'robot@test.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Wait for Dashboard
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    await page.waitForTimeout(3000); // Wait for charts to animate/load
    await page.screenshot({ path: path.join(screenshotsDir, '2_dashboard.png') });
    console.log('Dashboard screenshot saved.');

    // 3. Navigate to Attendance Hub
    console.log('Navigating to Attendance Hub...');
    await page.goto('http://localhost:5173/attendance-hub');
    await page.waitForTimeout(3000); // Wait for camera/map placeholder to load
    await page.screenshot({ path: path.join(screenshotsDir, '3_attendance.png') });
    console.log('Attendance screenshot saved.');
    
    // 4. Leave Tab
    try {
      console.log('Navigating to Leave Tab...');
      await page.click('button:has-text("Cuti")'); // Or "Cuti & Izin"
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(screenshotsDir, '4_leave.png') });
    } catch(e) { console.log('Skipping Leave Tab screenshot due to error'); }
    
    // 5. Employees
    try {
      console.log('Navigating to Employees...');
      await page.goto('http://localhost:5173/employees');
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(screenshotsDir, '5_employees.png') });
    } catch(e) { console.log('Skipping Employees'); }
    
    // 6. Reports
    try {
      console.log('Navigating to Reports...');
      await page.goto('http://localhost:5173/reports');
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(screenshotsDir, '6_reports.png') });
    } catch(e) { console.log('Skipping Reports'); }
    
    // 7. Profile
    try {
      console.log('Navigating to Profile...');
      await page.goto('http://localhost:5173/profile');
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(screenshotsDir, '7_profile.png') });
    } catch(e) { console.log('Skipping Profile'); }

  } catch (err) {
    console.error('Error during capture:', err);
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
})();
