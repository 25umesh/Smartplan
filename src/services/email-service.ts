
import nodemailer from 'nodemailer';

const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASS;
const toEmail = process.env.TO_EMAIL;

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: emailUser,
        pass: emailPass,
    }
});

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string; }) {
  if (!emailUser || !emailPass) {
    console.log('--- SENDING EMAIL (SIMULATED) ---');
    console.log('TO:', to);
    console.log('SUBJECT:', subject);
    console.log('BODY (HTML):', html);
    console.log('--- EMAIL SENT (SIMULATED) ---');
    console.log('Email sending is not configured. Please set EMAIL_USER and EMAIL_PASS in your .env file.');
    return { id: `simulated_${Date.now()}` };
  }

  const mailOptions = {
    from: `"SmartPlan" <${emailUser}>`,
    to: to,
    subject: subject,
    html: html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send email.');
  }
}
