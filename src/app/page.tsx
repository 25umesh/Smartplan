
import { getTasks } from '@/lib/actions';
import { DashboardClient } from '@/components/tasks/dashboard-client';

export default async function DashboardPage() {
  const tasks = await getTasks();

  return (
    <div className="container mx-auto">
      <DashboardClient initialTasks={tasks} />
    </div>
  );
}
