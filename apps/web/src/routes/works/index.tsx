import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/works/")({
  component: WorksListRoute,
});

function WorksListRoute() {
  return (
    <div>
      <h1>Works</h1>
      <div data-testid="table">Works table placeholder</div>
    </div>
  );
}