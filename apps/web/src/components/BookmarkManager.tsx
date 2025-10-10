/**
 * Bookmark manager component for displaying and managing user bookmarks
 */

import { useUserInteractions } from "@/hooks/use-user-interactions";
import { logger } from "@academic-explorer/utils/logger";
import {
  IconBookmark,
  IconBookmarkOff,
  IconSearch,
  IconTrash,
  IconExternalLink,
} from "@tabler/icons-react";
import { useState } from "react";

interface BookmarkManagerProps {
  onNavigate?: (url: string) => void;
}

export function BookmarkManager({ onNavigate }: BookmarkManagerProps) {
  const { bookmarks, unbookmarkEntity, isLoadingBookmarks } =
    useUserInteractions();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredBookmarks = searchQuery
    ? bookmarks.filter(
        (bookmark) =>
          bookmark.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          bookmark.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          bookmark.tags?.some((tag) =>
            tag.toLowerCase().includes(searchQuery.toLowerCase()),
          ),
      )
    : bookmarks;

  const handleUnbookmark = async (bookmarkId: number) => {
    try {
      // Find the bookmark to get entity info for unbookmarking
      const bookmark = bookmarks.find((b) => b.id === bookmarkId);
      if (bookmark) {
        await unbookmarkEntity();
      }
    } catch (error) {
      logger.error("bookmark-manager", "Failed to remove bookmark", {
        bookmarkId,
        error,
      });
    }
  };

  const handleNavigate = (url: string) => {
    if (onNavigate) {
      onNavigate(url);
    } else {
      window.location.href = url;
    }
  };

  if (isLoadingBookmarks) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-2 text-sm text-gray-600">Loading bookmarks...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <IconBookmark size={24} />
          Bookmarks
        </h2>

        {/* Search */}
        <div className="relative mb-4">
          <IconSearch
            size={16}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search bookmarks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {filteredBookmarks.length === 0 ? (
        <div className="text-center py-12">
          <IconBookmarkOff size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchQuery ? "No bookmarks found" : "No bookmarks yet"}
          </h3>
          <p className="text-gray-600">
            {searchQuery
              ? "Try adjusting your search terms"
              : "Bookmark entities you want to revisit later"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredBookmarks.map((bookmark) => (
            <div
              key={bookmark.id}
              className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-medium text-gray-900 flex-1 pr-2">
                  {bookmark.title}
                </h3>
                <button
                  onClick={() => bookmark.id && handleUnbookmark(bookmark.id)}
                  className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors"
                  title="Remove bookmark"
                >
                  <IconTrash size={16} />
                </button>
              </div>

              <div className="text-sm text-gray-600 mb-2">
                <span className="capitalize">{bookmark.request.endpoint}</span>
                {bookmark.request.params &&
                  JSON.parse(bookmark.request.params) &&
                  Object.keys(JSON.parse(bookmark.request.params)).length >
                    0 && (
                    <span className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded">
                      {Object.keys(JSON.parse(bookmark.request.params)).length}{" "}
                      param
                      {Object.keys(JSON.parse(bookmark.request.params))
                        .length !== 1
                        ? "s"
                        : ""}
                    </span>
                  )}
              </div>

              {bookmark.notes && (
                <p className="text-sm text-gray-700 mb-2 line-clamp-2">
                  {bookmark.notes}
                </p>
              )}

              {bookmark.tags && bookmark.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {bookmark.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{new Date(bookmark.timestamp).toLocaleDateString()}</span>
                <button
                  onClick={() => handleNavigate(bookmark.request.cacheKey)}
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline"
                  title="Open bookmark"
                >
                  <IconExternalLink size={14} />
                  Open
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {bookmarks.length > 0 && (
        <div className="mt-6 text-center text-sm text-gray-600">
          {filteredBookmarks.length} of {bookmarks.length} bookmarks
        </div>
      )}
    </div>
  );
}
