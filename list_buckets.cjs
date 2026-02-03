
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Carregar variáveis de ambiente
const envLocalPath = path.resolve(__dirname, '.env.local');
const envPath = path.resolve(__dirname, '.env');
let envContent = '';
if (fs.existsSync(envLocalPath)) envContent = fs.readFileSync(envLocalPath, 'utf8');
else if (fs.existsSync(envPath)) envContent = fs.readFileSync(envPath, 'utf8');

envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) process.env[match[1]] = match[2].replace(/(^['"]|['"]$)/g, '').trim();
});

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function listBuckets() {
  console.log('--- Listando Buckets do Projeto ---');
  
  const { data, error } = await supabase.storage.listBuckets();
  
  if (error) {
    console.error('ERRO ao listar buckets:', error.message);
    console.log('Isso geralmente significa que a chave ANON não tem permissão para listar buckets (o que é normal).');
    console.log('Tente verificar o nome do bucket no painel do Supabase.');
  } else {
    console.log(`Encontrados ${data.length} buckets:`);
    data.forEach(b => {
        console.log(` - [${b.id}] (public: ${b.public}) Created: ${b.created_at}`);
    });
  }

  // Tentar listar arquivos na raiz do bucket 'files' novamente, só para confirmar
  console.log("\n--- Teste direto no bucket 'files' ---");
  const { data: files, error: filesError } = await supabase.storage.from('files').list();
  if (filesError) {
      console.log(`Erro ao acessar 'files': ${filesError.message}`);
  } else {
      console.log(`Arquivos na raiz de 'files': ${files.length}`);
      if (files.length > 0) console.log('Exemplos:', files.map(f => f.name).join(', '));
  }
}

listBuckets();
