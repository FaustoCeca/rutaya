import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import type { RouteState, Stop } from "@/hooks/useStops";

export const MAX_SHARED_STOPS = 30;
const MAX_LABEL_LENGTH = 200;

// Forma canónica de un viaje, usada tanto en el link (?r=) como en localStorage
export interface RoutePayload {
	v: 1;
	rt: boolean;
	s: [number, number, string][];
}

function round5(n: number): number {
	return Math.round(n * 1e5) / 1e5;
}

export function toRoutePayload(state: RouteState): RoutePayload {
	return {
		v: 1,
		rt: state.roundtrip,
		s: state.stops.map((s) => [round5(s.lat), round5(s.lng), s.label]),
	};
}

export function fromRoutePayload(data: unknown): RouteState | undefined {
	if (typeof data !== "object" || data === null) return undefined;
	const { v, rt, s } = data as { v?: unknown; rt?: unknown; s?: unknown };
	if (v !== 1 || !Array.isArray(s) || s.length > MAX_SHARED_STOPS) return undefined;
	const stops: Stop[] = [];
	for (const entry of s) {
		if (!Array.isArray(entry)) return undefined;
		const [lat, lng, label] = entry;
		if (typeof lat !== "number" || !Number.isFinite(lat) || lat < -90 || lat > 90) return undefined;
		if (typeof lng !== "number" || !Number.isFinite(lng) || lng < -180 || lng > 180)
			return undefined;
		if (typeof label !== "string" || label.length > MAX_LABEL_LENGTH) return undefined;
		stops.push({ id: crypto.randomUUID(), label, lat, lng });
	}
	return { stops, roundtrip: rt === true };
}

export function sameRoute(a: RouteState, b: RouteState): boolean {
	return JSON.stringify(toRoutePayload(a)) === JSON.stringify(toRoutePayload(b));
}

export function encodeRouteState(state: RouteState): string {
	return compressToEncodedURIComponent(JSON.stringify(toRoutePayload(state)));
}

export function buildShareUrl(state: RouteState): string {
	return `${location.origin}${location.pathname}?r=${encodeRouteState(state)}`;
}

export function decodeRouteState(encoded: string): RouteState | undefined {
	try {
		const json = decompressFromEncodedURIComponent(encoded);
		if (!json) return undefined;
		return fromRoutePayload(JSON.parse(json));
	} catch {
		return undefined;
	}
}
