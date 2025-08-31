
'use client';

import { useState, type ReactNode } from 'react';
import { BrainCircuit, Loader2 } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { generateScheduleAction } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '../ui/alert';

interface ScheduleGeneratorDialogProps {
  children: ReactNode;
}

export function ScheduleGeneratorDialog({ children }: ScheduleGeneratorDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [generatedSchedule, setGeneratedSchedule] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    setIsLoading(true);
    setGeneratedSchedule('');
    const result = await generateScheduleAction(prompt);
    if (result.error) {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive',
      });
    } else if (result.data) {
      setGeneratedSchedule(result.data.scheduleDetails);
    }
    setIsLoading(false);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      // Reset state on close
      setPrompt('');
      setGeneratedSchedule('');
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BrainCircuit className="h-6 w-6" />
            Smart Schedule Generator
          </DialogTitle>
          <DialogDescription>
            Describe your day, and we&apos;ll create a schedule for you. For example: &quot;I have a meeting at 10am, need to finish a report by 3pm, and have lunch around 1pm.&quot;
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Textarea
            placeholder="Describe your schedule here..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            disabled={isLoading}
          />
        </div>
        {generatedSchedule && (
          <Alert>
            <AlertDescription className="whitespace-pre-wrap font-mono text-sm">
                {generatedSchedule}
            </AlertDescription>
          </Alert>
        )}
        <DialogFooter>
          <Button onClick={handleGenerate} disabled={isLoading || !prompt.trim()}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate Schedule'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
