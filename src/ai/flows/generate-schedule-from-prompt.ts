'use server';
/**
 * @fileOverview This file defines a Genkit flow for generating a detailed schedule from a natural language description.
 *
 * - generateScheduleFromPrompt - A function that takes a natural language description of a desired schedule and returns a detailed schedule.
 * - GenerateScheduleFromPromptInput - The input type for the generateScheduleFromPrompt function.
 * - GenerateScheduleFromPromptOutput - The return type for the generateScheduleFromPrompt function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateScheduleFromPromptInputSchema = z.object({
  scheduleDescription: z
    .string()
    .describe(
      'A natural language description of the desired schedule. Be as specific as possible, including the timings of different events.'
    ),
});
export type GenerateScheduleFromPromptInput = z.infer<
  typeof GenerateScheduleFromPromptInputSchema
>;

const GenerateScheduleFromPromptOutputSchema = z.object({
  scheduleDetails: z.string().describe('A detailed schedule generated from the provided description.'),
});
export type GenerateScheduleFromPromptOutput = z.infer<
  typeof GenerateScheduleFromPromptOutputSchema
>;

export async function generateScheduleFromPrompt(
  input: GenerateScheduleFromPromptInput
): Promise<GenerateScheduleFromPromptOutput> {
  return generateScheduleFromPromptFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateScheduleFromPromptPrompt',
  input: {schema: GenerateScheduleFromPromptInputSchema},
  output: {schema: GenerateScheduleFromPromptOutputSchema},
  prompt: `You are a personal assistant expert at creating schedules from natural language descriptions.

  Based on the following description, create a detailed schedule:

  {{{scheduleDescription}}}

  The schedule should include specific times and descriptions of each activity. Focus on being very precise with times. Use 24-hour clock.
  Example: 10:00 - Meeting with John
  11:00 - Work on presentation slides
  13:00 - Lunch with team.
  `,
});

const generateScheduleFromPromptFlow = ai.defineFlow(
  {
    name: 'generateScheduleFromPromptFlow',
    inputSchema: GenerateScheduleFromPromptInputSchema,
    outputSchema: GenerateScheduleFromPromptOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
