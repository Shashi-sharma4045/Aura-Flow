// src/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  (import.meta.env.VITE_SUPABASE_URL as string) ||
  'https://igdzhskqtglbhcbiuwdh.supabase.co';

const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ||
  'sb_publishable_LqoaDZjk3Yc-g8eMPqKrAw_4k4363fi';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
