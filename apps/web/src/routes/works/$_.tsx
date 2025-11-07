import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

export const Route = createFileRoute("/works/$_")({
  validateSearch: z.object({
    select: z.string().optional(),
  }),
}).lazy(() => import("./$_.lazy").then((m) => m.Route));
