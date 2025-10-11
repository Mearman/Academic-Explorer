import { HistoryManager } from "@/components/HistoryManager";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/history")({
  component: HistoryPage,
});

function HistoryPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8">
        <HistoryManager
          onNavigate={(url) => {
            // Handle navigation to historical URLs
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
