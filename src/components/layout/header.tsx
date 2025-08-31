
"use client";

import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { SmartTaskDialog } from '../tasks/smart-task-dialog';
import { PlusCircle } from 'lucide-react';

export function Header() {
  const pathname = usePathname();

  const getTitle = () => {
    switch (pathname) {
      case '/':
        return 'Dashboard';
      case '/calendar':
        return 'Calendar';
      case '/settings':
        return 'Settings';
      default:
        return 'SmartPlan';
    }
  };

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="md:hidden" />
        <h1 className="text-xl font-semibold">{getTitle()}</h1>
      </div>
      <SmartTaskDialog>
        <Button>
          <PlusCircle className="mr-2 h-5 w-5" />
          Add Task
        </Button>
      </SmartTaskDialog>
    </header>
  );
}
