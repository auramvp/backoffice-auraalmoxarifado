
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zdgapmcalocdvdgvbwsj.supabase.co';
const supabaseKey = 'sb_publishable_BgGJ0noZ8kExU47L3Y5KZw_KraGXjuz';

const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
  console.log('Listing tables via indirect check...');
  
  const tablesToCheck = ['users', 'profiles', 'team_members', 'admin_users', 'admins'];
  
  for (const table of tablesToCheck) {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) {
          console.log(`Table '${table}' check failed: ${error.code} - ${error.message}`);
      } else {
          console.log(`Table '${table}' EXISTS.`);
          if (data.length > 0) {
              console.log('Sample data:', data[0]);
          } else {
              console.log('Table is empty.');
          }
      }
  }
}

listTables();
