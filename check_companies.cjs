
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envLocalPath = path.resolve(__dirname, '.env.local');
let envContent = fs.existsSync(envLocalPath) ? fs.readFileSync(envLocalPath, 'utf8') : '';
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) process.env[match[1]] = match[2].replace(/(^['"]|['"]$)/g, '').trim();
});

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkCompanies() {
  console.log("Checking 'companies' table...");
  const { data: companies, error } = await supabase.from('companies').select('*').limit(3);
  
  if (error) {
    console.log(`Error: ${error.message}`);
  } else {
    console.log(`Found ${companies.length} companies.`);
    if (companies.length > 0) {
      console.log('Sample company keys:', Object.keys(companies[0]).join(', '));
      console.log('Sample company:', companies[0]);
    }
  }
}

checkCompanies();
