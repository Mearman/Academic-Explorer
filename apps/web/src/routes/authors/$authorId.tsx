import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

export const Route = createFileRoute("/authors/$authorId")({
  validateSearch: z.object({
    select: z.string().optional(),
  }),
}).lazy(() => import("./$authorId.lazy").then((m) => m.Route));
