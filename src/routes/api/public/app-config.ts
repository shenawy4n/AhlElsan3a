import { createFileRoute } from '@tanstack/react-router';

// Public same-origin config endpoint. Returns the Supabase URL and publishable
// key — both public-by-design values — so the browser client can boot without
// build-time VITE_ variables. No secrets are ever returned here.
export const Route = createFileRoute('/api/public/app-config')({
  server: {
    handlers: {
      GET: async () => {
        const supabaseUrl = process.env['SUPABASE_URL'];
        const publishableKey = process.env['SUPABASE_PUBLISHABLE_KEY'];
        if (!supabaseUrl || !publishableKey) {
          return new Response('Configuration unavailable', { status: 503 });
        }
        return Response.json(
          { supabaseUrl, publishableKey },
          { headers: { 'cache-control': 'no-store' } },
        );
      },
    },
  },
});
