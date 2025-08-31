
'use server';
/**
 * @fileOverview A Genkit flow for sending emails.
 *
 * - sendEmailFlow - A function that sends an email with a given subject and body.
 * - SendEmailInput - The input type for the sendEmailFlow function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { sendEmail } from '@/services/email-service';

export const SendEmailInputSchema = z.object({
  subject: z.string().describe('The subject of the email.'),
  body: z.string().describe('The HTML body of the email.'),
});
export type SendEmailInput = z.infer<typeof SendEmailInputSchema>;

export async function sendEmailAction(input: SendEmailInput) {
    return sendEmailFlow(input);
}

const sendEmailFlow = ai.defineFlow(
  {
    name: 'sendEmailFlow',
    inputSchema: SendEmailInputSchema,
    outputSchema: z.any(),
  },
  async (input) => {
    // In a real application, you might use another LLM call here
    // to format the email body, but for now, we'll just send it directly.
    return await sendEmail({
      subject: input.subject,
      html: input.body,
    });
  }
);
