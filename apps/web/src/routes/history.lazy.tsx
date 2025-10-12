import { createLazyFileRoute } from "@tanstack/react-router";
export const Route = createLazyFileRoute("/history")({
  component: HistoryPage,
});

import { HistoryManager } from "@/components/HistoryManager";

function HistoryPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8">
        <HistoryManager
          onNavigate={(url) => {
            // Handle navigation to historical URLs
            window.location.href = `/#${url}`;
          }}
        />
      </div>
    </div>
  );
}

export default HistoryPage;
