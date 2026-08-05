const { chromium, devices } = require('playwright');
const path = require('path');
const fs = require('fs');

async function captureScreens() {
  const screenshotsDir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir);
  }

  const browser = await chromium.launch({ headless: true });

  try {
    // 1. ADMIN ROLE (DESKTOP)
    console.log('--- START ADMIN (DESKTOP) ---');
    const adminContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const adminPage = await adminContext.newPage();
    
    await adminPage.goto('http://localhost:5173/login');
    await adminPage.waitForTimeout(2000);
    await adminPage.screenshot({ path: path.join(screenshotsDir, '1_login.png') });
    console.log('Login screenshot saved.');
    
    // Login with REAL Admin Account
    await adminPage.fill('input[name="identifier"]', 'admin_test@dea.com');
    await adminPage.fill('input[name="password"]', 'password123');
    await adminPage.click('button[type="submit"]');
    
    await adminPage.waitForURL('**/dashboard', { timeout: 15000 });
    await adminPage.waitForTimeout(3000);
    await adminPage.screenshot({ path: path.join(screenshotsDir, '2_dashboard.png') });
    console.log('Dashboard screenshot saved.');

    try {
      await adminPage.goto('http://localhost:5173/organization');
      await adminPage.waitForTimeout(3000); // Wait for real data to load
      await adminPage.screenshot({ path: path.join(screenshotsDir, '5_employees.png') });
      console.log('Organization screenshot saved.');
    } catch(e) {}

    try {
      await adminPage.goto('http://localhost:5173/reports');
      await adminPage.waitForTimeout(3000);
      await adminPage.screenshot({ path: path.join(screenshotsDir, '6_reports.png') });
      console.log('Reports screenshot saved.');
    } catch(e) {}

    try {
      await adminPage.goto('http://localhost:5173/settings');
      await adminPage.waitForTimeout(3000);
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
    
    await userPage.goto('http://localhost:5173/login');
    // Login with REAL User Account
    await userPage.fill('input[name="identifier"]', 'user_test@dea.com');
    await userPage.fill('input[name="password"]', 'password123');
    await userPage.click('button[type="submit"]');
    
    await userPage.waitForURL('**/dashboard', { timeout: 15000 });
    
    console.log('Navigating to Attendance Hub (Mobile)...');
    await userPage.goto('http://localhost:5173/attendance-hub');
    await userPage.waitForTimeout(5000); // Need more time for camera and real map to load
    await userPage.screenshot({ path: path.join(screenshotsDir, '3_attendance.png') });
    console.log('Attendance Mobile screenshot saved.');
    
    try {
      await userPage.click('button:has-text("Cuti")'); 
      await userPage.waitForTimeout(2000);
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
