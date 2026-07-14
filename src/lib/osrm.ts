import type { Stop } from "@/hooks/useStops";

export interface TripLeg {
	duration: number;
	distance: number;
}

export interface TripResult {
	// order[i] = posición de visita (0-based) de la parada i del array de entrada
	order: number[];
	// [lat, lng] listo para Leaflet (OSRM responde lng,lat; el swap se hace acá y solo acá)
	geometry: [number, number][];
	legs: TripLeg[];
	totalDuration: number;
	totalDistance: number;
}

interface OsrmTripResponse {
	code: string;
	waypoints?: { waypoint_index: number }[];
	trips?: {
		duration: number;
		distance: number;
		geometry: { coordinates: [number, number][] };
		legs: { duration: number; distance: number }[];
	}[];
}

export async function fetchTrip(stops: Stop[], roundtrip: boolean): Promise<TripResult> {
	const coords = stops.map((s) => `${s.lng},${s.lat}`).join(";");
	const url = new URL(`https://router.project-osrm.org/trip/v1/driving/${coords}`);
	url.searchParams.set("source", "first");
	url.searchParams.set("roundtrip", String(roundtrip));
	if (!roundtrip) url.searchParams.set("destination", "any");
	url.searchParams.set("geometries", "geojson");
	url.searchParams.set("overview", "full");

	const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
	if (!res.ok) throw new Error("No se pudo calcular la ruta");
	const data: OsrmTripResponse = await res.json();
	const trip = data.trips?.[0];
	if (data.code !== "Ok" || !trip || !data.waypoints) {
		if (data.code === "NoTrips" || data.code === "NoRoute") {
			throw new Error("No se encontró una ruta entre las paradas");
		}
		throw new Error("No se pudo calcular la ruta");
	}
	return {
		order: data.waypoints.map((w) => w.waypoint_index),
		geometry: trip.geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]),
		legs: trip.legs.map((l) => ({ duration: l.duration, distance: l.distance })),
		totalDuration: trip.duration,
		totalDistance: trip.distance,
	};
}
