import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

export const Route = createFileRoute("/works/$workId")({
  validateSearch: z.object({
    select: z.string().optional(),
  }),
}).lazy(() => import("./$workId.lazy").then((m) => m.Route));
