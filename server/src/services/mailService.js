import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let capturedEmails = [];

export const getCapturedEmails = () => capturedEmails;
export const getLastCapturedEmail = () => capturedEmails[capturedEmails.length - 1];
export const clearCapturedEmails = () => {
  capturedEmails = [];
};

// Check: Refuse console mode in production environment
if (env.MAIL_TRANSPORT === 'console' && env.NODE_ENV === 'production') {
  const errMsg = 'FATAL: MAIL_TRANSPORT=console is refused in production environment. Configure SMTP transport.';
  console.error(errMsg);
  throw new Error(errMsg);
}

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

  // Verify connection configuration on startup without logging credentials
  smtpTransporter.verify().then(() => {
    console.log(`[MAIL] SMTP transport ready at ${env.SMTP_HOST}:${env.SMTP_PORT} (sender: ${env.MAIL_FROM})`);
  }).catch((err) => {
    console.warn(`[MAIL] SMTP transport verification warning: ${err.message}`);
  });
}

/**
 * Core mail dispatcher
 */
const sendMail = async ({ to, subject, text, html, code }) => {
  const mailRecord = { to, subject, text, html, code, sentAt: new Date() };
  capturedEmails.push(mailRecord);

  if (env.MAIL_TRANSPORT === 'console') {
    if (env.NODE_ENV === 'production') {
      throw new Error('MAIL_TRANSPORT=console is not allowed in production');
    }
    console.log('\n[CONSOLE MAIL TRANSPORT]');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    if (code) {
      console.log(`Code: [ ${code} ]`);
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
      console.error(`Failed to send email to ${to}: ${err.message}`);
      const sendErr = new Error('EMAIL_SEND_FAILED');
      sendErr.code = 'EMAIL_SEND_FAILED';
      sendErr.status = 503;
      throw sendErr;
    }
  }

  console.log(`[MAIL] Transport "${env.MAIL_TRANSPORT}" captured email to ${to}`);
  return mailRecord;
};

/**
 * "Your ChessTourn verification code" template
 * 6-digit code large, 10-minute validity, ignore notice, NO LINKS.
 */
export const sendVerificationOtpEmail = async (to, code) => {
  const subject = 'Your ChessTourn verification code';
  const text = `Your ChessTourn verification code is:\n\n${code}\n\nThis code is valid for 10 minutes.\nIf you did not request this, ignore this e-mail.`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #0b0b0c; color: #ffffff; border-radius: 12px; border: 1px solid #262628;">
      <h2 style="margin: 0 0 16px; color: #ffffff; font-size: 20px; font-weight: 600;">ChessTourn Verification</h2>
      <p style="margin: 0 0 24px; color: #a1a1aa; font-size: 14px; line-height: 1.5;">Use the following 6-digit code to verify your e-mail address:</p>
      <div style="margin: 0 0 24px; padding: 20px; background: #141416; border: 1px solid #2c2c2f; border-radius: 8px; text-align: center;">
        <span style="font-family: monospace; font-size: 34px; font-weight: 700; letter-spacing: 8px; color: #e8c27a; display: inline-block;">${code}</span>
      </div>
      <p style="margin: 0 0 8px; color: #d4d4d8; font-size: 13px;">This code is valid for <strong>10 minutes</strong>.</p>
      <p style="margin: 0; color: #71717a; font-size: 12px;">If you did not request this, ignore this e-mail.</p>
    </div>
  `;
  return sendMail({ to, subject, text, html, code });
};

/**
 * "Your ChessTourn password reset code" template
 * 6-digit code large, 10-minute validity, ignore notice, NO LINKS.
 */
export const sendPasswordResetOtpEmail = async (to, code) => {
  const subject = 'Your ChessTourn password reset code';
  const text = `Your ChessTourn password reset code is:\n\n${code}\n\nThis code is valid for 10 minutes.\nIf you did not request this, ignore this e-mail.`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #0b0b0c; color: #ffffff; border-radius: 12px; border: 1px solid #262628;">
      <h2 style="margin: 0 0 16px; color: #ffffff; font-size: 20px; font-weight: 600;">ChessTourn Password Reset</h2>
      <p style="margin: 0 0 24px; color: #a1a1aa; font-size: 14px; line-height: 1.5;">Use the following 6-digit code to reset your password:</p>
      <div style="margin: 0 0 24px; padding: 20px; background: #141416; border: 1px solid #2c2c2f; border-radius: 8px; text-align: center;">
        <span style="font-family: monospace; font-size: 34px; font-weight: 700; letter-spacing: 8px; color: #e8c27a; display: inline-block;">${code}</span>
      </div>
      <p style="margin: 0 0 8px; color: #d4d4d8; font-size: 13px;">This code is valid for <strong>10 minutes</strong>.</p>
      <p style="margin: 0; color: #71717a; font-size: 12px;">If you did not request this, ignore this e-mail.</p>
    </div>
  `;
  return sendMail({ to, subject, text, html, code });
};

// Aliases for compatibility
export const sendVerificationEmail = sendVerificationOtpEmail;
export const sendPasswordResetEmail = sendPasswordResetOtpEmail;

export const sendAccountApprovedEmail = async (to, fullName) => {
  const subject = 'Your account was approved';
  const text = `Hello ${fullName || ''},\n\nYour account has been approved by an administrator. You may now log in to the Chess Tournament platform at ${env.CLIENT_URL}/login.`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Account Approved</h2>
      <p>Hello ${fullName || ''},</p>
      <p>Your account has been approved by an administrator. You may now log in to participate in tournaments and activities.</p>
      <p><a href="${env.CLIENT_URL}/login" style="background-color: #16a34a; color: #ffffff; padding: 10px 18px; text-decoration: none; border-radius: 4px; display: inline-block;">Log In Now</a></p>
    </div>
  `;
  return sendMail({ to, subject, text, html });
};

export const sendAccountRejectedEmail = async (to, fullName, note) => {
  const subject = 'Your account registration update';
  const text = `Hello ${fullName || ''},\n\nYour account was not approved by an administrator.\n${note ? `Reason/Note: ${note}` : ''}`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Account Registration Update</h2>
      <p>Hello ${fullName || ''},</p>
      <p>Your account was not approved by an administrator.</p>
      ${note ? `<p><strong>Note:</strong> ${note}</p>` : ''}
    </div>
  `;
  return sendMail({ to, subject, text, html });
};

export default {
  sendVerificationOtpEmail,
  sendPasswordResetOtpEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendAccountApprovedEmail,
  sendAccountRejectedEmail,
  getCapturedEmails,
  getLastCapturedEmail,
  clearCapturedEmails
};
