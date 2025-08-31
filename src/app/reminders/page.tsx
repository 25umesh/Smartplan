
import { getTasks } from '@/lib/actions';
import { RemindersClient } from '@/components/reminders/reminders-client';

export default async function RemindersPage() {
  const tasks = await getTasks();

  return (
    <div className="container mx-auto">
      <RemindersClient tasks={tasks} />
    </div>
  );
}
