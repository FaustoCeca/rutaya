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
}

export type StopsAction =
	| { type: "add"; stop: Stop }
	| { type: "remove"; id: string }
	| { type: "makeOrigin"; id: string }
	| { type: "relabel"; id: string; label: string }
	| { type: "toggleRoundtrip" };

// ~1e-4 grados ≈ 11 m: dos paradas más cerca que eso se consideran la misma dirección
const DUPLICATE_THRESHOLD_DEG = 1e-4;

function stopsReducer(state: RouteState, action: StopsAction): RouteState {
	switch (action.type) {
		case "add":
			return { ...state, stops: [...state.stops, action.stop] };
		case "remove":
			return { ...state, stops: state.stops.filter((s) => s.id !== action.id) };
		case "makeOrigin": {
			const stop = state.stops.find((s) => s.id === action.id);
			if (!stop) return state;
			return { ...state, stops: [stop, ...state.stops.filter((s) => s.id !== action.id)] };
		}
		case "relabel":
			return {
				...state,
				stops: state.stops.map((s) => (s.id === action.id ? { ...s, label: action.label } : s)),
			};
		case "toggleRoundtrip":
			return { ...state, roundtrip: !state.roundtrip };
	}
}

export function isNearDuplicate(stops: Stop[], lat: number, lng: number): boolean {
	return stops.some(
		(s) =>
			Math.abs(s.lat - lat) < DUPLICATE_THRESHOLD_DEG &&
			Math.abs(s.lng - lng) < DUPLICATE_THRESHOLD_DEG,
	);
}

export function useStops(initialState: RouteState) {
	const [state, dispatch] = useReducer(stopsReducer, initialState);
	return { state, dispatch };
}
