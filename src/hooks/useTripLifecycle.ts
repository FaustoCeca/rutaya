import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { decodeRouteState, sameRoute } from "@/lib/share";
import {
	clearActiveTrip,
	loadActiveTrip,
	loadStartHistory,
	loadTripHistory,
	pushStartHistory,
	pushTripHistory,
	type StoredStart,
	type StoredTrip,
	saveActiveTrip,
	saveDeliveredStops,
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
	delivered: number[];
}

function buildInitialModel(r: string | undefined): InitialModel {
	const empty: RouteState = { stops: [], roundtrip: false, originId: null };
	const active = loadActiveTrip();
	if (r) {
		const linked = decodeRouteState(r);
		if (linked && linked.stops.length >= 2) {
			const matchesActive = active !== null && sameRoute(linked, active.state);
			return {
				routeState: linked,
				mode: "trip",
				isPreview: !matchesActive,
				invalidLink: false,
				// mismo viaje que el activo: los índices entregados siguen valiendo
				// porque sameRoute garantiza el mismo orden de paradas
				delivered: matchesActive ? active.delivered : [],
			};
		}
		// enlace roto: caer al viaje activo si hay, si no al editor vacío
		return active
			? {
					routeState: active.state,
					mode: "trip",
					isPreview: false,
					invalidLink: true,
					delivered: active.delivered,
				}
			: { routeState: empty, mode: "edit", isPreview: false, invalidLink: true, delivered: [] };
	}
	if (active) {
		return {
			routeState: active.state,
			mode: "trip",
			isPreview: false,
			invalidLink: false,
			delivered: active.delivered,
		};
	}
	return { routeState: empty, mode: "edit", isPreview: false, invalidLink: false, delivered: [] };
}

export function useTripLifecycle(r: string | undefined) {
	const navigate = useNavigate();
	const [initial] = useState(() => buildInitialModel(r));
	const { state, dispatch } = useStops(initial.routeState);
	const [mode, setMode] = useState<PlannerMode>(initial.mode);
	const [isPreview, setIsPreview] = useState(initial.isPreview);
	const [history, setHistory] = useState<StoredTrip[]>(loadTripHistory);
	const [startHistory, setStartHistory] = useState<StoredStart[]>(loadStartHistory);
	const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
	const [delivered, setDelivered] = useState<number[]>(initial.delivered);

	// saca ?r= de la URL para que un reload no resucite el viaje del enlace
	function clearShareParam() {
		void navigate({ to: "/", search: { r: undefined }, replace: true });
	}

	function activate(routeState: RouteState) {
		saveActiveTrip(routeState);
		pushTripHistory(routeState);
		const origin = routeState.stops[0];
		if (origin) pushStartHistory({ lat: origin.lat, lng: origin.lng, label: origin.label });
		setHistory(loadTripHistory());
		setStartHistory(loadStartHistory());
		setDelivered([]);
		setIsPreview(false);
		setMode("trip");
		setConfirm(null);
		clearShareParam();
	}

	function toggleDelivered(index: number) {
		// un viaje recibido no debe tocar las entregas del viaje activo ajeno
		if (isPreview) return;
		const next = delivered.includes(index)
			? delivered.filter((i) => i !== index)
			: [...delivered, index];
		setDelivered(next);
		saveDeliveredStops(next);
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
				setDelivered([]);
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
		startHistory,
		confirm,
		delivered,
		toggleDelivered,
		createTrip,
		saveTrip,
		endTrip,
		loadFromHistory,
		cancelConfirm: () => setConfirm(null),
	};
}
