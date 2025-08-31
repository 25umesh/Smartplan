import { z } from 'zod';

export interface Reminder {
  id: string;
  remindAt: string; // ISO string
  sent: boolean;
  message: string;
}

export interface Task {
  id:string;
  title: string;
  description?: string | null;
  dueDate?: string | null; // ISO string
  completed: boolean;
  createdAt: string; // ISO string
  reminders: Reminder[];
}

export const SendEmailInputSchema = z.object({
  to: z.string().describe('The recipient of the email.'),
  subject: z.string().describe('The subject of the email.'),
  body: z.string().describe('The HTML body of the email.'),
});
export type SendEmailInput = z.infer<typeof SendEmailInputSchema>;
