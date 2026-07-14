import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import type { RouteState, Stop } from "@/hooks/useStops";

const MAX_SHARED_STOPS = 15;
const MAX_LABEL_LENGTH = 200;

function round5(n: number): number {
	return Math.round(n * 1e5) / 1e5;
}

export function encodeRouteState(state: RouteState): string {
	const payload = {
		v: 1,
		rt: state.roundtrip,
		s: state.stops.map((s) => [round5(s.lat), round5(s.lng), s.label]),
	};
	return compressToEncodedURIComponent(JSON.stringify(payload));
}

export function buildShareUrl(state: RouteState): string {
	return `${location.origin}${location.pathname}?r=${encodeRouteState(state)}`;
}

export function decodeRouteState(encoded: string): RouteState | undefined {
	try {
		const json = decompressFromEncodedURIComponent(encoded);
		if (!json) return undefined;
		const data = JSON.parse(json);
		if (data?.v !== 1 || !Array.isArray(data.s) || data.s.length > MAX_SHARED_STOPS) {
			return undefined;
		}
		const stops: Stop[] = [];
		for (const entry of data.s) {
			if (!Array.isArray(entry)) return undefined;
			const [lat, lng, label] = entry;
			if (typeof lat !== "number" || !Number.isFinite(lat) || lat < -90 || lat > 90)
				return undefined;
			if (typeof lng !== "number" || !Number.isFinite(lng) || lng < -180 || lng > 180)
				return undefined;
			if (typeof label !== "string" || label.length > MAX_LABEL_LENGTH) return undefined;
			stops.push({ id: crypto.randomUUID(), label, lat, lng });
		}
		return { stops, roundtrip: data.rt === true };
	} catch {
		return undefined;
	}
}
