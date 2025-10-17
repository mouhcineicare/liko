const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function applyMigration() {
  const sql = fs.readFileSync(
    path.join(__dirname, '../supabase/migrations/001_initial_schema.sql'),
    'utf8'
  );
  
  // Note: This requires service role key, adjust as needed
  console.log('Apply this SQL manually in Supabase dashboard:');
  console.log(sql);
}

applyMigration();
