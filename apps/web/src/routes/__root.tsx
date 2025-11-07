import { RouterErrorComponent } from "@/components/error/RouterErrorComponent";
import { MainLayout } from "@/components/layout/MainLayout";
import { NavigationTracker } from "@/components/NavigationTracker";
import { UrlFixer } from "@/components/UrlFixer";
import { logger } from "@academic-explorer/utils/logger";
import { createRootRoute, Outlet, redirect } from "@tanstack/react-router";
import { themeClass } from "../styles/theme.css";

function RootLayout() {
  logger.debug("routing", "RootLayout: Rendering", {}, "RootLayout");

  // MainLayout re-enabled after fixing React 19 hook violations
  // The layout-store was refactored to ensure stable method references
  return (
    <div className={themeClass}>
      <UrlFixer />
      <NavigationTracker />
      <MainLayout>
        <Outlet />
      </MainLayout>
    </div>
  );
}

export const Route = createRootRoute({
  component: RootLayout,
  errorComponent: RouterErrorComponent,
  beforeLoad: ({ location }) => {
    // Handle URLs like /#/https://api.openalex.org/path -> /#/path
    const { pathname, href } = location;

    logger.debug("routing", "Root beforeLoad", {
      pathname,
      href,
    });

    // Check if pathname starts with /https:// or /http:// followed by api.openalex.org
    // Need to match /https://api.openalex.org/ or /http://api.openalex.org/
    const openAlexPattern = /^\/(https?:\/\/api\.openalex\.org)\//;

    if (openAlexPattern.test(pathname)) {
      // Strip the protocol and api.openalex.org from the pathname
      const cleanPath = pathname.replace(openAlexPattern, "/");

      // Extract the raw query string from href (which doesn't include the # symbol)
      const queryIndex = href.indexOf("?");
      const rawQueryString =
        queryIndex !== -1 ? href.substring(queryIndex + 1) : "";

      const newUrl = rawQueryString
        ? `${cleanPath}?${rawQueryString}`
        : cleanPath;

      logger.debug(
        "routing",
        "Detected OpenAlex URL in pathname, redirecting",
        {
          originalPath: pathname,
          cleanPath,
          rawQueryString,
          newUrl,
          href,
        },
      );

      // Use window.location to preserve exact query string encoding
      if (typeof window !== "undefined") {
        window.location.replace(`#${newUrl}`);
        // Throw to stop route processing
        throw new Error("Redirecting");
      }
    }

    // Fix browser address bar display issues with collapsed protocol slashes
    // This handles cases where https://doi.org/... displays as https:/doi.org/...
    if (typeof window !== "undefined") {
      logger.debug("routing", "Starting URL normalization check", {
        pathname,
        href,
        hasHash: !!window.location.hash,
        hash: window.location.hash,
      });

      // Check both hash (for #/works/...) and pathname (when TanStack Router processes hash routes)
      const currentHash = window.location.hash || "";
      const hashPath = currentHash.split("?")[0];

      // First, check if we need to decode encoded URLs to pretty URLs
      if (currentHash.includes("%")) {
        logger.debug("routing", "Found encoded URL, attempting decode", { currentHash });

        // Extract entity type and encoded ID from hash
        const hashParts = hashPath.split("/");
        const entityType = hashParts[1]; // works, authors, institutions, etc.
        const encodedId = hashParts.slice(2).join("/"); // Join the rest with slashes

        logger.debug("routing", "Parsed hash components", { hashParts, entityType, encodedId });

        if (entityType && encodedId) {
          try {
            const decodedId = decodeURIComponent(encodedId);

            logger.debug("routing", "URL decode attempt", {
              encodedId,
              decodedId,
              areDifferent: decodedId !== encodedId,
              includesProtocol: decodedId.includes("://") || decodedId.includes(":/")
            });

            // Only update if the decoded version is different (contains unencoded characters)
            if (decodedId !== encodedId && (decodedId.includes("://") || decodedId.includes(":/"))) {
              // Extract query params from CURRENT hash, not from old href
              const hashQueryParams = currentHash.includes("?")
                ? "?" + currentHash.split("?").slice(1).join("?")
                : "";

              const prettyHash = `/${entityType}/${decodedId}${hashQueryParams}`;

              logger.debug("routing", "Detected encoded external canonical ID, redirecting", {
                originalHash: currentHash,
                prettyHash,
                encodedId,
                decodedId,
                hashQueryParams
              });

              // Use TanStack Router's redirect for proper navigation
              throw redirect({ to: prettyHash });
            } else {
              logger.debug("routing", "Skipping URL conversion - conditions not met", {
                decodedId,
                encodedId,
                areDifferent: decodedId !== encodedId,
                includesProtocol: decodedId.includes("://") || decodedId.includes(":/")
              });
            }
          } catch (error) {
            // If decoding fails, continue with normal collapsed protocol fixing
            logger.debug("routing", "Failed to decode URL", { error, encodedId });
          }
        } else {
          logger.debug("routing", "Missing entity type or encoded ID", { entityType, encodedId });
        }
      } else {
        logger.debug("routing", "No encoded URL found, skipping decode", { currentHash });
      }

      // Then fix any remaining collapsed protocol patterns
      const updatedHash = window.location.hash; // Use updated hash after potential decoding
      const updatedHashPath = updatedHash.split("?")[0];

      // For hash routes, TanStack Router puts the hash content in the pathname
      // We need to check both sources for collapsed protocol patterns
      let sourceToFix = "";
      let urlPrefix = "";

      if (updatedHash && updatedHash !== "#") {
        // Direct hash navigation - use the hash
        sourceToFix = updatedHashPath;
        urlPrefix = "#";
        logger.debug("routing", "Using hash as source for URL normalization", { hashPath: updatedHashPath });
      } else if (pathname.includes("https:/") || pathname.includes("http:/") || pathname.includes("ror:/")) {
        // Hash route processed by TanStack Router - use pathname
        sourceToFix = pathname;
        urlPrefix = "#";
        logger.debug("routing", "Using pathname as source for URL normalization", { pathname });
      }

      if (sourceToFix) {
        // Look for collapsed protocol patterns
        const collapsedHttpsPattern = /(^|\/)(https?:\/)([^\/])/;
        const collapsedRorPattern = /(^|\/)(ror:\/)([^\/])/;

        let fixedSource = sourceToFix;

        logger.debug("routing", "Checking for collapsed patterns", {
          sourceToFix,
          hasCollapsedHttps: collapsedHttpsPattern.test(sourceToFix),
          hasCollapsedRor: collapsedRorPattern.test(sourceToFix)
        });

        // Fix collapsed https:// or http:// patterns
        fixedSource = fixedSource.replace(collapsedHttpsPattern, '$1$2/$3');

        // Fix collapsed ror:// patterns
        fixedSource = fixedSource.replace(collapsedRorPattern, '$1$2/$3');

        logger.debug("routing", "URL fix attempt", {
          originalSource: sourceToFix,
          fixedSource,
          wouldChange: fixedSource !== sourceToFix
        });

        // If we made corrections, update the URL immediately without page reload
        if (fixedSource !== sourceToFix) {
          // Extract query params from current hash (after potential decoding), not from old href
          const queryIndex = updatedHash.indexOf("?");
          const queryParams = queryIndex !== -1 ? updatedHash.substring(queryIndex) : "";

          const fixedUrl = window.location.pathname + window.location.search + urlPrefix + fixedSource + queryParams;

          logger.debug("routing", "Fixing collapsed protocol slashes", {
            source: updatedHash ? "hash" : "pathname",
            originalSource: sourceToFix,
            fixedSource,
            fixedUrl,
          });

          // Use replaceState to update URL without adding to history or triggering reload
          window.history.replaceState(window.history.state, "", fixedUrl);
        } else {
          logger.debug("routing", "No changes needed - URL already correct", {
            sourceToFix,
            fixedSource
          });
        }
      }
    }
  },
});
