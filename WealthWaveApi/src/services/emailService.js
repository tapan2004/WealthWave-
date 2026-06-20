import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create SMTP Transporter using .env variables
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.MAIL_PORT || '587', 10),
  secure: process.env.MAIL_PORT === '465', // true for 465, false for 587
  auth: {
    user: process.env.MAIL_USER || '',
    pass: process.env.MAIL_PASS || ''
  }
});

const fromEmail = process.env.MAIL_FROM || 'Finance Tracker <tabc1196@gmail.com>';

/**
 * Send simple plain text email
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} text - Plain text body
 */
export const sendEmail = async (to, subject, text) => {
  try {
    const mailOptions = { from: fromEmail, to, subject, text };
    const info = await transporter.sendMail(mailOptions);
    console.log(`✉️ Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`⚠️ Email sending failed to ${to}:`, error.message);
  }
};

/**
 * Send rich HTML email
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - HTML body content
 */
export const sendHtmlEmail = async (to, subject, html) => {
  try {
    const mailOptions = { from: fromEmail, to, subject, html };
    const info = await transporter.sendMail(mailOptions);
    console.log(`✉️ HTML Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`⚠️ HTML Email sending failed to ${to}:`, error.message);
  }
};

/**
 * Send email with file attachment (e.g. Excel spreadsheet)
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} text - Email body text
 * @param {Buffer} buffer - Attachment binary buffer content
 * @param {string} filename - Attachment filename
 */
export const sendEmailWithAttachment = async (to, subject, text, buffer, filename) => {
  try {
    const mailOptions = {
      from: fromEmail,
      to,
      subject,
      text,
      attachments: [
        {
          filename,
          content: buffer
        }
      ]
    };
    const info = await transporter.sendMail(mailOptions);
    console.log(`✉️ Email with attachment sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`⚠️ Email with attachment failed to ${to}:`, error.message);
  }
};

export default {
  sendEmail,
  sendHtmlEmail,
  sendEmailWithAttachment
};
