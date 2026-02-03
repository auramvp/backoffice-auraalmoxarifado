
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

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Credenciais ausentes.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function probe() {
  console.log('--- Sondando Buckets (Tentativa de Acesso Público) ---');
  
  const candidates = ['files', 'tax-documents', 'documents', 'public', 'uploads', 'comprovantes'];
  
  for (const bucket of candidates) {
    process.stdout.write(`Tentando bucket '${bucket}'... `);
    const { data, error } = await supabase.storage.from(bucket).list('', { limit: 5 });
    
    if (error) {
      console.log(`ERRO: ${error.message}`);
    } else {
      console.log(`SUCESSO! ${data.length} arquivos na raiz.`);
      if (data.length > 0) {
        console.log('  Arquivos:', data.map(f => f.name).join(', '));
        // Se tiver pastas, listar dentro
        const folders = data.filter(f => !f.id); // folders usually don't have ID in some versions, or check metadata
        // Actually list returns object with id, name, metadata. Folders have metadata: null usually?
        // Let's just try to list 'tax-documents' inside 'files' if it exists
      }
      
      if (bucket === 'files') {
          console.log("  Verificando 'files/tax-documents'...");
          const { data: sub, error: subErr } = await supabase.storage.from('files').list('tax-documents');
          if (subErr) console.log(`  Erro subpasta: ${subErr.message}`);
          else {
              console.log(`  Arquivos em 'files/tax-documents': ${sub.length}`);
              if (sub.length > 0) console.log('    ' + sub.map(f => f.name).join(', '));
          }
      }
    }
  }
}

probe();
