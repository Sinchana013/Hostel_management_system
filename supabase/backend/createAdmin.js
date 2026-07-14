// createAdmin.js
import { supabase } from "./supabaseClient.js";

async function createAdminUser(email, name) {
  try {
    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password: generateTemporaryPassword(),
      options: {
        data: {
          full_name: name,
        }
      }
    });

    if (authError) throw authError;

    // 2. Create user profile with admin role
    // Based on the schema, we need to include std_usn and manager_id
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: authData.user.id,
        role: 'admin',
        std_usn: null,  // Required by check constraint
        manager_id: null  // Required by check constraint
      });

    if (profileError) throw profileError;

    console.log('✅ Admin user created successfully!');
    console.log('Email:', email);
    console.log('Temporary password has been set');
    console.log('The user should check their email to verify their account');

    return { success: true, userId: authData.user.id };

  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    return { success: false, error };
  }
}

function generateTemporaryPassword() {
  const length = 16;
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

// Usage: node createAdmin.js "admin@example.com" "Admin Name"
const [email, name] = process.argv.slice(2);
if (!email || !name) {
  console.error('Usage: node createAdmin.js <email> "<Full Name>"');
  process.exit(1);
}

createAdminUser(email, name);