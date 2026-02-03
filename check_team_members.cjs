
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zdgapmcalocdvdgvbwsj.supabase.co';
const supabaseKey = 'sb_publishable_BgGJ0noZ8kExU47L3Y5KZw_KraGXjuz'; 

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTeamMembers() {
  console.log("Checking 'team_members' table structure...");
  const { data, error } = await supabase.from('team_members').select('*').limit(1);
  
  if (error) {
    console.error("Error accessing 'team_members':", error);
  } else {
    console.log("Found row:", data);
  }
}

checkTeamMembers();
