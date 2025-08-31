'use server';
/**
 * @fileOverview Detects task details from a block of text.
 *
 * - detectTaskDetailsFromText - A function that detects deadlines and task details from text.
 * - DetectTaskDetailsFromTextInput - The input type for the detectTaskDetailsFromText function.
 * - DetectTaskDetailsFromTextOutput - The return type for the detectTaskDetailsFromText function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DetectTaskDetailsFromTextInputSchema = z.object({
  text: z
    .string()
    .describe("A block of text containing information about tasks, deadlines, and other details."),
});
export type DetectTaskDetailsFromTextInput = z.infer<typeof DetectTaskDetailsFromTextInputSchema>;

const DetectTaskDetailsFromTextOutputSchema = z.object({
  taskName: z.string().describe("The name of the task."),
  deadline: z.string().describe("The deadline of the task, in ISO format, or null if not found.").nullable(),
  description: z.string().describe("A detailed description of the task.").nullable(),
});
export type DetectTaskDetailsFromTextOutput = z.infer<typeof DetectTaskDetailsFromTextOutputSchema>;

export async function detectTaskDetailsFromText(input: DetectTaskDetailsFromTextInput): Promise<DetectTaskDetailsFromTextOutput> {
  return detectTaskDetailsFromTextFlow(input);
}

const prompt = ai.definePrompt({
  name: 'detectTaskDetailsFromTextPrompt',
  input: {schema: DetectTaskDetailsFromTextInputSchema},
  output: {schema: DetectTaskDetailsFromTextOutputSchema},
  prompt: `You are an AI assistant designed to extract task details from a given text. Your goal is to identify the task name, deadline, and description, if present. If a piece of information is not present, set the output field to null.

Analyze the following text:

{{text}}

Provide the extracted information in a structured format.`,
});

const detectTaskDetailsFromTextFlow = ai.defineFlow(
  {
    name: 'detectTaskDetailsFromTextFlow',
    inputSchema: DetectTaskDetailsFromTextInputSchema,
    outputSchema: DetectTaskDetailsFromTextOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
