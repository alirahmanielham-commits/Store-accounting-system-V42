import nodemailer from 'nodemailer';

// You can configure this via environment variables
// SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.example.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || 'user',
    pass: process.env.SMTP_PASS || 'pass',
  },
});

export const sendEmail = async (to: string, subject: string, text: string, html?: string) => {
  if (!process.env.SMTP_HOST) {
    console.log(`[Email Simulation] To: ${to}, Subject: ${subject}`);
    return; // Simulating email if not configured
  }
  
  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"سیستم حسابداری" <no-reply@example.com>',
      to,
      subject,
      text,
      html,
    });
    console.log('Message sent: %s', info.messageId);
  } catch (error) {
    console.error('Error sending email:', error);
  }
};
