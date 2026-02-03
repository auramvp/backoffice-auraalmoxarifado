
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zdgapmcalocdvdgvbwsj.supabase.co';
const supabaseKey = 'sb_publishable_BgGJ0noZ8kExU47L3Y5KZw_KraGXjuz'; 
const supabase = createClient(supabaseUrl, supabaseKey);

async function listAllTables() {
  // Try to find tables by querying a known table or making a broad select
  // Since we can't query information_schema directly easily with js client without rpc
  // We'll guess common names
  const candidates = ['tax_requests', 'tax_analysis', 'tax_recovery', 'requests', 'documents', 'files'];
  
  for (const table of candidates) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (!error) {
        console.log(`Table '${table}' exists. Count: ${count}`);
    } else {
        // console.log(`Table '${table}' error: ${error.message}`);
    }
  }
}

listAllTables();
