import { checkIsAdmin } from '@/lib/auth';
import { getPendingSubmissionsAction } from '@/app/actions/moderation';
import { getTournaments, getDeckArchetypes } from '@/lib/data-repository';
import { AdminLoginForm } from '@/components/admin/AdminLoginForm';
import { AccessDeniedCard } from '@/components/admin/AccessDeniedCard';
import { ModerationDashboard } from '@/components/admin/ModerationDashboard';

export const metadata = {
  title: 'Moderation Queue — Battle Reporter',
  description: 'Review and approve community stream match timestamp submissions.',
};

export default async function ModerationQueuePage() {
  const { user, isAdmin } = await checkIsAdmin();

  // 1. Not signed in -> Prompt Admin Sign In
  if (!user) {
    return <AdminLoginForm />;
  }

  // 2. Signed in but not an authorized admin -> Access Denied
  if (!isAdmin) {
    return <AccessDeniedCard userEmail={user.email || 'Unknown User'} />;
  }

  // 3. Authenticated Admin -> Load pending submissions, tournaments, and archetypes
  const [pendingSubmissions, tournaments, archetypes] = await Promise.all([
    getPendingSubmissionsAction(),
    getTournaments(),
    getDeckArchetypes(),
  ]);

  return (
    <ModerationDashboard
      userEmail={user.email || 'Admin'}
      initialSubmissions={pendingSubmissions}
      tournaments={tournaments}
      archetypes={archetypes}
    />
  );
}
