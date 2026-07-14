import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "./__root";

export const indexRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/",
	component: PlannerPage,
});

function PlannerPage() {
	return <main className="h-full w-full" />;
}
