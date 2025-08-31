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
  priority?: 'low' | 'medium' | 'high' | null;
  completed: boolean;
  createdAt: string; // ISO string
  reminders: Reminder[];
}
