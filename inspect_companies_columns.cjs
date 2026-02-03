const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zdgapmcalocdvdgvbwsj.supabase.co';
const supabaseKey = 'sb_publishable_BgGJ0noZ8kExU47L3Y5KZw_KraGXjuz';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectCompanies() {
  const { data, error } = await supabase.from('companies').select('*').limit(1);
  if (error) {
    console.error('Error:', error);
  } else {
    if (data && data.length > 0) {
      console.log('Columns in companies:', Object.keys(data[0]));
    } else {
      console.log('No companies found, cannot inspect columns from data.');
      // Fallback: try to insert a dummy to see error or use generic info if available
    }
  }
}

inspectCompanies();