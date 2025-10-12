import { createLazyFileRoute } from "@tanstack/react-router";
import { BookmarkManager } from "@/components/BookmarkManager";
export const Route = createLazyFileRoute("/bookmarks")({
  component: BookmarksPage,
});

import { useNavigate } from "@tanstack/react-router";

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

export default BookmarksPage;
