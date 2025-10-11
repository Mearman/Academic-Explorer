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
    const { pathname, search } = location;
    
    if (pathname.includes("://api.openalex.org/")) {
      logger.debug("routing", "Detected OpenAlex URL in pathname, redirecting", {
        originalPath: pathname,
      });
      
      // Extract the path after api.openalex.org/
      const cleanPath = pathname.replace(/^.*?:\/\/api\.openalex\.org\//, "/");
      
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
  },
});
