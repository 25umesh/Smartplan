
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import type { Task } from '@/lib/types';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { deleteTask, toggleTaskCompletion } from '@/lib/actions';
import { Trash2, Calendar, Circle, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface DashboardClientProps {
  initialTasks: Task[];
}

const priorityStyles = {
  low: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export function DashboardClient({ initialTasks }: DashboardClientProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const { toast } = useToast();

  const handleToggle = async (taskId: string) => {
    const originalTasks = [...tasks];
    setTasks(tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t));
    try {
      await toggleTaskCompletion(taskId);
    } catch (error) {
      setTasks(originalTasks);
      toast({ title: 'Error', description: 'Failed to update task.', variant: 'destructive' });
    }
  };

  const handleDelete = async (taskId: string) => {
    const originalTasks = [...tasks];
    setTasks(tasks.filter(t => t.id !== taskId));
    try {
      await deleteTask(taskId);
      toast({ title: 'Task Deleted', description: 'The task has been removed.' });
    } catch (error) {
      setTasks(originalTasks);
      toast({ title: 'Error', description: 'Failed to delete task.', variant: 'destructive' });
    }
  };

  const upcomingTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-16">
        <Image src="https://picsum.photos/400/300" alt="Empty state" width={400} height={300} data-ai-hint="empty state illustration" className="rounded-lg mb-6" />
        <h2 className="text-2xl font-semibold">All Clear!</h2>
        <p className="text-muted-foreground mt-2">You have no tasks. Add one to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold mb-4">Upcoming</h2>
        {upcomingTasks.length > 0 ? (
          <div className="space-y-3">
            <AnimatePresence>
              {upcomingTasks.map(task => (
                <motion.div key={task.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -50 }}>
                  <TaskItem task={task} onToggle={handleToggle} onDelete={handleDelete} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <p className="text-muted-foreground">No upcoming tasks. Great job!</p>
        )}
      </div>

      {completedTasks.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold mb-4">Completed</h2>
          <div className="space-y-3">
            <AnimatePresence>
              {completedTasks.map(task => (
                <motion.div key={task.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <TaskItem task={task} onToggle={handleToggle} onDelete={handleDelete} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}

function TaskItem({ task, onToggle, onDelete }: { task: Task, onToggle: (id: string) => void, onDelete: (id: string) => void }) {
  return (
    <Card className={cn('transition-all', task.completed && 'bg-muted/50')}>
      <CardContent className="p-4 flex items-center gap-4">
        <Checkbox
          checked={task.completed}
          onCheckedChange={() => onToggle(task.id)}
          aria-label={`Mark "${task.title}" as ${task.completed ? 'incomplete' : 'complete'}`}
        />
        <div className="flex-1 grid gap-1">
          <p className={cn("font-medium", task.completed && "line-through text-muted-foreground")}>{task.title}</p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {task.dueDate && (
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{format(parseISO(task.dueDate), 'MMM d')}</span>
              </div>
            )}
            {task.priority && (
              <Badge variant="outline" className={cn('text-xs', priorityStyles[task.priority])}>{task.priority}</Badge>
            )}
          </div>
        </div>
        <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => onDelete(task.id)}>
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Delete task</span>
        </Button>
      </CardContent>
    </Card>
  );
}
