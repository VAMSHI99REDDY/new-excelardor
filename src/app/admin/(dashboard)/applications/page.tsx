import { createAuthServerClient, createServerComponentClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import ApplicationRowClient from './ApplicationRowClient';

export const dynamic = 'force-dynamic';

export default async function ApplicationsPage() {
  const authClient = await createAuthServerClient();
  const { data: { user } } = await authClient.auth.getUser();

  if (!user) {
    redirect('/admin/login');
  }

  const supabase = createServerComponentClient();

  // The real table that stores job submissions is `excelardor`.
  // We fetch all columns we need for the admin view.
  const { data: applications, error } = await supabase
    .from('excelardor')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return <div className="p-4 text-red-500">Error loading applications</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-black mb-8 text-black">Job Applications</h1>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Applicant</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Position</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Experience</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {applications?.map((app) => (
                <ApplicationRowClient key={app.id} app={app} />
              ))}
              {(!applications || applications.length === 0) && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    No applications found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
