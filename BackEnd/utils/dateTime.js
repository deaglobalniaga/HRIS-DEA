/**
 * Timezone Utility for PT DEA GLOBAL NIAGA HRIS
 * Operational Timezone: WITA (Asia/Makassar, UTC+8)
 */

const TIMEZONE = 'Asia/Makassar';

/**
 * Returns YYYY-MM-DD string in WITA (Asia/Makassar) timezone
 * @param {Date|string|number} date 
 * @returns {string} YYYY-MM-DD
 */
const getWitaDateStr = (date = new Date()) => {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return new Date().toISOString().split('T')[0];
    return new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE }).format(d);
};

/**
 * Returns current Date adjusted to WITA
 * @returns {Date}
 */
const getWitaDate = (date = new Date()) => {
    const d = date instanceof Date ? date : new Date(date);
    return new Date(d.toLocaleString('en-US', { timeZone: TIMEZONE }));
};

/**
 * Returns formatted time string in HH:mm WITA
 * @param {Date|string|number} date 
 * @returns {string} HH:mm
 */
const getWitaTimeStr = (date = new Date()) => {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '--:--';
    return d.toLocaleTimeString('id-ID', {
        timeZone: TIMEZONE,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
};

module.exports = {
    TIMEZONE,
    getWitaDateStr,
    getWitaDate,
    getWitaTimeStr
};
