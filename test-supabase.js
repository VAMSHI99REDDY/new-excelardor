// Simple connection test – does NOT expose any credentials
import { createClientComponentClient } from './src/utils/supabase/client';
import { createServerComponentClient } from './src/utils/supabase/server';

async function test() {
  try {
    // Try public client first (read‑only access)
    const pub = createClientComponentClient();
    const { data: pubData, error: pubErr } = await pub
      .from('career_applications')
      .select('id')
      .limit(1);
    console.log('Public client query result:', pubErr ? 'error' : `rows ${pubData?.length ?? 0}`);
  } catch (e) {
    console.error('Public client failed:', e.message);
  }

  try {
    // Server client uses service‑role key – may be empty locally
    const srv = createServerComponentClient();
    const { data: srvData, error: srvErr } = await srv
      .from('career_applications')
      .select('id')
      .limit(1);
    console.log('Server client query result:', srvErr ? 'error' : `rows ${srvData?.length ?? 0}`);
    // Storage bucket test (list objects – no need to download)
    const { data: listData, error: listErr } = await srv.storage
      .from('career-resumes')
      .list('', { limit: 1 });
    console.log('Storage bucket access:', listErr ? 'error' : `objects ${listData?.length ?? 0}`);
  } catch (e) {
    console.error('Server client failed:', e.message);
  }
}

test();
