import { config } from 'dotenv';
config();

import '@/ai/flows/suggest-optimal-reminder-times.ts';
import '@/ai/flows/generate-schedule-from-prompt.ts';
import '@/ai/flows/detect-task-details-from-text.ts';