
"use client";

import { useState, type ReactNode, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Bell, CalendarIcon, Loader2, PlusCircle, Sparkles, Trash2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format, addMinutes, isBefore, sub, parseISO, differenceInMinutes, set, formatISO } from "date-fns";
import { detectDetailsAction, addTask, suggestRemindersAction } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";
import type { Reminder } from "@/lib/types";
import { Alert, AlertDescription } from "../ui/alert";
import { Switch } from "../ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface SmartTaskDialogProps {
  children: ReactNode;
}

type Step = 'details' | 'reminders';
type ReminderUnit = 'minutes' | 'hours' | 'days';

interface RelativeReminder {
  id: string;
  value: number;
  unit: ReminderUnit;
}


export function SmartTaskDialog({ children }: SmartTaskDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<Step>('details');

  // --- Step 1: Details State ---
  const [rawText, setRawText] = useState("");
  const [isDetecting, setIsDetecting] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [includeTime, setIncludeTime] = useState(false);
  const [time, setTime] = useState("09:00");
  
  // --- Step 2: Reminders State ---
  const [reminders, setReminders] = useState<RelativeReminder[]>([]);
  const [message, setMessage] = useState('Your friendly reminder!');
  const [isSuggesting, setIsSuggesting] = useState(false);

  // --- Common State ---
  const [isSaving, setIsSaving] = useState(false);
  const [notificationEmail, setNotificationEmail] = useState<string | null>(null);
  const { toast } = useToast();

  const resetAllState = () => {
    // Details
    setRawText("");
    setIsDetecting(false);
    setTitle("");
    setDescription("");
    setDueDate(undefined);
    setIncludeTime(false);
    setTime("09:00");
    // Reminders
    setReminders([]);
    setMessage('Your friendly reminder!');
    setIsSuggesting(false);
    // Common
    setIsSaving(false);
    setStep('details');
  };

  useEffect(() => {
    if (isOpen) {
        const savedEmail = localStorage.getItem('notificationEmail');
        setNotificationEmail(savedEmail);
    } else {
      setTimeout(resetAllState, 200); // Reset after close animation
    }
  }, [isOpen])

  const handleDetect = async () => {
    if (!rawText.trim()) return;
    setIsDetecting(true);
    const result = await detectDetailsAction(rawText);
    if (result.error) {
      toast({ title: "Detection Failed", description: result.error, variant: "destructive" });
    } else if (result.data) {
      setTitle(result.data.taskName || "");
      setDescription(result.data.description || "");
      if (result.data.deadline) {
          // AI returns ISO string in UTC, parseISO handles it correctly.
          const date = parseISO(result.data.deadline);
          if (!isNaN(date.getTime())) {
            setDueDate(date);
            // Check if time is significant (not midnight)
            if (date.getUTCHours() !== 0 || date.getUTCMinutes() !== 0) {
              setIncludeTime(true);
              // Format time according to local timezone for display
              setTime(format(date, "HH:mm"));
            }
          }
      }
    }
    setIsDetecting(false);
  };
  
  const getFinalDueDate = () => {
    if (!dueDate) return undefined;

    let finalDueDate = dueDate; // Start with the selected date object

    if (includeTime) {
        const [hours, minutes] = time.split(':').map(Number);
        // Construct a new Date object from a string that specifies the exact local time.
        const dateString = `${format(finalDueDate, 'yyyy-MM-dd')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
        finalDueDate = new Date(dateString);
    } else {
        // If no time is included, just use the date part (time will be midnight local)
        finalDueDate = new Date(format(finalDueDate, 'yyyy-MM-dd'));
    }
    
    return finalDueDate;
  }
  
  const isDueDateValid = useMemo(() => {
    const finalDueDate = getFinalDueDate();
    if(!finalDueDate) return true; // No due date is valid
    return isBefore(addMinutes(new Date(), 10), finalDueDate);
  }, [dueDate, includeTime, time]);


  const handleNext = () => {
    if (!title) {
        toast({ title: "Title is required", variant: "destructive" });
        return;
    }
    if (!isDueDateValid) {
        toast({ title: "Due date must be at least 10 minutes in the future.", variant: "destructive" });
        return;
    }
    setStep('reminders');
  }

  const handleSave = async () => {
    if (!title) {
        toast({ title: "Title is required", variant: "destructive" });
        return;
    }
    if (!isDueDateValid) {
        toast({ title: "Due date must be at least 10 minutes in the future.", variant: "destructive" });
        return;
    }

    setIsSaving(true);
    const finalDueDate = getFinalDueDate();

    let remindersToSet: Omit<Reminder, 'id' | 'sent'>[] = [];
    if(finalDueDate) {
      const fiveMinutesFromNow = addMinutes(new Date(), 5);
      const calculatedReminders = reminders.map(r => {
        const remindAt = sub(finalDueDate, { [r.unit]: r.value });
        return { remindAt, message };
      });

      const invalidReminders = calculatedReminders.filter(r => isBefore(r.remindAt, fiveMinutesFromNow));
      if (invalidReminders.length > 0) {
        toast({ title: 'Some reminders are set for the past or within 5 minutes.', description: 'Please adjust your reminders to be at least 5 minutes in the future.', variant: 'destructive' });
        setIsSaving(false);
        return;
      }
      remindersToSet = calculatedReminders.map(r => ({...r, remindAt: r.remindAt.toISOString()}));
    }
    
    try {
        await addTask({
            title,
            description,
            dueDate: finalDueDate ? finalDueDate.toISOString() : null,
        }, notificationEmail, remindersToSet);
        
        toast({ title: "Task Added", description: `"${title}" has been added.` });
        setIsOpen(false);
    } catch(e) {
        toast({ title: "Failed to add task", variant: "destructive" });
    }
    setIsSaving(false);
  }

  // Reminder step functions
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
    const finalDueDate = getFinalDueDate();
    if (!finalDueDate) return;
    setIsSuggesting(true);
    const result = await suggestRemindersAction({
      taskDescription: title,
      deadline: finalDueDate.toISOString()
    });

    if (result.error) {
      toast({ title: "Suggestion Failed", description: result.error, variant: 'destructive' });
    } else if (result.data) {
      const dueDate = finalDueDate;
      const suggestedRelativeReminders = result.data.suggestedReminderTimes.map(timeStr => {
        const remindAt = parseISO(timeStr);
        if (isBefore(remindAt, new Date()) || isBefore(dueDate, remindAt)) return null;

        const totalMinutes = differenceInMinutes(dueDate, remindAt);
        if (totalMinutes < 1) return null;
        
        const days = Math.floor(totalMinutes / (60 * 24));
        const hours = Math.floor((totalMinutes % (60*24)) / 60);
        const minutes = totalMinutes % 60;
        
        if (days > 0 && hours === 0 && minutes === 0) return { id: crypto.randomUUID(), value: days, unit: 'days' as ReminderUnit };
        if (hours > 0 && minutes === 0 && days === 0) return { id: crypto.randomUUID(), value: hours, unit: 'hours' as ReminderUnit };
        if (minutes > 0 && hours === 0 && days === 0) return { id: crypto.randomUUID(), value: minutes, unit: 'minutes' as ReminderUnit };
        if (days > 0) return { id: crypto.randomUUID(), value: days, unit: 'days' as ReminderUnit };
        if (hours > 0) return { id: crypto.randomUUID(), value: hours, unit: 'hours' as ReminderUnit };
        return { id: crypto.randomUUID(), value: minutes, unit: 'minutes' as ReminderUnit };
      }).filter((r): r is RelativeReminder => r !== null);

      const uniqueSuggestions = Array.from(new Map(suggestedRelativeReminders.map(item => [`${item.value}-${item.unit}`, item])).values());
      const combined = [...reminders, ...uniqueSuggestions];
      const finalReminders = Array.from(new Map(combined.map(item => [`${item.value}-${item.unit}`, item])).values()).slice(0, 6);

      setReminders(finalReminders);
      toast({ title: "Suggestions Added", description: "Optimal reminder times have been added to the list." });
    }
    setIsSuggesting(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add a New Task</DialogTitle>
           {step === 'details' && (
              <DialogDescription>
                Describe your task in the box below and let our AI detect the details for you.
              </DialogDescription>
           )}
           {step === 'reminders' && (
              <DialogDescription>
                Optionally, add reminders for your new task &quot;{title}&quot;. You can add up to 6.
              </DialogDescription>
           )}
        </DialogHeader>

        {step === 'details' && (
            <div className="grid gap-4 py-4">
            <div className="flex items-end gap-2">
                <div className="grid w-full gap-1.5">
                <Label htmlFor="raw-text">Task Description</Label>
                <Input
                    id="raw-text"
                    placeholder="e.g., Finish Q3 report by this Friday at 5pm"
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                />
                </div>
                <Button onClick={handleDetect} disabled={isDetecting || !rawText.trim()} className="shrink-0">
                {isDetecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <Sparkles className="h-4 w-4" />
                )}
                <span className="ml-2 hidden sm:inline">Detect Details</span>
                </Button>
            </div>
            {!notificationEmail && (
                <Alert variant="destructive">
                    <AlertDescription>
                        No notification email is set. Please set one on the <a href="/settings" className="font-bold underline">Settings</a> page to receive task confirmations and reminders.
                    </AlertDescription>
                </Alert>
            )}

            <div className="my-4 h-px bg-border" />
            
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                <Label htmlFor="title">Title</Label>
                <Input id="title" value={title} onChange={e => setTitle(e.target.value)} />
                </div>
                <div className="grid gap-1.5">
                <Label>Due Date</Label>
                <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        variant={"outline"}
                        className={cn(
                        "justify-start text-left font-normal",
                        !dueDate && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dueDate ? format(dueDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                    <Calendar
                        mode="single"
                        selected={dueDate}
                        onSelect={setDueDate}
                        initialFocus
                    />
                    </PopoverContent>
                </Popover>
                </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex items-center space-x-2 rounded-lg border p-4">
                <Switch
                    id="set-time"
                    checked={includeTime}
                    onCheckedChange={setIncludeTime}
                />
                <div className="grid gap-1.5">
                    <Label htmlFor="set-time">Set Time</Label>
                    <p className="text-xs text-muted-foreground">
                    Specify a time for this item.
                    </p>
                </div>
                </div>
                {includeTime && (
                    <div className="grid gap-1.5">
                        <Label htmlFor="time">Time</Label>
                        <Input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
                    </div>
                )}
            </div>
             {dueDate && !isDueDateValid && (
                <p className="text-sm text-destructive">Due date must be at least 10 minutes in the future.</p>
            )}
            <div className="grid gap-1.5">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            </div>
        )}

        {step === 'reminders' && (
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
                {!getFinalDueDate() && (
                    <Alert variant="destructive">
                        <AlertDescription>
                            Please go back and set a due date to add reminders.
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

                {getFinalDueDate() && (
                    <div className="space-y-4">
                        <div className="grid gap-1.5">
                            <Label htmlFor="message">Reminder Message</Label>
                            <Input id="message" value={message} onChange={e => setMessage(e.target.value)} />
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Label>Reminders</Label>
                              <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={addReminder} disabled={reminders.length >= 6}>
                                    <PlusCircle className="mr-2 h-4 w-4"/>
                                    Add Reminder
                                </Button>
                                <Button variant="outline" size="sm" onClick={handleSuggestReminders} disabled={isSuggesting || reminders.length >= 6}>
                                    {isSuggesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Sparkles className="mr-2 h-4 w-4"/>}
                                    Suggest
                                </Button>
                              </div>
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
                        </div>
                    </div>
                )}
            </div>
        )}

        <DialogFooter>
          {step === 'details' && (
            <>
              <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button onClick={handleNext} disabled={isDetecting || !title || !isDueDateValid}>
                Next
              </Button>
            </>
          )}
          {step === 'reminders' && (
            <>
              <Button variant="outline" onClick={() => setStep('details')}>Back</Button>
              <Button onClick={handleSave} disabled={isSaving || !notificationEmail || (reminders.length > 0 && !getFinalDueDate())}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Task
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
