const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Carregar variáveis de ambiente manualmente
const envLocalPath = path.resolve(__dirname, '.env.local');
const envPath = path.resolve(__dirname, '.env');

let envContent = '';
if (fs.existsSync(envLocalPath)) {
  envContent = fs.readFileSync(envLocalPath, 'utf8');
} else if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
}

envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.length > 0 && value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') {
      value = value.replace(/\\n/gm, '\n');
    }
    value = value.replace(/(^['"]|['"]$)/g, '').trim();
    process.env[key] = value;
  }
});

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkConnection() {
  console.log('Verificando conexão com DB...');
  const { data, error } = await supabase.from('companies').select('count', { count: 'exact', head: true });
  
  if (error) {
    console.error('Erro de conexão DB:', error);
  } else {
    console.log('Conexão DB OK. Total companies:', data, '(count only)');
  }
}

checkConnection();
