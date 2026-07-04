const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: (Number(process.env.SMTP_PORT) || 587) === 465,
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
  tls: {
    rejectUnauthorized: false
  },
  connectionTimeout: 8000, // 8s connection timeout
  greetingTimeout: 8000,
});

exports.sendOtpEmail = async (toEmail, code) => {
  // Check if SMTP is configured
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log(`\n======================================================`);
    console.log(`[Developer Fallback Mode] SMTP credentials not set in .env`);
    console.log(`Verification Code for ${toEmail}: ${code}`);
    console.log(`======================================================\n`);
    return { success: true, mock: true, message: 'Developer Fallback Mode: Code printed in server console.' };
  }

  try {
    const mailOptions = {
      from: `"Ethnus Attendance Verification" <${process.env.SMTP_USER}>`,
      to: toEmail,
      subject: 'Email Verification Code - Ethnus Attendance',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 600px;">
          <h2 style="color: #4f46e5; margin-bottom: 20px;">Ethnus Trainer Attendance</h2>
          <p>Welcome! You are registering a trainer account on the Ethnus Attendance Management & Live Verification System.</p>
          <p>Please use the following 4-digit verification code to verify your email address:</p>
          <div style="background-color: #f1f5f9; padding: 15px; border-radius: 6px; font-size: 24px; font-weight: bold; letter-spacing: 4px; text-align: center; margin: 20px 0; color: #1e293b;">
            ${code}
          </div>
          <p style="color: #64748b; font-size: 12px; margin-top: 20px;">This code is valid for 10 minutes. If you did not request this, please ignore this email.</p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[SMTP Mail Sent] Verification email delivered to ${toEmail}: ${info.messageId}`);
    return { success: true, mock: false, messageId: info.messageId };
  } catch (error) {
    console.error(`[SMTP Mail Error] Failed to send email to ${toEmail}:`, error.message);
    
    // Fall back to printing in console so registration doesn't break
    console.log(`\n======================================================`);
    console.log(`[SMTP Error Fallback] Connection failed: ${error.message}`);
    console.log(`Verification Code for ${toEmail}: ${code}`);
    console.log(`======================================================\n`);
    return { success: true, mock: true, fallbackReason: error.message };
  }
};

exports.sendPasswordResetOtpEmail = async (toEmail, code) => {
  // Check if SMTP is configured
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log(`\n======================================================`);
    console.log(`[Developer Fallback Mode] SMTP credentials not set in .env`);
    console.log(`Password Reset Verification Code for ${toEmail}: ${code}`);
    console.log(`======================================================\n`);
    return { success: true, mock: true, message: 'Developer Fallback Mode: Code printed in server console.' };
  }

  try {
    const mailOptions = {
      from: `"Ethnus Attendance Verification" <${process.env.SMTP_USER}>`,
      to: toEmail,
      subject: 'Password Reset Code - Ethnus Attendance',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 600px;">
          <h2 style="color: #4f46e5; margin-bottom: 20px;">Ethnus Trainer Attendance</h2>
          <p>You requested a password reset for your trainer account on the Ethnus Attendance Management & Live Verification System.</p>
          <p>Please use the following 4-digit verification code to reset your password:</p>
          <div style="background-color: #f1f5f9; padding: 15px; border-radius: 6px; font-size: 24px; font-weight: bold; letter-spacing: 4px; text-align: center; margin: 20px 0; color: #1e293b;">
            ${code}
          </div>
          <p style="color: #64748b; font-size: 12px; margin-top: 20px;">This code is valid for 10 minutes. If you did not request this, please ignore this email.</p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[SMTP Mail Sent] Password Reset email delivered to ${toEmail}: ${info.messageId}`);
    return { success: true, mock: false, messageId: info.messageId };
  } catch (error) {
    console.error(`[SMTP Mail Error] Failed to send password reset email to ${toEmail}:`, error.message);
    
    // Fall back to printing in console
    console.log(`\n======================================================`);
    console.log(`[SMTP Error Fallback] Connection failed: ${error.message}`);
    console.log(`Password Reset Verification Code for ${toEmail}: ${code}`);
    console.log(`======================================================\n`);
    return { success: true, mock: true, fallbackReason: error.message };
  }
};

