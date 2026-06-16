import { createClient } from '@supabase/supabase-js';

// Respect both standard Vite prefixes and Next.js fallback prefixes
const supabaseUrl = ((import.meta as any).env?.VITE_SUPABASE_URL as string) || 'https://kirltxcnlunlhgtaafjs.supabase.co';
const supabaseKey = ((import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string) || 'sb_publishable_263cmxRN6_LVZFsbQCLqzw_QZ7tlM8H';

export const supabase = createClient(supabaseUrl, supabaseKey);
