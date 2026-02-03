const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zdgapmcalocdvdgvbwsj.supabase.co';
const supabaseKey = 'sb_publishable_BgGJ0noZ8kExU47L3Y5KZw_KraGXjuz';

const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
  // Try to list tables by querying information_schema if possible (often restricted)
  // Or just try to fetch from common tables
  const tables = ['invoices', 'companies', 'subscriptions', 'plans', 'users', 'profiles', 'expenses'];
  
  for (const table of tables) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (error) {
      console.log(`Table '${table}': Error - ${error.message}`);
    } else {
      console.log(`Table '${table}': Exists (count: ${count})`);
      // If exists, get one row to see columns
      const { data } = await supabase.from(table).select('*').limit(1);
      if (data && data.length > 0) {
        console.log(`  Columns: ${Object.keys(data[0]).join(', ')}`);
      }
    }
  }
}

listTables();