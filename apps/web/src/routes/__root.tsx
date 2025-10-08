import { RouterErrorComponent } from "@/components/error/RouterErrorComponent";
import { MainLayout } from "@/components/layout/MainLayout";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { logger } from "@academic-explorer/utils/logger";
import { themeClass } from "../styles/theme.css";

function RootLayout() {
  logger.debug("RootLayout: Rendering");
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
});
