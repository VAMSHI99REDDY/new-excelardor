const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load env variables manually from .env.local
const envPath = path.resolve(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split(/\r?\n/).forEach(line => {
  const match = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (match) env[match[1]] = match[2];
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const serviceKey = env['SUPABASE_SERVICE_ROLE_KEY'];
if (!supabaseUrl || !serviceKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

(async () => {
  const { data, error } = await supabase.from('excelardor').select('*').limit(1).single();
  if (error) {
    console.error('Error fetching:', error);
    process.exit(1);
  }
  if (!data) {
    console.log('Table empty');
    return;
  }
  console.log('Columns in excelardor table:');
  console.log(Object.keys(data));
  console.log('Sample row:');
  console.log(JSON.stringify(data, null, 2));
})();
