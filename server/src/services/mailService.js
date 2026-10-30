import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let capturedEmails = [];

export const getCapturedEmails = () => capturedEmails;
export const getLastCapturedEmail = () => capturedEmails[capturedEmails.length - 1];
export const clearCapturedEmails = () => {
  capturedEmails = [];
};

let smtpTransporter = null;
if (env.MAIL_TRANSPORT === 'smtp' && env.SMTP_HOST) {
  smtpTransporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS
    }
  });
}

/**
 * Generic mail dispatcher.
 */
const sendMail = async ({ to, subject, text, html, link, token }) => {
  const mailRecord = { to, subject, text, html, link, token, sentAt: new Date() };
  capturedEmails.push(mailRecord);

  if (env.MAIL_TRANSPORT === 'console') {
    // Development/console mode: print full verification/reset link to server terminal
    console.log('\n[CONSOLE MAIL TRANSPORT]');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    if (link) {
      console.log(`Link: ${link}`);
    } else {
      console.log(`Body: ${text}`);
    }
    console.log('[END CONSOLE MAIL TRANSPORT]\n');
    return mailRecord;
  }

  if (smtpTransporter) {
    try {
      return await smtpTransporter.sendMail({
        from: env.MAIL_FROM,
        to,
        subject,
        text,
        html
      });
    } catch (err) {
      console.error(`Failed to send email to ${to}:`, err.message);
      throw err;
    }
  }

  // Fallback if neither smtp nor console matched
  console.log(`[MAIL] To: ${to} | Subject: ${subject} | Link: ${link}`);
  return mailRecord;
};

export const sendVerificationEmail = async (to, token) => {
  const link = `${env.CLIENT_URL}/verify-email?token=${token}`;
  const subject = 'Verify your email';
  const text = `Welcome! Please verify your email by opening the following link in your browser:\n\n${link}\n\nThis link will expire in 24 hours.`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Welcome to Chess Tournament Management</h2>
      <p>Please click the button or link below to verify your email address:</p>
      <p><a href="${link}" style="background-color: #2563eb; color: #ffffff; padding: 10px 18px; text-decoration: none; border-radius: 4px; display: inline-block;">Verify Email</a></p>
      <p>Or open this link directly: <a href="${link}">${link}</a></p>
      <p><small>This link is valid for 24 hours and can only be used once.</small></p>
    </div>
  `;
  return sendMail({ to, subject, text, html, link, token });
};

export const sendPasswordResetEmail = async (to, token) => {
  const link = `${env.CLIENT_URL}/reset-password?token=${token}`;
  const subject = 'Reset your password';
  const text = `You requested a password reset. Please use the following link to choose a new password:\n\n${link}\n\nThis link will expire in 1 hour.`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Password Reset Request</h2>
      <p>We received a request to reset your password. Click the link below to choose a new password:</p>
      <p><a href="${link}" style="background-color: #dc2626; color: #ffffff; padding: 10px 18px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a></p>
      <p>Or open this link directly: <a href="${link}">${link}</a></p>
      <p><small>This link is valid for 1 hour and can only be used once. If you did not request this, you can safely ignore this email.</small></p>
    </div>
  `;
  return sendMail({ to, subject, text, html, link, token });
};

export const sendAccountApprovedEmail = async (to, fullName) => {
  const subject = 'Your account was approved';
  const text = `Hello ${fullName || ''},\n\nYour organizer account has been approved by an administrator. You may now log in to the Chess Tournament platform at ${env.CLIENT_URL}/login.`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Account Approved</h2>
      <p>Hello ${fullName || ''},</p>
      <p>Your organizer account has been approved by an administrator. You may now log in to manage tournaments and players.</p>
      <p><a href="${env.CLIENT_URL}/login" style="background-color: #16a34a; color: #ffffff; padding: 10px 18px; text-decoration: none; border-radius: 4px; display: inline-block;">Log In Now</a></p>
    </div>
  `;
  return sendMail({ to, subject, text, html });
};

export default {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendAccountApprovedEmail,
  getCapturedEmails,
  getLastCapturedEmail,
  clearCapturedEmails
};
