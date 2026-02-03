
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zdgapmcalocdvdgvbwsj.supabase.co';
const supabaseKey = 'sb_publishable_BgGJ0noZ8kExU47L3Y5KZw_KraGXjuz';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRoles() {
  console.log('Checking valid roles...');
  
  // Try to insert a dummy team member with role 'TIME' and 'MEMBER' to see if it's allowed.
  // The table is 'team_members' based on TeamView.tsx.
  
  const rolesToTry = ['TIME', 'Time', 'MEMBER', 'Member', 'time', 'member'];
  
  for (const role of rolesToTry) {
      console.log(`Trying role: ${role}`);
      const { data, error } = await supabase.from('team_members').insert([{
          name: 'Test Role Check',
          email: `test_${role}_${Date.now()}@test.com`,
          access_code: '000000',
          role: role,
          permissions: [],
          status: 'inactive' // Using inactive so we can easily delete later or ignore
      }]).select();
      
      if (!error) {
          console.log(`SUCCESS! Valid role is: ${role}`);
          // Clean up
          await supabase.from('team_members').delete().eq('id', data[0].id);
      } else {
          console.log(`Failed with ${role}: ${error.message}`);
      }
  }
}

checkRoles();
