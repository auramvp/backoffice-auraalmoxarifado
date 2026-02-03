const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zdgapmcalocdvdgvbwsj.supabase.co';
const supabaseKey = 'sb_publishable_BgGJ0noZ8kExU47L3Y5KZw_KraGXjuz';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSubs() {
  const { data, error } = await supabase.from('subscriptions').select('*').limit(5);
  if (error) {
    console.log('Error:', error.message);
  } else {
    console.log('Subscriptions:', data);
  }
}

checkSubs();