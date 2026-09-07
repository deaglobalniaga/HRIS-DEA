const nodemailer = require('nodemailer');
require('dotenv').config();

// Create resilient transporter for Gmail / Cloud environments
const createTransporter = () => {
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const isGmail = host.includes('gmail') || process.env.SMTP_SERVICE === 'gmail';
    const user = process.env.SMTP_USER || 'dea.global.niaga1@gmail.com';
    const rawPass = process.env.SMTP_PASS || '';
    const pass = rawPass.replace(/\s+/g, ''); // strip any accidental copy-pasted spaces

    if (isGmail) {
        return nodemailer.createTransport({
            service: 'gmail',
            auth: { user, pass }
        });
    }

    return nodemailer.createTransport({
        host: host,
        port: parseInt(process.env.SMTP_PORT) || 465,
        secure: process.env.SMTP_SECURE === 'true' || parseInt(process.env.SMTP_PORT) === 465,
        auth: { user, pass },
        tls: {
            rejectUnauthorized: false
        }
    });
};

const transporter = createTransporter();
const SENDER_EMAIL = process.env.SMTP_USER || 'dea.global.niaga1@gmail.com';
const SENDER_NAME = '"HRIS PT DEA GLOBAL NIAGA"';

/**
 * Sends an email notification for HRIS requests
 */
const sendRequestNotification = async (to, subject, data, link) => {
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
            
            <p style="margin-top: 30px; font-size: 12px; color: #888;">Email ini dikirim otomatis oleh HRIS PT DEA GLOBAL NIAGA.</p>
        </div>
    `;

    try {
        const info = await transporter.sendMail({
            from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
            replyTo: SENDER_EMAIL,
            to: to,
            subject: subject,
            html: htmlContent
        });
        console.log('Request notification email sent successfully:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (err) {
        console.error('Failed to send request email:', err);
        return { success: false, error: err.message };
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

    try {
        const info = await transporter.sendMail({
            from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
            replyTo: SENDER_EMAIL,
            to: to,
            subject: `[HRIS DGN] Kode Reset Password: ${otpCode}`,
            html: htmlContent
        });
        console.log('Reset OTP email sent successfully:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (err) {
        console.error('Failed to send reset OTP email:', err);
        return { success: false, error: err.message };
    }
};

/**
 * Sends MFA 2-Factor Authentication OTP code via email
 */
const sendMfaOtpEmail = async (to, otpCode, minutesValid = 5) => {
    const htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px 24px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
            <div style="text-align: center; margin-bottom: 24px;">
                <div style="display: inline-block; background: #fee2e2; border: 1px solid #fca5a5; width: 48px; height: 48px; border-radius: 12px; line-height: 48px; font-size: 22px;">
                    🛡️
                </div>
                <h2 style="color: #0f172a; font-size: 20px; font-weight: 800; margin: 12px 0 4px 0;">Verifikasi Masuk 2-Langkah (MFA)</h2>
                <p style="color: #64748b; font-size: 13px; margin: 0;">Sistem Keamanan HRIS PT DEA GLOBAL NIAGA</p>
            </div>

            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 20px; text-align: center;">
                <p style="color: #334155; font-size: 13px; margin: 0 0 12px 0;">Gunakan kode verifikasi berikut untuk menyelesaikan proses autentikasi akun Anda:</p>
                <div style="background: #ffffff; border: 2px dashed #dc2626; border-radius: 10px; padding: 14px 20px; display: inline-block; letter-spacing: 8px; font-size: 30px; font-weight: 900; color: #991b1b; font-family: monospace;">
                    ${otpCode}
                </div>
                <p style="color: #64748b; font-size: 12px; margin: 12px 0 0 0;">
                    Kode ini berlaku selama <strong>${minutesValid} menit</strong>.
                </p>
            </div>

            <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 12px 16px; margin-bottom: 20px;">
                <p style="color: #991b1b; font-size: 11px; margin: 0; line-height: 1.4; font-weight: 600;">
                    ⚠️ <strong>Keamanan:</strong> Jangan bagikan kode ini kepada siapapun termasuk pihak yang mengatasnamakan HR atau Tim IT.
                </p>
            </div>

            <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0;">
                Email ini dibuat secara otomatis oleh Sistem Keamanan HRIS PT DEA GLOBAL NIAGA.
            </p>
        </div>
    `;

    console.log(`\n========================================`);
    console.log(`🛡️ [MFA EMAIL OTP] To: ${to}`);
    console.log(`🔢 OTP Code: ${otpCode}`);
    console.log(`⏱️ Valid for: ${minutesValid} Minutes`);
    console.log(`========================================\n`);

    try {
        const info = await transporter.sendMail({
            from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
            replyTo: SENDER_EMAIL,
            to: to,
            subject: `[HRIS DGN] Kode Verifikasi 2-Langkah (MFA): ${otpCode}`,
            html: htmlContent
        });
        console.log('MFA OTP email sent successfully:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (err) {
        console.error('Failed to send MFA OTP email:', err);
        return { success: false, error: err.message };
    }
};

/**
 * Sends email to all HSE Admins when an employee uploads a new certificate
 */
const sendHseNewCertUploadEmail = async ({ toEmails, employeeName, certName, certNumber, issueDate, expiryDate, link }) => {
    if (!toEmails || toEmails.length === 0) return { success: false, message: 'No HSE admin emails provided' };

    const actionLink = link || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/organization?tab=certifications&subtab=pending`;
    const htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
            <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #991b1b; font-size: 20px; font-weight: 900; margin: 0;">PT DEA GLOBAL NIAGA</h1>
                <p style="color: #64748b; font-size: 12px; margin-top: 4px; font-weight: 700;">DIVISI K3 & KESELAMATAN KERJA (HSE)</p>
            </div>

            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                <h2 style="color: #0f172a; font-size: 16px; font-weight: 800; margin: 0 0 8px 0;">📑 Pengajuan Verifikasi Sertifikat K3 Baru</h2>
                <p style="color: #475569; font-size: 13px; margin: 0 0 16px 0; line-height: 1.5;">
                    Karyawan telah mengunggah dokumen sertifikat K3 baru dan memerlukan pemeriksaan serta verifikasi dari Admin HSE:
                </p>

                <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #1e293b;">
                    <tr>
                        <td style="padding: 8px 12px; font-weight: bold; background: #f1f5f9; width: 35%; border-radius: 6px 0 0 0;">Nama Karyawan</td>
                        <td style="padding: 8px 12px; background: #ffffff; border: 1px solid #e2e8f0;">${employeeName || '-'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 12px; font-weight: bold; background: #f1f5f9;">Jenis Sertifikasi</td>
                        <td style="padding: 8px 12px; background: #ffffff; border: 1px solid #e2e8f0; font-weight: bold; color: #991b1b;">${certName || '-'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 12px; font-weight: bold; background: #f1f5f9;">Nomor Registrasi</td>
                        <td style="padding: 8px 12px; background: #ffffff; border: 1px solid #e2e8f0; font-family: monospace;">${certNumber || '-'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 12px; font-weight: bold; background: #f1f5f9;">Tanggal Terbit</td>
                        <td style="padding: 8px 12px; background: #ffffff; border: 1px solid #e2e8f0;">${issueDate || '-'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 12px; font-weight: bold; background: #f1f5f9; border-radius: 0 0 0 6px;">Masa Berlaku</td>
                        <td style="padding: 8px 12px; background: #ffffff; border: 1px solid #e2e8f0;">${expiryDate || 'Seumur Hidup / Tidak Terbatas'}</td>
                    </tr>
                </table>
            </div>

            <div style="text-align: center; margin: 28px 0;">
                <a href="${actionLink}" style="background-color: #991b1b; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 13px; font-weight: 800; display: inline-block; box-shadow: 0 2px 6px rgba(153, 27, 27, 0.3);">
                    Buka Matriks K3 & Verifikasi Dokumen
                </a>
            </div>

            <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0; line-height: 1.4;">
                Email ini dikirimkan secara otomatis oleh Sistem HRIS K3 PT DEA GLOBAL NIAGA kepada seluruh Admin HSE terdaftar.
            </p>
        </div>
    `;

    const recipients = Array.isArray(toEmails) ? toEmails.join(',') : toEmails;
    try {
        const info = await transporter.sendMail({
            from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
            replyTo: SENDER_EMAIL,
            to: recipients,
            subject: `[HRIS DGN] Pengajuan Sertifikat K3 Baru: ${employeeName} (${certName})`,
            html: htmlContent
        });
        console.log('HSE cert upload email sent successfully:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (err) {
        console.error('Failed to send HSE cert upload email:', err);
        return { success: false, error: err.message };
    }
};

/**
 * Sends email to employee when their certificate is approved
 */
const sendCertApprovalEmail = async ({ toEmail, employeeName, certName, certNumber, adminName, expiryDate, link }) => {
    if (!toEmail) return { success: false, message: 'No employee email provided' };

    const actionLink = link || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/personal-certifications`;
    const htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
            <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #991b1b; font-size: 20px; font-weight: 900; margin: 0;">PT DEA GLOBAL NIAGA</h1>
                <p style="color: #64748b; font-size: 12px; margin-top: 4px; font-weight: 700;">PORTAL SERTIFIKASI & KOMPETENSI KERJA</p>
            </div>

            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                    <span style="font-size: 20px;">✅</span>
                    <h2 style="color: #166534; font-size: 16px; font-weight: 800; margin: 0;">Sertifikat K3 Anda Telah Disetujui!</h2>
                </div>
                <p style="color: #15803d; font-size: 13px; margin: 0 0 16px 0; line-height: 1.5;">
                    Halo <strong>${employeeName || 'Karyawan'}</strong>, pengajuan berkas sertifikasi Anda telah diverifikasi dan disetujui resmi oleh Tim HSE.
                </p>

                <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #1e293b;">
                    <tr>
                        <td style="padding: 8px 12px; font-weight: bold; background: #e2e8f0; width: 35%;">Jenis Sertifikat</td>
                        <td style="padding: 8px 12px; background: #ffffff; border: 1px solid #e2e8f0; font-weight: bold; color: #166534;">${certName || '-'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 12px; font-weight: bold; background: #e2e8f0;">Nomor Sertifikat</td>
                        <td style="padding: 8px 12px; background: #ffffff; border: 1px solid #e2e8f0; font-family: monospace;">${certNumber || '-'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 12px; font-weight: bold; background: #e2e8f0;">Diverifikasi Oleh</td>
                        <td style="padding: 8px 12px; background: #ffffff; border: 1px solid #e2e8f0;">${adminName || 'Admin HSE'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 12px; font-weight: bold; background: #e2e8f0;">Masa Berlaku</td>
                        <td style="padding: 8px 12px; background: #ffffff; border: 1px solid #e2e8f0;">${expiryDate || 'Seumur Hidup / Tidak Terbatas'}</td>
                    </tr>
                </table>
            </div>

            <div style="text-align: center; margin: 28px 0;">
                <a href="${actionLink}" style="background-color: #15803d; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 13px; font-weight: 800; display: inline-block;">
                    Lihat Portofolio Sertifikasi Saya
                </a>
            </div>

            <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0;">
                Email ini dikirim otomatis oleh Sistem HRIS PT DEA GLOBAL NIAGA.
            </p>
        </div>
    `;

    try {
        const info = await transporter.sendMail({
            from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
            replyTo: SENDER_EMAIL,
            to: toEmail,
            subject: `[HRIS DGN] Sertifikat Disetujui: ${certName}`,
            html: htmlContent
        });
        console.log('Cert approval email sent successfully:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (err) {
        console.error('Failed to send cert approval email:', err);
        return { success: false, error: err.message };
    }
};

/**
 * Sends email to employee when their certificate is rejected
 */
const sendCertRejectionEmail = async ({ toEmail, employeeName, certName, certNumber, adminName, reason, link }) => {
    if (!toEmail) return { success: false, message: 'No employee email provided' };

    const actionLink = link || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/personal-certifications`;
    const htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
            <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #991b1b; font-size: 20px; font-weight: 900; margin: 0;">PT DEA GLOBAL NIAGA</h1>
                <p style="color: #64748b; font-size: 12px; margin-top: 4px; font-weight: 700;">DIVISI K3 & KESELAMATAN KERJA (HSE)</p>
            </div>

            <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                    <span style="font-size: 20px;">❌</span>
                    <h2 style="color: #991b1b; font-size: 16px; font-weight: 800; margin: 0;">Pemberitahuan: Pengajuan Sertifikat Ditolak</h2>
                </div>
                <p style="color: #7f1d1d; font-size: 13px; margin: 0 0 16px 0; line-height: 1.5;">
                    Halo <strong>${employeeName || 'Karyawan'}</strong>, berkas pengajuan sertifikat Anda belum dapat disetujui oleh Tim HSE dengan rincian sebagai berikut:
                </p>

                <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #1e293b; margin-bottom: 16px;">
                    <tr>
                        <td style="padding: 8px 12px; font-weight: bold; background: #fee2e2; width: 35%;">Jenis Sertifikat</td>
                        <td style="padding: 8px 12px; background: #ffffff; border: 1px solid #fecaca; font-weight: bold;">${certName || '-'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 12px; font-weight: bold; background: #fee2e2;">Nomor Sertifikat</td>
                        <td style="padding: 8px 12px; background: #ffffff; border: 1px solid #fecaca; font-family: monospace;">${certNumber || '-'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 12px; font-weight: bold; background: #fee2e2;">Diverifikasi Oleh</td>
                        <td style="padding: 8px 12px; background: #ffffff; border: 1px solid #fecaca;">${adminName || 'Admin HSE'}</td>
                    </tr>
                </table>

                <div style="background-color: #ffffff; border-left: 4px solid #dc2626; border-radius: 4px; padding: 12px 14px;">
                    <p style="margin: 0; font-size: 12px; font-weight: bold; color: #991b1b;">Alasan Penolakan dari Admin HSE:</p>
                    <p style="margin: 4px 0 0 0; font-size: 13px; color: #334155; line-height: 1.4;">
                        ${reason || 'Dokumen buram / tidak sesuai dengan standar legalitas institusi penerbit.'}
                    </p>
                </div>
            </div>

            <p style="font-size: 13px; color: #475569; line-height: 1.5; margin-bottom: 20px;">
                Silakan lakukan unggah ulang dokumen sertifikat yang jelas dan sesuai melalui tombol di bawah:
            </p>

            <div style="text-align: center; margin: 24px 0;">
                <a href="${actionLink}" style="background-color: #dc2626; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 13px; font-weight: 800; display: inline-block;">
                    Unggah Ulang Sertifikat
                </a>
            </div>

            <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0;">
                Email ini dikirim otomatis oleh Sistem HRIS PT DEA GLOBAL NIAGA.
            </p>
        </div>
    `;

    try {
        const info = await transporter.sendMail({
            from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
            replyTo: SENDER_EMAIL,
            to: toEmail,
            subject: `[HRIS DGN] Pemberitahuan: Sertifikat Ditolak - ${certName}`,
            html: htmlContent
        });
        console.log('Cert rejection email sent successfully:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (err) {
        console.error('Failed to send cert rejection email:', err);
        return { success: false, error: err.message };
    }
};

/**
 * Sends warning email when certificate is expiring within 90 days
 */
const sendCertExpiringEmail = async ({ toEmail, recipientName, certName, certNumber, expiryDate, daysLeft, roleType }) => {
    if (!toEmail) return { success: false, message: 'No email provided' };

    const isHseRecipient = roleType === 'hse_admin';
    const actionLink = isHseRecipient 
        ? `${process.env.FRONTEND_URL || 'http://localhost:5173'}/organization?tab=certifications&expiry=expiring`
        : `${process.env.FRONTEND_URL || 'http://localhost:5173'}/personal-certifications`;

    const htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
            <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #991b1b; font-size: 20px; font-weight: 900; margin: 0;">PT DEA GLOBAL NIAGA</h1>
                <p style="color: #64748b; font-size: 12px; margin-top: 4px; font-weight: 700;">PERINGATAN MASA BERLAKU KUALIFIKASI K3</p>
            </div>

            <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                    <span style="font-size: 20px;">⚠️</span>
                    <h2 style="color: #92400e; font-size: 16px; font-weight: 800; margin: 0;">Masa Berlaku Sertifikat Mendekati Batas Akhir</h2>
                </div>
                <p style="color: #78350f; font-size: 13px; margin: 0 0 16px 0; line-height: 1.5;">
                    Halo <strong>${recipientName || 'Pengguna'}</strong>, sistem mendeteksi masa berlaku sertifikat berikut tersisa <strong>≤ 90 hari</strong>:
                </p>

                <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #1e293b;">
                    <tr>
                        <td style="padding: 8px 12px; font-weight: bold; background: #fef3c7; width: 35%;">Jenis Sertifikat</td>
                        <td style="padding: 8px 12px; background: #ffffff; border: 1px solid #fde68a; font-weight: bold; color: #b45309;">${certName || '-'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 12px; font-weight: bold; background: #fef3c7;">Nomor Sertifikat</td>
                        <td style="padding: 8px 12px; background: #ffffff; border: 1px solid #fde68a; font-family: monospace;">${certNumber || '-'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 12px; font-weight: bold; background: #fef3c7;">Tanggal Kedaluwarsa</td>
                        <td style="padding: 8px 12px; background: #ffffff; border: 1px solid #fde68a; font-weight: bold;">${expiryDate || '-'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 12px; font-weight: bold; background: #fef3c7;">Sisa Hari</td>
                        <td style="padding: 8px 12px; background: #ffffff; border: 1px solid #fde68a; font-weight: 900; color: #dc2626;">${daysLeft} Hari Lagi</td>
                    </tr>
                </table>
            </div>

            <p style="font-size: 13px; color: #475569; line-height: 1.5; margin-bottom: 20px;">
                Harap segera mempersiapkan pembaharuan lisensi / sertifikasi untuk memastikan kepatuhan regulasi keselamatan kerja di lingkungan operasional PT DEA GLOBAL NIAGA.
            </p>

            <div style="text-align: center; margin: 24px 0;">
                <a href="${actionLink}" style="background-color: #d97706; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 13px; font-weight: 800; display: inline-block;">
                    Buka Rincian Sertifikat
                </a>
            </div>

            <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0;">
                Email ini dikirim otomatis oleh Scheduler Sistem HRIS PT DEA GLOBAL NIAGA.
            </p>
        </div>
    `;

    try {
        const info = await transporter.sendMail({
            from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
            replyTo: SENDER_EMAIL,
            to: toEmail,
            subject: `[HRIS DGN] Peringatan Masa Berlaku Sertifikat K3 (Sisa ${daysLeft} Hari): ${certName}`,
            html: htmlContent
        });
        console.log('Cert expiring email sent successfully:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (err) {
        console.error('Failed to send cert expiring email:', err);
        return { success: false, error: err.message };
    }
};

/**
 * Sends email alert when an account performs critical security activities:
 * - Change Username
 * - Change Password
 * - Update Recovery Email
 * - Enable / Disable MFA
 */
const sendSecurityActivityEmail = async ({ toEmail, recipientName, activityType, details, timestamp, ipAddress, userAgent }) => {
    if (!toEmail) return { success: false, message: 'No recipient email provided' };

    const formattedTime = timestamp || new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' }) + ' WITA';
    const htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 550px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
            <div style="text-align: center; margin-bottom: 24px;">
                <div style="display: inline-block; background: #fee2e2; border: 1px solid #fca5a5; width: 44px; height: 44px; border-radius: 12px; line-height: 44px; font-size: 20px;">
                    🛡️
                </div>
                <h1 style="color: #991b1b; font-size: 18px; font-weight: 900; margin: 12px 0 2px 0;">PT DEA GLOBAL NIAGA</h1>
                <p style="color: #64748b; font-size: 12px; margin: 0; font-weight: 700;">NOTIFIKASI AKTIVITAS KEAMANAN AKUN</p>
            </div>

            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                <h2 style="color: #0f172a; font-size: 15px; font-weight: 800; margin: 0 0 8px 0;">${activityType}</h2>
                <p style="color: #475569; font-size: 13px; margin: 0 0 16px 0; line-height: 1.5;">
                    Halo <strong>${recipientName || 'Pengguna'}</strong>, sistem kami mendeteksi perubahan konfigurasi keamanan pada akun HRIS Anda:
                </p>

                <table style="width: 100%; border-collapse: collapse; font-size: 12px; color: #1e293b;">
                    <tr>
                        <td style="padding: 8px 10px; font-weight: bold; background: #f1f5f9; width: 35%;">Aktivitas</td>
                        <td style="padding: 8px 10px; background: #ffffff; border: 1px solid #e2e8f0; font-weight: bold; color: #991b1b;">${activityType}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 10px; font-weight: bold; background: #f1f5f9;">Keterangan</td>
                        <td style="padding: 8px 10px; background: #ffffff; border: 1px solid #e2e8f0;">${details || '-'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 10px; font-weight: bold; background: #f1f5f9;">Waktu Kejadian</td>
                        <td style="padding: 8px 10px; background: #ffffff; border: 1px solid #e2e8f0;">${formattedTime}</td>
                    </tr>
                    ${ipAddress ? `
                    <tr>
                        <td style="padding: 8px 10px; font-weight: bold; background: #f1f5f9;">Alamat IP</td>
                        <td style="padding: 8px 10px; background: #ffffff; border: 1px solid #e2e8f0; font-family: monospace;">${ipAddress}</td>
                    </tr>
                    ` : ''}
                </table>
            </div>

            <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 12px 16px; margin-bottom: 20px;">
                <p style="color: #991b1b; font-size: 11px; margin: 0; line-height: 1.4; font-weight: 600;">
                    ⚠️ <strong>Penting:</strong> Jika Anda tidak merasa melakukan perubahan ini, akun Anda mungkin dalam bahaya. Segera hubungi Tim IT Administrator atau lakukan reset password.
                </p>
            </div>

            <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0;">
                Email ini dibuat secara otomatis oleh Sistem Keamanan HRIS PT DEA GLOBAL NIAGA.
            </p>
        </div>
    `;

    try {
        const info = await transporter.sendMail({
            from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
            replyTo: SENDER_EMAIL,
            to: toEmail,
            subject: `[HRIS DGN] Peringatan Keamanan Akun: ${activityType}`,
            html: htmlContent
        });
        console.log('Security activity email sent successfully:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (err) {
        console.error('Failed to send security activity email:', err);
        return { success: false, error: err.message };
    }
};

/**
 * Helper to fetch all active HSE Admin emails dynamically
 */
const getHseAdminEmails = async (supabaseClient) => {
    try {
        const { data: users, error } = await supabaseClient
            .from('users')
            .select(`
                id,
                username,
                email,
                recovery_email,
                roles (name),
                employees (
                    department_id,
                    email_office,
                    departments (name)
                )
            `)
            .neq('is_active', false);

        if (error || !users) return [];

        const emails = new Set();
        users.forEach(u => {
            const roleName = (u.roles?.name || '').toLowerCase();
            const emp = Array.isArray(u.employees) ? u.employees[0] : u.employees;
            const deptName = (emp?.departments?.name || '').toLowerCase();
            const username = (u.username || '').toLowerCase();

            const isHSE = roleName === 'hse_admin' || 
                          username === 'hse_admin' || 
                          (roleName === 'admin' && (deptName.includes('hse') || deptName.includes('k3') || deptName.includes('safety')));

            if (isHSE) {
                if (u.email && u.email.includes('@')) emails.add(u.email.trim());
                if (u.recovery_email && u.recovery_email.includes('@')) emails.add(u.recovery_email.trim());
                if (emp?.email_office && emp.email_office.includes('@')) emails.add(emp.email_office.trim());
            }
        });

        return Array.from(emails);
    } catch (e) {
        console.error('getHseAdminEmails error:', e);
        return [];
    }
};

module.exports = {
    sendRequestNotification,
    sendPasswordResetOtpEmail,
    sendMfaOtpEmail,
    sendHseNewCertUploadEmail,
    sendCertApprovalEmail,
    sendCertRejectionEmail,
    sendCertExpiringEmail,
    sendSecurityActivityEmail,
    getHseAdminEmails
};
