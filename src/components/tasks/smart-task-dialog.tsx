
"use client";

import { useState, type ReactNode, useEffect } from "react";
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
import { Bell, CalendarIcon, Loader2, Sparkles } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format, addMinutes, isBefore, parseISO } from "date-fns";
import { detectDetailsAction, addTask, suggestRemindersAction } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import type { Task, Reminder } from "@/lib/types";
import { Alert, AlertDescription } from "../ui/alert";
import { Switch } from "../ui/switch";
import { Checkbox } from "../ui/checkbox";

interface SmartTaskDialogProps {
  children: ReactNode;
}

type Step = 'details' | 'reminders';

export function SmartTaskDialog({ children }: SmartTaskDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<Step>('details');

  // --- Step 1: Details State ---
  const [rawText, setRawText] = useState("");
  const [isDetecting, setIsDetecting] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [priority, setPriority] = useState<Task['priority']>();
  const [includeTime, setIncludeTime] = useState(false);
  const [time, setTime] = useState("09:00");
  
  // --- Step 2: Reminders State ---
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [suggestedTimes, setSuggestedTimes] = useState<string[]>([]);
  const [reasoning, setReasoning] = useState('');
  const [selectedTimes, setSelectedTimes] = useState<string[]>([]);
  const [customTime, setCustomTime] = useState<Date | undefined>();
  const [message, setMessage] = useState('Your friendly reminder!');

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
    setPriority(undefined);
    setIncludeTime(false);
    setTime("09:00");
    // Reminders
    setIsLoadingSuggestions(false);
    setSuggestedTimes([]);
    setReasoning('');
    setSelectedTimes([]);
    setCustomTime(undefined);
    setMessage('Your friendly reminder!');
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
          const date = new Date(result.data.deadline);
          if (!isNaN(date.getTime())) {
            setDueDate(date);
            if (date.getUTCHours() !== 0 || date.getUTCMinutes() !== 0) {
              setIncludeTime(true);
              setTime(format(date, "HH:mm"));
            }
          }
      }
      setPriority(result.data.priority as Task['priority'] || undefined);
    }
    setIsDetecting(false);
  };
  
  const handleFetchSuggestions = async (taskTitle: string, taskDescription?: string, taskDueDate?: Date, taskPriority?: Task['priority']) => {
    setIsLoadingSuggestions(true);
    setSuggestedTimes([]);
    setReasoning('');
    try {
        const result = await suggestRemindersAction({
            taskDescription: taskTitle + (taskDescription ? `\n${taskDescription}` : ''),
            deadline: taskDueDate?.toISOString() || undefined,
            priority: taskPriority || undefined,
        });
        if (result.error) {
            toast({ title: 'Failed to get suggestions', description: result.error, variant: 'destructive' });
        } else if (result.data) {
            setSuggestedTimes(result.data.suggestedReminderTimes);
            setReasoning(result.data.reasoning);
        }
    } catch(e) {
        toast({ title: 'An error occurred', description: 'Could not fetch suggestions.', variant: 'destructive' });
    } finally {
        setIsLoadingSuggestions(false);
    }
  };

  const handleNext = () => {
    if (!title) {
        toast({ title: "Title is required", variant: "destructive" });
        return;
    }
    setStep('reminders');
    let finalDueDate: Date | undefined = dueDate;
    if (dueDate && includeTime) {
        const newDueDate = new Date(dueDate);
        const [hours, minutes] = time.split(':').map(Number);
        newDueDate.setHours(hours, minutes);
        finalDueDate = newDueDate;
    }
    handleFetchSuggestions(title, description, finalDueDate, priority);
  }

  const handleSave = async () => {
    if (!title) {
        toast({ title: "Title is required", variant: "destructive" });
        return;
    }
    setIsSaving(true);

    let finalDueDate: Date | undefined = dueDate;
    if (dueDate && includeTime) {
        const newDueDate = new Date(dueDate);
        const [hours, minutes] = time.split(':').map(Number);
        newDueDate.setHours(hours, minutes);
        finalDueDate = newDueDate;
    }

    let remindersToSet: Omit<Reminder, 'id' | 'sent'>[] = selectedTimes.map(time => ({ remindAt: time, message }));
    if (customTime && isCustomTimeValid) {
      remindersToSet.push({ remindAt: customTime.toISOString(), message });
    }

    try {
        await addTask({
            title,
            description,
            dueDate: finalDueDate ? finalDueDate.toISOString() : null,
            priority: priority || null,
        }, notificationEmail, remindersToSet);
        
        toast({ title: "Task Added", description: `"${title}" has been added.` });
        setIsOpen(false);
    } catch(e) {
        toast({ title: "Failed to add task", variant: "destructive" });
    }
    setIsSaving(false);
  }

  const handleCheckboxChange = (time: string, checked: boolean) => {
    setSelectedTimes(prev => 
      checked ? [...prev, time] : prev.filter(t => t !== time)
    );
  }

  const fiveMinutesFromNow = addMinutes(new Date(), 5);
  const validSuggestedTimes = suggestedTimes.filter(time => !isBefore(parseISO(time), fiveMinutesFromNow));
  const isCustomTimeValid = customTime && !isBefore(customTime, fiveMinutesFromNow);

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
                Optionally, add reminders for your new task &quot;{title}&quot;.
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
                    placeholder="e.g., Finish Q3 report by this Friday at 5pm (high priority)"
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
            <div className="grid gap-1.5">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            <div className="grid gap-1.5 sm:max-w-xs">
                <Label>Priority</Label>
                    <Select value={priority} onValueChange={(value: Task['priority']) => setPriority(value)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Set priority" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
        )}

        {step === 'reminders' && (
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
                                        newDate.setHours(hours, minutes, 0, 0);
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
        )}

        <DialogFooter>
          {step === 'details' && (
            <>
              <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button onClick={handleNext} disabled={isDetecting || !title}>
                Next
              </Button>
            </>
          )}
          {step === 'reminders' && (
            <>
              <Button variant="outline" onClick={() => setStep('details')}>Back</Button>
              <Button onClick={handleSave} disabled={isSaving || isLoadingSuggestions || !notificationEmail}>
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
