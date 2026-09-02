import { createRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { ConfirmDialog } from "@/components/planner/ConfirmDialog";
import { FirstVisitHints } from "@/components/planner/FirstVisitHints";
import { ImportFlow } from "@/components/planner/ImportFlow";
import { BUENOS_AIRES, type MapFocusTarget, MapView } from "@/components/planner/MapView";
import { SearchBox } from "@/components/planner/SearchBox";
import { StopsSheet } from "@/components/planner/StopsSheet";
import { Toast } from "@/components/planner/Toast";
import { findNearStop, isNearDuplicate } from "@/hooks/useStops";
import { useTrip } from "@/hooks/useTrip";
import { useTripLifecycle } from "@/hooks/useTripLifecycle";
import { useUserLocation } from "@/hooks/useUserLocation";
import { type GeocodeResult, reverseGeocode } from "@/lib/geocoding";
import { getCurrentPosition } from "@/lib/geolocation";
import { buildGoogleMapsLegs } from "@/lib/googleMaps";
import { MAX_SHARED_STOPS, shareRoute } from "@/lib/share";
import { MY_LOCATION_LABEL } from "@/lib/tripStorage";
import { rootRoute } from "./__root";

export const indexRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/",
	component: PlannerPage,
	validateSearch: (search: Record<string, unknown>) => ({
		r: typeof search.r === "string" ? search.r : undefined,
	}),
});

function PlannerPage() {
	const { r } = indexRoute.useSearch();
	const lifecycle = useTripLifecycle(r);
	const { state, dispatch, mode, isPreview, history, startHistory, confirm } = lifecycle;
	const [toast, setToast] = useState<string | null>(
		lifecycle.invalidLink ? "El enlace no es válido" : null,
	);
	const [focus, setFocus] = useState<MapFocusTarget | null>(null);
	const centerRef = useRef({ lat: BUENOS_AIRES[0], lng: BUENOS_AIRES[1] });
	const userLoc = useUserLocation();
	const [importJob, setImportJob] = useState<{
		file: File;
		getBias: () => Promise<{ lat: number; lng: number }>;
	} | null>(null);

	const hasOrigin = state.originId !== null;
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
	const mapsLegs = orderedStops ? buildGoogleMapsLegs(orderedStops, state.roundtrip) : [];

	function addStop(lat: number, lng: number, label?: string, asOrigin = false): boolean {
		if (mode === "trip") {
			setToast("El viaje está confirmado y no se puede modificar");
			return false;
		}
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

	// Sesgo de cercanía del import: posición GPS fresca, o el centro del mapa
	async function resolveImportBias() {
		return (await userLoc.getFreshLocation()) ?? centerRef.current;
	}

	// Fija el punto de partida: si ese lugar ya es una parada la promueve a
	// origen; si no, la agrega como parada inicial.
	function setStart(lat: number, lng: number, label: string) {
		const existing = findNearStop(state.stops, lat, lng);
		if (existing) {
			dispatch({ type: "makeOrigin", id: existing.id });
			focusMap(existing.lat, existing.lng);
			return;
		}
		if (addStop(lat, lng, label, true)) focusMap(lat, lng);
	}

	async function handleUseMyLocation() {
		try {
			const pos = await getCurrentPosition();
			userLoc.recordLocation(pos);
			setStart(pos.lat, pos.lng, MY_LOCATION_LABEL);
		} catch {
			setToast("No pudimos acceder a tu ubicación. Revisá los permisos.");
		}
	}

	function handleImportConfirm(added: { lat: number; lng: number; label: string }[]) {
		let count = 0;
		for (const s of added) {
			if (addStop(s.lat, s.lng, s.label)) count++;
		}
		setImportJob(null);
		setToast(
			count > 0
				? 'Paradas agregadas. Marcá tu punto de partida con "Empezar acá".'
				: "Esas paradas ya estaban en la lista",
		);
	}

	async function handleShare() {
		const message = await shareRoute(state);
		if (message) setToast(message);
	}

	return (
		<main className="relative h-full w-full">
			<MapView
				stops={state.stops}
				order={order}
				geometry={trip?.geometry}
				focus={focus}
				gpsCenter={state.stops.length === 0 ? userLoc.startupFix : null}
				onMapTap={addStop}
				onCenterChange={(lat, lng) => {
					centerRef.current = { lat, lng };
				}}
			/>
			{mode === "edit" && (
				<SearchBox
					getCenter={() => userLoc.locationRef.current ?? centerRef.current}
					onSelect={handleSearchSelect}
					onUseMyLocation={() => void handleUseMyLocation()}
				/>
			)}
			<StopsSheet
				mode={mode}
				isPreview={isPreview}
				stops={state.stops}
				roundtrip={state.roundtrip}
				hasOrigin={hasOrigin}
				trip={trip}
				order={order}
				isFetching={tripQuery.isFetching}
				isError={tripQuery.isError}
				mapsLegs={mapsLegs}
				history={history}
				startHistory={startHistory}
				delivered={lifecycle.delivered}
				onToggleDelivered={lifecycle.toggleDelivered}
				onShare={() => void handleShare()}
				onRetry={() => void tripQuery.refetch()}
				onToggleRoundtrip={() => dispatch({ type: "toggleRoundtrip" })}
				onRemove={(id) => dispatch({ type: "remove", id })}
				onMakeOrigin={(id) => dispatch({ type: "makeOrigin", id })}
				onCreateTrip={lifecycle.createTrip}
				onSaveTrip={lifecycle.saveTrip}
				onEndTrip={lifecycle.endTrip}
				onLoadHistory={lifecycle.loadFromHistory}
				onImportFile={(file) => setImportJob({ file, getBias: resolveImportBias })}
				onUseMyLocation={() => void handleUseMyLocation()}
				onPickStart={(start) => setStart(start.lat, start.lng, start.label)}
			/>
			{importJob && (
				<ImportFlow
					file={importJob.file}
					getBias={importJob.getBias}
					maxToAdd={Math.max(0, MAX_SHARED_STOPS - state.stops.length)}
					onConfirm={handleImportConfirm}
					onClose={() => setImportJob(null)}
				/>
			)}
			<Toast message={toast} onDismiss={() => setToast(null)} />
			{confirm && (
				<ConfirmDialog
					message={confirm.message}
					confirmLabel={confirm.confirmLabel}
					onConfirm={confirm.action}
					onCancel={lifecycle.cancelConfirm}
				/>
			)}
			<FirstVisitHints
				showWelcome={mode === "edit" && !r}
				onWelcomeDone={() => {
					// en preview/trip no hay búsqueda ni import: no pedir permiso ahí
					if (mode === "edit") userLoc.requestStartupLocation();
				}}
			/>
		</main>
	);
}
