import { act, renderHook } from "@testing-library/react";
import { isNearDuplicate, type RouteState, type Stop, useStops } from "./useStops";

function stop(id: string, lat: number, lng: number): Stop {
	return { id, label: `Parada ${id}`, lat, lng };
}

const EMPTY: RouteState = { stops: [], roundtrip: false };

describe("isNearDuplicate", () => {
	it("should flag a point within ~11 m of an existing stop", () => {
		const stops = [stop("a", -34.6, -58.38)];

		expect(isNearDuplicate(stops, -34.60005, -58.38005)).toBe(true);
	});

	it("should accept a point farther away", () => {
		const stops = [stop("a", -34.6, -58.38)];

		expect(isNearDuplicate(stops, -34.601, -58.38)).toBe(false);
		expect(isNearDuplicate([], -34.6, -58.38)).toBe(false);
	});
});

describe("useStops reducer", () => {
	it("should append stops on add", () => {
		const { result } = renderHook(() => useStops(EMPTY));

		act(() => result.current.dispatch({ type: "add", stop: stop("a", -34.6, -58.38) }));
		act(() => result.current.dispatch({ type: "add", stop: stop("b", -34.7, -58.4) }));

		expect(result.current.state.stops.map((s) => s.id)).toEqual(["a", "b"]);
	});

	it("should remove a stop by id", () => {
		const initial = {
			stops: [stop("a", -34.6, -58.38), stop("b", -34.7, -58.4)],
			roundtrip: false,
		};
		const { result } = renderHook(() => useStops(initial));

		act(() => result.current.dispatch({ type: "remove", id: "a" }));

		expect(result.current.state.stops.map((s) => s.id)).toEqual(["b"]);
	});

	it("should move the chosen stop to the front on makeOrigin", () => {
		const initial = {
			stops: [stop("a", -34.6, -58.38), stop("b", -34.7, -58.4), stop("c", -34.8, -58.5)],
			roundtrip: false,
		};
		const { result } = renderHook(() => useStops(initial));

		act(() => result.current.dispatch({ type: "makeOrigin", id: "c" }));

		expect(result.current.state.stops.map((s) => s.id)).toEqual(["c", "a", "b"]);
	});

	it("should ignore makeOrigin for an unknown id", () => {
		const initial = { stops: [stop("a", -34.6, -58.38)], roundtrip: false };
		const { result } = renderHook(() => useStops(initial));

		act(() => result.current.dispatch({ type: "makeOrigin", id: "zzz" }));

		expect(result.current.state.stops.map((s) => s.id)).toEqual(["a"]);
	});

	it("should relabel only the matching stop", () => {
		const initial = {
			stops: [stop("a", -34.6, -58.38), stop("b", -34.7, -58.4)],
			roundtrip: false,
		};
		const { result } = renderHook(() => useStops(initial));

		act(() => result.current.dispatch({ type: "relabel", id: "b", label: "Nueva" }));

		expect(result.current.state.stops.map((s) => s.label)).toEqual(["Parada a", "Nueva"]);
	});

	it("should toggle roundtrip", () => {
		const { result } = renderHook(() => useStops(EMPTY));

		act(() => result.current.dispatch({ type: "toggleRoundtrip" }));

		expect(result.current.state.roundtrip).toBe(true);
	});

	it("should reset to an empty one-way state", () => {
		const initial = { stops: [stop("a", -34.6, -58.38)], roundtrip: true };
		const { result } = renderHook(() => useStops(initial));

		act(() => result.current.dispatch({ type: "reset" }));

		expect(result.current.state).toEqual(EMPTY);
	});

	it("should replace the whole state on hydrate", () => {
		const { result } = renderHook(() => useStops(EMPTY));
		const next = { stops: [stop("z", -34.9, -58.6)], roundtrip: true };

		act(() => result.current.dispatch({ type: "hydrate", state: next }));

		expect(result.current.state).toEqual(next);
	});
});
