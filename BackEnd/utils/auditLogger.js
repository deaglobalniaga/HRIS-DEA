const supabase = require('../config/supabase');

/**
 * Log admin action into audit_logs table safely (non-blocking / fail-safe)
 * @param {Object} params
 * @param {string} params.userId - UUID of the user performing the action
 * @param {string} params.action - Short title of the action (e.g. 'Agenda Diperbarui')
 * @param {string} params.details - Detailed description of what was changed
 * @param {string} [params.status='Success'] - 'Success' | 'Failed' | 'Warning'
 * @param {Object} [params.req] - Express request object to extract IP and User-Agent
 */
const logAdminActivity = async ({ userId, action, details, status = 'Success', req = null }) => {
    try {
        let ipAddress = null;
        let userAgent = null;

        if (req) {
            const rawIp = req.headers['x-forwarded-for'] || req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || '';
            ipAddress = String(rawIp).split(',')[0].trim() || '127.0.0.1';
            userAgent = req.headers['user-agent'] || 'HRIS Client';
        }

        const effectiveUserId = userId || req?.userId || null;

        await supabase.from('audit_logs').insert({
            user_id: effectiveUserId,
            action,
            details,
            ip_address: ipAddress,
            user_agent: userAgent,
            status
        });
    } catch (err) {
        console.error('AuditLogger error (non-fatal):', err.message);
    }
};

module.exports = { logAdminActivity };
