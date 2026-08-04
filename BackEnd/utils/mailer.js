const nodemailer = require('nodemailer');

// Initialize transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

/**
 * Sends an email notification for HRIS requests
 * @param {string} to - Recipient email (HR/Admin)
 * @param {string} subject - Email subject
 * @param {Object} data - Request details (type, name, reason, date, etc)
 * @param {string} link - Link to the approval page
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
        // For ethereal email testing, this will log the URL to preview the email
        if (process.env.SMTP_HOST === 'smtp.ethereal.email') {
            console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
        }
    } catch (err) {
        console.error('Failed to send email:', err);
    }
};

module.exports = {
    sendRequestNotification
};
