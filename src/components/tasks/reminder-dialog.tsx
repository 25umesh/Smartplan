
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
import { Bell, CalendarIcon, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { suggestRemindersAction, addReminder } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import type { Task } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Alert, AlertDescription } from '../ui/alert';

interface ReminderDialogProps {
  task: Task;
  children: ReactNode;
}

export function ReminderDialog({ task, children }: ReminderDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [suggestedTimes, setSuggestedTimes] = useState<string[]>([]);
  const [reasoning, setReasoning] = useState('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [customTime, setCustomTime] = useState<Date | undefined>();
  const [message, setMessage] = useState('Your friendly reminder!');
  const [notificationEmail, setNotificationEmail] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFetchSuggestions = async () => {
    setIsLoadingSuggestions(true);
    setSuggestedTimes([]);
    setReasoning('');
    try {
        const result = await suggestRemindersAction({
            taskDescription: task.title + (task.description ? `\n${task.description}` : ''),
            deadline: task.dueDate || undefined,
        });
        if (result.error) {
            toast({
                title: 'Failed to get suggestions',
                description: result.error,
                variant: 'destructive',
            });
        } else if (result.data) {
            setSuggestedTimes(result.data.suggestedReminderTimes);
            setReasoning(result.data.reasoning);
            if (result.data.suggestedReminderTimes.length > 0) {
                setSelectedTime(result.data.suggestedReminderTimes[0]);
            }
        }
    } catch(e) {
        toast({
            title: 'An error occurred',
            description: 'Could not fetch suggestions.',
            variant: 'destructive',
        });
    } finally {
        setIsLoadingSuggestions(false);
    }
  };
  
  useEffect(() => {
      if(isOpen) {
          const savedEmail = localStorage.getItem('notificationEmail');
          setNotificationEmail(savedEmail);
          handleFetchSuggestions();
      } else {
          // Reset state on close
          setIsLoadingSuggestions(false);
          setIsSaving(false);
          setSuggestedTimes([]);
          setReasoning('');
          setSelectedTime('');
          setCustomTime(undefined);
          setMessage('Your friendly reminder!');
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleSave = async () => {
    const remindAt = selectedTime === 'custom' ? customTime : selectedTime;
    if (!remindAt) {
      toast({ title: 'Please select a reminder time.', variant: 'destructive' });
      return;
    }
    setIsSaving(true);
    try {
        await addReminder(task.id, {
            remindAt: new Date(remindAt).toISOString(),
            message,
        }, notificationEmail);
        toast({ title: 'Reminder Set', description: 'Your reminder has been saved and a confirmation email has been sent.' });
        setIsOpen(false);
    } catch(e) {
        toast({ title: 'Failed to set reminder', variant: 'destructive' });
    }
    setIsSaving(false);
  }


  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-6 w-6" /> Set Reminder for &quot;{task.title}&quot;
          </DialogTitle>
          <DialogDescription>
            Our AI can suggest optimal times, or you can set your own.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {!notificationEmail && (
            <Alert variant="destructive">
                <AlertDescription>
                    No notification email is set. Please set one on the <a href="/settings" className="font-bold underline">Settings</a> page to receive reminders.
                </AlertDescription>
            </Alert>
          )}

          {isLoadingSuggestions && (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoadingSuggestions && suggestedTimes.length > 0 && (
            <div className="space-y-4">
              <Alert>
                  <Sparkles className="h-4 w-4" />
                <AlertDescription className="text-sm text-muted-foreground">
                  {reasoning}
                </AlertDescription>
              </Alert>
              <RadioGroup value={selectedTime} onValueChange={setSelectedTime}>
                {suggestedTimes.map((time) => (
                  <div key={time} className="flex items-center space-x-2">
                    <RadioGroupItem value={time} id={time} />
                    <Label htmlFor={time}>{format(new Date(time), 'PPP p')}</Label>
                  </div>
                ))}
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="custom" id="custom" />
                  <Label htmlFor="custom">Custom time</Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {selectedTime === 'custom' && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={'outline'}
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !customTime && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {customTime ? format(customTime, 'PPP p') : <span>Pick a date and time</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={customTime}
                  onSelect={setCustomTime}
                  initialFocus
                />
                <div className="p-3 border-t border-border">
                    <Input type="time" onChange={e => {
                        const [hours, minutes] = e.target.value.split(':').map(Number);
                        setCustomTime(prev => {
                            const newDate = prev ? new Date(prev) : new Date();
                            newDate.setHours(hours, minutes);
                            return newDate;
                        });
                    }}/>
                </div>
              </PopoverContent>
            </Popover>
          )}

          <div className="grid gap-1.5">
            <Label htmlFor="message">Reminder Message</Label>
            <Input id="message" value={message} onChange={e => setMessage(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving || isLoadingSuggestions || !notificationEmail}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Reminder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
