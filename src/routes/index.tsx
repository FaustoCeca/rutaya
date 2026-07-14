import { createRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { BUENOS_AIRES, type MapFocusTarget, MapView } from "@/components/planner/MapView";
import { SearchBox } from "@/components/planner/SearchBox";
import { StopsSheet } from "@/components/planner/StopsSheet";
import { Toast } from "@/components/planner/Toast";
import { isNearDuplicate, useStops } from "@/hooks/useStops";
import { useTrip } from "@/hooks/useTrip";
import { type GeocodeResult, reverseGeocode } from "@/lib/geocoding";
import { getCurrentPosition } from "@/lib/geolocation";
import { rootRoute } from "./__root";

export const indexRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/",
	component: PlannerPage,
});

function PlannerPage() {
	const { state, dispatch } = useStops({ stops: [], roundtrip: false });
	const [toast, setToast] = useState<string | null>(null);
	const [focus, setFocus] = useState<MapFocusTarget | null>(null);
	const centerRef = useRef({ lat: BUENOS_AIRES[0], lng: BUENOS_AIRES[1] });

	const tripQuery = useTrip(state.stops, state.roundtrip);
	const trip = state.stops.length >= 2 ? tripQuery.data : undefined;
	// solo aplicar el orden si corresponde al set actual (evita numeración inconsistente
	// mientras se recalcula tras agregar/quitar una parada)
	const order = trip && trip.order.length === state.stops.length ? trip.order : undefined;

	function addStop(lat: number, lng: number, label?: string, asOrigin = false): boolean {
		if (isNearDuplicate(state.stops, lat, lng)) {
			setToast("Esa parada ya está en la lista");
			return false;
		}
		const id = crypto.randomUUID();
		dispatch({
			type: "add",
			stop: { id, label: label ?? `Parada (${lat.toFixed(2)}, ${lng.toFixed(2)})`, lat, lng },
		});
		if (asOrigin) dispatch({ type: "makeOrigin", id });
		if (!label) {
			void reverseGeocode(lat, lng).then((resolved) => {
				if (resolved) dispatch({ type: "relabel", id, label: resolved });
			});
		}
		return true;
	}

	function focusMap(lat: number, lng: number) {
		setFocus((prev) => ({ lat, lng, seq: (prev?.seq ?? 0) + 1 }));
	}

	function handleSearchSelect(result: GeocodeResult) {
		if (addStop(result.lat, result.lng, result.label)) {
			focusMap(result.lat, result.lng);
		}
	}

	async function handleUseMyLocation() {
		try {
			const pos = await getCurrentPosition();
			if (addStop(pos.lat, pos.lng, "Mi ubicación", true)) {
				focusMap(pos.lat, pos.lng);
			}
		} catch {
			setToast("No pudimos acceder a tu ubicación. Revisá los permisos.");
		}
	}

	return (
		<main className="relative h-full w-full">
			<MapView
				stops={state.stops}
				order={order}
				geometry={trip?.geometry}
				focus={focus}
				onMapTap={addStop}
				onCenterChange={(lat, lng) => {
					centerRef.current = { lat, lng };
				}}
			/>
			<SearchBox
				getCenter={() => centerRef.current}
				onSelect={handleSearchSelect}
				onUseMyLocation={handleUseMyLocation}
			/>
			<StopsSheet
				stops={state.stops}
				roundtrip={state.roundtrip}
				trip={trip}
				order={order}
				isFetching={tripQuery.isFetching}
				isError={tripQuery.isError}
				onRetry={() => void tripQuery.refetch()}
				onToggleRoundtrip={() => dispatch({ type: "toggleRoundtrip" })}
				onRemove={(id) => dispatch({ type: "remove", id })}
				onMakeOrigin={(id) => dispatch({ type: "makeOrigin", id })}
			/>
			<Toast message={toast} onDismiss={() => setToast(null)} />
		</main>
	);
}
