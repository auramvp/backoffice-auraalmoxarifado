
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zdgapmcalocdvdgvbwsj.supabase.co';
const supabaseKey = 'sb_publishable_BgGJ0noZ8kExU47L3Y5KZw_KraGXjuz'; 

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLogs() {
  console.log("Checking recent logs...");
  const { data, error } = await supabase.from('activity_logs').select('*').order('timestamp', { ascending: false }).limit(10);
  
  if (error) {
    console.error("Error accessing 'activity_logs':", error);
  } else {
    console.log("Found logs:", data);
  }
}

checkLogs();
