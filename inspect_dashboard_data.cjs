const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zdgapmcalocdvdgvbwsj.supabase.co';
const supabaseKey = 'sb_publishable_BgGJ0noZ8kExU47L3Y5KZw_KraGXjuz';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  console.log('--- Inspecting Plans ---');
  const { data: plans, error: plansError } = await supabase.from('plans').select('*');
  if (plansError) console.error('Error fetching plans:', plansError);
  else console.log('Plans found:', plans);

  console.log('\n--- Inspecting Companies (Plan distribution) ---');
  const { data: companies, error: companiesError } = await supabase.from('companies').select('plan, name');
  if (companiesError) console.error('Error fetching companies:', companiesError);
  else console.log('Companies found:', companies);

  console.log('\n--- Inspecting Payment Methods Source ---');
  // Check common tables for payment info
  const tables = ['subscriptions', 'invoices', 'payments'];
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*').limit(5);
    if (error) {
      console.log(`Table '${t}': Error/Not Found - ${error.message}`);
    } else {
      console.log(`Table '${t}': Found ${data.length} rows`);
      if (data.length > 0) console.log('Sample keys:', Object.keys(data[0]));
      if (data.length > 0) console.log('Sample row:', data[0]);
    }
  }
}

inspect();