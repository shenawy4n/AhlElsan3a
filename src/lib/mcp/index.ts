import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listCategories from "./tools/list-categories";
import searchProviders from "./tools/search-providers";

const supabaseUrl = "https://nukvihjhdvahbtgrqkxy.supabase.co";

export default defineMcp({
  name: "ahl-elsan3a",
  title: "Ahl Elsan3a",
  version: "0.1.0",
  instructions:
    "Directory of village craftsmen and service providers in Egypt (Arabic). Requires sign-in. Use `list_categories` to get category/area ids, then `search_providers` to find craftsmen. Phone numbers are not exposed; direct users to the app's provider page to contact them.",
  auth: auth.oauth.issuer({
    issuer: `${supabaseUrl}/auth/v1`,
    acceptedAudiences: "authenticated",
    jwksUri: `${supabaseUrl}/auth/v1/.well-known/jwks.json`,
  }),
  tools: [listCategories, searchProviders],
});
