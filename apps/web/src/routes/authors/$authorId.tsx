import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import AuthorRoute from "./$authorId.lazy";

export const Route = createFileRoute("/authors/$authorId")({
  component: AuthorRoute,
  validateSearch: z.object({
    select: z.string().optional(),
  }),
});
