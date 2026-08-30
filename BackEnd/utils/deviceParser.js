const UAParser = require('ua-parser-js');

// Brand Prefixes for Android
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
    { prefix: /^OnePlus/i, brand: 'OnePlus' }
];

/**
 * Parses device, OS, browser and hardware model from request headers and optional client telemetry.
 */
function parseDeviceDetails(req) {
    const rawUa = req.headers['user-agent'] || '';
    const parser = new UAParser(rawUa);
    const uaResult = parser.getResult();

    // 1. Client telemetry (if sent from frontend)
    let clientInfo = null;
    if (req.body?.deviceInfo && typeof req.body.deviceInfo === 'object') {
        clientInfo = req.body.deviceInfo;
    } else if (req.headers['x-client-device']) {
        try {
            clientInfo = JSON.parse(decodeURIComponent(req.headers['x-client-device']));
        } catch (e) {}
    }

    // 2. Resolve Operating System
    let osStr = '';
    if (clientInfo?.osFull) {
        osStr = clientInfo.osFull;
    } else {
        const osName = uaResult.os.name || 'Windows';
        let osVer = uaResult.os.version || '';
        
        if (osName === 'Windows') {
            if (rawUa.includes('Windows NT 10.0')) {
                // Windows NT 10.0 header is used for both Windows 10 and 11
                osStr = 'Windows 10/11';
            } else if (rawUa.includes('Windows NT 6.3')) {
                osStr = 'Windows 8.1';
            } else if (rawUa.includes('Windows NT 6.1')) {
                osStr = 'Windows 7';
            } else {
                osStr = `Windows ${osVer || '11'}`;
            }
        } else if (osName === 'Mac OS' || osName === 'iOS') {
            osStr = `${osName === 'Mac OS' ? 'macOS' : 'iOS'} ${osVer}`.trim();
        } else {
            osStr = `${osName} ${osVer}`.trim();
        }
    }

    // 3. Resolve Browser
    let browserStr = '';
    if (clientInfo?.browserFull) {
        browserStr = clientInfo.browserFull;
    } else {
        const bName = uaResult.browser.name || 'Web Browser';
        const bVer = uaResult.browser.version ? uaResult.browser.version.split('.')[0] : '';
        browserStr = `${bName} ${bVer}`.trim();
    }

    // 4. Resolve Device Model & Type
    let deviceType = clientInfo?.deviceType || uaResult.device.type || (['iOS', 'Android'].includes(uaResult.os.name) ? 'Mobile' : 'Desktop');
    if (deviceType === 'mobile') deviceType = 'Mobile';
    if (deviceType === 'tablet') deviceType = 'Tablet';

    let deviceModel = '';
    if (clientInfo?.deviceModel && clientInfo.deviceModel !== 'Desktop Workstation') {
        deviceModel = clientInfo.deviceModel;
    } else if (uaResult.device.vendor) {
        deviceModel = `${uaResult.device.vendor} ${uaResult.device.model || ''}`.trim();
    } else if (/iPhone/i.test(rawUa)) {
        deviceModel = 'Apple iPhone';
    } else if (/iPad/i.test(rawUa)) {
        deviceModel = 'Apple iPad';
    } else if (/Macintosh|Mac OS X/i.test(rawUa)) {
        deviceModel = 'Apple Mac';
    } else if (/Android/i.test(rawUa)) {
        const modelMatch = rawUa.match(/;\s*([^;]+?)\s*(?:Build|\))/i);
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
    } else if (osStr.includes('Windows')) {
        deviceModel = 'Laptop / PC Windows';
    } else {
        deviceModel = deviceType === 'Mobile' ? 'Smartphone' : 'Desktop PC';
    }

    // 5. Client IP & Location
    let clientIp = req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : (req.ip || req.socket.remoteAddress || '127.0.0.1');
    if (clientIp.startsWith('::ffff:')) {
        clientIp = clientIp.replace('::ffff:', '');
    }
    if (clientIp === '::1') {
        clientIp = '127.0.0.1';
    }
    const clientLocation = req.body?.location || 'Kalimantan Selatan, ID';

    // 6. Device Fingerprint
    const explicitDeviceId = req.body?.deviceId || clientInfo?.deviceId;
    const finalDeviceId = explicitDeviceId || `dev_${Buffer.from(clientIp + osStr + browserStr + deviceModel).toString('hex').slice(0, 16)}`;

    return {
        deviceFingerprint: finalDeviceId,
        deviceModel,
        deviceType,
        os: osStr,
        browser: browserStr,
        ip: clientIp,
        location: clientLocation
    };
}

module.exports = {
    parseDeviceDetails
};
