
'use client';

import { useState } from 'react';
import type { Task } from '@/lib/types';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { isSameDay, format } from 'date-fns';
import { CheckCircle2, Circle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface CalendarViewProps {
  tasks: Task[];
}

export function CalendarView({ tasks }: CalendarViewProps) {
  const [date, setDate] = useState<Date | undefined>(new Date());

  const tasksWithDueDate = tasks.filter(t => t.dueDate);

  const selectedDayTasks = date
    ? tasksWithDueDate.filter(task => isSameDay(new Date(task.dueDate!), date))
    : [];

  const modifiers = {
    hasTask: tasksWithDueDate.map(task => new Date(task.dueDate!))
  };

  const modifiersStyles = {
    hasTask: {
      position: 'relative',
      '&::after': {
        content: '""',
        display: 'block',
        position: 'absolute',
        bottom: '4px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '4px',
        height: '4px',
        borderRadius: '50%',
        backgroundColor: 'hsl(var(--primary))'
      }
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      <Card className="md:col-span-2">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          className="p-0"
          classNames={{
            root: 'w-full',
            months: 'w-full',
            month: 'w-full',
            table: 'w-full',
            head_row: 'grid grid-cols-7',
            row: 'grid grid-cols-7',
          }}
          modifiers={modifiers}
          modifiersStyles={modifiersStyles}
          styles={{
            day: {
              ...modifiersStyles.hasTask,
            }
          }}
        />
      </Card>
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle>{date ? format(date, 'MMMM d, yyyy') : 'Select a day'}</CardTitle>
        </CardHeader>
        <CardContent>
          {date ? (
            selectedDayTasks.length > 0 ? (
              <ul className="space-y-3">
                <AnimatePresence>
                  {selectedDayTasks.map(task => (
                    <motion.li 
                      key={task.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="flex items-start gap-3"
                    >
                      {task.completed ? <CheckCircle2 className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" /> : <Circle className="mt-1 h-4 w-4 flex-shrink-0 text-muted-foreground" />}
                      <div>
                        <p className={task.completed ? 'text-muted-foreground line-through' : ''}>{task.title}</p>
                      </div>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            ) : (
              <p className="text-muted-foreground">No tasks for this day.</p>
            )
          ) : (
            <p className="text-muted-foreground">Select a day to see tasks.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
