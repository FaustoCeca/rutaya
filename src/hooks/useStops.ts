import { useReducer } from "react";

export interface Stop {
	id: string;
	label: string;
	lat: number;
	lng: number;
}

export interface RouteState {
	stops: Stop[];
	roundtrip: boolean;
	// parada elegida explícitamente como punto de partida (la app la mantiene en
	// stops[0]); null hasta que el usuario la elige, y sin ella no se crea el viaje
	originId: string | null;
}

export type StopsAction =
	| { type: "add"; stop: Stop }
	| { type: "remove"; id: string }
	| { type: "makeOrigin"; id: string }
	| { type: "relabel"; id: string; label: string }
	| { type: "toggleRoundtrip" }
	| { type: "reset" }
	| { type: "hydrate"; state: RouteState };

// ~1e-4 grados ≈ 11 m: dos paradas más cerca que eso se consideran la misma dirección
const DUPLICATE_THRESHOLD_DEG = 1e-4;

function stopsReducer(state: RouteState, action: StopsAction): RouteState {
	switch (action.type) {
		case "add":
			return { ...state, stops: [...state.stops, action.stop] };
		case "remove":
			return {
				...state,
				stops: state.stops.filter((s) => s.id !== action.id),
				originId: state.originId === action.id ? null : state.originId,
			};
		case "makeOrigin": {
			const stop = state.stops.find((s) => s.id === action.id);
			if (!stop) return state;
			return {
				...state,
				stops: [stop, ...state.stops.filter((s) => s.id !== action.id)],
				originId: stop.id,
			};
		}
		case "relabel":
			return {
				...state,
				stops: state.stops.map((s) => (s.id === action.id ? { ...s, label: action.label } : s)),
			};
		case "toggleRoundtrip":
			return { ...state, roundtrip: !state.roundtrip };
		case "reset":
			return { stops: [], roundtrip: false, originId: null };
		case "hydrate":
			return action.state;
	}
}

export function findNearStop<T extends { lat: number; lng: number }>(
	points: T[],
	lat: number,
	lng: number,
): T | undefined {
	return points.find(
		(p) =>
			Math.abs(p.lat - lat) < DUPLICATE_THRESHOLD_DEG &&
			Math.abs(p.lng - lng) < DUPLICATE_THRESHOLD_DEG,
	);
}

export function isNearDuplicate(stops: Stop[], lat: number, lng: number): boolean {
	return findNearStop(stops, lat, lng) !== undefined;
}

export function useStops(initialState: RouteState) {
	const [state, dispatch] = useReducer(stopsReducer, initialState);
	return { state, dispatch };
}
