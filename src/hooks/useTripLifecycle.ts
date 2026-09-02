import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { deliveredIdsToIndices, deliveredIndicesToIds } from "@/lib/deliveredMarks";
import { sameRoute } from "@/lib/share";
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
import { buildInitialModel } from "./plannerInitialModel";
import { type RouteState, useStops } from "./useStops";

export type PlannerMode = "edit" | "trip";

export interface ConfirmRequest {
	message: string;
	confirmLabel: string;
	action: () => void;
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
	// ids de paradas entregadas preservados mientras se modifica el viaje;
	// null = no se está modificando
	const [pendingDeliveredIds, setPendingDeliveredIds] = useState<string[] | null>(null);

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
		// al guardar una modificación, las entregas preservadas por id vuelven
		// como índices del set nuevo; en cualquier otro camino quedan en cero
		const nextDelivered = pendingDeliveredIds
			? deliveredIdsToIndices(routeState.stops, pendingDeliveredIds)
			: [];
		setDelivered(nextDelivered);
		if (nextDelivered.length > 0) saveDeliveredStops(nextDelivered);
		setPendingDeliveredIds(null);
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

	function modifyTrip() {
		setConfirm({
			message: "¿Modificar el viaje? Vas a poder agregar o quitar paradas y volver a confirmarlo.",
			confirmLabel: "Modificar viaje",
			action: () => {
				// las entregas se preservan por id: los índices se rompen al editar
				setPendingDeliveredIds(deliveredIndicesToIds(state.stops, delivered));
				setDelivered([]);
				setMode("edit");
				setConfirm(null);
			},
		});
	}

	function discardChanges() {
		setConfirm({
			message: "¿Descartar los cambios? El viaje vuelve a como estaba.",
			confirmLabel: "Descartar",
			action: () => {
				const active = loadActiveTrip();
				if (active) {
					dispatch({ type: "hydrate", state: active.state });
					setDelivered(active.delivered);
					setMode("trip");
				}
				setPendingDeliveredIds(null);
				setConfirm(null);
			},
		});
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
		isModifying: pendingDeliveredIds !== null,
		modifyTrip,
		discardChanges,
		createTrip,
		saveTrip,
		endTrip,
		loadFromHistory,
		cancelConfirm: () => setConfirm(null),
	};
}
