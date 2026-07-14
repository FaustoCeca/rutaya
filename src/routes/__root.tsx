import { createRootRoute, Outlet } from "@tanstack/react-router";

export const rootRoute = createRootRoute({
	component: RootLayout,
});

function RootLayout() {
	return (
		<div className="relative h-dvh w-full overflow-hidden bg-gray-100 text-gray-900">
			<Outlet />
		</div>
	);
}
