// services/supabase.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto";

const supabaseUrl = 'https://fcwfzxwhaaocxbwobeay.supabase.co';
const supabaseAnonKey = "sb_publishable_OEGz75-H2EwqqJjKTAve8A_aY-z_HYz";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase URL or Key is missing. Check your .env configuration.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
