const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zdgapmcalocdvdgvbwsj.supabase.co';
const supabaseKey = 'sb_publishable_BgGJ0noZ8kExU47L3Y5KZw_KraGXjuz';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  const { data, error } = await supabase.from('invoices').select('*').limit(1);
  if (error) {
    console.error('Error fetching invoices:', error);
  } else {
    console.log('Invoices columns:', data && data.length > 0 ? Object.keys(data[0]) : 'No data found');
    if (data && data.length > 0) console.log('Sample row:', data[0]);
  }
}

inspect();