import { RouterErrorComponent } from "@/components/error/RouterErrorComponent";
import { MainLayout } from "@/components/layout/MainLayout";
import { createRootRoute, Outlet, redirect } from "@tanstack/react-router";
import { logger } from "@academic-explorer/utils/logger";
import { themeClass } from "../styles/theme.css";

function RootLayout() {
  logger.debug("routing", "RootLayout: Rendering", {}, "RootLayout");
  return (
    <div
      className={themeClass}
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
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
    const { pathname, search, href } = location;
    
    logger.debug("routing", "Root beforeLoad", {
      pathname,
      search,
      href,
    });
    
    // Match patterns like /https://api.openalex.org/ or /http://api.openalex.org/
    const openAlexPattern = /^\/(https?):\/\/api\.openalex\.org\//;
    
    if (openAlexPattern.test(pathname)) {
      logger.debug("routing", "Detected OpenAlex URL in pathname, redirecting", {
        originalPath: pathname,
        search,
      });
      
      // Extract the path after api.openalex.org/ - replace everything up to and including api.openalex.org/
      const cleanPath = pathname.replace(openAlexPattern, "/");
      
      logger.debug("routing", "Redirecting to cleaned path", {
        cleanPath,
        search,
      });
      
      throw redirect({
        to: cleanPath,
        search,
        replace: true,
      });
    }
    
    // Also check if the entire href contains the pattern (for cases where router parses it oddly)
    if (href.includes("://api.openalex.org/")) {
      logger.debug("routing", "Detected OpenAlex URL in href, attempting to extract", {
        href,
      });
      
      // Try to extract the full URL from href
      const match = href.match(/https?:\/\/api\.openalex\.org\/([^#]*)/);
      if (match?.[1]) {
        const [pathAndQuery] = match[1].split("#");
        const [path, queryString] = (pathAndQuery ?? "").split("?");
        
        const cleanPath = `/${path}`;
        const searchParams = queryString ? Object.fromEntries(new URLSearchParams(queryString)) : undefined;
        
        logger.debug("routing", "Redirecting to extracted path", {
          cleanPath,
          searchParams,
        });
        
        throw redirect({
          to: cleanPath,
          search: searchParams,
          replace: true,
        });
      }
    }
  },
});
