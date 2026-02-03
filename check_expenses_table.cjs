
const { createClient } = require('@supabase/supabase-js');

// URL and Key from project context or environment
const supabaseUrl = 'https://zdgapmcalocdvdgvbwsj.supabase.co';
const supabaseKey = 'sb_publishable_BgGJ0noZ8kExU47L3Y5KZw_KraGXjuz'; 

if (!supabaseKey) {
    console.error("SUPABASE_KEY environment variable is missing.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  console.log("Checking 'expenses' table...");
  const { data: expenses, error: errorExpenses } = await supabase.from('expenses').select('*').limit(5);
  
  if (errorExpenses) {
    console.error("Error accessing 'expenses' table:", errorExpenses);
  } else {
    console.log(`'expenses' table exists. Found ${expenses.length} rows.`);
    if (expenses.length > 0) console.log(expenses);
  }

  console.log("\nChecking 'expense_categories' table...");
  const { data: categories, error: errorCategories } = await supabase.from('expense_categories').select('*').limit(5);

  if (errorCategories) {
     console.error("Error accessing 'expense_categories' table:", errorCategories);
  } else {
     console.log(`'expense_categories' table exists. Found ${categories.length} rows.`);
     if (categories.length > 0) console.log(categories);
  }
}

checkTables();
