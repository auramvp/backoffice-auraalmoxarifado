const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zdgapmcalocdvdgvbwsj.supabase.co';
const supabaseKey = 'sb_publishable_BgGJ0noZ8kExU47L3Y5KZw_KraGXjuz';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('--- PLANS ---');
  const { data: plans, error } = await supabase.from('plans').select('*').order('value');
  if (plans) {
    plans.forEach(p => {
        console.log(`Name: ${p.name} | Value: ${p.value} | ID: ${p.id}`);
    });
  } else {
    console.log('Error fetching plans:', error);
  }
}

check();