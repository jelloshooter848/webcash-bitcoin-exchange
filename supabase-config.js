// Supabase Configuration
// Replace with your actual Supabase project credentials

const SUPABASE_CONFIG = {
    url: 'https://xoojokmiwwtawgitoovp.supabase.co', 
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhvb2pva21pd3d0YXdnaXRvb3ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MDIwMTMsImV4cCI6MjA2ODE3ODAxM30.oZIBQ3elGlnmrIztdO1pO3mbGX2Y4Av7IUCpp4OFkV4'
};

// Initialize Supabase client
const supabaseClient = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

// Export for use in other modules
window.supabase = supabaseClient;
window.SUPABASE_CONFIG = SUPABASE_CONFIG;