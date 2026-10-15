import { createClient } from "@supabase/supabase-js";

import { publicEnv, serverEnv } from "@/env";
import type { Database } from "@/lib/database.types";

/**
 * Service-role client. It bypasses Row Level Security, so:
 *   - it is only imported by server code (Server Actions, Route Handlers, scripts);
 *   - the caller must still authorise the request before using it;
 *   - the secret key must never reach the browser or a NEXT_PUBLIC_* variable.
 */
export function createAdminSupabaseClient() {
  const { supabaseUrl } = publicEnv();
  const { secretKey } = serverEnv();

  return createClient<Database>(supabaseUrl, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
