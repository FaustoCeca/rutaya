import type { Stop } from "@/hooks/useStops";
import { fetchTrip } from "./osrm";

const STOPS: Stop[] = [
	{ id: "a", label: "Origen", lat: -34.6, lng: -58.38 },
	{ id: "b", label: "Parada", lat: -34.65, lng: -58.4 },
];

const OK_RESPONSE = {
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

function mockFetch(body: unknown, ok = true) {
	const mock = vi.fn().mockResolvedValue({ ok, json: () => Promise.resolve(body) });
	vi.stubGlobal("fetch", mock);
	return mock;
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("fetchTrip", () => {
	it("should request coordinates as lng,lat with source=first", async () => {
		const mock = mockFetch(OK_RESPONSE);

		await fetchTrip(STOPS, false);

		const url = new URL(mock.mock.calls[0][0]);
		expect(url.pathname).toContain("-58.38,-34.6;-58.4,-34.65");
		expect(url.searchParams.get("source")).toBe("first");
		expect(url.searchParams.get("roundtrip")).toBe("false");
		expect(url.searchParams.get("destination")).toBe("any");
	});

	it("should not pin a destination when the trip is roundtrip", async () => {
		const mock = mockFetch(OK_RESPONSE);

		await fetchTrip(STOPS, true);

		const url = new URL(mock.mock.calls[0][0]);
		expect(url.searchParams.get("roundtrip")).toBe("true");
		expect(url.searchParams.get("destination")).toBeNull();
	});

	it("should swap OSRM lng,lat geometry into lat,lng for Leaflet", async () => {
		mockFetch(OK_RESPONSE);

		const trip = await fetchTrip(STOPS, false);

		expect(trip.geometry).toEqual([
			[-34.6, -58.38],
			[-34.65, -58.4],
		]);
		expect(trip.order).toEqual([0, 1]);
		expect(trip.totalDuration).toBe(900);
		expect(trip.totalDistance).toBe(5000);
		expect(trip.legs).toEqual([{ duration: 900, distance: 5000 }]);
	});

	it("should explain when no route exists between stops", async () => {
		mockFetch({ code: "NoTrips" });

		await expect(fetchTrip(STOPS, false)).rejects.toThrow(
			"No se encontró una ruta entre las paradas",
		);
	});

	it("should fail with a generic message on HTTP errors", async () => {
		mockFetch({}, false);

		await expect(fetchTrip(STOPS, false)).rejects.toThrow("No se pudo calcular la ruta");
	});

	it("should fail with a generic message on malformed responses", async () => {
		mockFetch({ code: "Ok" });

		await expect(fetchTrip(STOPS, false)).rejects.toThrow("No se pudo calcular la ruta");
	});
});
