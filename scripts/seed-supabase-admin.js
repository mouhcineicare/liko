const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function seedAdmin() {
  const hashedPassword = await bcrypt.hash('12345qwert', 10);
  
  const { data, error } = await supabase
    .from('users')
    .upsert({
      email: 'admin@gmail.com',
      password: hashedPassword,
      full_name: 'Admin User',
      role: 'admin',
      status: 'active',
      email_verified: true
    }, {
      onConflict: 'email'
    })
    .select();

  if (error) {
    console.error('Error creating admin:', error);
  } else {
    console.log('✅ Admin user created:', data);
    console.log('Login: admin@gmail.com / 12345qwert');
  }
}

seedAdmin();
