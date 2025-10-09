import { createFileRoute } from "@tanstack/react-router";

function FunderRoute() {
  const { funderId } = Route.useParams();

  return <div>Hello "/funders/$funderId"!</div>;
}

export const Route = createFileRoute("/funders/$funderId")({
  component: FunderRoute,
});
