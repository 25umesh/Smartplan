
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BrainCircuit, Calendar, LayoutDashboard, Sparkles, Settings, Bell } from 'lucide-react';
import {
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { ScheduleGeneratorDialog } from '../tasks/schedule-generator-dialog';
import { ThemeToggle } from '../theme-toggle';

const links = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
  { href: '/reminders', label: 'Reminders', icon: Bell },
];

const bottomLinks = [
    { href: '/settings', label: 'Settings', icon: Settings },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <>
      <SidebarHeader>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold text-foreground group-data-[collapsible=icon]:hidden">
            SmartPlan
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent className="flex flex-col justify-between p-2">
        <SidebarMenu>
          {links.map((link) => (
            <SidebarMenuItem key={link.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname === link.href}
                tooltip={link.label}
                className="justify-start"
              >
                <Link href={link.href}>
                  <link.icon className="h-5 w-5" />
                  <span>{link.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          <SidebarMenuItem>
            <ScheduleGeneratorDialog>
                <SidebarMenuButton tooltip="Smart Scheduler" className='justify-start'>
                    <BrainCircuit className="h-5 w-5" />
                    <span>Smart Scheduler</span>
                </SidebarMenuButton>
            </ScheduleGeneratorDialog>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarMenu>
          {bottomLinks.map((link) => (
            <SidebarMenuItem key={link.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname === link.href}
                tooltip={link.label}
                className="justify-start"
              >
                <Link href={link.href}>
                  <link.icon className="h-5 w-5" />
                  <span>{link.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="flex items-center justify-end p-2 group-data-[collapsible=icon]:justify-center">
         <ThemeToggle />
      </SidebarFooter>
    </>
  );
}
