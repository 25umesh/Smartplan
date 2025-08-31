
'use server';
/**
 * @fileOverview A Genkit flow for sending emails.
 *
 * - sendEmailAction - A function that sends an email with a given subject and body.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { sendEmail } from '@/services/email-service';
import type { SendEmailInput } from '@/lib/types';
import { SendEmailInputSchema } from '@/lib/types';

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
