import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { z } from "zod";

const autocompleteWorksSearchSchema = z.object({
  filter: z.string().optional().catch(undefined),
  search: z.string().optional().catch(undefined),
  q: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/autocomplete/works/")({
  component: AutocompleteWorksRoute,
  validateSearch: autocompleteWorksSearchSchema,
});

function AutocompleteWorksRoute() {
  const search = Route.useSearch();

  useEffect(() => {
    // Prettify the URL by decoding encoded characters
    if (typeof window !== "undefined") {
      const currentHash = window.location.hash;
      const decodedHash = decodeURIComponent(currentHash);
      
      // Only update if the URL actually changed after decoding
      if (currentHash !== decodedHash) {
        window.history.replaceState(null, "", decodedHash);
      }
    }
  }, []);

  return (
    <div>
      <h1>Autocomplete Works</h1>
      <div>
        <h2>Search Parameters:</h2>
        <pre>{JSON.stringify(search, null, 2)}</pre>
      </div>
    </div>
  );
}
