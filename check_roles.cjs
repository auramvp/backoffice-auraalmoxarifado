
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zdgapmcalocdvdgvbwsj.supabase.co';
const supabaseKey = 'sb_publishable_BgGJ0noZ8kExU47L3Y5KZw_KraGXjuz';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkConstraint() {
  console.log('Checking valid roles...');
  // We can't easily check constraints via JS client without admin, but we can try common roles.
  // Common roles: 'admin', 'user', 'owner', 'member', 'ALMOXARIFE', 'ADMIN'
  
  const userId = 'd1aac413-c731-404b-95a6-26f524b8b53d'; // ID from previous run
  
  const rolesToTry = ['admin', 'ADMIN', 'master', 'MASTER', 'owner', 'OWNER', 'super_admin'];
  
  for (const role of rolesToTry) {
      console.log(`Trying role: ${role}`);
      const { error } = await supabase.from('profiles').upsert({
          id: userId,
          email: 'carlosgabriel.camppos@gmail.com',
          name: 'Carlos Gabriel',
          role: role,
          permissions: { all: true }
      });
      
      if (!error) {
          console.log(`SUCCESS! Valid role is: ${role}`);
          break;
      } else {
          console.log(`Failed with ${role}: ${error.message}`);
      }
  }
}

checkConstraint();
