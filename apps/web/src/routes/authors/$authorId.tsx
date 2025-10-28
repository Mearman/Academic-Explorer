import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import React from "react";
import { AUTHOR_FIELDS, cachedOpenAlex, type Author } from "@academic-explorer/client";
import { themeClass } from "../../styles/theme.css";

// Standalone author component that bypasses MainLayout to avoid React Hook #311 error
class StandaloneAuthorPage extends React.Component<
  { authorId: string },
  {
    author: Author | null;
    loading: boolean;
    error: string | null;
    viewMode: "raw" | "rich";
  }
> {
  constructor(props: { authorId: string }) {
    super(props);
    this.state = {
      author: null,
      loading: true,
      error: null,
      viewMode: "rich",
    };
  }

  async componentDidMount() {
    try {
      const response = await cachedOpenAlex.client.authors.getAuthor(
        this.props.authorId,
        { select: [...AUTHOR_FIELDS] }
      );
      this.setState({ author: response as Author, loading: false });
    } catch (err) {
      this.setState({ error: String(err), loading: false });
    }
  }

  toggleViewMode = () => {
    this.setState((prev) => ({
      viewMode: prev.viewMode === "raw" ? "rich" : "raw",
    }));
  };

  render() {
    const { loading, error, author, viewMode } = this.state;
    const { authorId } = this.props;

    return (
      <div className={themeClass} style={{ minHeight: "100vh", backgroundColor: "#1a1b1e", color: "#c1c2c5" }}>
        <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <a
              href="#/"
              style={{
                color: "#5c7cfa",
                textDecoration: "none",
                fontSize: "14px",
              }}
            >
              ← Back to Home
            </a>
            {!loading && !error && (
              <button
                onClick={this.toggleViewMode}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#5c7cfa",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Toggle {viewMode === "raw" ? "Rich" : "Raw"} View
              </button>
            )}
          </div>

          {loading && (
            <div style={{ textAlign: "center", padding: "40px" }}>
              <h2 style={{ fontSize: "24px", marginBottom: "10px" }}>Loading Author...</h2>
              <p style={{ color: "#909296" }}>Author ID: {authorId}</p>
            </div>
          )}

          {error && (
            <div style={{ textAlign: "center", padding: "40px", color: "#fa5252" }}>
              <h2 style={{ fontSize: "24px", marginBottom: "10px" }}>Error Loading Author</h2>
              <p style={{ marginBottom: "10px" }}>Author ID: {authorId}</p>
              <p style={{ fontSize: "14px" }}>{error}</p>
            </div>
          )}

          {!loading && !error && author && (
            <>
              <h1 style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "20px" }}>
                {author.display_name || "Author"}
              </h1>

              {viewMode === "raw" ? (
                <pre
                  style={{
                    backgroundColor: "#25262b",
                    padding: "20px",
                    borderRadius: "8px",
                    overflow: "auto",
                    maxHeight: "600px",
                    fontSize: "12px",
                  }}
                >
                  {JSON.stringify(author, null, 2)}
                </pre>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {author.display_name && (
                    <div>
                      <strong>Name:</strong> {author.display_name}
                    </div>
                  )}
                  {author.works_count !== undefined && (
                    <div>
                      <strong>Works:</strong> {author.works_count}
                    </div>
                  )}
                  {author.cited_by_count !== undefined && (
                    <div>
                      <strong>Citations:</strong> {author.cited_by_count}
                    </div>
                  )}
                  {author.summary_stats && (
                    <div>
                      <strong>H-index:</strong> {author.summary_stats.h_index}
                      <br />
                      <strong>i10-index:</strong> {author.summary_stats.i10_index}
                    </div>
                  )}
                  {author.orcid && (
                    <div>
                      <strong>ORCID:</strong>{" "}
                      <a
                        href={author.orcid}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "#5c7cfa" }}
                      >
                        {author.orcid}
                      </a>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }
}

// Extract authorId from URL and render standalone page
function AuthorRouteWrapper() {
  // Extract authorId from hash URL
  const match = window.location.hash.match(/\/authors\/([^?#/]+)/);
  const authorId = match ? match[1] : "unknown";

  return <StandaloneAuthorPage authorId={authorId} />;
}

export const Route = createFileRoute("/authors/$authorId")({
  component: AuthorRouteWrapper,
  validateSearch: z.object({
    select: z.string().optional(),
  }),
});
