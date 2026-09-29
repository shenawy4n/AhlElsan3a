<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture decisions

- Supabase connection settings are delivered at runtime, not build time: the
  browser client is `src/lib/supabase-runtime.ts` (config fetched from
  `/api/public/app-config`, which reads `SUPABASE_URL` /
  `SUPABASE_PUBLISHABLE_KEY` injected by Lovable Cloud). `.env` carries no
  `VITE_SUPABASE_*` values — never reintroduce build-time env dependencies for
  the backend connection, and import `{ supabase }` from
  `@/lib/supabase-runtime`, not the generated client.
