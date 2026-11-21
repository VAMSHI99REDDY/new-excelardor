import { createServerComponentClient } from '@/utils/supabase/server';

async function main(){
  const supabase = createServerComponentClient();
  const {data, error} = await supabase.from('excelardor').select('*').limit(1).single();
  if(error){
    console.error('Error fetching row:', error);
    process.exit(1);
  }
  if(!data){
    console.log('Table is empty.');
    return;
  }
  console.log('Columns present in excelardor table:');
  console.log(Object.keys(data));
  console.log('Sample row:', data);
}

main();