
import { Resend } from 'resend';

// NOTE: This is a placeholder for a real email sending service.
// You would replace this with your actual email sending logic.
// For local development, this will just log to the console.
// You can sign up for a free Resend account and get an API key
// to test this for real.

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const fromEmail = process.env.FROM_EMAIL || 'onboarding@resend.dev';
const toEmail = process.env.TO_EMAIL || 'delivered@resend.dev';

export async function sendEmail({ subject, html }: { subject: string; html: string; }) {
  if (resend) {
    try {
      const response = await resend.emails.send({
        from: fromEmail,
        to: toEmail,
        subject: subject,
        html: html,
      });
      console.log('Email sent:', response);
      return response;
    } catch (error) {
      console.error('Error sending email:', error);
      throw new Error('Failed to send email.');
    }
  } else {
    console.log('--- SENDING EMAIL ---');
    console.log('TO:', toEmail);
    console.log('FROM:', fromEmail);
    console.log('SUBJECT:', subject);
    console.log('BODY (HTML):', html);
    console.log('--- EMAIL SENT (SIMULATED) ---');
    // Simulate a successful response for local development
    return { id: `simulated_${Date.now()}` };
  }
}
