// Supabase connection verification script (no credentials printed)
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Load .env.local (simple parser)
const envPath = './.env.local';
const envLines = fs.readFileSync(envPath, 'utf8').split(/\n/);
const env = {};
for (const line of envLines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx);
  const val = trimmed.slice(eqIdx + 1);
  env[key] = val;
}

// Public client (anon key)
const supabasePublic = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function verify() {
  try {
    const { data: pubData, error: pubErr } = await supabasePublic
      .from('career_applications')
      .select('id')
      .limit(1);
    console.log('Public client access:', pubErr ? 'error' : `rows ${pubData?.length ?? 0}`);
  } catch (e) {
    console.error('Public client exception:', e.message);
  }

  // Server client using service role (may be empty locally)
  if (env.SUPABASE_SERVICE_ROLE_KEY) {
    const supabaseSrv = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    try {
      const { data: srvData, error: srvErr } = await supabaseSrv
        .from('career_applications')
        .select('id')
        .limit(1);
      console.log('Server client access:', srvErr ? 'error' : `rows ${srvData?.length ?? 0}`);
    } catch (e) {
      console.error('Server client exception:', e.message);
    }
    try {
      const { data: listData, error: listErr } = await supabaseSrv.storage.from('career-resumes').list('', { limit: 1 });
      console.log('Storage bucket access:', listErr ? 'error' : `objects ${listData?.length ?? 0}`);
    } catch (e) {
      console.error('Storage exception:', e.message);
    }
  } else {
    console.log('Service role key not set – server‑side checks skipped.');
  }
}

verify();
