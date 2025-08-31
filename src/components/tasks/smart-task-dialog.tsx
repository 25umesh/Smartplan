
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
import { CalendarIcon, Loader2, Sparkles } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { detectDetailsAction, addTask } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import type { Task } from "@/lib/types";

interface SmartTaskDialogProps {
  children: ReactNode;
}

export function SmartTaskDialog({ children }: SmartTaskDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [rawText, setRawText] = useState("");
  const [isDetecting, setIsDetecting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [priority, setPriority] = useState<Task['priority'] | undefined>();

  useEffect(() => {
    if (!isOpen) {
        // Reset state when dialog closes
        setRawText("");
        setIsDetecting(false);
        setIsSaving(false);
        setTitle("");
        setDescription("");
        setDueDate(undefined);
        setPriority(undefined);
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
          }
      }
      setPriority(result.data.priority as Task['priority'] || undefined);
    }
    setIsDetecting(false);
  };

  const handleSave = async () => {
    if (!title) {
        toast({ title: "Title is required", variant: "destructive" });
        return;
    }
    setIsSaving(true);
    try {
        await addTask({
            title,
            description,
            dueDate: dueDate ? dueDate.toISOString() : null,
            priority: priority || null,
        });
        toast({ title: "Task Added", description: `"${title}" has been added.` });
        setIsOpen(false);
    } catch(e) {
        toast({ title: "Failed to add task", variant: "destructive" });
    }
    setIsSaving(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add a New Task</DialogTitle>
          <DialogDescription>
            Describe your task in the box below and let our AI detect the details for you.
          </DialogDescription>
        </DialogHeader>
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
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving || !title}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
