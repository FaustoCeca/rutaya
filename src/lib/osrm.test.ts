import type { Stop } from "@/hooks/useStops";
import { fetchTrip } from "./osrm";

const STOPS: Stop[] = [
	{ id: "a", label: "Origen", lat: -34.6, lng: -58.38 },
	{ id: "b", label: "Parada", lat: -34.65, lng: -58.4 },
];

const STOPS_3: Stop[] = [...STOPS, { id: "c", label: "Otra", lat: -34.7, lng: -58.5 }];

// con esta matriz el orden óptimo es 0 → 2 → 1
const TABLE_REORDER = {
	code: "Ok",
	durations: [
		[0, 1000, 100],
		[1000, 0, 1000],
		[150, 100, 0],
	],
};

function routeOk(legCount: number) {
	return {
		code: "Ok",
		routes: [
			{
				duration: legCount * 900,
				distance: legCount * 5000,
				geometry: {
					coordinates: [
						[-58.38, -34.6],
						[-58.4, -34.65],
					],
				},
				legs: Array.from({ length: legCount }, () => ({ duration: 900, distance: 5000 })),
			},
		],
	};
}

const TRIP_OK = {
	code: "Ok",
	waypoints: [{ waypoint_index: 0 }, { waypoint_index: 1 }],
	trips: [
		{
			duration: 900,
			distance: 5000,
			geometry: {
				coordinates: [
					[-58.38, -34.6],
					[-58.4, -34.65],
				],
			},
			legs: [{ duration: 900, distance: 5000 }],
		},
	],
};

// "http-error" simula una respuesta no-ok del servidor
type Handler = unknown | "http-error";

function mockOsrm(handlers: { table?: Handler; route?: Handler; trip?: Handler }) {
	const mock = vi.fn().mockImplementation((input: URL | string) => {
		const url = String(input);
		const body = url.includes("/table/")
			? handlers.table
			: url.includes("/route/")
				? handlers.route
				: url.includes("/trip/")
					? handlers.trip
					: undefined;
		if (body === undefined) return Promise.reject(new Error(`fetch inesperado: ${url}`));
		if (body === "http-error")
			return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
		return Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
	});
	vi.stubGlobal("fetch", mock);
	return mock;
}

function calledUrls(mock: ReturnType<typeof vi.fn>): string[] {
	return mock.mock.calls.map((c) => String(c[0]));
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("fetchTrip", () => {
	it("should skip the duration matrix when there are only two stops", async () => {
		const mock = mockOsrm({ route: routeOk(1) });

		const trip = await fetchTrip(STOPS, false);

		expect(calledUrls(mock).some((u) => u.includes("/table/"))).toBe(false);
		const routeUrl = new URL(calledUrls(mock).find((u) => u.includes("/route/")) ?? "");
		expect(routeUrl.pathname).toContain("-58.38,-34.6;-58.4,-34.65");
		expect(routeUrl.searchParams.get("geometries")).toBe("geojson");
		expect(routeUrl.searchParams.get("overview")).toBe("full");
		expect(trip.order).toEqual([0, 1]);
	});

	it("should reorder the stops using the duration matrix", async () => {
		const mock = mockOsrm({ table: TABLE_REORDER, route: routeOk(2) });

		const trip = await fetchTrip(STOPS_3, false);

		// la parada 1 se visita última: /route recibe origen;otra;parada
		const routeUrl = new URL(calledUrls(mock).find((u) => u.includes("/route/")) ?? "");
		expect(routeUrl.pathname).toContain("-58.38,-34.6;-58.5,-34.7;-58.4,-34.65");
		expect(trip.order).toEqual([0, 2, 1]);
	});

	it("should append the origin to the route when the trip is roundtrip", async () => {
		const mock = mockOsrm({ route: routeOk(2) });

		const trip = await fetchTrip(STOPS, true);

		const routeUrl = new URL(calledUrls(mock).find((u) => u.includes("/route/")) ?? "");
		expect(routeUrl.pathname).toContain("-58.38,-34.6;-58.4,-34.65;-58.38,-34.6");
		expect(trip.legs).toHaveLength(2);
		expect(trip.totalDuration).toBe(1800);
	});

	it("should swap OSRM lng,lat geometry into lat,lng for Leaflet", async () => {
		mockOsrm({ route: routeOk(1) });

		const trip = await fetchTrip(STOPS, false);

		expect(trip.geometry).toEqual([
			[-34.6, -58.38],
			[-34.65, -58.4],
		]);
	});

	it("should fall back to the classic /trip when /table fails", async () => {
		const mock = mockOsrm({ table: "http-error", trip: TRIP_OK });

		const trip = await fetchTrip(STOPS_3, false);

		const tripUrl = new URL(calledUrls(mock).find((u) => u.includes("/trip/")) ?? "");
		expect(tripUrl.searchParams.get("source")).toBe("first");
		expect(tripUrl.searchParams.get("destination")).toBe("any");
		expect(trip.order).toEqual([0, 1]);
		expect(trip.totalDuration).toBe(900);
	});

	it("should explain when the stops have no road connection", async () => {
		// null en la matriz = par sin conexión; el fallback /trip tampoco encuentra ruta
		mockOsrm({
			table: {
				code: "Ok",
				durations: [
					[0, null, 100],
					[null, 0, 100],
					[100, 100, 0],
				],
			},
			trip: { code: "NoTrips" },
		});

		await expect(fetchTrip(STOPS_3, false)).rejects.toThrow(
			"No se encontró una ruta entre las paradas",
		);
	});

	it("should fail with a generic message when every endpoint is down", async () => {
		mockOsrm({ table: "http-error", route: "http-error", trip: "http-error" });

		await expect(fetchTrip(STOPS_3, false)).rejects.toThrow("No se pudo calcular la ruta");
	});
});
