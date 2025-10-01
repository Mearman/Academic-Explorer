import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/autocomplete/authors/")({
  component: AutocompleteAuthorsRoute,
});

function AutocompleteAuthorsRoute() {
  return (
    <div>
      <h1>Autocomplete Authors</h1>
    </div>
  );
}