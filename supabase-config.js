// Supabase Configuration
// Replace with your actual Supabase project credentials

const SUPABASE_CONFIG = {
    url: 'YOUR_SUPABASE_URL', // Replace with your Supabase project URL
    anonKey: 'YOUR_SUPABASE_ANON_KEY' // Replace with your Supabase anon key
};

// Initialize Supabase client
const supabase = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

// Export for use in other modules
window.supabase = supabase;
window.SUPABASE_CONFIG = SUPABASE_CONFIG;