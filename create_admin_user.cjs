
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zdgapmcalocdvdgvbwsj.supabase.co';
const supabaseKey = 'sb_publishable_BgGJ0noZ8kExU47L3Y5KZw_KraGXjuz';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createAdminUser() {
  const email = 'carlosgabriel.camppos@gmail.com';
  const password = 'Aura@0782';
  const name = 'Carlos Gabriel';
  
  console.log(`Creating user: ${email}`);

  // 1. Sign Up
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: name,
        role: 'admin_master' // Metadata role (sometimes used)
      }
    }
  });

  if (authError) {
    console.error('Error creating auth user:', authError.message);
    // If user already exists, we proceed to update profile
    if (!authError.message.includes('already registered')) {
        return;
    }
  } else {
    console.log('Auth user created successfully:', authData.user?.id);
  }
  
  // Try to sign in to get the user ID if sign up failed (already exists) or to verify
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (signInError) {
      console.error('Error signing in:', signInError.message);
      return;
  }
  
  const userId = signInData.user.id;
  console.log(`User ID: ${userId}`);

  // 2. Update/Insert Profile
  console.log('Updating profile in "profiles" table...');
  
  // First, check if profile exists
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  const profileData = {
    id: userId,
    email: email,
    name: name,
    role: 'ADMIN_MASTER', // Assuming upper case based on "ALMOXARIFE" example
    permissions: { all: true, admin: true },
    // company_id: null // Admin master might not need a company, or needs a special one
  };

  let profileError;
  if (existingProfile) {
      const { error } = await supabase.from('profiles').update(profileData).eq('id', userId);
      profileError = error;
  } else {
      const { error } = await supabase.from('profiles').insert([profileData]);
      profileError = error;
  }

  if (profileError) {
    console.error('Error updating profile:', profileError.message);
    // Try without company_id if it failed, maybe it's required?
    // Or maybe we need to fetch a dummy company.
  } else {
    console.log('Profile updated successfully with ADMIN_MASTER role.');
  }
}

createAdminUser();
