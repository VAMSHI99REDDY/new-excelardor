import { createAuthServerClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function RemovedPage() {
  const authClient = await createAuthServerClient();
  const { data: { user } } = await authClient.auth.getUser();

  if (!user) {
    redirect('/admin/login');
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Contact Messages</h1>
      <p className="text-gray-600">This feature has been removed from the admin portal.</p>
      <Link href="/admin" className="text-blue-600 hover:underline mt-4 inline-block">Back to Dashboard</Link>
    </div>
  );
}
