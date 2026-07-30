import type { Stop } from "@/hooks/useStops";
import { buildGoogleMapsLegs } from "./googleMaps";

function makeStops(count: number): Stop[] {
	return Array.from({ length: count }, (_, i) => ({
		id: `s${i}`,
		label: `Parada ${i + 1}`,
		lat: Number((-34.6 - i * 0.01).toFixed(2)),
		lng: Number((-58.38 - i * 0.01).toFixed(2)),
	}));
}

describe("buildGoogleMapsLegs", () => {
	it("should return no legs with fewer than 2 stops", () => {
		expect(buildGoogleMapsLegs([], false)).toEqual([]);
		expect(buildGoogleMapsLegs(makeStops(1), false)).toEqual([]);
	});

	it("should build a single link with origin, waypoints and destination", () => {
		const stops = makeStops(3);

		const legs = buildGoogleMapsLegs(stops, false);

		expect(legs).toHaveLength(1);
		expect(legs[0].from).toBe(1);
		expect(legs[0].to).toBe(3);
		const params = new URL(legs[0].url).searchParams;
		expect(params.get("origin")).toBe("-34.6,-58.38");
		expect(params.get("destination")).toBe("-34.62,-58.4");
		expect(params.get("waypoints")).toBe("-34.61,-58.39");
		expect(params.get("travelmode")).toBe("driving");
	});

	it("should close the loop back to the origin on roundtrip", () => {
		const stops = makeStops(2);

		const legs = buildGoogleMapsLegs(stops, true);

		expect(legs).toHaveLength(1);
		const params = new URL(legs[0].url).searchParams;
		expect(params.get("destination")).toBe(params.get("origin"));
		// la vuelta al origen no cuenta como parada nueva en el label
		expect(legs[0].to).toBe(2);
	});

	it("should chain legs when Google Maps' 11-point limit is exceeded", () => {
		const stops = makeStops(15);

		const legs = buildGoogleMapsLegs(stops, false);

		expect(legs).toHaveLength(2);
		expect(legs[0].from).toBe(1);
		expect(legs[0].to).toBe(11);
		expect(legs[1].from).toBe(11);
		expect(legs[1].to).toBe(15);
		// el segundo tramo arranca donde termina el primero
		const firstParams = new URL(legs[0].url).searchParams;
		const secondParams = new URL(legs[1].url).searchParams;
		expect(secondParams.get("origin")).toBe(firstParams.get("destination"));
	});

	it("should cover the 30-stop maximum with 3 chained legs", () => {
		const stops = makeStops(30);

		const legs = buildGoogleMapsLegs(stops, false);

		expect(legs.map((l) => [l.from, l.to])).toEqual([
			[1, 11],
			[11, 21],
			[21, 30],
		]);
		for (let i = 1; i < legs.length; i++) {
			const prev = new URL(legs[i - 1].url).searchParams;
			const next = new URL(legs[i].url).searchParams;
			expect(next.get("origin")).toBe(prev.get("destination"));
		}
	});
});
