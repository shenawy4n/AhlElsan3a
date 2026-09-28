// Browser/SSR Supabase client backed by runtime-fetched configuration.
// Replaces direct use of the generated client, which depends on build-time
// VITE_SUPABASE_* variables. Import { supabase } from here everywhere.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { brokeredPreviewStorage } from '@/integrations/supabase/previewAuthStorage';
import { getAppConfigSync, type AppConfig } from './app-config';

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    // New Supabase API keys are opaque strings, not bearer JWTs.
    if (headers.get('Authorization') === `Bearer ${supabaseKey}`) {
      headers.delete('Authorization');
    }

    headers.set('apikey', supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

function createSupabaseClient(config: AppConfig): SupabaseClient<Database> {
  return createClient<Database>(config.supabaseUrl, config.publishableKey, {
    global: {
      fetch: createSupabaseFetch(config.publishableKey),
    },
    auth: {
      storage: brokeredPreviewStorage(),
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

let _supabase: SupabaseClient<Database> | undefined;

// Import the supabase client like this:
// import { supabase } from "@/lib/supabase-runtime";
export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient(getAppConfigSync());
    return Reflect.get(_supabase, prop, receiver);
  },
});
