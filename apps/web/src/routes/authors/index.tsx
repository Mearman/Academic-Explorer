import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/authors/")({
  component: AuthorsListRoute,
});

function AuthorsListRoute() {
  return (
    <div>
      <h1>Authors</h1>
      <div data-testid="table">Authors table placeholder</div>
    </div>
  );
}