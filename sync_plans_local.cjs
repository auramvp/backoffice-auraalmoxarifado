
const { createClient } = require('@supabase/supabase-js');
const https = require('https');

// Supabase configuration
const supabaseUrl = 'https://zdgapmcalocdvdgvbwsj.supabase.co';
const supabaseKey = 'sb_publishable_BgGJ0noZ8kExU47L3Y5KZw_KraGXjuz'; // Anon key
const supabase = createClient(supabaseUrl, supabaseKey);

// Cakto configuration
const caktoClientId = '8L9pEZdS4hS9rHOuGFmyPChrSYbOOswJJ0ZQSgeq';
const caktoClientSecret = '0578WYVcpdNGQiHCcjByJeIBdbGk2oJRsaAdCz1tEAfa72WvGhwvKOdfrvgbdbdo7Pe8XYwDWTiFHdUkt68mfcE9F4pSweKWg9JXHmqDVR6zvnoBo8FFc9vxSQQQluRx';

// Product IDs
const AURA_PRODUCT_IDS = [
  // 'eb406e9e-dd90-4bb8-8b8a-c381d9c7657e', // REMOVED (Deleted product with old prices)
  'b49a15d9-8d74-4e8a-8aaf-d14bcdbbe131'  // Active product
];

// Helper for HTTPS requests
function request(url, method, headers, body = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method, headers }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function main() {
  console.log('Starting sync...');

  // 1. Authenticate with Cakto
  console.log('Authenticating with Cakto...');
  const params = new URLSearchParams({
    'client_id': caktoClientId,
    'client_secret': caktoClientSecret
  }).toString();

  const auth = await request('https://api.cakto.com.br/public_api/token/', 'POST', {
    'Content-Type': 'application/x-www-form-urlencoded'
  }, params);

  if (!auth.access_token) {
    console.error('Authentication failed:', auth);
    return;
  }
  const token = auth.access_token;
  console.log('Authenticated.');

  // 2. Fetch all offers
  console.log('Fetching offers...');
  const response = await request('https://api.cakto.com.br/api/offers/?limit=100', 'GET', {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/json'
  });

  const allOffers = Array.isArray(response) ? response : (response.data || response.results || []);
  console.log(`Found ${allOffers.length} offers total.`);

  // 3. Filter and process offers
  const offersToSync = [];
  
  for (const offer of allOffers) {
    let name = offer.name || offer.title || 'Plano sem nome';
    const productId = offer.product || offer.product_id;
    const price = offer.price || offer.value || 0;
    const externalId = offer.id || String(Math.random());

    // Normalize name
    if (/pano pro/i.test(name)) {
        name = 'Plano Pro';
    }

    // Ignore duplicate Plano Pro (497) if any
    if (name === 'Plano Pro' && Math.abs(price - 297) > 50) {
        console.log(`Ignoring duplicate/incorrect Plano Pro: ${name} - ${price}`);
        continue;
    }

    // Filter by Product ID
    if (AURA_PRODUCT_IDS.includes(productId)) {
        console.log(`Preparing to sync: ${name} - R$ ${price} [${productId}]`);
        offersToSync.push({
            name: name,
            value: price,
            description: offer.description || null,
            external_id: externalId,
            status: 'active'
        });
    }
  }

  console.log(`Selected ${offersToSync.length} offers to sync.`);

  // 4. Update Supabase
  // Try to delete existing plans first
  console.log('Deleting existing plans...');
  const { error: deleteError } = await supabase.from('plans').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  
  if (deleteError) {
      console.error('Error deleting plans:', deleteError);
      console.log('NOTE: If this failed due to permissions, the sync cannot proceed with ANON key.');
      return;
  }
  console.log('Existing plans deleted.');

  // Insert new plans
  console.log('Inserting new plans...');
  const { data: inserted, error: insertError } = await supabase.from('plans').insert(offersToSync).select();
  
  if (insertError) {
      console.error('Error inserting plans:', insertError);
  } else {
      console.log(`Successfully inserted ${inserted.length} plans.`);
      inserted.forEach(p => console.log(` - ${p.name}: ${p.value}`));
  }
}

main();
