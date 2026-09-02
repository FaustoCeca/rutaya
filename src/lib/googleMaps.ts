import type { Stop } from "@/hooks/useStops";

// La URL API de Google Maps acepta hasta 9 waypoints intermedios,
// o sea 11 puntos por link (origen + 9 intermedios + destino)
const MAX_POINTS_PER_LEG = 11;

export interface MapsLeg {
	url: string;
	// números de parada (1-based) que cubre el tramo, para el label del botón
	from: number;
	to: number;
}

function legUrl(points: Stop[]): string {
	const coord = (s: Stop) => `${s.lat},${s.lng}`;
	const params = new URLSearchParams({
		api: "1",
		origin: coord(points[0]),
		destination: coord(points[points.length - 1]),
		travelmode: "driving",
	});
	const middle = points.slice(1, -1);
	if (middle.length > 0) params.set("waypoints", middle.map(coord).join("|"));
	return `https://www.google.com/maps/dir/?${params.toString()}`;
}

// Navegación a una sola parada sin origin: Google Maps arranca desde la
// ubicación actual del conductor.
export function stopNavUrl(stop: Stop): string {
	const params = new URLSearchParams({
		api: "1",
		destination: `${stop.lat},${stop.lng}`,
		travelmode: "driving",
	});
	return `https://www.google.com/maps/dir/?${params.toString()}`;
}

// Divide la ruta en tramos navegables encadenados: cada tramo arranca en la
// última parada del anterior. Con ≤11 puntos devuelve un solo tramo (el link
// clásico de siempre); con el tope de 30 paradas nunca hay más de 3 tramos.
export function buildGoogleMapsLegs(orderedStops: Stop[], roundtrip: boolean): MapsLeg[] {
	if (orderedStops.length < 2) return [];
	const points = roundtrip ? [...orderedStops, orderedStops[0]] : orderedStops;
	const legs: MapsLeg[] = [];
	let start = 0;
	while (start < points.length - 1) {
		const end = Math.min(start + MAX_POINTS_PER_LEG - 1, points.length - 1);
		legs.push({
			url: legUrl(points.slice(start, end + 1)),
			from: start + 1,
			// en roundtrip el último punto es la vuelta al origen: no es una parada nueva
			to: Math.min(end + 1, orderedStops.length),
		});
		start = end;
	}
	return legs;
}
