const https = require('https');

const clientId = '8L9pEZdS4hS9rHOuGFmyPChrSYbOOswJJ0ZQSgeq';
const clientSecret = '0578WYVcpdNGQiHCcjByJeIBdbGk2oJRsaAdCz1tEAfa72WvGhwvKOdfrvgbdbdo7Pe8XYwDWTiFHdUkt68mfcE9F4pSweKWg9JXHmqDVR6zvnoBo8FFc9vxSQQQluRx';

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
  try {
    console.log('1. Autenticando...');
    const params = new URLSearchParams({
      'client_id': clientId,
      'client_secret': clientSecret
    }).toString();

    const auth = await request('https://api.cakto.com.br/public_api/token/', 'POST', {
      'Content-Type': 'application/x-www-form-urlencoded'
    }, params);

    if (!auth.access_token) {
      console.error('Falha na autenticação:', auth);
      return;
    }

    const token = auth.access_token;
    console.log('Token obtido.');

    console.log('2. Buscando produtos...');
    const products = await request('https://api.cakto.com.br/api/products/?limit=100', 'GET', {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    });

    // Handle different response structures
    const productList = Array.isArray(products) ? products : (products.data || products.results || []);
    console.log(`Encontrados ${productList.length} produtos.`);
    
    // Print all product names to see what we have
    productList.forEach(p => console.log(` - Produto: [${p.id}] ${p.name}`));

    // Find "Aura Almoxarifado" or similar
    // User mentioned: "Pano Pro", "Plano Intelligence", "Plano Business", "Plano Starter"
    // Let's see if these are products or offers.
    
    // Print details of the second Aura product (if exists)
    const auraProduct2 = productList.find(p => p.id === 'b49a15d9-8d74-4e8a-8aaf-d14bcdbbe131');
    if (auraProduct2) {
        console.log('Detalhes do produto Aura 2:', JSON.stringify(auraProduct2, null, 2));
        
        // Try to fetch offers for this specific product
        console.log(`Buscando ofertas para Aura 2 (${auraProduct2.id})...`);
        const offers2 = await request(`https://api.cakto.com.br/api/products/${auraProduct2.id}/offers/`, 'GET', {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
        });
        const offerList2 = Array.isArray(offers2) ? offers2 : (offers2.data || offers2.results || []);
        console.log(`> ${offerList2.length} ofertas encontradas para Aura 2.`);
        offerList2.forEach(o => console.log(`  - Oferta: [${o.id}] ${o.name}`));
    }

    // Try global offers endpoint
    console.log('Tentando buscar ofertas globais...');
    try {
        const allOffers = await request('https://api.cakto.com.br/api/offers/?limit=100', 'GET', {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
        });
        const allOffersList = Array.isArray(allOffers) ? allOffers : (allOffers.data || allOffers.results || []);
        console.log(`Ofertas globais encontradas: ${allOffersList.length}`);
        
        // Print first offer details to find price field
        if (allOffersList.length > 0) {
             console.log('Exemplo de oferta:', JSON.stringify(allOffersList[0], null, 2));
        }

        allOffersList.forEach(o => {
            const pId = o.product || o.product_id;
            console.log(` - Oferta Global: [${o.id}] ${o.name || o.title} | ProductID: ${pId} | Price: ${o.price || o.value}`);
        });
    } catch (e) {
        console.log('Endpoint global de ofertas falhou ou não existe.');
    }
    
    /*
    // Fetch offers for ALL products to be sure
    for (const p of productList) {
    ...
    */

  } catch (error) {
    console.error('Erro:', error);
  }
}

main();
