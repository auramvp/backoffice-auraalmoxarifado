
const { createClient } = require('@supabase/supabase-js');

async function triggerSync() {
  console.log('Triggering sync_plans webhook...');
  try {
    const response = await fetch('https://zdgapmcalocdvdgvbwsj.supabase.co/functions/v1/cakto-webhook?action=sync_plans', {
        method: 'POST'
    });
    
    if (response.ok) {
        console.log('Sync triggered successfully.');
        const text = await response.text();
        console.log('Response:', text);
    } else {
        console.error('Sync failed:', response.status, response.statusText);
        const text = await response.text();
        console.error('Error details:', text);
    }
  } catch (error) {
    console.error('Error triggering sync:', error);
  }
}

triggerSync();
