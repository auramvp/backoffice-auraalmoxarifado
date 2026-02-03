
const { createClient } = require('@supabase/supabase-js');

// URL and Key from project context or environment
const supabaseUrl = 'https://zdgapmcalocdvdgvbwsj.supabase.co';
// I need the service role key or anon key. The previous code had it in env vars or I can find it in lib/supabase.ts (anon key).
// Let's read lib/supabase.ts first to get the key.
const supabaseKey = process.env.SUPABASE_KEY || ''; 

async function main() {
  if (!supabaseKey) {
      console.log("Please provide SUPABASE_KEY");
      return;
  }
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const { data, error } = await supabase.from('plans').select('*');
  
  if (error) {
    console.error('Error fetching plans:', error);
    return;
  }
  
  console.log(`Found ${data.length} plans:`);
  data.forEach(p => console.log(` - [${p.id}] ${p.name} (R$ ${p.value}) - ExternalID: ${p.external_id}`));
}

// I need to read the key from the file or environment. 
// I will just use the key from lib/supabase.ts if I can read it.
