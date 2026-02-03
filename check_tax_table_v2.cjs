
const { createClient } = require('@supabase/supabase-js');

// URL and Key from project context or environment
const supabaseUrl = 'https://zdgapmcalocdvdgvbwsj.supabase.co';
const supabaseKey = 'sb_publishable_BgGJ0noZ8kExU47L3Y5KZw_KraGXjuz'; 

if (!supabaseKey) {
    console.error("SUPABASE_KEY environment variable is missing.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTaxAnalysisRequests() {
  console.log("Checking 'tax_analysis_requests' table...");
  const { data: requests, error: reqError } = await supabase.from('tax_analysis_requests').select('*').limit(5);
  
  if (reqError) {
    console.error("Error accessing 'tax_analysis_requests' table:", reqError);
  } else {
    console.log(`'tax_analysis_requests' table exists. Found ${requests.length} rows.`);
    if (requests.length > 0) console.log(JSON.stringify(requests[0], null, 2));
  }
}

checkTaxAnalysisRequests();
