import { createRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MapView } from "@/components/planner/MapView";
import { Toast } from "@/components/planner/Toast";
import { isNearDuplicate, useStops } from "@/hooks/useStops";
import { reverseGeocode } from "@/lib/geocoding";
import { rootRoute } from "./__root";

export const indexRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/",
	component: PlannerPage,
});

function PlannerPage() {
	const { state, dispatch } = useStops({ stops: [], roundtrip: false });
	const [toast, setToast] = useState<string | null>(null);

	function addStop(lat: number, lng: number, label?: string) {
		if (isNearDuplicate(state.stops, lat, lng)) {
			setToast("Esa parada ya está en la lista");
			return;
		}
		const id = crypto.randomUUID();
		dispatch({
			type: "add",
			stop: { id, label: label ?? `Parada (${lat.toFixed(2)}, ${lng.toFixed(2)})`, lat, lng },
		});
		if (!label) {
			void reverseGeocode(lat, lng).then((resolved) => {
				if (resolved) dispatch({ type: "relabel", id, label: resolved });
			});
		}
	}

	return (
		<main className="relative h-full w-full">
			<MapView stops={state.stops} order={undefined} onMapTap={addStop} />
			<Toast message={toast} onDismiss={() => setToast(null)} />
		</main>
	);
}
