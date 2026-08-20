const nodemailer = require('nodemailer');

// Initialize transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

/**
 * Sends an email notification for HRIS requests
 */
const sendRequestNotification = async (to, subject, data, link) => {
    if (!process.env.SMTP_HOST) {
        console.warn('SMTP is not configured in .env. Skipping email sending.');
        return;
    }

    const htmlContent = `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: auto; border: 1px solid #eaeaea; border-radius: 8px;">
            <h2 style="color: #c71e2c; border-bottom: 2px solid #eaeaea; padding-bottom: 10px;">Pengajuan Baru: ${data.type}</h2>
            <p>Halo HR/Admin,</p>
            <p>Terdapat pengajuan baru dari karyawan yang memerlukan persetujuan Anda.</p>
            
            <table style="width: 100%; margin-top: 20px; border-collapse: collapse;">
                <tr>
                    <td style="padding: 8px; border: 1px solid #eaeaea; font-weight: bold; background: #f9f9f9; width: 30%;">Nama Karyawan</td>
                    <td style="padding: 8px; border: 1px solid #eaeaea;">${data.name}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #eaeaea; font-weight: bold; background: #f9f9f9;">Tipe Pengajuan</td>
                    <td style="padding: 8px; border: 1px solid #eaeaea;">${data.type}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #eaeaea; font-weight: bold; background: #f9f9f9;">Tanggal</td>
                    <td style="padding: 8px; border: 1px solid #eaeaea;">${data.dateRange || data.date}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #eaeaea; font-weight: bold; background: #f9f9f9;">Alasan</td>
                    <td style="padding: 8px; border: 1px solid #eaeaea;">${data.reason}</td>
                </tr>
            </table>

            <div style="margin-top: 30px; text-align: center;">
                <a href="${link}" style="background-color: #c71e2c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Proses Approval di Web</a>
            </div>
            
            <p style="margin-top: 30px; font-size: 12px; color: #888;">Email ini dikirim otomatis oleh HRIS PT. Dea Global Niaga.</p>
        </div>
    `;

    try {
        const info = await transporter.sendMail({
            from: '"HRIS DGN Notification" <no-reply@deaglobalniaga.com>',
            to: to,
            subject: subject,
            html: htmlContent
        });
        console.log('Email sent successfully:', info.messageId);
    } catch (err) {
        console.error('Failed to send email:', err);
    }
};

/**
 * Sends a 6-digit OTP verification email for Password Reset
 * @param {string} to - Recipient user email
 * @param {string} otpCode - 6-digit OTP code (e.g. '482910')
 * @param {number} minutesValid - Validity duration in minutes (default 10)
 */
const sendPasswordResetOtpEmail = async (to, otpCode, minutesValid = 10) => {
    const htmlContent = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; max-width: 550px; margin: auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
            <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #991b1b; font-size: 22px; font-weight: 900; margin: 0; letter-spacing: -0.5px;">PT DEA GLOBAL NIAGA</h1>
                <p style="color: #64748b; font-size: 12px; margin-top: 4px; font-weight: bold;">HRIS Enterprise Security Portal</p>
            </div>
            
            <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; text-align: center; border: 1px solid #e2e8f0; margin-bottom: 24px;">
                <h2 style="color: #0f172a; font-size: 16px; font-weight: 800; margin-top: 0; margin-bottom: 8px;">Kode Verifikasi Reset Password</h2>
                <p style="color: #475569; font-size: 13px; margin: 0 0 16px 0; line-height: 1.5;">
                    Gunakan kode 6-digit di bawah ini untuk mengatur ulang kata sandi akun HRIS Anda:
                </p>
                
                <div style="display: inline-block; background-color: #ffffff; border: 2px dashed #991b1b; border-radius: 12px; padding: 14px 28px; margin: 8px auto;">
                    <span style="font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 900; color: #991b1b; letter-spacing: 6px;">
                        ${otpCode}
                    </span>
                </div>

                <p style="color: #64748b; font-size: 12px; margin-top: 14px; font-weight: 600;">
                    ⏱️ Kode ini berlaku selama <strong style="color: #0f172a;">${minutesValid} menit</strong>.
                </p>
            </div>

            <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 12px 16px; margin-bottom: 20px;">
                <p style="color: #991b1b; font-size: 11px; margin: 0; line-height: 1.4; font-weight: 600;">
                    ⚠️ <strong>Perhatian Keamanan:</strong> Jangan pernah memberikan kode ini kepada siapa pun. Jika Anda tidak meminta reset password, abaikan email ini.
                </p>
            </div>

            <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0;">
                Email ini dibuat secara otomatis oleh Sistem Keamanan HRIS PT DEA GLOBAL NIAGA.
            </p>
        </div>
    `;

    console.log(`\n========================================`);
    console.log(`🔐 [RESET PASSWORD OTP] To: ${to}`);
    console.log(`🔢 OTP Code: ${otpCode}`);
    console.log(`⏱️ Valid for: ${minutesValid} Minutes`);
    console.log(`========================================\n`);

    if (!process.env.SMTP_HOST || process.env.SMTP_HOST === 'smtp.ethereal.email') {
        // Ethereal / Local mode
        try {
            const info = await transporter.sendMail({
                from: '"HRIS DGN Security" <security@deaglobalniaga.com>',
                to: to,
                subject: `[HRIS DGN] Kode Reset Password: ${otpCode}`,
                html: htmlContent
            });
            console.log('OTP Email preview URL:', nodemailer.getTestMessageUrl(info));
        } catch (e) {
            console.log('Local mailer simulated (OTP logged to console).');
        }
        return { success: true, simulated: true };
    }

    try {
        const info = await transporter.sendMail({
            from: '"HRIS DGN Security" <no-reply@deaglobalniaga.com>',
            to: to,
            subject: `[HRIS DGN] Kode Reset Password: ${otpCode}`,
            html: htmlContent
        });
        return { success: true, messageId: info.messageId };
    } catch (err) {
        console.error('Failed to send reset OTP email:', err);
        return { success: false, error: err.message };
    }
};

module.exports = {
    sendRequestNotification,
    sendPasswordResetOtpEmail
};
