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
    // Mock APIs
    const fakePayload = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600, id: 1, role: 'admin' })).toString('base64');
    const fakeToken = `header.${fakePayload}.signature`;
    
    await page.route('**/api/hris/auth/login', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ token: fakeToken, user: { id: 1, role: 'admin', full_name: 'Robot' } })
    }));
    await page.route('**/api/hris/auth/profile', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: 1, role: 'admin', full_name: 'Robot', email: 'robot@test.com' })
    }));
    await page.route('**/api/hris/dashboard/stats', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        totalEmployees: 25, presentToday: 24, onLeave: 1, totalDivisions: 5,
        attendanceTrends: [{date: '2023-01-01', hadir: 20, terlambat: 2, tidak_hadir: 3}],
        radarData: [{division: 'IT', kedisiplinan: 90}]
      })
    }));
    await page.route('**/api/hris/attendance/today', route => route.fulfill({
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
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await page.waitForTimeout(3000); // Wait for charts to animate/load
    await page.screenshot({ path: path.join(screenshotsDir, '2_dashboard.png') });
    console.log('Dashboard screenshot saved.');

    // 3. Navigate to Attendance Hub
    console.log('Navigating to Attendance Hub...');
    await page.click('text="Pusat Kehadiran"');
    await page.waitForTimeout(3000); // Wait for camera/map placeholder to load
    await page.screenshot({ path: path.join(screenshotsDir, '3_attendance.png') });
    console.log('Attendance screenshot saved.');

  } catch (err) {
    console.error('Error during capture:', err);
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
})();
