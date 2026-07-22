import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { decodeRouteState, sameRoute } from "@/lib/share";
import {
	clearActiveTrip,
	loadActiveTrip,
	loadTripHistory,
	pushTripHistory,
	type StoredTrip,
	saveActiveTrip,
} from "@/lib/tripStorage";
import { type RouteState, useStops } from "./useStops";

export type PlannerMode = "edit" | "trip";

export interface ConfirmRequest {
	message: string;
	confirmLabel: string;
	action: () => void;
}

interface InitialModel {
	routeState: RouteState;
	mode: PlannerMode;
	isPreview: boolean;
	invalidLink: boolean;
}

function buildInitialModel(r: string | undefined): InitialModel {
	const empty: RouteState = { stops: [], roundtrip: false };
	const active = loadActiveTrip();
	if (r) {
		const linked = decodeRouteState(r);
		if (linked && linked.stops.length >= 2) {
			const matchesActive = active !== null && sameRoute(linked, active.state);
			return { routeState: linked, mode: "trip", isPreview: !matchesActive, invalidLink: false };
		}
		// enlace roto: caer al viaje activo si hay, si no al editor vacío
		return active
			? { routeState: active.state, mode: "trip", isPreview: false, invalidLink: true }
			: { routeState: empty, mode: "edit", isPreview: false, invalidLink: true };
	}
	if (active) {
		return { routeState: active.state, mode: "trip", isPreview: false, invalidLink: false };
	}
	return { routeState: empty, mode: "edit", isPreview: false, invalidLink: false };
}

export function useTripLifecycle(r: string | undefined) {
	const navigate = useNavigate();
	const [initial] = useState(() => buildInitialModel(r));
	const { state, dispatch } = useStops(initial.routeState);
	const [mode, setMode] = useState<PlannerMode>(initial.mode);
	const [isPreview, setIsPreview] = useState(initial.isPreview);
	const [history, setHistory] = useState<StoredTrip[]>(loadTripHistory);
	const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);

	// saca ?r= de la URL para que un reload no resucite el viaje del enlace
	function clearShareParam() {
		void navigate({ to: "/", search: { r: undefined }, replace: true });
	}

	function activate(routeState: RouteState) {
		saveActiveTrip(routeState);
		pushTripHistory(routeState);
		setHistory(loadTripHistory());
		setIsPreview(false);
		setMode("trip");
		setConfirm(null);
		clearShareParam();
	}

	function createTrip() {
		activate(state);
	}

	function saveTrip() {
		const active = loadActiveTrip();
		if (active && !sameRoute(active.state, state)) {
			setConfirm({
				message: "Ya tenés un viaje en curso. ¿Querés reemplazarlo por este?",
				confirmLabel: "Reemplazar",
				action: () => activate(state),
			});
			return;
		}
		activate(state);
	}

	function endTrip() {
		setConfirm({
			message: "¿Terminar el viaje? Va a quedar guardado en el historial.",
			confirmLabel: "Terminar viaje",
			action: () => {
				clearActiveTrip();
				dispatch({ type: "reset" });
				setMode("edit");
				setConfirm(null);
				clearShareParam();
			},
		});
	}

	function loadFromHistory(entry: StoredTrip) {
		const doLoad = () => {
			dispatch({ type: "hydrate", state: entry.state });
			activate(entry.state);
		};
		if (mode === "edit" && state.stops.length > 0) {
			setConfirm({
				message:
					"Se van a descartar las paradas que estás cargando. ¿Abrir el viaje del historial?",
				confirmLabel: "Abrir viaje",
				action: doLoad,
			});
			return;
		}
		doLoad();
	}

	return {
		state,
		dispatch,
		mode,
		isPreview,
		invalidLink: initial.invalidLink,
		history,
		confirm,
		createTrip,
		saveTrip,
		endTrip,
		loadFromHistory,
		cancelConfirm: () => setConfirm(null),
	};
}
