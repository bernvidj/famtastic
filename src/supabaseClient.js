import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jwyivcakhwyapzllwndd.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3eWl2Y2FraHd5YXB6bGx3bmRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNzczNjgsImV4cCI6MjA5NDg1MzM2OH0.MJaDp5Mt3c3lL_UfUxxCAJWlg__Vj_ml2deylYeJCeg';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
