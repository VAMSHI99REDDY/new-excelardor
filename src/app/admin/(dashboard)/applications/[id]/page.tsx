import { createAuthServerClient, createServerComponentClient } from '@/utils/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { ApplicationDetailsClient } from './ApplicationDetailsClient';

export const dynamic = 'force-dynamic';

export default async function ApplicationDetailsPage(props: { params: Promise<{ id: string }> }) {
  const authClient = await createAuthServerClient();
  const { data: { user } } = await authClient.auth.getUser();

  if (!user) {
    redirect('/admin/login');
  }

  const params = await props.params;
  const supabase = createServerComponentClient();

  const { data: application, error } = await supabase
    .from('excelardor')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !application) {
    notFound();
  }

  // Generate signed URL for resume (bucket "resumes")
  let resumeUrl = null;
  if (application.resume_path) {
    const { data: urlData, error: urlError } = await supabase.storage
      .from('resumes')
      .createSignedUrl(application.resume_path, 60 * 60, { download: true }); // 1 hour expiry with forced download

    if (urlError) {
      console.error('Error creating signed URL:', urlError);
    }

    if (!urlError && urlData) {
      resumeUrl = urlData.signedUrl;
    }
  }

  return <ApplicationDetailsClient application={application} resumeUrl={resumeUrl} />;
}
