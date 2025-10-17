import { createServerClient } from '@/lib/supabase/server';

let supabaseInstance: any = null;

export async function connectDB() {
  if (!supabaseInstance) {
    supabaseInstance = createServerClient();
  }
  return supabaseInstance;
}

export default connectDB;