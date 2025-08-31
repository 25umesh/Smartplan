
'use server';
/**
 * @fileOverview AI agent that suggests optimal times for setting reminders based on tasks.
 *
 * - suggestOptimalReminderTimes - A function that suggests optimal reminder times.
 * - SuggestOptimalReminderTimesInput - The input type for the suggestOptimalReminderTimes function.
 * - SuggestOptimalReminderTimesOutput - The return type for the suggestOptimalReminderTimes function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestOptimalReminderTimesInputSchema = z.object({
  taskDescription: z
    .string()
    .describe('The description of the task for which to suggest reminder times.'),
  deadline: z
    .string()
    .optional()
    .describe('The deadline for the task, if any, in ISO format.'),
  priority: z
    .enum(['low', 'medium', 'high'])
    .optional()
    .describe('The priority of the task.'),
});
export type SuggestOptimalReminderTimesInput = z.infer<
  typeof SuggestOptimalReminderTimesInputSchema
>;

const SuggestOptimalReminderTimesOutputSchema = z.object({
  suggestedReminderTimes: z
    .array(z.string())
    .describe(
      'An array of suggested reminder times in ISO format, ordered from earliest to latest.'
    ),
  reasoning: z
    .string()
    .describe(
      'The AI agents reasoning for suggesting the reminder times, including how it considered the task description and deadline.'
    ),
});
export type SuggestOptimalReminderTimesOutput = z.infer<
  typeof SuggestOptimalReminderTimesOutputSchema
>;

export async function suggestOptimalReminderTimes(
  input: SuggestOptimalReminderTimesInput
): Promise<SuggestOptimalReminderTimesOutput> {
  return suggestOptimalReminderTimesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestOptimalReminderTimesPrompt',
  input: {schema: SuggestOptimalReminderTimesInputSchema},
  output: {schema: SuggestOptimalReminderTimesOutputSchema},
  prompt: `You are a personal assistant AI that suggests optimal reminder times for tasks.

  Given the following task description, deadline (if any), and priority, suggest an appropriate number of reminder times in ISO format.
  - If priority is "high", suggest exactly 12 reminder times.
  - If priority is "medium", suggest exactly 6 reminder times.
  - If priority is "low", suggest exactly 3 reminder times.
  - If priority is not provided, suggest 6 reminder times as a default.

  Explain your reasoning for suggesting these times, considering the task description, deadline, and priority.

  Task description: {{{taskDescription}}}
  Deadline: {{{deadline}}}
  Priority: {{{priority}}}

  Format your response as a JSON object with "suggestedReminderTimes" (an array of ISO format datetimes) and "reasoning" fields.
`,
});

const suggestOptimalReminderTimesFlow = ai.defineFlow(
  {
    name: 'suggestOptimalReminderTimesFlow',
    inputSchema: SuggestOptimalReminderTimesInputSchema,
    outputSchema: SuggestOptimalReminderTimesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
