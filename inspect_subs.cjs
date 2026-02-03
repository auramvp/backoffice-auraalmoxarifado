const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zdgapmcalocdvdgvbwsj.supabase.co';
const supabaseKey = 'sb_publishable_BgGJ0noZ8kExU47L3Y5KZw_KraGXjuz';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('--- SUBSCRIPTIONS ---');
  const { data: subs, error } = await supabase.from('subscriptions').select('*').limit(5);
  if (error) {
    console.log('Error:', error);
  } else {
    if (subs.length > 0) {
      console.log('Keys:', Object.keys(subs[0]));
      console.log('Sample:', subs[0]);
    } else {
      console.log('No subscriptions found.');
    }
  }

  console.log('\n--- PLANS ---');
  const { data: plans } = await supabase.from('plans').select('id, name');
  console.log(plans);
}

check();