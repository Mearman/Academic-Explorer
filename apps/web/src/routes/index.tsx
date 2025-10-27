import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({}).lazy(() => import("./index.lazy").then((d) => d.Route));
