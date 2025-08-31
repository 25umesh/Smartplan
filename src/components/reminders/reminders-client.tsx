
'use client';

import { useState } from 'react';
import type { Task } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { format, parseISO } from 'date-fns';
import { Bell, CheckCircle2, Circle } from 'lucide-react';
import { ReminderDialog } from '../tasks/reminder-dialog';
import { Button } from '../ui/button';
import Image from 'next/image';

interface RemindersClientProps {
  tasks: Task[];
}

export function RemindersClient({ tasks: initialTasks }: RemindersClientProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const tasksWithReminders = tasks.filter(t => t.reminders.length > 0);

  if (tasksWithReminders.length === 0) {
      return (
          <div className="text-center py-16">
              <div className="inline-block bg-secondary p-4 rounded-full">
                  <Bell className="h-12 w-12 text-muted-foreground" />
              </div>
              <h2 className="mt-6 text-2xl font-semibold">No Reminders Set</h2>
              <p className="mt-2 text-muted-foreground">You can set reminders from the dashboard or calendar views.</p>
          </div>
      )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming Reminders</CardTitle>
        <CardDescription>View and manage all of your upcoming reminders in one place.</CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" className="w-full">
          {tasksWithReminders.map(task => (
            <AccordionItem value={task.id} key={task.id}>
              <AccordionTrigger>
                <div className='flex items-center gap-3'>
                    {task.completed ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
                    <span className={task.completed ? "line-through text-muted-foreground" : ""}>{task.title}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-3 pl-8">
                    {task.reminders.map(reminder => (
                        <li key={reminder.id} className="flex items-center justify-between text-sm">
                            <div>
                                <p className="font-medium">{reminder.message}</p>
                                <p className="text-muted-foreground">{format(parseISO(reminder.remindAt), 'PPP p')}</p>
                            </div>
                            <Badge variant={reminder.sent ? "secondary" : "default"}>{reminder.sent ? "Sent" : "Upcoming"}</Badge>
                        </li>
                    ))}
                </ul>
                <div className="pl-8 mt-4">
                    <ReminderDialog task={task}>
                        <Button variant="outline" size="sm">
                            <Bell className="mr-2 h-4 w-4" />
                            Add Reminder
                        </Button>
                    </ReminderDialog>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
