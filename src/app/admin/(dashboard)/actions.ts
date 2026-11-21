'use server';

import { createAuthServerClient, createServerComponentClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

async function assertAuthenticated() {
  const authClient = await createAuthServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

export async function updateApplicationAction(id: string, status: string, notes: string) {
  await assertAuthenticated();

  const supabase = createServerComponentClient();
  const { error } = await supabase
    .from('excelardor')
    .update({ status, admin_notes: notes })
    .eq('id', id);
  
  if (error) throw new Error(error.message);
  revalidatePath('/admin/applications');
}

export async function deleteApplicationAction(id: string, resumePath: string | null) {
  await assertAuthenticated();

  const supabase = createServerComponentClient();
  
  if (resumePath) {
    await supabase.storage.from('resume').remove([resumePath]);
  }
  
  const { error } = await supabase
    .from('excelardor')
    .delete()
    .eq('id', id);
    
  if (error) throw new Error(error.message);
  revalidatePath('/admin/applications');
}

export async function updateContactMessageAction(id: string, status: string, notes: string) {
  await assertAuthenticated();

  const supabase = createServerComponentClient();
  const { error } = await supabase
    .from('contact_messages')
    .update({ status, admin_notes: notes })
    .eq('id', id);
    
  if (error) throw new Error(error.message);
  revalidatePath('/admin/contact-messages');
}

export async function deleteContactMessageAction(id: string) {
  await assertAuthenticated();

  const supabase = createServerComponentClient();
  const { error } = await supabase
    .from('contact_messages')
    .delete()
    .eq('id', id);
    
  if (error) throw new Error(error.message);
  revalidatePath('/admin/contact-messages');
}
