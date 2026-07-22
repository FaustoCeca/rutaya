import type { RouteState } from "@/hooks/useStops";
import { fromRoutePayload, toRoutePayload } from "./share";

const ACTIVE_KEY = "rutaya-active-trip";
const HISTORY_KEY = "rutaya-trip-history";
const HISTORY_MAX = 5;

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
