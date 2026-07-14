import type { Stop } from "@/hooks/useStops";

// La URL API de Google Maps acepta hasta 9 waypoints intermedios
const MAX_WAYPOINTS = 9;

export function buildGoogleMapsUrl(orderedStops: Stop[], roundtrip: boolean): string | undefined {
	if (orderedStops.length < 2) return undefined;
	const coord = (s: Stop) => `${s.lat},${s.lng}`;
	const origin = orderedStops[0];
	const destination = roundtrip ? origin : orderedStops[orderedStops.length - 1];
	const middle = roundtrip ? orderedStops.slice(1) : orderedStops.slice(1, -1);
	if (middle.length > MAX_WAYPOINTS) return undefined;
	const params = new URLSearchParams({
		api: "1",
		origin: coord(origin),
		destination: coord(destination),
		travelmode: "driving",
	});
	if (middle.length > 0) params.set("waypoints", middle.map(coord).join("|"));
	return `https://www.google.com/maps/dir/?${params.toString()}`;
}
