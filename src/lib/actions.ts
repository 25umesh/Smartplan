
'use server';

import fs from 'fs/promises';
import path from 'path';
import { revalidatePath } from 'next/cache';
import type { Reminder, Task } from './types';
import { detectTaskDetailsFromText } from '@/ai/flows/detect-task-details-from-text';
import { generateScheduleFromPrompt } from '@/ai/flows/generate-schedule-from-prompt';
import { suggestOptimalReminderTimes } from '@/ai/flows/suggest-optimal-reminder-times';
import { sendEmailAction } from '@/ai/flows/send-email-flow';
import { z } from 'zod';
import { format } from 'date-fns';

const tasksFilePath = path.join(process.cwd(), 'data', 'tasks.json');

async function readTasks(): Promise<Task[]> {
  try {
    const data = await fs.readFile(tasksFilePath, 'utf-8');
    return JSON.parse(data) as Task[];
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      await writeTasks([]);
      return []; // If file doesn't exist, create it and return empty array
    }
    console.error('Error reading tasks:', error);
    return [];
  }
}

async function writeTasks(tasks: Task[]): Promise<void> {
  try {
    const dataDirectory = path.dirname(tasksFilePath);
    await fs.mkdir(dataDirectory, { recursive: true });
    await fs.writeFile(tasksFilePath, JSON.stringify(tasks, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing tasks:', error);
    throw new Error('Failed to save tasks.');
  }
}

export async function getTasks(): Promise<Task[]> {
  const tasks = await readTasks();
  return tasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function addTask(taskData: Omit<Task, 'id' | 'createdAt' | 'completed' | 'reminders'>, toEmail: string | null) {
  const tasks = await readTasks();
  const newTask: Task = {
    id: crypto.randomUUID(),
    completed: false,
    createdAt: new Date().toISOString(),
    reminders: [],
    ...taskData,
  };
  tasks.unshift(newTask);
  await writeTasks(tasks);

  // Send confirmation email if an email address is provided
  if (toEmail) {
      await sendEmailAction({
        to: toEmail,
        subject: `Task Created: ${newTask.title}`,
        body: `<h1>Task Created</h1><p>Your new task, "${newTask.title}", has been successfully created.</p>`,
      });
  }

  revalidatePath('/');
  revalidatePath('/calendar');
  revalidatePath('/reminders');
  return newTask;
}

export async function updateTask(taskId: string, updates: Partial<Task>) {
  const tasks = await readTasks();
  const taskIndex = tasks.findIndex(t => t.id === taskId);
  if (taskIndex === -1) {
    throw new Error('Task not found');
  }
  tasks[taskIndex] = { ...tasks[taskIndex], ...updates };
  await writeTasks(tasks);
  revalidatePath('/');
  revalidatePath('/calendar');
  revalidatePath('/reminders');
  return tasks[taskIndex];
}

export async function deleteTask(taskId: string) {
  let tasks = await readTasks();
  tasks = tasks.filter(t => t.id !== taskId);
  await writeTasks(tasks);
  revalidatePath('/');
  revalidatePath('/calendar');
  revalidatePath('/reminders');
}

export async function toggleTaskCompletion(taskId: string) {
  const tasks = await readTasks();
  const task = tasks.find(t => t.id === taskId);
  if (task) {
    task.completed = !task.completed;
    await writeTasks(tasks);
    revalidatePath('/');
    revalidatePath('/calendar');
    revalidatePath('/reminders');
  }
}

export async function addReminders(taskId: string, remindersData: Omit<Reminder, 'id' | 'sent'>[], toEmail: string | null) {
    const tasks = await readTasks();
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) {
        throw new Error('Task not found');
    }

    const newReminders: Reminder[] = remindersData.map(reminderData => ({
        id: crypto.randomUUID(),
        sent: false,
        ...reminderData,
    }));

    tasks[taskIndex].reminders.push(...newReminders);
    await writeTasks(tasks);

    // Send reminder confirmation email if an email address is provided
    if (toEmail && newReminders.length > 0) {
        const reminderListHtml = newReminders
            .map(r => `<li>${format(new Date(r.remindAt), 'PPP p')} - <em>${r.message}</em></li>`)
            .join('');
        
        await sendEmailAction({
            to: toEmail,
            subject: `Reminders Set for "${tasks[taskIndex].title}"`,
            body: `<h1>Reminders Set</h1><p>The following reminders for your task, "<strong>${tasks[taskIndex].title}</strong>", have been set:</p><ul>${reminderListHtml}</ul>`,
        });
    }

    revalidatePath('/');
    revalidatePath('/calendar');
    revalidatePath('/reminders');
    return newReminders;
}


// AI-related actions
export async function detectDetailsAction(text: string) {
  if (!text.trim()) {
    return { error: 'Input text cannot be empty.' };
  }
  try {
    const result = await detectTaskDetailsFromText({ text });
    return { data: result };
  } catch (error) {
    console.error('AI Error:', error);
    return { error: 'Failed to detect task details.' };
  }
}

export async function generateScheduleAction(prompt: string) {
  if (!prompt.trim()) {
    return { error: 'Prompt cannot be empty.' };
  }
  try {
    const result = await generateScheduleFromPrompt({ scheduleDescription: prompt });
    return { data: result };
  } catch (error) {
    console.error('AI Error:', error);
    return { error: 'Failed to generate schedule.' };
  }
}

const SuggestRemindersSchema = z.object({
  taskDescription: z.string(),
  deadline: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
});

export async function suggestRemindersAction(input: z.infer<typeof SuggestRemindersSchema>) {
  if (!input.taskDescription.trim()) {
    return { error: 'Task description cannot be empty.' };
  }
  try {
    const result = await suggestOptimalReminderTimes(input);
    return { data: result };
  } catch (error) {
    console.error('AI Error:', error);
    return { error: 'Failed to suggest reminders.' };
  }
}
