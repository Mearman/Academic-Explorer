import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/$_")({}).lazy(() => import("./$_.lazy").then((m) => m.Route));
