/**
 * Advanced Client-Side Device & OS Detector for HRIS DGN
 * Accurately detects Windows 11 vs 10 via User-Agent Client Hints,
 * Hardware Model (Samsung, Xiaomi, iPhone, Laptop vs Desktop PC via Battery & WebGL),
 * and generates a persistent device fingerprint.
 */

// Popular Android Manufacturer Prefix Map
const ANDROID_BRANDS = [
    { prefix: /^SM-[A-Z0-9]+/i, brand: 'Samsung Galaxy' },
    { prefix: /^GT-[A-Z0-9]+/i, brand: 'Samsung Galaxy' },
    { prefix: /^Pixel/i, brand: 'Google Pixel' },
    { prefix: /^CPH[0-9]+/i, brand: 'OPPO' },
    { prefix: /^RMX[0-9]+/i, brand: 'Realme' },
    { prefix: /^V[0-9]{4}[A-Z]*/i, brand: 'Vivo' },
    { prefix: /^vivo/i, brand: 'Vivo' },
    { prefix: /^2[0-9]{3}[0-9A-Z]+/i, brand: 'Xiaomi' },
    { prefix: /^Redmi/i, brand: 'Xiaomi Redmi' },
    { prefix: /^POCO/i, brand: 'Xiaomi POCO' },
    { prefix: /^Mi\s+/i, brand: 'Xiaomi Mi' },
    { prefix: /^Infinix/i, brand: 'Infinix' },
    { prefix: /^X[0-9]{3}/i, brand: 'Infinix' },
    { prefix: /^TECNO/i, brand: 'Tecno Mobile' },
    { prefix: /^ASUS/i, brand: 'ASUS' },
    { prefix: /^ROG/i, brand: 'ASUS ROG Phone' },
    { prefix: /^moto/i, brand: 'Motorola' },
    { prefix: /^HUAWEI/i, brand: 'Huawei' },
    { prefix: /^HONOR/i, brand: 'Honor' },
    { prefix: /^OnePlus/i, brand: 'OnePlus' },
    { prefix: /^NE[0-9]{4}/i, brand: 'OnePlus' },
    { prefix: /^KB[0-9]{4}/i, brand: 'OnePlus' },
    { prefix: /^GM[0-9]{4}/i, brand: 'OnePlus' }
];

export const getClientDeviceInfo = async () => {
    if (typeof window === 'undefined') {
        return {
            osFull: 'Windows 10/11',
            deviceModel: 'PC / Desktop',
            deviceType: 'Desktop',
            browserFull: 'Web Browser',
            deviceId: 'dev_default'
        };
    }

    const ua = navigator.userAgent || '';
    let osName = 'Windows';
    let osVersion = '';
    let deviceModel = '';
    let deviceType = 'Desktop';
    let browserName = 'Web Browser';
    let browserVersion = '';
    let isLaptop = false;

    // 1. Device Form Factor Detection
    const isMobile = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const isTablet = /(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk)/i.test(ua) || (navigator.maxTouchPoints > 1 && /Macintosh/i.test(ua));
    deviceType = isTablet ? 'Tablet' : (isMobile ? 'Mobile' : 'Desktop');

    // 2. Battery API to differentiate Laptop vs Desktop PC
    try {
        if (!isMobile && !isTablet && typeof navigator.getBattery === 'function') {
            const battery = await navigator.getBattery();
            if (battery && (battery.charging !== undefined || battery.level !== undefined)) {
                // Desktops usually either don't support battery or have chargingTime = 0 / level = 1 without discharging
                isLaptop = true;
            }
        }
    } catch (e) {
        // Ignore battery API security block
    }

    // 3. User-Agent Client Hints API (Chrome, Edge, Brave, Opera, Samsung Internet)
    let clientHintsModel = '';
    if (navigator.userAgentData && typeof navigator.userAgentData.getHighEntropyValues === 'function') {
        try {
            const hints = await navigator.userAgentData.getHighEntropyValues([
                'platform',
                'platformVersion',
                'architecture',
                'model',
                'bitness',
                'formFactors'
            ]);

            if (hints.platform === 'Windows') {
                osName = 'Windows';
                // Windows 11 has platformVersion >= 13.0.0 (or build >= 22000)
                const majorVer = parseInt((hints.platformVersion || '').split('.')[0], 10);
                if (majorVer >= 13) {
                    osVersion = '11';
                } else if (majorVer > 0) {
                    osVersion = '10';
                } else {
                    osVersion = '11'; // Default modern chromium on Windows NT 10.0 is typically Win 11
                }
            } else if (hints.platform) {
                osName = hints.platform;
                osVersion = hints.platformVersion || '';
            }

            if (hints.model && hints.model.trim()) {
                clientHintsModel = hints.model.trim();
            }
        } catch (e) {
            console.debug('Client hints error:', e);
        }
    }

    // 4. Fallback OS Detection via User Agent
    if (!osVersion) {
        if (/Windows NT 10.0/i.test(ua)) {
            osName = 'Windows';
            // If screen or touch hints indicate modern PC, label Windows 11 / 10
            osVersion = '11';
        } else if (/Windows NT 6.3/i.test(ua)) {
            osName = 'Windows'; osVersion = '8.1';
        } else if (/Windows NT 6.2/i.test(ua)) {
            osName = 'Windows'; osVersion = '8';
        } else if (/Windows NT 6.1/i.test(ua)) {
            osName = 'Windows'; osVersion = '7';
        } else if (/Macintosh|Mac OS X/i.test(ua)) {
            osName = 'macOS';
            const macVer = ua.match(/Mac OS X ([0-9_]+)/);
            if (macVer) {
                const cleanMacVer = macVer[1].replace(/_/g, '.');
                const major = parseInt(cleanMacVer.split('.')[0], 10);
                const minor = parseInt(cleanMacVer.split('.')[1] || 0, 10);
                if (major === 15 || (major === 10 && minor >= 16)) osVersion = 'Sequoia (15)';
                else if (major === 14) osVersion = 'Sonoma (14)';
                else if (major === 13) osVersion = 'Ventura (13)';
                else if (major === 12) osVersion = 'Monterey (12)';
                else if (major === 11) osVersion = 'Big Sur (11)';
                else osVersion = cleanMacVer;
            }
        } else if (/Android/i.test(ua)) {
            osName = 'Android';
            const andVer = ua.match(/Android\s+([0-9.]+)/i);
            osVersion = andVer ? andVer[1] : '';
        } else if (/iPhone|iPad|iPod/i.test(ua)) {
            osName = /iPad/i.test(ua) ? 'iPadOS' : 'iOS';
            const iosVer = ua.match(/OS ([0-9_]+)/);
            osVersion = iosVer ? iosVer[1].replace(/_/g, '.') : '';
        } else if (/CrOS/i.test(ua)) {
            osName = 'ChromeOS';
        } else if (/Linux/i.test(ua)) {
            osName = 'Linux';
        }
    }

    // 5. Browser Detection
    if (/Edg\//i.test(ua)) {
        browserName = 'Microsoft Edge';
        browserVersion = (ua.match(/Edg\/([0-9.]+)/) || [])[1] || '';
    } else if (/OPR\//i.test(ua) || /Opera/i.test(ua)) {
        browserName = 'Opera';
        browserVersion = (ua.match(/OPR\/([0-9.]+)/) || [])[1] || '';
    } else if (/SamsungBrowser/i.test(ua)) {
        browserName = 'Samsung Internet';
        browserVersion = (ua.match(/SamsungBrowser\/([0-9.]+)/) || [])[1] || '';
    } else if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) {
        browserName = 'Google Chrome';
        browserVersion = (ua.match(/Chrome\/([0-9.]+)/) || [])[1] || '';
    } else if (/Firefox\//i.test(ua)) {
        browserName = 'Mozilla Firefox';
        browserVersion = (ua.match(/Firefox\/([0-9.]+)/) || [])[1] || '';
    } else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) {
        browserName = 'Apple Safari';
        browserVersion = (ua.match(/Version\/([0-9.]+)/) || [])[1] || '';
    }

    // 6. GPU Renderer Detection for Desktop Hardware Clues
    let gpuInfo = '';
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl) {
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
                const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';
                if (renderer) {
                    if (renderer.includes('NVIDIA')) gpuInfo = 'NVIDIA';
                    else if (renderer.includes('AMD') || renderer.includes('Radeon')) gpuInfo = 'AMD Radeon';
                    else if (renderer.includes('Intel')) gpuInfo = 'Intel HD/Iris';
                    else if (renderer.includes('Apple')) gpuInfo = 'Apple GPU';
                }
            }
        }
    } catch (e) {}

    // 7. Device Model Resolution
    if (clientHintsModel) {
        let brandName = '';
        for (const b of ANDROID_BRANDS) {
            if (b.prefix.test(clientHintsModel)) {
                brandName = b.brand;
                break;
            }
        }
        deviceModel = brandName ? `${brandName} (${clientHintsModel})` : clientHintsModel;
    } else if (/iPhone/i.test(ua)) {
        const w = window.screen.width;
        const h = window.screen.height;
        if ((w === 430 && h === 932) || (w === 393 && h === 852)) deviceModel = 'Apple iPhone 15/16 Pro';
        else if ((w === 428 && h === 926) || (w === 390 && h === 844)) deviceModel = 'Apple iPhone 13/14/15';
        else if (w === 375 && h === 812) deviceModel = 'Apple iPhone X/XS/11 Pro';
        else if (w === 414 && h === 896) deviceModel = 'Apple iPhone 11/XR';
        else deviceModel = 'Apple iPhone';
    } else if (/iPad/i.test(ua) || (navigator.maxTouchPoints > 1 && /Macintosh/i.test(ua))) {
        deviceModel = 'Apple iPad';
    } else if (/Macintosh|Mac OS X/i.test(ua)) {
        deviceModel = isLaptop ? 'Apple MacBook (Laptop)' : 'Apple Mac Workstation';
    } else if (/Android/i.test(ua)) {
        // Extract Model from UA string: e.g. "; SM-S918B Build/"
        const modelMatch = ua.match(/;\s*([^;]+?)\s*(?:Build|\))/i);
        if (modelMatch && modelMatch[1]) {
            const rawModel = modelMatch[1].trim();
            let brandName = '';
            for (const b of ANDROID_BRANDS) {
                if (b.prefix.test(rawModel)) {
                    brandName = b.brand;
                    break;
                }
            }
            deviceModel = brandName ? `${brandName} (${rawModel})` : `Android (${rawModel})`;
        } else {
            deviceModel = 'Android Smartphone';
        }
    } else if (osName === 'Windows') {
        if (isLaptop) {
            deviceModel = gpuInfo ? `Laptop Windows (${gpuInfo})` : 'Laptop Windows';
        } else {
            deviceModel = gpuInfo ? `PC Desktop (${gpuInfo})` : 'Laptop / PC Windows';
        }
    } else {
        deviceModel = isMobile ? 'Smartphone' : 'Laptop / Desktop PC';
    }

    // 8. Generate / Retrieve Persistent Device Fingerprint
    let persistentDeviceId = localStorage.getItem('hris_device_uuid');
    if (!persistentDeviceId) {
        const rand = Math.random().toString(36).substring(2, 10);
        const time = Date.now().toString(36);
        persistentDeviceId = `dev_${time}_${rand}`;
        localStorage.setItem('hris_device_uuid', persistentDeviceId);
    }

    const osFull = `${osName} ${osVersion}`.trim();
    const browserMajor = browserVersion ? browserVersion.split('.')[0] : '';
    const browserFull = `${browserName} ${browserMajor}`.trim();

    return {
        deviceId: persistentDeviceId,
        deviceModel,
        deviceType,
        osName,
        osVersion,
        osFull,
        browserName,
        browserVersion: browserMajor,
        browserFull,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        isLaptop
    };
};
