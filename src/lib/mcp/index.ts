import { defineMcp } from "@lovable.dev/mcp-js";
import listCategories from "./tools/list-categories";
import searchProviders from "./tools/search-providers";

export default defineMcp({
  name: "ahl-elsan3a",
  title: "Ahl Elsan3a",
  version: "0.1.0",
  instructions:
    "Public directory of village craftsmen and service providers in Egypt (Arabic). Use `list_categories` to get category/area ids, then `search_providers` to find craftsmen. Phone numbers are not exposed; direct users to the app's provider page to contact them.",
  tools: [listCategories, searchProviders],
});
