// Runtime app configuration. The browser client loads its Supabase connection
// settings from /api/public/app-config instead of build-time VITE_ variables,
// so no connection values live in the repository.

export type AppConfig = { supabaseUrl: string; publishableKey: string };

let cached: AppConfig | null = null;

function serverConfig(): AppConfig {
  const supabaseUrl = process.env['SUPABASE_URL'];
  const publishableKey = process.env['SUPABASE_PUBLISHABLE_KEY'];
  if (!supabaseUrl || !publishableKey) {
    throw new Error(
      'Missing Supabase environment variable(s): ' +
        [
          ...(!supabaseUrl ? ['SUPABASE_URL'] : []),
          ...(!publishableKey ? ['SUPABASE_PUBLISHABLE_KEY'] : []),
        ].join(', '),
    );
  }
  return { supabaseUrl, publishableKey };
}

async function fetchBrowserConfig(): Promise<AppConfig> {
  const res = await fetch('/api/public/app-config');
  if (!res.ok) throw new Error('Unable to load application configuration');
  const data = (await res.json()) as AppConfig;
  if (!data?.supabaseUrl || !data?.publishableKey) {
    throw new Error('Invalid application configuration');
  }
  return data;
}

// Synchronous read for client creation. On the server this reads the
// per-request injected env lazily; in the browser it only succeeds after
// appConfigReady has resolved (the root component awaits it before rendering).
export function getAppConfigSync(): AppConfig {
  if (cached) return cached;
  if (typeof window === 'undefined') {
    cached = serverConfig();
    return cached;
  }
  throw new Error('Application configuration not loaded yet');
}

export async function ensureAppConfig(): Promise<AppConfig> {
  if (!cached) {
    cached = typeof window === 'undefined' ? serverConfig() : await fetchBrowserConfig();
  }
  return cached;
}

// Resolves once the browser has fetched the runtime config. On the server it
// resolves immediately (env may also be read lazily per access on the edge).
export const appConfigReady: Promise<AppConfig | null> = (async () => {
  if (typeof window !== 'undefined') {
    cached = await fetchBrowserConfig();
  } else {
    try {
      cached = serverConfig();
    } catch {
      // Edge runtime may inject env per request; leave null and let
      // getAppConfigSync() read it lazily during request handling.
    }
  }
  return cached;
})();
