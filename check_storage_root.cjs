
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zdgapmcalocdvdgvbwsj.supabase.co';
const supabaseKey = 'sb_publishable_BgGJ0noZ8kExU47L3Y5KZw_KraGXjuz'; 
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStorageRoot() {
  console.log("Checking Storage bucket 'files' root...");
  const { data: files, error: fileError } = await supabase.storage.from('files').list();

  if (fileError) {
     console.error("Error accessing storage:", fileError);
  } else {
     console.log(`Found ${files.length} files/folders in root of 'files':`);
     console.log(files);
  }
}

checkStorageRoot();
