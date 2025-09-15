import { createRootRoute, Outlet } from "@tanstack/react-router"
import { MainLayout } from "@/components/layout/MainLayout"
import { themeClass } from "../styles/theme.css"

function RootLayout() {
	return (
		<div className={themeClass} style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
			<MainLayout>
				<Outlet />
			</MainLayout>
		</div>
	)
}

export const Route = createRootRoute({
	component: RootLayout,
})