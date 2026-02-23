import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://localhost:54321'; // mock
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'mock'; // mock 

// Just use fetch to check if CORS or edge fn exists on production? 
// Actually I don't have the env vars so I can't interact with prod.
