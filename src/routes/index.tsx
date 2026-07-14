import { createRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { BUENOS_AIRES, type MapFocusTarget, MapView } from "@/components/planner/MapView";
import { SearchBox } from "@/components/planner/SearchBox";
import { StopsSheet } from "@/components/planner/StopsSheet";
import { Toast } from "@/components/planner/Toast";
import { isNearDuplicate, type RouteState, useStops } from "@/hooks/useStops";
import { useTrip } from "@/hooks/useTrip";
import { type GeocodeResult, reverseGeocode } from "@/lib/geocoding";
import { getCurrentPosition } from "@/lib/geolocation";
import { buildGoogleMapsUrl } from "@/lib/googleMaps";
import { buildShareUrl, decodeRouteState } from "@/lib/share";
import { rootRoute } from "./__root";

export const indexRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/",
	component: PlannerPage,
	validateSearch: (search: Record<string, unknown>) => ({
		r: typeof search.r === "string" ? search.r : undefined,
	}),
});

function initialStateFromUrl(r: string | undefined): { state: RouteState; invalid: boolean } {
	const empty: RouteState = { stops: [], roundtrip: false };
	if (!r) return { state: empty, invalid: false };
	const decoded = decodeRouteState(r);
	return decoded ? { state: decoded, invalid: false } : { state: empty, invalid: true };
}

function PlannerPage() {
	const { r } = indexRoute.useSearch();
	const [initial] = useState(() => initialStateFromUrl(r));
	const { state, dispatch } = useStops(initial.state);
	const [toast, setToast] = useState<string | null>(
		initial.invalid ? "El enlace no es válido" : null,
	);
	const [focus, setFocus] = useState<MapFocusTarget | null>(null);
	const centerRef = useRef({ lat: BUENOS_AIRES[0], lng: BUENOS_AIRES[1] });

	const tripQuery = useTrip(state.stops, state.roundtrip);
	const trip = state.stops.length >= 2 ? tripQuery.data : undefined;
	// solo aplicar el orden si corresponde al set actual (evita numeración inconsistente
	// mientras se recalcula tras agregar/quitar una parada)
	const order = trip && trip.order.length === state.stops.length ? trip.order : undefined;

	const orderedStops = order
		? state.stops
				.map((stop, i) => ({ stop, pos: order[i] }))
				.sort((a, b) => a.pos - b.pos)
				.map((x) => x.stop)
		: undefined;
	const googleMapsUrl = orderedStops
		? buildGoogleMapsUrl(orderedStops, state.roundtrip)
		: undefined;

	async function handleShare() {
		const url = buildShareUrl(state);
		if (navigator.share) {
			try {
				await navigator.share({ title: "Ruta de entregas", url });
			} catch {
				// el usuario cerró el share sheet
			}
			return;
		}
		try {
			await navigator.clipboard.writeText(url);
			setToast("Enlace copiado");
		} catch {
			setToast("No se pudo copiar el enlace");
		}
	}

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
				googleMapsUrl={googleMapsUrl}
				onShare={() => void handleShare()}
				onRetry={() => void tripQuery.refetch()}
				onToggleRoundtrip={() => dispatch({ type: "toggleRoundtrip" })}
				onRemove={(id) => dispatch({ type: "remove", id })}
				onMakeOrigin={(id) => dispatch({ type: "makeOrigin", id })}
			/>
			<Toast message={toast} onDismiss={() => setToast(null)} />
		</main>
	);
}
