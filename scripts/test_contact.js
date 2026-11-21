const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
// Load env manually
const envPath = path.resolve(__dirname, '..', '.env.local');
const env = {};
fs.readFileSync(envPath, 'utf8').split(/\r?\n/).forEach(line => {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2];
});
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
(async () => {
  const { data, error } = await supabase.from('contact_messages').select('*').limit(5);
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Data:', data);
  }
})();
