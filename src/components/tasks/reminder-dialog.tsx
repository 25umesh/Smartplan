
'use client';

import { useState, type ReactNode, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Bell, Loader2, PlusCircle, Sparkles, Trash2 } from 'lucide-react';
import { addMinutes, isBefore, parseISO, sub, differenceInMinutes, differenceInHours, differenceInDays } from 'date-fns';
import { addReminders, suggestRemindersAction } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import type { Task } from '@/lib/types';
import { Alert, AlertDescription } from '../ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface ReminderDialogProps {
  task: Task;
  children: ReactNode;
}

type ReminderUnit = 'minutes' | 'hours' | 'days';

interface RelativeReminder {
  id: string;
  value: number;
  unit: ReminderUnit;
}

export function ReminderDialog({ task, children }: ReminderDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [reminders, setReminders] = useState<RelativeReminder[]>([]);
  const [message, setMessage] = useState('Your friendly reminder!');
  const [notificationEmail, setNotificationEmail] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      const savedEmail = localStorage.getItem('notificationEmail');
      setNotificationEmail(savedEmail);
    } else {
      // Reset state on close
      setIsSaving(false);
      setIsSuggesting(false);
      setReminders([]);
      setMessage('Your friendly reminder!');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const addReminder = () => {
    if (reminders.length >= 6) {
      toast({ title: 'You can add up to 6 reminders.', variant: 'destructive' });
      return;
    }
    setReminders([...reminders, { id: crypto.randomUUID(), value: 10, unit: 'minutes' }]);
  };

  const removeReminder = (id: string) => {
    setReminders(reminders.filter(r => r.id !== id));
  };

  const updateReminder = (id: string, value: Partial<RelativeReminder>) => {
    setReminders(reminders.map(r => (r.id === id ? { ...r, ...value } : r)));
  };

  const handleSuggestReminders = async () => {
    if (!task.dueDate) return;
    setIsSuggesting(true);
    const result = await suggestRemindersAction({
      taskDescription: task.title,
      deadline: task.dueDate
    });

    if (result.error) {
      toast({ title: "Suggestion Failed", description: result.error, variant: 'destructive' });
    } else if (result.data) {
      const dueDate = parseISO(task.dueDate);
      const suggestedRelativeReminders = result.data.suggestedReminderTimes.map(timeStr => {
        const remindAt = parseISO(timeStr);
        const days = differenceInDays(dueDate, remindAt);
        const hours = differenceInHours(dueDate, remindAt) % 24;
        const minutes = differenceInMinutes(dueDate, remindAt) % 60;
        
        if (days > 0) return { id: crypto.randomUUID(), value: days, unit: 'days' as ReminderUnit };
        if (hours > 0) return { id: crypto.randomUUID(), value: hours, unit: 'hours' as ReminderUnit };
        return { id: crypto.randomUUID(), value: Math.max(5, minutes), unit: 'minutes' as ReminderUnit };
      }).filter(r => r !== null);

      const uniqueSuggestions = Array.from(new Map(suggestedRelativeReminders.map(item => [`${item.value}-${item.unit}`, item])).values());
      const combined = [...reminders, ...uniqueSuggestions];
      const finalReminders = Array.from(new Map(combined.map(item => [`${item.value}-${item.unit}`, item])).values()).slice(0, 6);

      setReminders(finalReminders);
      toast({ title: "Suggestions Added", description: "Optimal reminder times have been added to the list." });
    }
    setIsSuggesting(false);
  }

  const handleSave = async () => {
    if (!task.dueDate) {
      toast({ title: 'Cannot set reminders for tasks without a due date.', variant: 'destructive' });
      return;
    }

    const fiveMinutesFromNow = addMinutes(new Date(), 5);
    const dueDate = parseISO(task.dueDate);

    const remindersToSet = reminders.map(r => {
      const remindAt = sub(dueDate, { [r.unit]: r.value });
      return { remindAt, message };
    });

    const invalidReminders = remindersToSet.filter(r => isBefore(r.remindAt, fiveMinutesFromNow));
    if (invalidReminders.length > 0) {
      toast({ title: 'Some reminders are set for the past or within 5 minutes.', description: 'Please adjust your reminders to be at least 5 minutes in the future.', variant: 'destructive' });
      return;
    }
    
    setIsSaving(true);
    try {
      await addReminders(task.id, remindersToSet.map(r => ({...r, remindAt: r.remindAt.toISOString()})), notificationEmail);
      toast({ title: 'Reminders Set', description: `Your reminders for "${task.title}" have been saved.` });
      setIsOpen(false);
    } catch (e) {
      toast({ title: 'Failed to set reminders', variant: 'destructive' });
    }
    setIsSaving(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-6 w-6" /> Set Reminders for &quot;{task.title}&quot;
          </DialogTitle>
          <DialogDescription>
            Add up to 6 reminders. Reminders are sent relative to the task due date and cannot be set within 5 minutes of the current time.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
          {!task.dueDate && (
             <Alert variant="destructive">
                <AlertDescription>
                    This task has no due date. Please add a due date to set reminders.
                </AlertDescription>
            </Alert>
          )}
          {!notificationEmail && (
            <Alert variant="destructive">
              <AlertDescription>
                No notification email is set. Please set one on the <a href="/settings" className="font-bold underline">Settings</a> page to receive reminders.
              </AlertDescription>
            </Alert>
          )}

          {task.dueDate && (
             <div className="space-y-4">
                <div className="grid gap-1.5">
                    <Label htmlFor="message">Reminder Message</Label>
                    <Input id="message" value={message} onChange={e => setMessage(e.target.value)} />
                </div>
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Reminders</Label>
                      <Button variant="outline" size="sm" onClick={handleSuggestReminders} disabled={isSuggesting || reminders.length >= 6}>
                          {isSuggesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Sparkles className="mr-2 h-4 w-4"/>}
                          Suggest
                      </Button>
                    </div>
                    {reminders.map((reminder) => (
                        <div key={reminder.id} className="flex items-center gap-2 p-2 border rounded-lg">
                           <Input
                                type="number"
                                value={reminder.value}
                                onChange={e => updateReminder(reminder.id, { value: parseInt(e.target.value, 10) || 0 })}
                                className="w-20"
                                min="1"
                           />
                           <Select
                                value={reminder.unit}
                                onValueChange={(value: ReminderUnit) => updateReminder(reminder.id, { unit: value })}
                           >
                               <SelectTrigger className="w-[120px]">
                                   <SelectValue placeholder="Unit" />
                               </SelectTrigger>
                               <SelectContent>
                                   <SelectItem value="minutes">Minutes</SelectItem>
                                   <SelectItem value="hours">Hours</SelectItem>
                                   <SelectItem value="days">Days</SelectItem>
                               </SelectContent>
                           </Select>
                           <span className="flex-1 text-sm text-muted-foreground">before due</span>
                           <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive h-8 w-8" onClick={() => removeReminder(reminder.id)}>
                               <Trash2 className="h-4 w-4"/>
                           </Button>
                        </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={addReminder} disabled={reminders.length >= 6}>
                        <PlusCircle className="mr-2 h-4 w-4"/>
                        Add Reminder
                    </Button>
                </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving || !task.dueDate || !notificationEmail || reminders.length === 0}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Reminders
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
