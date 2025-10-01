import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/institutions")({
  component: InstitutionsListRoute,
});

function InstitutionsListRoute() {
  return (
    <div>
      <h1>Institutions</h1>
      <div data-testid="table">Institutions table placeholder</div>
    </div>
  );
}