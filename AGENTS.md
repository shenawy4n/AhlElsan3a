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

- The backend connection uses Lovable's standard generated client: import
  `{ supabase }` from `@/integrations/supabase/client`, which reads build-time
  `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` from `.env` (both are
  public-by-design values). A previous runtime-fetch indirection was removed
  because it made the first paint race the config request and intermittently
  crash the app into the error screen.

