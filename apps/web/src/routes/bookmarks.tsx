import { BookmarkManager } from "@/components/BookmarkManager";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/bookmarks")({
  component: BookmarksPage,
});

function BookmarksPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8">
        <BookmarkManager
          onNavigate={(url) => {
            // Handle navigation to bookmarked URLs
            if (url.startsWith("/")) {
              void navigate({ to: url });
            } else {
              window.location.href = url;
            }
          }}
        />
      </div>
    </div>
  );
}
