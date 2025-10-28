import { RouterErrorComponent } from "@/components/error/RouterErrorComponent";
import { MainLayout } from "@/components/layout/MainLayout";
import { NavigationTracker } from "@/components/NavigationTracker";
import { logger } from "@academic-explorer/utils/logger";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { themeClass } from "../styles/theme.css";

function RootLayout() {
  logger.debug("routing", "RootLayout: Rendering", {}, "RootLayout");

  // TEMPORARY: Bypass MainLayout for ALL routes to avoid React Hook #311 error
  // TODO: Fix MainLayout hook violations and re-enable full layout
  return (
    <div className={themeClass}>
      <Outlet />
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
  },
});
