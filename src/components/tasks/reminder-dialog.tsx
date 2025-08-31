
'use client';

import { useState, type ReactNode, useEffect, useMemo } from 'react';
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
import { format, addMinutes, isBefore, parseISO } from 'date-fns';
import { suggestRemindersAction, addReminders } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import type { Task } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { Checkbox } from '../ui/checkbox';
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
  const [selectedTimes, setSelectedTimes] = useState<string[]>([]);
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
          setSelectedTimes([]);
          setCustomTime(undefined);
          setMessage('Your friendly reminder!');
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleSave = async () => {
    let remindersToSet = selectedTimes.map(time => ({ remindAt: time, message }));
    if (customTime && isCustomTimeValid) {
      remindersToSet.push({ remindAt: customTime.toISOString(), message });
    }

    if (remindersToSet.length === 0) {
      toast({ title: 'Please select at least one reminder time.', variant: 'destructive' });
      return;
    }
    
    setIsSaving(true);
    try {
        await addReminders(task.id, remindersToSet, notificationEmail);
        toast({ title: 'Reminders Set', description: `Your reminders for "${task.title}" have been saved.` });
        setIsOpen(false);
    } catch(e) {
        toast({ title: 'Failed to set reminders', variant: 'destructive' });
    }
    setIsSaving(false);
  }

  const handleCheckboxChange = (time: string, checked: boolean) => {
    setSelectedTimes(prev => 
      checked ? [...prev, time] : prev.filter(t => t !== time)
    );
  }

  const fiveMinutesFromNow = useMemo(() => addMinutes(new Date(), 5), []);

  const validSuggestedTimes = useMemo(() => {
      return suggestedTimes.filter(time => !isBefore(parseISO(time), fiveMinutesFromNow));
  }, [suggestedTimes, fiveMinutesFromNow]);
  
  const isCustomTimeValid = useMemo(() => customTime && !isBefore(customTime, fiveMinutesFromNow), [customTime, fiveMinutesFromNow]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-6 w-6" /> Set Reminders for &quot;{task.title}&quot;
          </DialogTitle>
          <DialogDescription>
            AI suggestions are for times in the future. You can select multiple. Reminders cannot be set within 5 minutes of the current time.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
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

          {!isLoadingSuggestions && validSuggestedTimes.length > 0 && (
            <div className="space-y-4">
              <Alert>
                  <Sparkles className="h-4 w-4" />
                <AlertDescription className="text-sm text-muted-foreground">
                  {reasoning}
                </AlertDescription>
              </Alert>
              <div className="space-y-2">
                {validSuggestedTimes.map((time) => (
                  <div key={time} className="flex items-center space-x-2">
                    <Checkbox 
                        id={time} 
                        checked={selectedTimes.includes(time)}
                        onCheckedChange={(checked) => handleCheckboxChange(time, !!checked)}
                    />
                    <Label htmlFor={time} className="cursor-pointer">{format(parseISO(time), 'PPP p')}</Label>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="space-y-2">
              <Label>Custom time</Label>
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
                    disabled={(date) => isBefore(date, new Date(new Date().setHours(0,0,0,0)))}
                    />
                    <div className="p-3 border-t border-border">
                        <Input type="time" onChange={e => {
                            const [hours, minutes] = e.target.value.split(':').map(Number);
                            setCustomTime(prev => {
                                const newDate = prev ? new Date(prev) : new Date();
                                newDate.setHours(hours, minutes, 0, 0); // Also reset seconds and ms
                                return newDate;
                            });
                        }}/>
                    </div>
                </PopoverContent>
                </Popover>
                {customTime && !isCustomTimeValid && (
                    <p className="text-sm text-destructive">Custom time must be at least 5 minutes in the future.</p>
                )}
          </div>


          <div className="grid gap-1.5">
            <Label htmlFor="message">Reminder Message</Label>
            <Input id="message" value={message} onChange={e => setMessage(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving || isLoadingSuggestions || !notificationEmail || (selectedTimes.length === 0 && !isCustomTimeValid)}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Reminders
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
