
import { getTasks } from '@/lib/actions';
import { CalendarView } from '@/components/calendar/calendar-view';

export default async function CalendarPage() {
  const tasks = await getTasks();

  return (
    <div className="container mx-auto">
      <CalendarView tasks={tasks} />
    </div>
  );
}
