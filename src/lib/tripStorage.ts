import { findNearStop, type RouteState } from "@/hooks/useStops";
import { fromRoutePayload, toRoutePayload } from "./share";

const ACTIVE_KEY = "rutaya-active-trip";
const HISTORY_KEY = "rutaya-trip-history";
const HISTORY_MAX = 5;
const START_HISTORY_KEY = "rutaya-start-history";
const START_HISTORY_MAX = 3;

// Etiqueta del origen tomado del GPS. Nunca entra al historial de partidas:
// ya existe el botón fijo "Usar mi ubicación", y guardar coordenadas viejas
// bajo ese nombre señalaría un lugar equivocado.
export const MY_LOCATION_LABEL = "Mi ubicación";

export interface StoredStart {
	lat: number;
	lng: number;
	label: string;
}

export interface StoredTrip {
	state: RouteState;
	createdAt: number;
}

function parseStored(raw: unknown): StoredTrip | null {
	if (typeof raw !== "object" || raw === null) return null;
	const { p, t } = raw as { p?: unknown; t?: unknown };
	const state = fromRoutePayload(p);
	if (!state || typeof t !== "number") return null;
	return { state, createdAt: t };
}

export function loadActiveTrip(): StoredTrip | null {
	try {
		const raw = localStorage.getItem(ACTIVE_KEY);
		if (!raw) return null;
		return parseStored(JSON.parse(raw));
	} catch {
		return null;
	}
}

export function saveActiveTrip(state: RouteState): void {
	try {
		localStorage.setItem(ACTIVE_KEY, JSON.stringify({ p: toRoutePayload(state), t: Date.now() }));
	} catch {
		// sin storage la app sigue funcionando; solo no persiste entre sesiones
	}
}

export function clearActiveTrip(): void {
	try {
		localStorage.removeItem(ACTIVE_KEY);
	} catch {
		// ignorar
	}
}

export function loadTripHistory(): StoredTrip[] {
	try {
		const raw = localStorage.getItem(HISTORY_KEY);
		if (!raw) return [];
		const list = JSON.parse(raw);
		if (!Array.isArray(list)) return [];
		return list
			.map(parseStored)
			.filter((x): x is StoredTrip => x !== null)
			.slice(0, HISTORY_MAX);
	} catch {
		return [];
	}
}

export function pushTripHistory(state: RouteState): void {
	try {
		const key = JSON.stringify(toRoutePayload(state));
		// si el mismo viaje ya estaba, sube al tope en vez de duplicarse
		const rest = loadTripHistory().filter((t) => JSON.stringify(toRoutePayload(t.state)) !== key);
		const entries = [
			{ p: toRoutePayload(state), t: Date.now() },
			...rest.map((t) => ({ p: toRoutePayload(t.state), t: t.createdAt })),
		];
		localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, HISTORY_MAX)));
	} catch {
		// ignorar
	}
}

function isStoredStart(x: unknown): x is StoredStart {
	if (typeof x !== "object" || x === null) return false;
	const { lat, lng, label } = x as { lat?: unknown; lng?: unknown; label?: unknown };
	return (
		typeof lat === "number" &&
		Number.isFinite(lat) &&
		typeof lng === "number" &&
		Number.isFinite(lng) &&
		typeof label === "string"
	);
}

export function loadStartHistory(): StoredStart[] {
	try {
		const raw = localStorage.getItem(START_HISTORY_KEY);
		if (!raw) return [];
		const list = JSON.parse(raw);
		if (!Array.isArray(list)) return [];
		return list.filter(isStoredStart).slice(0, START_HISTORY_MAX);
	} catch {
		return [];
	}
}

export function pushStartHistory(start: StoredStart): void {
	if (start.label === MY_LOCATION_LABEL) return;
	try {
		// el mismo lugar (±11 m) ya guardado sube al tope en vez de duplicarse
		const rest = loadStartHistory().filter((s) => !findNearStop([start], s.lat, s.lng));
		localStorage.setItem(
			START_HISTORY_KEY,
			JSON.stringify([start, ...rest].slice(0, START_HISTORY_MAX)),
		);
	} catch {
		// ignorar
	}
}
