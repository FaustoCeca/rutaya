import type { Stop } from "@/hooks/useStops";
import { solveTripOrder } from "./tsp";

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

const OSRM = "https://router.project-osrm.org";

interface OsrmTableResponse {
	code: string;
	durations?: (number | null)[][];
}

interface OsrmRouteResponse {
	code: string;
	routes?: {
		duration: number;
		distance: number;
		geometry: { coordinates: [number, number][] };
		legs: { duration: number; distance: number }[];
	}[];
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

function coordsPath(stops: Stop[]): string {
	return stops.map((s) => `${s.lng},${s.lat}`).join(";");
}

// Calcula el viaje en dos pasos: matriz de tiempos (/table) → orden resuelto
// en el cliente (tsp.ts, exacto con <10 paradas y 2-opt/Or-opt desde 10) →
// geometría y tramos reales (/route). Si el servidor público falla en algún
// paso, cae al /trip clásico (la heurística del propio servidor).
export async function fetchTrip(stops: Stop[], roundtrip: boolean): Promise<TripResult> {
	try {
		return await fetchRefinedTrip(stops, roundtrip);
	} catch {
		return await fetchServerTrip(stops, roundtrip);
	}
}

async function fetchRefinedTrip(stops: Stop[], roundtrip: boolean): Promise<TripResult> {
	// con 2 paradas hay un solo orden posible: la matriz no aporta nada
	const sequence =
		stops.length === 2 ? [0, 1] : solveTripOrder(await fetchDurations(stops), roundtrip);
	const ordered = sequence.map((i) => stops[i]);
	const routeStops = roundtrip ? [...ordered, ordered[0]] : ordered;

	const url = new URL(`${OSRM}/route/v1/driving/${coordsPath(routeStops)}`);
	url.searchParams.set("geometries", "geojson");
	url.searchParams.set("overview", "full");
	const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
	if (!res.ok) throw new Error("No se pudo calcular la ruta");
	const data: OsrmRouteResponse = await res.json();
	const route = data.routes?.[0];
	if (data.code !== "Ok" || !route) {
		if (data.code === "NoRoute") throw new Error("No se encontró una ruta entre las paradas");
		throw new Error("No se pudo calcular la ruta");
	}

	const order = new Array<number>(stops.length);
	sequence.forEach((stopIndex, visitPos) => {
		order[stopIndex] = visitPos;
	});
	return {
		order,
		geometry: route.geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]),
		legs: route.legs.map((l) => ({ duration: l.duration, distance: l.distance })),
		totalDuration: route.duration,
		totalDistance: route.distance,
	};
}

async function fetchDurations(stops: Stop[]): Promise<number[][]> {
	const url = new URL(`${OSRM}/table/v1/driving/${coordsPath(stops)}`);
	const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
	if (!res.ok) throw new Error("No se pudo calcular la ruta");
	const data: OsrmTableResponse = await res.json();
	if (data.code !== "Ok" || !data.durations) throw new Error("No se pudo calcular la ruta");
	return data.durations.map((row) =>
		row.map((value) => {
			// null = par sin conexión vial entre sí
			if (value == null) throw new Error("No se encontró una ruta entre las paradas");
			return value;
		}),
	);
}

async function fetchServerTrip(stops: Stop[], roundtrip: boolean): Promise<TripResult> {
	const url = new URL(`${OSRM}/trip/v1/driving/${coordsPath(stops)}`);
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
