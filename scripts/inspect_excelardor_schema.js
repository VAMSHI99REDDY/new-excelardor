require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function main() {
  const { data, error } = await supabase.rpc('pg_table_def', { schema: 'public', table_name: 'excelardor' });
  if (error) {
    console.error('Error fetching schema:', error);
    process.exit(1);
  }
  console.log(JSON.stringify(data, null, 2));
}

main();