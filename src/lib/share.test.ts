import type { RouteState } from "@/hooks/useStops";
import {
	decodeRouteState,
	encodeRouteState,
	fromRoutePayload,
	MAX_SHARED_STOPS,
	sameRoute,
	toRoutePayload,
} from "./share";

function makeState(overrides: Partial<RouteState> = {}): RouteState {
	return {
		stops: [
			{ id: "a", label: "Obelisco", lat: -34.6037, lng: -58.3816 },
			{ id: "b", label: "Caminito", lat: -34.6393, lng: -58.3657 },
		],
		roundtrip: false,
		originId: "a",
		...overrides,
	};
}

describe("toRoutePayload", () => {
	it("should round coordinates to 5 decimals", () => {
		const state = makeState({
			stops: [{ id: "a", label: "X", lat: -34.60371234, lng: -58.38165678 }],
		});

		const payload = toRoutePayload(state);

		expect(payload.s[0]).toEqual([-34.60371, -58.38166, "X"]);
	});
});

describe("encodeRouteState / decodeRouteState", () => {
	it("should survive a round-trip preserving stops and roundtrip flag", () => {
		const state = makeState({ roundtrip: true });

		const decoded = decodeRouteState(encodeRouteState(state));

		expect(decoded).toBeDefined();
		expect(decoded?.roundtrip).toBe(true);
		expect(decoded?.stops.map((s) => s.label)).toEqual(["Obelisco", "Caminito"]);
		expect(decoded?.stops[0].lat).toBeCloseTo(-34.6037, 4);
		expect(decoded?.stops[0].lng).toBeCloseTo(-58.3816, 4);
	});

	it("should generate fresh ids for decoded stops", () => {
		const decoded = decodeRouteState(encodeRouteState(makeState()));

		expect(decoded?.stops[0].id).not.toBe("a");
		expect(decoded?.stops[0].id).not.toBe(decoded?.stops[1].id);
	});

	it("should mark the first decoded stop as the origin", () => {
		const decoded = decodeRouteState(encodeRouteState(makeState()));

		expect(decoded).toBeDefined();
		expect(decoded?.originId).toBe(decoded?.stops[0].id);
	});

	it("should return undefined for garbage input", () => {
		expect(decodeRouteState("no-es-un-payload")).toBeUndefined();
		expect(decodeRouteState("")).toBeUndefined();
	});
});

describe("fromRoutePayload", () => {
	it("should reject non-objects and wrong versions", () => {
		expect(fromRoutePayload(null)).toBeUndefined();
		expect(fromRoutePayload("x")).toBeUndefined();
		expect(fromRoutePayload({ v: 2, rt: false, s: [] })).toBeUndefined();
	});

	it("should reject more stops than the shared limit", () => {
		const s = Array.from({ length: MAX_SHARED_STOPS + 1 }, (_, i) => [-34, -58, `P${i}`]);

		expect(fromRoutePayload({ v: 1, rt: false, s })).toBeUndefined();
	});

	it("should reject out-of-range coordinates", () => {
		expect(fromRoutePayload({ v: 1, rt: false, s: [[-91, -58, "X"]] })).toBeUndefined();
		expect(fromRoutePayload({ v: 1, rt: false, s: [[-34, 181, "X"]] })).toBeUndefined();
		expect(fromRoutePayload({ v: 1, rt: false, s: [[Number.NaN, -58, "X"]] })).toBeUndefined();
	});

	it("should reject labels over the maximum length", () => {
		const s = [[-34, -58, "x".repeat(201)]];

		expect(fromRoutePayload({ v: 1, rt: false, s })).toBeUndefined();
	});

	it("should treat any non-true rt as one-way", () => {
		const decoded = fromRoutePayload({ v: 1, rt: "yes", s: [[-34, -58, "X"]] });

		expect(decoded?.roundtrip).toBe(false);
	});
});

describe("sameRoute", () => {
	it("should ignore stop ids and compare coordinates and labels", () => {
		const a = makeState();
		const b = makeState({
			stops: a.stops.map((s) => ({ ...s, id: crypto.randomUUID() })),
		});

		expect(sameRoute(a, b)).toBe(true);
	});

	it("should detect a changed coordinate", () => {
		const a = makeState();
		const b = makeState({
			stops: [a.stops[0], { ...a.stops[1], lat: a.stops[1].lat + 0.01 }],
		});

		expect(sameRoute(a, b)).toBe(false);
	});
});
