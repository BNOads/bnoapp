import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

// Create a public Supabase client that doesn't use stored auth sessions
// This is useful for accessing public data without authentication
export const createPublicSupabaseClient = () => {
  return createClient<Database>(
    "https://tbdooscfrrkwfutkdjha.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRiZG9vc2NmcnJrd2Z1dGtkamhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NTQwODIsImV4cCI6MjA3MTUzMDA4Mn0.yd988Fotgc9LIZi83NlGDTaeB4f8BNgr9TYJgye0Cqw",
    { 
      auth: { 
        persistSession: false,
        storage: undefined
      } 
    }
  );
};